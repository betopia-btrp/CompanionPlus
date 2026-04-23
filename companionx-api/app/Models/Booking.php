<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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
        return $this->belongsTo(ConsultantProfile::class, 'consultant_id');
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(User::class, 'patient_id');
    }

    public function slot(): BelongsTo
    {
        return $this->belongsTo(AvailabilitySlot::class, 'slot_id');
    }
}
