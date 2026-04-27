<?php

namespace App\Policies;

use App\Models\Booking;
use App\Models\ConsultantProfile;
use App\Models\User;
use Illuminate\Support\Carbon;

class ConsultantBookingPolicy
{
    public function book(User $user, ConsultantProfile $consultant, Carbon $start, Carbon $end): bool
    {
        $plan = $consultant->user?->subscriptionPlan;
        $maxHours = $plan?->getFeature('max_available_hours_per_month');

        if ($maxHours === null) {
            return true;
        }

        $bookedMinutes = Booking::where('consultant_id', $consultant->user_id)
            ->whereIn('status', ['booked', 'confirmed'])
            ->where('scheduled_start', '>=', now()->startOfMonth())
            ->where('scheduled_start', '<=', now()->endOfMonth())
            ->get()
            ->sum(fn ($b) => $b->scheduled_start->diffInMinutes($b->scheduled_end));

        $totalMinutes = $bookedMinutes + $start->diffInMinutes($end);

        return $totalMinutes <= $maxHours * 60;
    }
}
