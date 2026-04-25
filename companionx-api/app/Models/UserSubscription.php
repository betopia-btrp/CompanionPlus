<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

class UserSubscription extends Model
{
    protected $fillable = [
        'user_id',
        'subscription_plan_id',
        'status',
        'current_period_start',
        'current_period_end',
        'cancelled_at',
        'payment_processor',
        'payment_processor_subscription_id',
    ];

    protected function casts(): array
    {
        return [
            'current_period_start' => 'datetime',
            'current_period_end' => 'datetime',
            'cancelled_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(SubscriptionPlan::class, 'subscription_plan_id');
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    public function isCanceled(): bool
    {
        return $this->status === 'canceled';
    }

    public function isPastDue(): bool
    {
        return $this->status === 'past_due';
    }

    public function isPeriodActive(): bool
    {
        if (!$this->isActive()) {
            return false;
        }

        if ($this->current_period_end instanceof Carbon) {
            return $this->current_period_end->isFuture();
        }

        return false;
    }

    public function cancel(): void
    {
        $this->update([
            'status' => 'canceled',
            'cancelled_at' => now(),
        ]);
    }

    public function reactivate(): void
    {
        $this->update([
            'status' => 'active',
            'cancelled_at' => null,
        ]);
    }
}