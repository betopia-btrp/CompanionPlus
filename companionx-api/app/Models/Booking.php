<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

class Booking extends Model
{
    protected $fillable = [
        'patient_id',
        'consultant_id',
        'slot_id',
        'status',
        'jitsi_room_uuid',
        'price_at_booking',
        'scheduled_start',
        'scheduled_end',
        'stripe_session_id',
    ];

    protected function casts(): array
    {
        return [
            'price_at_booking' => 'float',
            'scheduled_start' => 'datetime',
            'scheduled_end' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function consultant(): BelongsTo
    {
        return $this->belongsTo(ConsultantProfile::class, 'consultant_id', 'user_id');
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(User::class, 'patient_id');
    }

    public function slot(): BelongsTo
    {
        return $this->belongsTo(AvailabilitySlot::class, 'slot_id');
    }

    public function transactions()
    {
        return $this->hasMany(Transaction::class);
    }

    private const HOLD_MINUTES = 15;

    public function hasActiveHold(): bool
    {
        return $this->status === 'booked'
            && $this->created_at instanceof Carbon
            && $this->created_at->addMinutes(self::HOLD_MINUTES)->isFuture();
    }

    public function holdExpiresAt(): Carbon
    {
        return $this->created_at->copy()->addMinutes(self::HOLD_MINUTES);
    }

    public function isHeldBy(?User $user): bool
    {
        return $this->hasActiveHold()
            && $user !== null
            && $this->patient_id === $user->id;
    }
}
