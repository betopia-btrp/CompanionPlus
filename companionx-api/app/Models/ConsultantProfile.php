<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ConsultantProfile extends Model
{
    protected $fillable = ['user_id', 'specialization', 'bio', 'base_rate_bdt', 'is_approved', 'average_rating'];

    // THIS IS THE MISSING PIECE
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}