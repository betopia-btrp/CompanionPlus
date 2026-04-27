<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SessionNote extends Model
{
    protected $fillable = [
        'booking_id',
        'consultant_id',
        'notes',
        'private_notes',
    ];

    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class);
    }

    public function consultant(): BelongsTo
    {
        return $this->belongsTo(ConsultantProfile::class, 'consultant_id', 'user_id');
    }
}
