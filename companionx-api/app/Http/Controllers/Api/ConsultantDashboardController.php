<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AvailabilitySlot;
use App\Models\AvailabilityTemplate;
use App\Models\Booking;
use App\Models\Transaction;
use App\Services\ConsultantSchedulingService;
use App\Services\SlotGeneratorService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
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

    public function storeSlot(Request $request, ConsultantSchedulingService $service)
    {
        $validated = $request->validate([
            'start_datetime' => 'required|date|after:now',
            'end_datetime' => 'required|date|after:start_datetime',
        ]);

        $slot = $service->createSlot($request->user(), $validated);

        return response()->json([
            'message' => 'Availability slot created.',
            'slot' => $service->serializeSlot($slot),
        ], 201);
    }

    public function updateSlot(Request $request, int $slotId, ConsultantSchedulingService $service)
    {
        $validated = $request->validate([
            'start_datetime' => 'required|date|after:now',
            'end_datetime' => 'required|date|after:start_datetime',
        ]);

        $slot = $service->updateSlot($request->user(), $slotId, $validated);

        return response()->json([
            'message' => 'Slot updated.',
            'slot' => $service->serializeSlot($slot),
        ]);
    }

    public function destroySlot(Request $request, int $slotId, ConsultantSchedulingService $service)
    {
        $result = $service->deleteSlot($request->user(), $slotId);

        return response()->json([
            'message' => $result['message'],
            'cancelled_bookings' => $result['cancelled_bookings'] ?? 0,
        ]);
    }

    public function approveBooking(Request $request, int $bookingId)
    {
        $profile = $request->user()->consultantProfile;

        if (!$profile) {
            throw ValidationException::withMessages(['booking' => ['Consultant profile not found.']]);
        }

        $booking = Booking::where('consultant_id', $profile->user_id)
            ->where('status', 'pending')
            ->findOrFail($bookingId);

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
            ->where('status', 'pending')
            ->findOrFail($bookingId);

        $booking->update(['status' => 'cancelled']);

        return response()->json(['message' => 'Booking rejected.']);
    }

    // ── Schedule ──────────────────────────────────────────────────────

    public function schedule(Request $request, SlotGeneratorService $generator)
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

        $slots = AvailabilitySlot::where('consultant_id', $profile->user_id)
            ->active() // Only get active slots
            ->whereBetween('start_datetime', [$start, $end])
            ->with('activeBooking')
            ->orderBy('start_datetime')
            ->get()
            ->map(fn (AvailabilitySlot $slot) => [
                'id' => $slot->id,
                'start_datetime' => optional($slot->start_datetime)->toISOString(),
                'end_datetime' => optional($slot->end_datetime)->toISOString(),
                'status' => $this->resolveSlotStatus($slot),
                'source_template_id' => $slot->source_template_id,
            ])
            ->values();

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
            ->orderBy('day_of_week')
            ->orderBy('start_time')
            ->get()
            ->map(fn (AvailabilityTemplate $t) => [
                'id' => $t->id,
                'day_of_week' => $t->day_of_week,
                'start_time' => $t->start_time instanceof Carbon ? $t->start_time->format('H:i') : (string) $t->start_time,
                'end_time' => $t->end_time instanceof Carbon ? $t->end_time->format('H:i') : (string) $t->end_time,
            ])
            ->values();

        return response()->json([
            'slots' => $slots,
            'bookings' => $bookings,
            'templates' => $templates,
        ]);
    }

    // ── Templates ─────────────────────────────────────────────────────

    public function storeTemplate(Request $request, SlotGeneratorService $generator)
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
            [
                'consultant_id' => $profile->user_id,
                'day_of_week' => $validated['day_of_week'],
            ],
            [
                'start_time' => $validated['start_time'],
                'end_time' => $validated['end_time'],
            ]
        );

        $generator->regenerateForTemplate($template);

        return response()->json([
            'message' => 'Template saved and slots generated.',
            'template' => [
                'id' => $template->id,
                'day_of_week' => $template->day_of_week,
                'start_time' => (string) $template->start_time,
                'end_time' => (string) $template->end_time,
            ],
        ], 201);
    }

    public function destroyTemplate(Request $request, int $templateId, SlotGeneratorService $generator)
    {
        $profile = $request->user()->consultantProfile;

        if (!$profile) {
            throw ValidationException::withMessages(['consultant' => ['Consultant profile not found.']]);
        }

        $template = AvailabilityTemplate::where('consultant_id', $profile->user_id)->findOrFail($templateId);

        // Delete future unbooked generated slots
        AvailabilitySlot::where('source_template_id', $template->id)
            ->active() // Only delete active slots
            ->where('start_datetime', '>', now())
            ->whereDoesntHave('bookings', fn ($q) => $q->whereIn('status', ['booked', 'pending', 'confirmed']))
            ->update(['source_template_id' => null]);

        $template->delete();

        return response()->json(['message' => 'Template removed.']);
    }

    // ── Bookings ──────────────────────────────────────────────────────

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

        $bookings = $query
            ->orderBy('scheduled_start', 'desc')
            ->paginate(20);

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

    // ── Wallet / Earnings ─────────────────────────────────────────────

    public function wallet(Request $request)
    {
        $profile = $request->user()->consultantProfile;

        if (!$profile) {
            throw ValidationException::withMessages(['consultant' => ['Consultant profile not found.']]);
        }

        $startOfMonth = Carbon::now()->startOfMonth();
        $startOfLastMonth = Carbon::now()->subMonth()->startOfMonth();
        $endOfLastMonth = Carbon::now()->subMonth()->endOfMonth();

        $monthlyEarnings = Transaction::query()
            ->whereHas('booking', fn ($q) => $q->where('consultant_id', $profile->user_id))
            ->where('status', 'succeeded')
            ->where('created_at', '>=', $startOfMonth)
            ->sum('consultant_net');

        $lastMonthEarnings = Transaction::query()
            ->whereHas('booking', fn ($q) => $q->where('consultant_id', $profile->user_id))
            ->where('status', 'succeeded')
            ->whereBetween('created_at', [$startOfLastMonth, $endOfLastMonth])
            ->sum('consultant_net');

        $changePercent = $lastMonthEarnings > 0
            ? round((($monthlyEarnings - $lastMonthEarnings) / $lastMonthEarnings) * 100, 1)
            : 0;

        $totalEarnings = Transaction::query()
            ->whereHas('booking', fn ($q) => $q->where('consultant_id', $profile->user_id))
            ->where('status', 'succeeded')
            ->sum('consultant_net');

        $transactions = Transaction::query()
            ->whereHas('booking', fn ($q) => $q->where('consultant_id', $profile->user_id))
            ->with('booking:id,scheduled_start,scheduled_end')
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return response()->json([
            'balance_bdt' => (float) $totalEarnings,
            'monthly_earnings' => (float) $monthlyEarnings,
            'change_percent' => $changePercent,
            'transactions' => $transactions->getCollection()->map(fn (Transaction $t) => [
                'id' => $t->id,
                'type' => $t->type,
                'status' => $t->status,
                'total_amount' => (float) $t->total_amount,
                'platform_fee' => (float) $t->platform_fee,
                'consultant_net' => (float) $t->consultant_net,
                'currency' => $t->currency,
                'booking_date' => $t->booking?->scheduled_start?->toISOString(),
                'created_at' => $t->created_at->toISOString(),
            ])->values(),
            'meta' => [
                'total' => $transactions->total(),
                'per_page' => $transactions->perPage(),
                'current_page' => $transactions->currentPage(),
                'last_page' => $transactions->lastPage(),
            ],
        ]);
    }

    // ── Helpers ────────────────────────────────────────────────────────

    private function resolveSlotStatus(AvailabilitySlot $slot): string
    {
        $ab = $slot->activeBooking;

        if (!$ab) {
            return 'available';
        }

        if ($ab->status === 'booked' && !$ab->hasActiveHold()) {
            return 'available';
        }

        if ($ab->status === 'booked' && $ab->hasActiveHold()) {
            return 'held';
        }

        return $ab->status; // pending, confirmed
    }

    private function serializeBooking(Booking $booking): array
    {
        $patient = $booking->patient;
        $patientRef = $patient
            ? '#' . strtoupper(substr(md5((string) $patient->id), 0, 6))
            : '#UNKNOWN';

        return [
            'id' => $booking->id,
            'patient_ref' => $patientRef,
            'patient_name' => $patient
                ? trim($patient->first_name . ' ' . $patient->last_name)
                : 'Unknown',
            'status' => $booking->status,
            'scheduled_start' => $booking->scheduled_start?->toISOString(),
            'scheduled_end' => $booking->scheduled_end?->toISOString(),
            'price_at_booking' => (float) $booking->price_at_booking,
            'jitsi_room_uuid' => $booking->jitsi_room_uuid,
            'is_first_time' => Booking::query()
                ->where('patient_id', $booking->patient_id)
                ->where('consultant_id', $booking->consultant_id)
                ->where('id', '<', $booking->id)
                ->doesntExist(),
        ];
    }
}
