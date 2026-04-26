<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'first_name',
        'last_name',
        'email',
        'password',
        'phone',
        'dob',
        'gender',
        'guardian_contact',
        'system_role',
        'onboarding_completed',
        'stripe_customer_id',
        'subscription_plan_id',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'onboarding_completed' => 'boolean',
        ];
    }

    public function consultantProfile(): HasOne
    {
        return $this->hasOne(ConsultantProfile::class);
    }

    public function subscriptionPlan(): BelongsTo
    {
        return $this->belongsTo(SubscriptionPlan::class);
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class);
    }

    public function activeSubscription(): HasOne
    {
        return $this->hasOne(Subscription::class)->where('status', 'active');
    }

    public function isOnFreePlan(): bool
    {
        return !$this->activeSubscription()->exists()
            || $this->subscriptionPlan === null
            || $this->subscriptionPlan->price == 0;
    }

    public function canAccessAiRecommendations(): bool
    {
        return $this->activeSubscription()->exists()
            && ($this->subscriptionPlan?->getFeature('ai_consultant_recommendations') ?? false);
    }

    public function canAccessAiExercises(): bool
    {
        return $this->activeSubscription()->exists()
            && ($this->subscriptionPlan?->getFeature('ai_exercise_personalization') ?? false);
    }
}
