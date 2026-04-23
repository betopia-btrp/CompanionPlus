<?php

namespace App\Services;

use App\Models\AvailabilitySlot;
use App\Models\ConsultantProfile;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SlotHoldService
{
    private const HOLD_MINUTES = 15;

    public function releaseExpiredHolds(): void
    {
        AvailabilitySlot::query()
            ->whereNotNull('held_by_user_id')
            ->whereNotNull('hold_expires_at')
            ->where('hold_expires_at', '<=', now())
            ->update([
                'held_by_user_id' => null,
                'hold_expires_at' => null,
            ]);
    }

    public function listConsultantSlots(ConsultantProfile $consultant, ?User $viewer = null): array
    {
        $this->releaseExpiredHolds();

        return AvailabilitySlot::where('consultant_id', $consultant->id)
            ->where('start_datetime', '>', now())
            ->orderBy('start_datetime')
            ->get()
            ->map(fn (AvailabilitySlot $slot) => $this->serializeSlot($slot, $viewer))
            ->values()
            ->all();
    }

    public function holdSlot(User $user, int $slotId): array
    {
        $this->releaseExpiredHolds();

        return DB::transaction(function () use ($user, $slotId) {
            $slot = AvailabilitySlot::whereKey($slotId)
                ->lockForUpdate()
                ->firstOrFail();

            if ($slot->is_booked) {
                throw ValidationException::withMessages([
                    'slot_id' => ['This slot is already booked.'],
                ]);
            }

            if ($slot->start_datetime?->isPast()) {
                throw ValidationException::withMessages([
                    'slot_id' => ['Past slots cannot be held.'],
                ]);
            }

            if ($slot->hasActiveHold() && $slot->held_by_user_id !== $user->id) {
                throw ValidationException::withMessages([
                    'slot_id' => ['This slot is currently held by another user.'],
                ]);
            }

            $this->releaseUserHolds($user, exceptSlotId: $slot->id);

            $slot->update([
                'held_by_user_id' => $user->id,
                'hold_expires_at' => now()->addMinutes(self::HOLD_MINUTES),
            ]);

            return [
                'message' => 'Slot held successfully.',
                'hold' => $this->buildCurrentHoldPayload($user),
            ];
        });
    }

    public function releaseHold(User $user, int $slotId): void
    {
        $this->releaseExpiredHolds();

        $slot = AvailabilitySlot::whereKey($slotId)
            ->where('held_by_user_id', $user->id)
            ->firstOrFail();

        $slot->update([
            'held_by_user_id' => null,
            'hold_expires_at' => null,
        ]);
    }

    public function buildCurrentHoldPayload(User $user): ?array
    {
        $this->releaseExpiredHolds();

        $slot = AvailabilitySlot::with('consultant.user')
            ->where('held_by_user_id', $user->id)
            ->whereNotNull('hold_expires_at')
            ->where('hold_expires_at', '>', now())
            ->orderByDesc('hold_expires_at')
            ->first();

        if (!$slot instanceof AvailabilitySlot) {
            return null;
        }

        return [
            'slot_id' => $slot->id,
            'consultant_id' => $slot->consultant_id,
            'consultant_name' => trim(($slot->consultant->user->first_name ?? '') . ' ' . ($slot->consultant->user->last_name ?? '')),
            'start_datetime' => optional($slot->start_datetime)->toISOString(),
            'end_datetime' => optional($slot->end_datetime)->toISOString(),
            'hold_expires_at' => optional($slot->hold_expires_at)->toISOString(),
            'remaining_seconds' => max(0, now()->diffInSeconds($slot->hold_expires_at, false)),
        ];
    }

    public function serializeSlot(AvailabilitySlot $slot, ?User $viewer = null): array
    {
        $activeHold = $slot->hasActiveHold();
        $isHeldByViewer = $viewer && $slot->held_by_user_id === $viewer->id && $activeHold;
        $status = $slot->is_booked
            ? 'booked'
            : ($isHeldByViewer ? 'held_by_you' : ($activeHold ? 'held' : 'available'));

        return [
            'id' => $slot->id,
            'start_datetime' => optional($slot->start_datetime)->toISOString(),
            'end_datetime' => optional($slot->end_datetime)->toISOString(),
            'is_booked' => $slot->is_booked,
            'status' => $status,
            'held_by_user_id' => $isHeldByViewer ? $slot->held_by_user_id : null,
            'hold_expires_at' => $activeHold ? optional($slot->hold_expires_at)->toISOString() : null,
            'remaining_seconds' => $activeHold && $slot->hold_expires_at
                ? max(0, now()->diffInSeconds($slot->hold_expires_at, false))
                : null,
        ];
    }

    private function releaseUserHolds(User $user, ?int $exceptSlotId = null): void
    {
        $query = AvailabilitySlot::where('held_by_user_id', $user->id);

        if ($exceptSlotId !== null) {
            $query->where('id', '!=', $exceptSlotId);
        }

        $query->update([
            'held_by_user_id' => null,
            'hold_expires_at' => null,
        ]);
    }
}
