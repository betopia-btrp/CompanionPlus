<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MoodJournal extends Model
{
    protected $table = 'mood_journal'; // Explicitly set table name

    protected $fillable = [
    'user_id',
    'emoji_mood',
    'text_note',
    'sentiment_score', // MUST BE HERE
    'is_at_risk'       // MUST BE HERE
];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}