<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\GenerateConsultantRecommendations;
use App\Jobs\GenerateOnboardingExercises;
use App\Models\Subscription;
use App\Models\SubscriptionPlan;
use App\Services\StripeService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SubscriptionController extends Controller
{
    public function __construct(
        private readonly StripeService $stripe
    ) {}

    public function index(Request $request)
    {
        $plans = SubscriptionPlan::where('is_active', true)
            ->where('type', $request->user()->system_role)
            ->orderBy('sort_order')
            ->get()
            ->map(fn (SubscriptionPlan $plan) => [
                'id' => $plan->id,
                'name' => $plan->name,
                'price' => (float) $plan->price,
                'billing_interval' => $plan->billing_interval,
                'features' => $plan->features,
                'sort_order' => $plan->sort_order,
                'stripe_price_id' => $plan->stripe_price_id,
            ]);

        return response()->json(['plans' => $plans]);
    }

    public function checkout(Request $request)
    {
        $request->validate([
            'plan_id' => 'required|exists:subscription_plans,id',
        ]);

        $user = $request->user();
        $plan = SubscriptionPlan::findOrFail($request->plan_id);

        if ($plan->type !== $user->system_role) {
            return response()->json(['error' => 'Invalid plan for your role.'], 422);
        }

        if (!$plan->stripe_price_id) {
            return response()->json([
                'error' => 'Plan not configured for payment. Run php artisan stripe:sync-prices first.',
            ], 500);
        }

        $successUrl = $request->input(
            'success_url',
            url('/pricing?session_id={CHECKOUT_SESSION_ID}')
        );
        $cancelUrl = $request->input(
            'cancel_url',
            url('/pricing')
        );

        $session = $this->stripe->createCheckoutSession(
            $user,
            $plan,
            $successUrl,
            $cancelUrl
        );

        return response()->json([
            'url' => $session->url,
            'session_id' => $session->id,
        ]);
    }

    public function complete(Request $request)
    {
        $request->validate([
            'session_id' => 'required|string',
        ]);

        $session = $this->stripe->retrieveCheckoutSession($request->session_id);

        if ($session->payment_status !== 'paid') {
            return response()->json(['error' => 'Payment not completed.'], 400);
        }

        $user = $request->user();
        $planId = (int) ($session->metadata['plan_id'] ?? 0);
        $plan = SubscriptionPlan::find($planId);

        if (!$plan) {
            return response()->json(['error' => 'Plan not found.'], 404);
        }

        $previousPlan = $user->subscriptionPlan;

        DB::transaction(function () use ($user, $plan, $session) {
            $newSub = $user->subscriptions()->create([
                'subscription_plan_id' => $plan->id,
                'status' => 'active',
                'current_period_start' => now(),
                'current_period_end' => $session->subscription?->current_period_end
                    ? \Carbon\Carbon::createFromTimestamp($session->subscription->current_period_end)
                    : \Carbon\Carbon::now()->addMonth(),
                'free_sessions_remaining' => $plan->getFeature('free_sessions', 0),
                'payment_processor' => 'stripe',
                'payment_processor_subscription_id' => $session->subscription?->id,
            ]);

            $user->subscriptions()
                ->where('status', 'active')
                ->where('id', '!=', $newSub->id)
                ->update(['status' => 'cancelled']);

            $user->subscription_plan_id = $plan->id;
            $user->save();
        });

        if ($previousPlan?->price == 0 && $plan->price > 0) {
            if ($user->onboarding_completed && $user->canAccessAiRecommendations()) {
                GenerateConsultantRecommendations::dispatch($user->id);
            }

            if ($user->onboarding_completed && $user->canAccessAiExercises()) {
                GenerateOnboardingExercises::dispatch($user->id);
            }
        }

        return response()->json([
            'message' => 'Subscription activated.',
            'plan' => [
                'id' => $plan->id,
                'name' => $plan->name,
            ],
        ]);
    }
}
