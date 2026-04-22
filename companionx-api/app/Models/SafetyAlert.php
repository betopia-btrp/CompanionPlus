<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SafetyAlert extends Model
{
    protected $fillable = [
    'journal_id',
    'patient_id',
    'status',
    'severity',
    'admin_id',
    'resolved_at'
];
}
