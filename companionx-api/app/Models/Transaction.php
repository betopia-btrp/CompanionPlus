<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Transaction extends Model
{
    protected $fillable = [
        'booking_id',
        'user_id',
        'type',
        'status',
        'stripe_reference_id',
        'total_amount',
        'platform_fee',
        'consultant_net',
        'currency',
    ];

    protected function casts(): array
    {
        return [
            'total_amount' => 'float',
            'platform_fee' => 'float',
            'consultant_net' => 'float',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
