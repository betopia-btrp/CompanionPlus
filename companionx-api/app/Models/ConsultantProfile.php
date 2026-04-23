<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ConsultantProfile extends Model
{
    protected $table = 'consultant_profiles';

    protected $fillable = [
        'user_id', 
        'specialization', 
        'bio', 
        'base_rate_bdt', 
        'is_approved', 
        'average_rating'
    ];

    protected function casts(): array
    {
        return [
            'base_rate_bdt' => 'float',
            'is_approved' => 'boolean',
            'average_rating' => 'float',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function availabilitySlots(): HasMany
    {
        return $this->hasMany(AvailabilitySlot::class, 'consultant_id');
    }

    public function bookings(): HasMany
    {
        return $this->hasMany(Booking::class, 'consultant_id');
    }
}
