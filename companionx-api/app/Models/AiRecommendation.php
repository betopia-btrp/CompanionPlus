<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AiRecommendation extends Model
{
    // You MUST have this array:
    protected $fillable = [
        'user_id', 
        'source_journal_id', 
        'rec_type', 
        'content_json'
    ];

    // You MUST have this cast:
    protected $casts = [
        'content_json' => 'array',
    ];
}