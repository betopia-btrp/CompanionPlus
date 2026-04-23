<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasOne;

class AiRecommendation extends Model
{
    protected $fillable = [
        'user_id',
        'source_journal_id',
        'rec_type',
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

    public function exerciseProgress(): HasOne
    {
        return $this->hasOne(ExerciseProgress::class, 'recommendation_id');
    }
}
