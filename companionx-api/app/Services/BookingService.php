<?php

namespace App\Services;

use App\Models\AvailabilitySlot;
use App\Models\Booking;
use App\Models\ConsultantProfile;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class BookingService
{
    private const HOLD_MINUTES = 15;

    public function cancelExpiredBookings(): void
    {
        Booking::query()
            ->where('status', 'booked')
            ->where('created_at', '<=', now()->subMinutes(self::HOLD_MINUTES))
            ->update(['status' => 'cancelled']);
    }

    public function listConsultantSlots(ConsultantProfile $consultant, ?User $viewer = null): array
    {
        $this->cancelExpiredBookings();

        return AvailabilitySlot::where('consultant_id', $consultant->user_id)
            ->where('start_datetime', '>', now())
            ->with('activeBooking')
            ->orderBy('start_datetime')
            ->get()
            ->map(fn (AvailabilitySlot $slot) => $this->serializeSlot($slot, $viewer))
            ->values()
            ->all();
    }

    public function bookSlot(User $user, int $slotId): array
    {
        $this->cancelExpiredBookings();

        return DB::transaction(function () use ($user, $slotId) {
            $slot = AvailabilitySlot::whereKey($slotId)
                ->lockForUpdate()
                ->firstOrFail();

            if ($slot->start_datetime?->isPast()) {
                throw ValidationException::withMessages([
                    'slot_id' => ['Past slots cannot be booked.'],
                ]);
            }

            $activeBooking = Booking::where('slot_id', $slot->id)
                ->whereIn('status', ['booked', 'pending', 'confirmed'])
                ->where(function ($q) {
                    $q->where('status', '!=', 'booked')
                      ->orWhere('created_at', '>', now()->subMinutes(self::HOLD_MINUTES));
                })
                ->lockForUpdate()
                ->first();

            if ($activeBooking && $activeBooking->patient_id !== $user->id) {
                throw ValidationException::withMessages([
                    'slot_id' => ['This slot is already booked.'],
                ]);
            }

            $this->cancelUserBookings($user, exceptSlotId: $slot->id);

            if ($activeBooking && $activeBooking->patient_id === $user->id) {
                return [
                    'message' => 'Slot already held.',
                    'booking' => $this->buildActiveBookingPayload($user),
                ];
            }

            Booking::create([
                'patient_id' => $user->id,
                'consultant_id' => $slot->consultant_id,
                'slot_id' => $slot->id,
                'status' => 'booked',
                'jitsi_room_uuid' => \Illuminate\Support\Str::uuid(),
                'price_at_booking' => $slot->consultant->base_rate_bdt ?? 0,
                'scheduled_start' => $slot->start_datetime,
                'scheduled_end' => $slot->end_datetime,
            ]);

            return [
                'message' => 'Slot booked.',
                'booking' => $this->buildActiveBookingPayload($user),
            ];
        });
    }

    public function cancelBooking(User $user, int $slotId): void
    {
        $this->cancelExpiredBookings();

        Booking::where('slot_id', $slotId)
            ->where('patient_id', $user->id)
            ->where('status', 'booked')
            ->update(['status' => 'cancelled']);
    }

    public function buildActiveBookingPayload(User $user): ?array
    {
        $this->cancelExpiredBookings();

        $booking = Booking::with(['consultant.user', 'slot'])
            ->where('patient_id', $user->id)
            ->where('status', 'booked')
            ->where('created_at', '>', now()->subMinutes(self::HOLD_MINUTES))
            ->orderByDesc('created_at')
            ->first();

        if (!$booking instanceof Booking) {
            return null;
        }

        $expiresAt = $booking->created_at->copy()->addMinutes(self::HOLD_MINUTES);

        return [
            'slot_id' => $booking->slot_id,
            'consultant_id' => $booking->consultant_id,
            'consultant_name' => trim(($booking->consultant->user->first_name ?? '') . ' ' . ($booking->consultant->user->last_name ?? '')),
            'start_datetime' => optional($booking->scheduled_start)->toISOString(),
            'end_datetime' => optional($booking->scheduled_end)->toISOString(),
            'hold_expires_at' => $expiresAt->toISOString(),
            'remaining_seconds' => max(0, now()->diffInSeconds($expiresAt, false)),
        ];
    }

    public function serializeSlot(AvailabilitySlot $slot, ?User $viewer = null): array
    {
        $ab = $slot->activeBooking;

        if (!$ab) {
            $status = 'available';
        } elseif ($ab->status === 'booked' && !$ab->hasActiveHold()) {
            $status = 'available';
        } elseif ($ab->isHeldBy($viewer)) {
            $status = 'held_by_you';
        } elseif ($ab->status === 'booked' && $ab->hasActiveHold()) {
            $status = 'held';
        } elseif ($ab->status === 'confirmed') {
            $status = 'booked';
        } else {
            $status = 'booked'; // pending
        }

        return [
            'id' => $slot->id,
            'start_datetime' => optional($slot->start_datetime)->toISOString(),
            'end_datetime' => optional($slot->end_datetime)->toISOString(),
            'status' => $status,
            'source_template_id' => $slot->source_template_id,
        ];
    }

    private function cancelUserBookings(User $user, ?int $exceptSlotId = null): void
    {
        $query = Booking::where('patient_id', $user->id)
            ->where('status', 'booked');

        if ($exceptSlotId !== null) {
            $query->where('slot_id', '!=', $exceptSlotId);
        }

        $query->update(['status' => 'cancelled']);
    }
}
