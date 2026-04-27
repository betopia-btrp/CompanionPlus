<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AvailabilityOverride;
use App\Models\AvailabilityTemplate;
use App\Models\Booking;
use App\Models\ConsultantProfile;
use App\Models\Subscription;
use App\Models\Transaction;
use App\Services\BookingService;
use App\Services\StripeService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class BookingFlowController extends Controller
{
    public function __construct(
        private readonly StripeService $stripe
    ) {}

    public function slots(Request $request, int $consultantId)
    {
        $consultant = ConsultantProfile::where('user_id', $consultantId)
            ->where('is_approved', true)
            ->with('user:id,first_name,last_name')
            ->firstOrFail();

        $validated = $request->validate([
            'start_date' => 'sometimes|date',
            'end_date' => 'sometimes|date|after_or_equal:start_date',
        ]);

        $start = Carbon::parse($validated['start_date'] ?? now()->startOfDay());
        $end = Carbon::parse($validated['end_date'] ?? now()->addWeeks(4)->endOfDay());

        $windows = $this->computeAvailabilityWindows($consultant->user_id, $start, $end);

        return response()->json([
            'consultant' => [
                'id' => $consultant->user_id,
                'name' => trim(($consultant->user->first_name ?? '') . ' ' . ($consultant->user->last_name ?? '')),
                'specialization' => $consultant->specialization,
            ],
            'windows' => $windows,
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

        // Validate against computed availability
        if (!$this->isTimeAvailable($consultant->user_id, $start, $end)) {
            return response()->json([
                'error' => 'Selected time range is not available.',
            ], 422);
        }

        return DB::transaction(function () use ($user, $consultant, $start, $end, $request) {
            $durationHours = $start->diffInMinutes($end) / 60;
            $totalAmount = round($consultant->base_rate_bdt * $durationHours);

            $booking = Booking::create([
                'patient_id' => $user->id,
                'consultant_id' => $consultant->user_id,
                'status' => 'booked',
                'jitsi_room_uuid' => Str::uuid(),
                'price_at_booking' => $totalAmount,
                'scheduled_start' => $start,
                'scheduled_end' => $end,
            ]);

            $activeSub = $user->activeSubscription;

            if ($activeSub && $activeSub->free_sessions_remaining > 0) {
                $activeSub->decrement('free_sessions_remaining');

                $booking->update(['status' => 'confirmed']);

                $consultant->increment('balance_bdt', $totalAmount);

                Transaction::create([
                    'booking_id' => $booking->id,
                    'user_id' => $user->id,
                    'type' => 'free_session',
                    'status' => 'succeeded',
                    'total_amount' => 0,
                    'platform_fee' => 0,
                    'consultant_net' => $totalAmount,
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
                $totalAmount,
                $booking,
                $request->input('success_url', url('/dashboard/booking/' . $consultant->user_id . '?session_id={CHECKOUT_SESSION_ID}&booking_id=' . $booking->id)),
                $request->input('cancel_url', url('/dashboard/booking/' . $consultant->user_id))
            );

            $booking->update(['stripe_session_id' => $session->id]);

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
        ]);

        $session = $this->stripe->retrieveCheckoutSession($validated['session_id']);

        if ($session->payment_status !== 'paid') {
            return response()->json(['error' => 'Payment not completed.'], 400);
        }

        $user = $request->user();

        $booking = Booking::where('stripe_session_id', $validated['session_id'])
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

    public function myBookings(Request $request)
    {
        $validated = $request->validate([
            'status' => 'nullable|string|in:booked,pending,confirmed,cancelled,completed',
            'page' => 'nullable|integer|min:1',
        ]);

        $user = $request->user();
        $role = $user->system_role;
        $page = max(1, (int) ($validated['page'] ?? 1));

        $query = Booking::query();

        if ($role === 'consultant') {
            $query->where('consultant_id', $user->id);
        } else {
            $query->where('patient_id', $user->id);
        }

        if (!empty($validated['status'])) {
            $query->where('status', $validated['status']);
        }

        $bookings = $query
            ->with([
                'consultant.user:id,first_name,last_name',
                'patient:id,first_name,last_name',
            ])
            ->orderBy('scheduled_start', 'desc')
            ->paginate(20, ['*'], 'page', $page);

        return response()->json([
            'bookings' => $bookings->getCollection()->map(function (Booking $b) use ($role) {
                $isPatient = $role !== 'consultant';
                $patient = $b->patient;
                $patientRef = $patient
                    ? '#' . strtoupper(substr(md5((string) $patient->id), 0, 6))
                    : '#UNKNOWN';

                return [
                    'id' => $b->id,
                    'ref' => $isPatient
                        ? trim(($b->consultant?->user->first_name ?? '') . ' ' . ($b->consultant?->user->last_name ?? ''))
                        : $patientRef,
                    'subtitle' => $isPatient
                        ? ($b->consultant?->specialization ?? '')
                        : $patientRef,
                    'status' => $b->status,
                    'scheduled_start' => $b->scheduled_start?->toISOString(),
                    'scheduled_end' => $b->scheduled_end?->toISOString(),
                    'price_at_booking' => (float) $b->price_at_booking,
                    'jitsi_room_uuid' => $b->jitsi_room_uuid,
                    'stripe_session_id' => $b->stripe_session_id,
                    'is_first_time' => $isPatient ? false : Booking::query()
                        ->where('patient_id', $b->patient_id)
                        ->where('consultant_id', $b->consultant_id)
                        ->where('id', '<', $b->id)
                        ->doesntExist(),
                ];
            })->values(),
            'meta' => [
                'total' => $bookings->total(),
                'per_page' => $bookings->perPage(),
                'current_page' => $bookings->currentPage(),
                'last_page' => $bookings->lastPage(),
            ],
        ]);
    }

    private function isTimeAvailable(int $consultantId, Carbon $start, Carbon $end): bool
    {
        $overlappingBooking = Booking::where('consultant_id', $consultantId)
            ->whereIn('status', ['booked', 'pending', 'confirmed'])
            ->where('scheduled_start', '<', $end)
            ->where('scheduled_end', '>', $start)
            ->exists();

        if ($overlappingBooking) {
            return false;
        }

        $blocked = AvailabilityOverride::where('consultant_id', $consultantId)
            ->where('type', 'blocked')
            ->where('start_datetime', '<', $end)
            ->where('end_datetime', '>', $start)
            ->exists();

        if ($blocked) {
            return false;
        }

        $dayOfWeek = $start->dayOfWeek;
        $inTemplate = AvailabilityTemplate::where('consultant_id', $consultantId)
            ->where('day_of_week', $dayOfWeek)
            ->get()
            ->contains(function ($tpl) use ($start, $end) {
                $tplStart = (clone $start)->setTimezone('Asia/Dhaka')
                    ->setTimeFromTimeString((string) $tpl->start_time)->setTimezone('UTC');
                $tplEnd = (clone $start)->setTimezone('Asia/Dhaka')
                    ->setTimeFromTimeString((string) $tpl->end_time)->setTimezone('UTC');
                return $start->gte($tplStart) && $end->lte($tplEnd);
            });

        if ($inTemplate) {
            return true;
        }

        return AvailabilityOverride::where('consultant_id', $consultantId)
            ->where('type', 'available')
            ->where('start_datetime', '<=', $start)
            ->where('end_datetime', '>=', $end)
            ->exists();
    }

    private function computeAvailabilityWindows(int $consultantId, Carbon $start, Carbon $end): array
    {
        $templates = AvailabilityTemplate::where('consultant_id', $consultantId)->get();
        $bookings = Booking::where('consultant_id', $consultantId)
            ->whereIn('status', ['booked', 'confirmed'])
            ->whereBetween('scheduled_start', [$start, $end])->get();
        $blocked = AvailabilityOverride::where('consultant_id', $consultantId)
            ->where('type', 'blocked')
            ->whereBetween('start_datetime', [$start, $end])->get();
        $availableOverrides = AvailabilityOverride::where('consultant_id', $consultantId)
            ->where('type', 'available')
            ->whereBetween('start_datetime', [$start, $end])->get();

        $windows = [];
        $current = $start->copy()->startOfDay();

        while ($current->lte($end)) {
            $dayTemplates = $templates->where('day_of_week', $current->dayOfWeek);

            foreach ($dayTemplates as $tpl) {
                $tplStart = (clone $current)->setTimezone('Asia/Dhaka')
                    ->setTimeFromTimeString((string) $tpl->start_time)->setTimezone('UTC');
                $tplEnd = (clone $current)->setTimezone('Asia/Dhaka')
                    ->setTimeFromTimeString((string) $tpl->end_time)->setTimezone('UTC');

                $occupied = collect();

                foreach ($bookings as $b) {
                    if ($b->scheduled_start->lt($tplEnd) && $b->scheduled_end->gt($tplStart)) {
                        $occupied->push(['start' => max($b->scheduled_start->timestamp, $tplStart->timestamp), 'end' => min($b->scheduled_end->timestamp, $tplEnd->timestamp)]);
                    }
                }
                foreach ($blocked as $o) {
                    if ($o->start_datetime->lt($tplEnd) && $o->end_datetime->gt($tplStart)) {
                        $occupied->push(['start' => max($o->start_datetime->timestamp, $tplStart->timestamp), 'end' => min($o->end_datetime->timestamp, $tplEnd->timestamp)]);
                    }
                }

                $occupied = $occupied->sortBy('start')->values();
                $merged = [];
                foreach ($occupied as $seg) {
                    if (empty($merged)) {
                        $merged[] = $seg;
                    } else {
                        $last = &$merged[count($merged) - 1];
                        if ($seg['start'] <= $last['end']) {
                            $last['end'] = max($last['end'], $seg['end']);
                        } else {
                            $merged[] = $seg;
                        }
                    }
                }

                $cursor = $tplStart->timestamp;
                foreach ($merged as $seg) {
                    if ($seg['start'] > $cursor) {
                        $windows[] = ['start' => Carbon::createFromTimestamp($cursor)->toISOString(), 'end' => Carbon::createFromTimestamp($seg['start'])->toISOString()];
                    }
                    $cursor = max($cursor, $seg['end']);
                }
                if ($cursor < $tplEnd->timestamp) {
                    $windows[] = ['start' => Carbon::createFromTimestamp($cursor)->toISOString(), 'end' => $tplEnd->toISOString()];
                }
            }

            foreach ($availableOverrides as $o) {
                if ($o->start_datetime->toDateString() === $current->toDateString()) {
                    $inTemplate = false;
                    foreach ($dayTemplates as $tpl) {
                        $tplStart = (clone $current)->setTimezone('Asia/Dhaka')
                            ->setTimeFromTimeString((string) $tpl->start_time)->setTimezone('UTC');
                        $tplEnd = (clone $current)->setTimezone('Asia/Dhaka')
                            ->setTimeFromTimeString((string) $tpl->end_time)->setTimezone('UTC');
                        if ($o->start_datetime->gte($tplStart) && $o->end_datetime->lte($tplEnd)) {
                            $inTemplate = true;
                            break;
                        }
                    }
                    if (!$inTemplate) {
                        $windows[] = ['start' => $o->start_datetime->toISOString(), 'end' => $o->end_datetime->toISOString()];
                    }
                }
            }

            $current->addDay();
        }

        usort($windows, fn ($a, $b) => $a['start'] <=> $b['start']);
        return $windows;
    }
}
