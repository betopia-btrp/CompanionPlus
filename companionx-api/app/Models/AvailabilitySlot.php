<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Carbon;

class AvailabilitySlot extends Model
{
    protected $fillable = [
        'consultant_id',
        'start_datetime',
        'end_datetime',
        'is_booked',
        'held_by_user_id',
        'hold_expires_at',
        'version',
    ];

    protected function casts(): array
    {
        return [
            'start_datetime' => 'datetime',
            'end_datetime' => 'datetime',
            'is_booked' => 'boolean',
            'hold_expires_at' => 'datetime',
            'version' => 'integer',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function consultant(): BelongsTo
    {
        return $this->belongsTo(ConsultantProfile::class, 'consultant_id');
    }

    public function booking(): HasOne
    {
        return $this->hasOne(Booking::class, 'slot_id');
    }

    public function heldByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'held_by_user_id');
    }

    public function hasActiveHold(): bool
    {
        return $this->held_by_user_id !== null
            && $this->hold_expires_at instanceof Carbon
            && $this->hold_expires_at->isFuture();
    }
}
