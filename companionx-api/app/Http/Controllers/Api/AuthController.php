<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ConsultantProfile;
use App\Models\Subscription;
use App\Models\SubscriptionPlan;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $request->validate([
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'phone' => 'required|string|unique:users',
            'password' => ['required', 'confirmed', Password::defaults()],
            'dob' => 'required|date',
            'gender' => 'required|string',
            'guardian_contact' => 'nullable|string',
            'system_role' => 'nullable|string|in:patient,consultant',
        ]);

        $systemRole = $request->string('system_role')->trim()->value() ?: 'patient';

        $user = User::create([
            'first_name' => $request->first_name,
            'last_name' => $request->last_name,
            'email' => $request->email,
            'phone' => $request->phone,
            'password' => Hash::make($request->password),
            'dob' => $request->dob,
            'gender' => $request->gender,
            'guardian_contact' => $request->guardian_contact,
            'system_role' => $systemRole,
        ]);

        if ($systemRole === 'consultant') {
            ConsultantProfile::firstOrCreate([
                'user_id' => $user->id,
            ]);
        }

        $plan = SubscriptionPlan::where('name', 'Free')
            ->where('type', $systemRole)
            ->first();

        if ($plan) {
            $user->subscription_plan_id = $plan->id;
            $user->save();

            $user->subscriptions()->create([
                'subscription_plan_id' => $plan->id,
                'status' => 'active',
                'current_period_start' => now(),
                'free_sessions_remaining' => $plan->getFeature('free_sessions', 0),
            ]);
        }

        Auth::login($user);
        $request->session()->regenerate();

        return response()->json([
            'user' => $user,
        ], 201);
    }

    public function login(Request $request)
    {
        $fields = $request->validate([
            'email' => 'required|string|email',
            'password' => 'required|string'
        ]);

        if (!Auth::attempt($fields, true)) {
            return response([
                'message' => 'Invalid credentials'
            ], 401);
        }

        $request->session()->regenerate();

        $user = $request->user();

        return response([
            'user' => $user,
        ], 200);
    }

    public function logout(Request $request)
    {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response(['message' => 'Logged out'], 200);
    }

    public function me(Request $request)
    {
        $user = $request->user()->load('subscriptionPlan');

        return response()->json([
            ...$user->toArray(),
            'active_subscription' => $user->activeSubscription()->exists(),
        ]);
    }
}
