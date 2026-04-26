<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AvailabilitySlot;
use App\Models\Booking;
use App\Models\ConsultantProfile;
use App\Models\Subscription;
use App\Models\Transaction;
use App\Services\BookingService;
use App\Services\StripeService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class BookingFlowController extends Controller
{
    public function __construct(
        private readonly StripeService $stripe
    ) {}

    public function slots(Request $request, int $consultantId, BookingService $bookingService)
    {
        $consultant = ConsultantProfile::where('user_id', $consultantId)
            ->where('is_approved', true)
            ->with('user:id,first_name,last_name')
            ->firstOrFail();

        return response()->json([
            'consultant' => [
                'id' => $consultant->user_id,
                'name' => trim(($consultant->user->first_name ?? '') . ' ' . ($consultant->user->last_name ?? '')),
                'specialization' => $consultant->specialization,
            ],
            'slots' => $bookingService->listConsultantSlots($consultant, $request->user()),
        ]);
    }

    public function currentHold(Request $request, BookingService $bookingService)
    {
        return response()->json([
            'hold' => $bookingService->buildActiveBookingPayload($request->user()),
        ]);
    }

    public function hold(Request $request, BookingService $bookingService)
    {
        $validated = $request->validate([
            'slot_id' => 'required|integer|exists:availability_slots,id',
        ]);

        return response()->json(
            $bookingService->bookSlot($request->user(), (int) $validated['slot_id'])
        );
    }

    public function release(Request $request, int $slotId, BookingService $bookingService)
    {
        $bookingService->cancelBooking($request->user(), $slotId);

        return response()->json([
            'message' => 'Booking cancelled.',
        ]);
    }

    public function checkout(Request $request)
    {
        $validated = $request->validate([
            'consultant_id' => 'required|integer|exists:consultant_profiles,user_id',
            'scheduled_start' => 'required|date|after:now',
            'scheduled_end' => 'required|date|after:scheduled_start',
        ]);

        $user = $request->user();
        $start = Carbon::parse($validated['scheduled_start']);
        $end = Carbon::parse($validated['scheduled_end']);

        $consultant = ConsultantProfile::where('user_id', $validated['consultant_id'])
            ->where('is_approved', true)
            ->firstOrFail();

        $matchingSlot = AvailabilitySlot::where('consultant_id', $consultant->user_id)
            ->where('start_datetime', '<=', $start)
            ->where('end_datetime', '>=', $end)
            ->whereNull('deleted_at')
            ->orderBy('start_datetime')
            ->first();

        if (!$matchingSlot) {
            return response()->json([
                'error' => 'Selected time range is not within available slots.',
            ], 422);
        }

        return DB::transaction(function () use ($user, $consultant, $matchingSlot, $start, $end, $request) {
            $booking = Booking::create([
                'patient_id' => $user->id,
                'consultant_id' => $consultant->user_id,
                'slot_id' => $matchingSlot->id,
                'status' => 'booked',
                'jitsi_room_uuid' => Str::uuid(),
                'price_at_booking' => $consultant->base_rate_bdt,
                'scheduled_start' => $start,
                'scheduled_end' => $end,
            ]);

            $activeSub = $user->activeSubscription;

            if ($activeSub && $activeSub->free_sessions_remaining > 0) {
                $activeSub->decrement('free_sessions_remaining');

                $booking->update(['status' => 'confirmed']);

                $consultant->increment('balance_bdt', $consultant->base_rate_bdt);

                $plan = $consultant->user->subscriptionPlan;
                $feePct = $plan?->getFeature('platform_fee_percentage', 10);

                Transaction::create([
                    'booking_id' => $booking->id,
                    'user_id' => $user->id,
                    'type' => 'free_session',
                    'status' => 'succeeded',
                    'total_amount' => 0,
                    'platform_fee' => 0,
                    'consultant_net' => $consultant->base_rate_bdt,
                    'currency' => 'BDT',
                ]);

                return response()->json([
                    'free_session' => true,
                    'booking_id' => $booking->id,
                    'message' => 'Session booked with your free session credit.',
                ]);
            }

            $session = $this->stripe->createBookingCheckoutSession(
                $user,
                $consultant->base_rate_bdt,
                $booking,
                $request->input('success_url', url('/dashboard/booking/' . $consultant->user_id . '?session_id={CHECKOUT_SESSION_ID}&booking_id=' . $booking->id)),
                $request->input('cancel_url', url('/dashboard/booking/' . $consultant->user_id))
            );

            return response()->json([
                'url' => $session->url,
                'session_id' => $session->id,
                'booking_id' => $booking->id,
            ]);
        });
    }

    public function complete(Request $request)
    {
        $validated = $request->validate([
            'session_id' => 'required|string',
            'booking_id' => 'required|integer|exists:bookings,id',
        ]);

        $session = $this->stripe->retrieveCheckoutSession($validated['session_id']);

        if ($session->payment_status !== 'paid') {
            return response()->json(['error' => 'Payment not completed.'], 400);
        }

        $user = $request->user();
        $booking = Booking::where('id', $validated['booking_id'])
            ->where('patient_id', $user->id)
            ->firstOrFail();

        $consultant = $booking->consultant;

        $plan = $consultant?->user?->subscriptionPlan;
        $feePct = $plan?->getFeature('platform_fee_percentage', 10);

        $totalAmount = $booking->price_at_booking;
        $platformFee = round($totalAmount * $feePct / 100, 2);
        $consultantNet = $totalAmount - $platformFee;

        DB::transaction(function () use ($booking, $consultant, $user, $session, $totalAmount, $platformFee, $consultantNet) {
            $booking->update(['status' => 'confirmed']);

            $consultant->increment('balance_bdt', $consultantNet);

            Transaction::create([
                'booking_id' => $booking->id,
                'user_id' => $user->id,
                'type' => 'payment',
                'status' => 'succeeded',
                'stripe_reference_id' => $session->payment_intent,
                'total_amount' => $totalAmount,
                'platform_fee' => $platformFee,
                'consultant_net' => $consultantNet,
                'currency' => 'BDT',
            ]);
        });

        return response()->json([
            'message' => 'Booking confirmed.',
            'booking' => [
                'id' => $booking->id,
                'scheduled_start' => $booking->scheduled_start->toISOString(),
                'scheduled_end' => $booking->scheduled_end->toISOString(),
                'status' => 'confirmed',
            ],
        ]);
    }
}
