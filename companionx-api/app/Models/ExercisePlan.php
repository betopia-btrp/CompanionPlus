<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class ExercisePlan extends Model
{
    protected $fillable = [
        'user_id',
        'origin',
        'title',
        'description',
        'estimated_time',
        'content_json',
    ];

    protected function casts(): array
    {
        return [
            'content_json' => 'array',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function progress(): HasOne
    {
        return $this->hasOne(ExerciseProgress::class, 'exercise_plan_id');
    }
}
