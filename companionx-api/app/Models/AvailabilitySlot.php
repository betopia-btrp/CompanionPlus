<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Scope;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Carbon;

class AvailabilitySlot extends Model
{
    protected $fillable = [
        'consultant_id',
        'start_datetime',
        'end_datetime',
        'source_template_id',
        'deleted_at',
        'deletion_reason',
    ];

    protected $dates = [
        'deleted_at',
    ];

    protected function casts(): array
    {
        return [
            'start_datetime' => 'datetime',
            'end_datetime' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
            'deleted_at' => 'datetime',
        ];
    }

    /**
     * Get only non-deleted slots
     */
    public function scopeActive($query)
    {
        return $query->whereNull('deleted_at');
    }

    public function consultant(): BelongsTo
    {
        return $this->belongsTo(ConsultantProfile::class, 'consultant_id', 'user_id');
    }

    public function sourceTemplate(): BelongsTo
    {
        return $this->belongsTo(AvailabilityTemplate::class, 'source_template_id');
    }

    public function bookings(): HasMany
    {
        return $this->hasMany(Booking::class, 'slot_id');
    }

    public function activeBooking(): HasOne
    {
        return $this->hasOne(Booking::class, 'slot_id')
            ->whereIn('status', ['booked', 'pending', 'confirmed']);
    }

    /**
     * Check if slot has any confirmed bookings
     */
    public function hasConfirmedBookings(): bool
    {
        return $this->bookings()->where('status', 'confirmed')->exists();
    }

    /**
     * Check if slot has any pending bookings
     */
    public function hasPendingBookings(): bool
    {
        return $this->bookings()->where('status', 'pending')->exists();
    }

    /**
     * Get count of confirmed bookings
     */
    public function confirmedBookingsCount(): int
    {
        return $this->bookings()->where('status', 'confirmed')->count();
    }

    /**
     * Get count of pending bookings
     */
    public function pendingBookingsCount(): int
    {
        return $this->bookings()->where('status', 'pending')->count();
    }
}
