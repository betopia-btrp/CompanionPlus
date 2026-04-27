<?php

namespace App\Services;

use App\Models\AvailabilitySlot;
use App\Models\Booking;
use App\Models\ConsultantProfile;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ConsultantSchedulingService
{
    public function __construct(private readonly BookingService $bookingService)
    {
    }

    public function ensureConsultantProfile(User $user): ConsultantProfile
    {
        return ConsultantProfile::firstOrCreate(
            ['user_id' => $user->id],
            [
                'specialization' => 'General Counseling',
                'bio' => null,
                'base_rate_bdt' => 0,
                'is_approved' => false,
                'average_rating' => 0,
            ]
        );
    }

    public function buildDashboardPayload(User $user): array
    {
        $this->bookingService->cancelExpiredBookings();

        $profile = $this->ensureConsultantProfile($user)->load([
            'availabilitySlots' => fn ($query) => $query->active()->orderBy('start_datetime'),
        ]);

        $today = Carbon::today();
        $startOfMonth = Carbon::now()->startOfMonth();

        $todayBookings = Booking::query()
            ->where('consultant_id', $profile->user_id)
            ->whereDate('scheduled_start', $today)
            ->with(['patient', 'slot'])
            ->orderBy('scheduled_start')
            ->get();

        $totalPatients = Booking::query()
            ->where('consultant_id', $profile->user_id)
            ->distinct('patient_id')
            ->count('patient_id');

        $pendingBookings = Booking::query()
            ->where('consultant_id', $profile->user_id)
            ->where('status', 'pending')
            ->with(['patient', 'slot'])
            ->orderBy('created_at', 'desc')
            ->get();

        $monthlyEarnings = Transaction::query()
            ->whereHas('booking', fn ($q) => $q->where('consultant_id', $profile->user_id))
            ->where('status', 'succeeded')
            ->where('created_at', '>=', $startOfMonth)
            ->sum('consultant_net');

        $lastMonthEarnings = Transaction::query()
            ->whereHas('booking', fn ($q) => $q->where('consultant_id', $profile->user_id))
            ->where('status', 'succeeded')
            ->whereBetween('created_at', [
                Carbon::now()->subMonth()->startOfMonth(),
                Carbon::now()->subMonth()->endOfMonth(),
            ])
            ->sum('consultant_net');

        $earningsChange = $lastMonthEarnings > 0
            ? round((($monthlyEarnings - $lastMonthEarnings) / $lastMonthEarnings) * 100, 1)
            : 0;

        $upcomingSlots = $profile->availabilitySlots()
            ->where('start_datetime', '>', now())
            ->with('activeBooking')
            ->get();

        $bookedCount = 0;
        $heldCount = 0;
        $availableCount = 0;

        foreach ($upcomingSlots as $slot) {
            $ab = $slot->activeBooking;
            if (!$ab) {
                $availableCount++;
            } elseif ($ab->status === 'booked' && $ab->hasActiveHold()) {
                $heldCount++;
            } else {
                $bookedCount++;
            }
        }

        return [
            'consultant' => [
                'id' => $profile->user_id,
                'name' => trim($user->first_name . ' ' . $user->last_name),
                'email' => $user->email,
                'is_approved' => $profile->is_approved,
                'specialization' => $profile->specialization,
                'bio' => $profile->bio,
                'base_rate_bdt' => $profile->base_rate_bdt,
                'average_rating' => $profile->average_rating,
            ],
            'stats' => [
                'today_sessions' => $todayBookings->count(),
                'total_patients' => $totalPatients,
                'pending_bookings' => $pendingBookings->count(),
                'upcoming_slots' => $upcomingSlots->count(),
                'booked_slots' => $bookedCount,
                'held_slots' => $heldCount,
                'available_slots' => $availableCount,
            ],
            'today_schedule' => $todayBookings->map(fn (Booking $b) => $this->serializeBooking($b))->values()->all(),
            'earnings' => [
                'monthly_total' => (float) $monthlyEarnings,
                'change_percent' => $earningsChange,
            ],
            'session_requests' => $pendingBookings->map(fn (Booking $b) => $this->serializeBooking($b))->values()->all(),
            'slots' => $upcomingSlots
                ->map(fn (AvailabilitySlot $slot) => $this->serializeSlot($slot))
                ->values()
                ->all(),
        ];
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
            'patient_name' => $patientRef,
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

    public function updateProfile(User $user, array $attributes): ConsultantProfile
    {
        $profile = $this->ensureConsultantProfile($user);

        $profile->update([
            'specialization' => $attributes['specialization'],
            'bio' => $attributes['bio'] ?? null,
            'base_rate_bdt' => (float) $attributes['base_rate_bdt'],
        ]);

        return $profile->fresh();
    }

    public function createSlot(User $user, array $attributes): AvailabilitySlot
    {
        $profile = $this->ensureConsultantProfile($user);
        $start = Carbon::parse($attributes['start_datetime']);
        $end = Carbon::parse($attributes['end_datetime']);

        $conflictExists = AvailabilitySlot::where('consultant_id', $profile->user_id)
            ->active() // Only check against active slots
            ->where(function ($query) use ($start, $end) {
                $query
                    ->whereBetween('start_datetime', [$start, $end->copy()->subSecond()])
                    ->orWhereBetween('end_datetime', [$start->copy()->addSecond(), $end])
                    ->orWhere(function ($nested) use ($start, $end) {
                        $nested
                            ->where('start_datetime', '<=', $start)
                            ->where('end_datetime', '>=', $end);
                    });
            })
            ->exists();

        if ($conflictExists) {
            throw ValidationException::withMessages([
                'start_datetime' => ['This slot overlaps with an existing availability window.'],
            ]);
        }

        return AvailabilitySlot::create([
            'consultant_id' => $profile->user_id,
            'start_datetime' => $start,
            'end_datetime' => $end,
        ]);
    }

    public function updateSlot(User $user, int $slotId, array $attributes): AvailabilitySlot
    {
        $profile = $this->ensureConsultantProfile($user);
        $slot = AvailabilitySlot::where('consultant_id', $profile->user_id)
            ->active() // Only update active slots
            ->findOrFail($slotId);

        $hasActiveBooking = Booking::where('slot_id', $slot->id)
            ->whereIn('status', ['booked', 'pending', 'confirmed'])
            ->where(function ($q) {
                $q->where('status', '!=', 'booked')
                  ->orWhere('created_at', '>', now()->subMinutes(15));
            })
            ->exists();

        if ($hasActiveBooking) {
            throw ValidationException::withMessages([
                'slot' => ['Booked or actively held slots cannot be moved.'],
            ]);
        }

        $start = Carbon::parse($attributes['start_datetime']);
        $end = Carbon::parse($attributes['end_datetime']);

        $conflictExists = AvailabilitySlot::where('consultant_id', $profile->user_id)
            ->active() // Only check against active slots
            ->where('id', '!=', $slot->id)
            ->where(function ($query) use ($start, $end) {
                $query
                    ->whereBetween('start_datetime', [$start, $end->copy()->subSecond()])
                    ->orWhereBetween('end_datetime', [$start->copy()->addSecond(), $end])
                    ->orWhere(function ($nested) use ($start, $end) {
                        $nested
                            ->where('start_datetime', '<=', $start)
                            ->where('end_datetime', '>=', $end);
                    });
            })
            ->exists();

        if ($conflictExists) {
            throw ValidationException::withMessages([
                'start_datetime' => ['This slot overlaps with an existing availability window.'],
            ]);
        }

        $slot->update([
            'start_datetime' => $start,
            'end_datetime' => $end,
        ]);

        return $slot->fresh();
    }

    public function deleteSlot(User $user, int $slotId, ?string $reason = null): array
    {
        $profile = $this->ensureConsultantProfile($user);
        $slot = AvailabilitySlot::where('consultant_id', $profile->user_id)
            ->findOrFail($slotId); // Find any slot (active or not) to check bookings

        // Check for confirmed bookings - these block deletion entirely
        $confirmedBookingsCount = $slot->confirmedBookingsCount();
        if ($confirmedBookingsCount > 0) {
            throw ValidationException::withMessages([
                'slot' => ['Cannot delete slot with confirmed bookings. Please cancel or reschedule confirmed appointments first.'],
            ]);
        }

        // Check for pending bookings - these will be auto-cancelled
        $pendingBookingsCount = $slot->pendingBookingsCount();
        
        if ($pendingBookingsCount > 0) {
            // Cancel pending bookings
            $slot->bookings()->where('status', 'pending')->update([
                'status' => 'cancelled',
                'cancelled_at' => now(),
                'cancellation_reason' => 'Slot deleted by consultant',
            ]);
            
            // Notify clients about cancelled bookings would happen here (via events/notifications)
            // For now, we'll just log or we could fire events
        }

        // Soft delete the slot
        $slot->update([
            'deleted_at' => now(),
            'deletion_reason' => $reason ?? 'Slot deleted by consultant',
        ]);

        return [
            'success' => true,
            'message' => 'Slot deleted successfully',
            'cancelled_bookings' => $pendingBookingsCount,
        ];
    }

    public function serializeSlot(AvailabilitySlot $slot): array
    {
        return $this->bookingService->serializeSlot($slot);
    }
}
