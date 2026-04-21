<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OnboardingAnswer extends Model
{
    // These fields are allowed to be saved in the database
    protected $fillable = [
        'user_id',
        'question_key',
        'answer_text'
    ];

    /**
     * Relationship: An onboarding answer belongs to a user.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}