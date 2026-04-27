<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AvailabilityOverride;
use App\Models\AvailabilityTemplate;
use App\Models\Booking;
use App\Models\Transaction;
use App\Services\ConsultantSchedulingService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

class ConsultantDashboardController extends Controller
{
    public function show(Request $request, ConsultantSchedulingService $service)
    {
        return response()->json(
            $service->buildDashboardPayload($request->user())
        );
    }

    public function updateProfile(Request $request, ConsultantSchedulingService $service)
    {
        $validated = $request->validate([
            'specialization' => 'required|string|max:255',
            'bio' => 'nullable|string|max:2000',
            'base_rate_bdt' => 'required|numeric|min:0|max:50000',
        ]);

        $profile = $service->updateProfile($request->user(), $validated);

        return response()->json([
            'message' => 'Consultant profile updated.',
            'consultant' => [
                'id' => $profile->user_id,
                'specialization' => $profile->specialization,
                'bio' => $profile->bio,
                'base_rate_bdt' => $profile->base_rate_bdt,
                'is_approved' => $profile->is_approved,
                'average_rating' => $profile->average_rating,
            ],
        ]);
    }

    // ── Overrides ─────────────────────────────────────────────────────

    public function storeOverride(Request $request)
    {
        $profile = $request->user()->consultantProfile;
        if (!$profile) {
            throw ValidationException::withMessages(['consultant' => ['Consultant profile not found.']]);
        }

        $validated = $request->validate([
            'start_datetime' => 'required|date|after:now',
            'end_datetime' => 'required|date|after:start_datetime',
            'type' => 'required|in:available,blocked',
            'reason' => 'nullable|string|max:500',
        ]);

        $override = AvailabilityOverride::create([
            'consultant_id' => $profile->user_id,
            'start_datetime' => $validated['start_datetime'],
            'end_datetime' => $validated['end_datetime'],
            'type' => $validated['type'],
            'reason' => $validated['reason'] ?? null,
        ]);

        return response()->json([
            'message' => 'Override saved.',
            'override' => [
                'id' => $override->id,
                'start_datetime' => $override->start_datetime->toISOString(),
                'end_datetime' => $override->end_datetime->toISOString(),
                'type' => $override->type,
                'reason' => $override->reason,
            ],
        ], 201);
    }

    public function destroyOverride(Request $request, int $overrideId)
    {
        $profile = $request->user()->consultantProfile;
        if (!$profile) {
            throw ValidationException::withMessages(['consultant' => ['Consultant profile not found.']]);
        }

        $override = AvailabilityOverride::where('consultant_id', $profile->user_id)
            ->findOrFail($overrideId);

        $override->delete();

        return response()->json(['message' => 'Override removed.']);
    }

    // ── Schedule ──────────────────────────────────────────────────────

    public function schedule(Request $request)
    {
        $profile = $request->user()->consultantProfile;
        if (!$profile) {
            throw ValidationException::withMessages(['consultant' => ['Consultant profile not found.']]);
        }

        $validated = $request->validate([
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
        ]);

        $start = Carbon::parse($validated['start_date'])->startOfDay();
        $end = Carbon::parse($validated['end_date'])->endOfDay();

        $windows = $this->computeWindows($profile->user_id, $start, $end);

        $overrides = AvailabilityOverride::where('consultant_id', $profile->user_id)
            ->whereBetween('start_datetime', [$start, $end])
            ->orderBy('start_datetime')
            ->get()
            ->map(fn ($o) => [
                'id' => $o->id,
                'start_datetime' => $o->start_datetime->toISOString(),
                'end_datetime' => $o->end_datetime->toISOString(),
                'type' => $o->type,
                'reason' => $o->reason,
            ]);

        $bookings = Booking::where('consultant_id', $profile->user_id)
            ->where(function ($q) use ($start, $end) {
                $q->whereBetween('scheduled_start', [$start, $end])
                  ->orWhereBetween('scheduled_end', [$start, $end]);
            })
            ->whereIn('status', ['booked', 'pending', 'confirmed'])
            ->with('patient:id,first_name,last_name')
            ->orderBy('scheduled_start')
            ->get()
            ->map(fn (Booking $b) => $this->serializeBooking($b))
            ->values();

        $templates = AvailabilityTemplate::where('consultant_id', $profile->user_id)
            ->orderBy('day_of_week')->orderBy('start_time')
            ->get()
            ->map(fn (AvailabilityTemplate $t) => [
                'id' => $t->id,
                'day_of_week' => $t->day_of_week,
                'start_time' => $t->start_time instanceof Carbon ? $t->start_time->format('H:i') : (string) $t->start_time,
                'end_time' => $t->end_time instanceof Carbon ? $t->end_time->format('H:i') : (string) $t->end_time,
            ])
            ->values();

        return response()->json([
            'windows' => $windows,
            'overrides' => $overrides,
            'bookings' => $bookings,
            'templates' => $templates,
        ]);
    }

    // ── Templates ─────────────────────────────────────────────────────

    public function storeTemplate(Request $request)
    {
        $profile = $request->user()->consultantProfile;
        if (!$profile) {
            throw ValidationException::withMessages(['consultant' => ['Consultant profile not found.']]);
        }

        $validated = $request->validate([
            'day_of_week' => 'required|integer|min:0|max:6',
            'start_time' => 'required|date_format:H:i',
            'end_time' => 'required|date_format:H:i|after:start_time',
        ]);

        $template = AvailabilityTemplate::updateOrCreate(
            ['consultant_id' => $profile->user_id, 'day_of_week' => $validated['day_of_week']],
            ['start_time' => $validated['start_time'], 'end_time' => $validated['end_time']]
        );

        return response()->json([
            'message' => 'Template saved.',
            'template' => [
                'id' => $template->id,
                'day_of_week' => $template->day_of_week,
                'start_time' => (string) $template->start_time,
                'end_time' => (string) $template->end_time,
            ],
        ], 201);
    }

    public function destroyTemplate(Request $request, int $templateId)
    {
        $profile = $request->user()->consultantProfile;
        if (!$profile) {
            throw ValidationException::withMessages(['consultant' => ['Consultant profile not found.']]);
        }

        $template = AvailabilityTemplate::where('consultant_id', $profile->user_id)->findOrFail($templateId);
        $template->delete();

        return response()->json(['message' => 'Template removed.']);
    }

    // ── Bookings ──────────────────────────────────────────────────────

    public function approveBooking(Request $request, int $bookingId)
    {
        $profile = $request->user()->consultantProfile;
        if (!$profile) {
            throw ValidationException::withMessages(['booking' => ['Consultant profile not found.']]);
        }
        $booking = Booking::where('consultant_id', $profile->user_id)
            ->where('status', 'pending')->findOrFail($bookingId);
        $booking->update(['status' => 'confirmed']);
        return response()->json(['message' => 'Booking confirmed.']);
    }

    public function rejectBooking(Request $request, int $bookingId)
    {
        $profile = $request->user()->consultantProfile;
        if (!$profile) {
            throw ValidationException::withMessages(['booking' => ['Consultant profile not found.']]);
        }
        $booking = Booking::where('consultant_id', $profile->user_id)
            ->where('status', 'pending')->findOrFail($bookingId);
        $booking->update(['status' => 'cancelled']);
        return response()->json(['message' => 'Booking rejected.']);
    }

    public function bookings(Request $request)
    {
        $profile = $request->user()->consultantProfile;
        if (!$profile) {
            throw ValidationException::withMessages(['consultant' => ['Consultant profile not found.']]);
        }

        $validated = $request->validate([
            'status' => 'nullable|string|in:booked,pending,confirmed,cancelled,completed',
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date|after_or_equal:date_from',
            'page' => 'nullable|integer|min:1',
        ]);

        $query = Booking::where('consultant_id', $profile->user_id)
            ->with('patient:id,first_name,last_name');

        if (!empty($validated['status'])) {
            $query->where('status', $validated['status']);
        }
        if (!empty($validated['date_from'])) {
            $query->where('scheduled_start', '>=', Carbon::parse($validated['date_from'])->startOfDay());
        }
        if (!empty($validated['date_to'])) {
            $query->where('scheduled_start', '<=', Carbon::parse($validated['date_to'])->endOfDay());
        }

        $bookings = $query->orderBy('scheduled_start', 'desc')->paginate(20);

        return response()->json([
            'bookings' => $bookings->getCollection()->map(fn (Booking $b) => $this->serializeBooking($b))->values(),
            'meta' => [
                'total' => $bookings->total(),
                'per_page' => $bookings->perPage(),
                'current_page' => $bookings->currentPage(),
                'last_page' => $bookings->lastPage(),
            ],
        ]);
    }

    // ── Wallet ─────────────────────────────────────────────────────────

    public function wallet(Request $request)
    {
        $profile = $request->user()->consultantProfile;
        if (!$profile) {
            throw ValidationException::withMessages(['consultant' => ['Consultant profile not found.']]);
        }

        $startOfMonth = Carbon::now()->startOfMonth();
        $startOfLastMonth = Carbon::now()->subMonth()->startOfMonth();
        $endOfLastMonth = Carbon::now()->subMonth()->endOfMonth();

        $monthlyEarnings = Transaction::whereHas('booking', fn ($q) => $q->where('consultant_id', $profile->user_id))
            ->where('status', 'succeeded')->where('created_at', '>=', $startOfMonth)->sum('consultant_net');

        $lastMonthEarnings = Transaction::whereHas('booking', fn ($q) => $q->where('consultant_id', $profile->user_id))
            ->where('status', 'succeeded')->whereBetween('created_at', [$startOfLastMonth, $endOfLastMonth])->sum('consultant_net');

        $changePercent = $lastMonthEarnings > 0
            ? round((($monthlyEarnings - $lastMonthEarnings) / $lastMonthEarnings) * 100, 1) : 0;

        $totalEarnings = Transaction::whereHas('booking', fn ($q) => $q->where('consultant_id', $profile->user_id))
            ->where('status', 'succeeded')->sum('consultant_net');

        $transactions = Transaction::whereHas('booking', fn ($q) => $q->where('consultant_id', $profile->user_id))
            ->with('booking:id,scheduled_start,scheduled_end')->orderBy('created_at', 'desc')->paginate(20);

        return response()->json([
            'balance_bdt' => (float) $totalEarnings,
            'monthly_earnings' => (float) $monthlyEarnings,
            'change_percent' => $changePercent,
            'transactions' => $transactions->getCollection()->map(fn (Transaction $t) => [
                'id' => $t->id,
                'type' => $t->type, 'status' => $t->status,
                'total_amount' => (float) $t->total_amount,
                'platform_fee' => (float) $t->platform_fee,
                'consultant_net' => (float) $t->consultant_net,
                'currency' => $t->currency,
                'booking_date' => $t->booking?->scheduled_start?->toISOString(),
                'created_at' => $t->created_at->toISOString(),
            ])->values(),
            'meta' => [
                'total' => $transactions->total(), 'per_page' => $transactions->perPage(),
                'current_page' => $transactions->currentPage(), 'last_page' => $transactions->lastPage(),
            ],
        ]);
    }

    // ── Computed Availability ─────────────────────────────────────────

    private function computeWindows(int $consultantId, Carbon $start, Carbon $end): array
    {
        $templates = AvailabilityTemplate::where('consultant_id', $consultantId)->get();
        $overrides = AvailabilityOverride::where('consultant_id', $consultantId)
            ->whereBetween('start_datetime', [$start, $end])->get();
        $bookings = Booking::where('consultant_id', $consultantId)
            ->whereIn('status', ['booked', 'confirmed'])
            ->whereBetween('scheduled_start', [$start, $end])->get();

        $windows = [];

        $current = $start->copy()->startOfDay();
        while ($current->lte($end)) {
            $dayTemplates = $templates->where('day_of_week', $current->dayOfWeek);

            foreach ($dayTemplates as $tpl) {
                // Build template start/end for this specific day
                $dateStr = $current->format('Y-m-d');
                $startTime = $tpl->start_time instanceof Carbon ? $tpl->start_time->format('H:i') : (string) $tpl->start_time;
                $endTime = $tpl->end_time instanceof Carbon ? $tpl->end_time->format('H:i') : (string) $tpl->end_time;
                $tplStart = Carbon::parse($dateStr . ' ' . $startTime, 'Asia/Dhaka')->setTimezone('UTC');
                $tplEnd = Carbon::parse($dateStr . ' ' . $endTime, 'Asia/Dhaka')->setTimezone('UTC');

                $occupied = collect();

                foreach ($bookings as $b) {
                    if ($b->scheduled_start->lt($tplEnd) && $b->scheduled_end->gt($tplStart)) {
                        $occupied->push([
                            'start' => $b->scheduled_start->gt($tplStart) ? $b->scheduled_start : $tplStart,
                            'end' => $b->scheduled_end->lt($tplEnd) ? $b->scheduled_end : $tplEnd,
                        ]);
                    }
                }

                foreach ($overrides->where('type', 'blocked') as $o) {
                    if ($o->start_datetime->lt($tplEnd) && $o->end_datetime->gt($tplStart)) {
                        $occupied->push([
                            'start' => $o->start_datetime->gt($tplStart) ? $o->start_datetime : $tplStart,
                            'end' => $o->end_datetime->lt($tplEnd) ? $o->end_datetime : $tplEnd,
                        ]);
                    }
                }

                $occupied = $occupied->sortBy(fn ($s) => $s['start']->timestamp)->values();

                $merged = [];
                foreach ($occupied as $seg) {
                    if (empty($merged)) {
                        $merged[] = $seg;
                    } else {
                        $last = &$merged[count($merged) - 1];
                        if ($seg['start']->lte($last['end'])) {
                            $last['end'] = $seg['end']->gt($last['end']) ? $seg['end'] : $last['end'];
                        } else {
                            $merged[] = $seg;
                        }
                    }
                }

                $cursor = $tplStart->copy();
                foreach ($merged as $seg) {
                    if ($seg['start']->gt($cursor)) {
                        $windows[] = [
                            'start_datetime' => $cursor->toISOString(),
                            'end_datetime' => $seg['start']->toISOString(),
                        ];
                    }
                    if ($seg['end']->gt($cursor)) {
                        $cursor = $seg['end']->copy();
                    }
                }
                if ($cursor->lt($tplEnd)) {
                    $windows[] = [
                        'start_datetime' => $cursor->toISOString(),
                        'end_datetime' => $tplEnd->toISOString(),
                    ];
                }
            }

            foreach ($overrides->where('type', 'available') as $o) {
                if ($o->start_datetime->toDateString() === $current->toDateString()) {
                    $inTemplate = false;
                    foreach ($dayTemplates as $tpl) {
                        $dateStr = $current->format('Y-m-d');
                        $startTime = $tpl->start_time instanceof Carbon ? $tpl->start_time->format('H:i') : (string) $tpl->start_time;
                        $endTime = $tpl->end_time instanceof Carbon ? $tpl->end_time->format('H:i') : (string) $tpl->end_time;
                        $tplStart = Carbon::parse($dateStr . ' ' . $startTime, 'Asia/Dhaka')->setTimezone('UTC');
                        $tplEnd = Carbon::parse($dateStr . ' ' . $endTime, 'Asia/Dhaka')->setTimezone('UTC');
                        if ($o->start_datetime->gte($tplStart) && $o->end_datetime->lte($tplEnd)) {
                            $inTemplate = true;
                            break;
                        }
                    }
                    if (!$inTemplate) {
                        $windows[] = [
                            'start_datetime' => $o->start_datetime->toISOString(),
                            'end_datetime' => $o->end_datetime->toISOString(),
                        ];
                    }
                }
            }

            $current->addDay();
        }

        usort($windows, fn ($a, $b) => $a['start_datetime'] <=> $b['start_datetime']);
        return $windows;
    }

    // ── Helpers ────────────────────────────────────────────────────────

    private function serializeBooking(Booking $booking): array
    {
        $patient = $booking->patient;
        $patientRef = $patient
            ? '#' . strtoupper(substr(md5((string) $patient->id), 0, 6))
            : '#UNKNOWN';

        return [
            'id' => $booking->id,
            'patient_ref' => $patientRef,
            'patient_name' => $patientRef,
            'status' => $booking->status,
            'scheduled_start' => $booking->scheduled_start?->toISOString(),
            'scheduled_end' => $booking->scheduled_end?->toISOString(),
            'price_at_booking' => (float) $booking->price_at_booking,
            'jitsi_room_uuid' => $booking->jitsi_room_uuid,
            'is_first_time' => Booking::query()
                ->where('patient_id', $booking->patient_id)
                ->where('consultant_id', $booking->consultant_id)
                ->where('id', '<', $booking->id)->doesntExist(),
        ];
    }
}
