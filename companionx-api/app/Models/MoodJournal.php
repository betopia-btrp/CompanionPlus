<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class MoodJournal extends Model
{
    protected $table = 'mood_journal';

    protected $fillable = [
        'user_id',
        'emoji_mood',
        'text_note',
        'sentiment_score',
        'is_at_risk',
        'analysis_json',
    ];

    protected function casts(): array
    {
        return [
            'sentiment_score' => 'float',
            'is_at_risk' => 'boolean',
            'analysis_json' => 'array',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function safetyAlert(): HasOne
    {
        return $this->hasOne(SafetyAlert::class, 'journal_id');
    }
}
