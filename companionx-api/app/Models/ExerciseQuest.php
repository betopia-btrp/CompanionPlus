<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class ExerciseQuest extends Model
{
    protected $fillable = [
        'user_id',
        'origin',
        'template_id',
        'content_json',
        'status',
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
        return $this->hasOne(ExerciseProgress::class, 'exercise_quest_id');
    }
}
