<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ExerciseProgress extends Model
{
    protected $table = 'exercise_progress';

    protected $fillable = [
        'user_id',
        'recommendation_id',
        'completed_task_keys',
        'completed_chapter_keys',
        'completion_percentage',
        'review_feeling',
        'review_text',
        'earned_badge_code',
        'earned_badge_name',
        'earned_badge_at',
        'review_submitted_at',
        'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'completed_task_keys' => 'array',
            'completed_chapter_keys' => 'array',
            'completion_percentage' => 'integer',
            'earned_badge_at' => 'datetime',
            'review_submitted_at' => 'datetime',
            'completed_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function recommendation(): BelongsTo
    {
        return $this->belongsTo(AiRecommendation::class, 'recommendation_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
