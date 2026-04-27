<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\ConsultantProfile;
use App\Models\Transaction;
use App\Services\StripeService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class StripeWebhookController extends Controller
{
    public function __construct(private readonly StripeService $stripe) {}

    public function handle(Request $request)
    {
        $sigHeader = $request->header('Stripe-Signature');

        if (!$sigHeader) {
            return response()->json(['error' => 'Missing signature.'], 400);
        }

        try {
            $event = $this->stripe->verifyWebhookSignature(
                $request->getContent(),
                $sigHeader
            );
        } catch (\Exception $e) {
            Log::error('Stripe webhook signature verification failed: ' . $e->getMessage());
            return response()->json(['error' => 'Invalid signature.'], 400);
        }

        switch ($event->type) {
            case 'checkout.session.completed':
                $this->handleCheckoutCompleted($event->data->object);
                break;

            default:
                Log::info('Stripe webhook received unhandled event type: ' . $event->type);
        }

        return response()->json(['received' => true]);
    }

    private function handleCheckoutCompleted(object $session): void
    {
        $bookingId = $session->metadata->booking_id ?? null;

        if (!$bookingId) {
            Log::warning('Stripe webhook: No booking_id in session metadata.', [
                'session_id' => $session->id,
            ]);
            return;
        }

        $booking = Booking::find($bookingId);

        if (!$booking) {
            Log::warning('Stripe webhook: Booking not found.', [
                'booking_id' => $bookingId,
                'session_id' => $session->id,
            ]);
            return;
        }

        if ($booking->status === 'confirmed' || $booking->status === 'completed') {
            return;
        }

        $consultant = $booking->consultant;

        if (!$consultant) {
            Log::warning('Stripe webhook: Consultant not found for booking.', [
                'booking_id' => $bookingId,
            ]);
            return;
        }

        $plan = $consultant?->user?->subscriptionPlan;
        $feePct = $plan?->getFeature('platform_fee_percentage', 10);

        $totalAmount = $booking->price_at_booking;
        $platformFee = round($totalAmount * $feePct / 100, 2);
        $consultantNet = $totalAmount - $platformFee;

        DB::transaction(function () use ($booking, $consultant, $session, $totalAmount, $platformFee, $consultantNet) {
            $booking->update([
                'status' => 'confirmed',
                'stripe_session_id' => $session->id,
            ]);

            $consultant->increment('balance_bdt', $consultantNet);

            Transaction::create([
                'booking_id' => $booking->id,
                'user_id' => $booking->patient_id,
                'type' => 'payment',
                'status' => 'succeeded',
                'stripe_reference_id' => $session->payment_intent,
                'total_amount' => $totalAmount,
                'platform_fee' => $platformFee,
                'consultant_net' => $consultantNet,
                'currency' => 'BDT',
            ]);
        });

        Log::info('Stripe webhook: Booking confirmed.', [
            'booking_id' => $booking->id,
            'session_id' => $session->id,
        ]);
    }
}
