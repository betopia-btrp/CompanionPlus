<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AvailabilityTemplate extends Model
{
    protected $fillable = [
        'consultant_id',
        'day_of_week',
        'start_time',
        'end_time',
    ];

    protected function casts(): array
    {
        return [
            'day_of_week' => 'integer',
            'start_time' => 'datetime:H:i',
            'end_time' => 'datetime:H:i',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function consultant(): BelongsTo
    {
        return $this->belongsTo(ConsultantProfile::class, 'consultant_id', 'user_id');
    }

    public function generatedSlots(): HasMany
    {
        return $this->hasMany(AvailabilitySlot::class, 'source_template_id');
    }
}
