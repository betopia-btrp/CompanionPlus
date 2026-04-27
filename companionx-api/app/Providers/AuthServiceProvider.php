<?php

namespace App\Providers;

use App\Models\ConsultantProfile;
use App\Models\ExercisePlan;
use App\Models\User;
use App\Policies\ConsultantBookingPolicy;
use App\Policies\ExercisePlanPolicy;
use App\Policies\SubscriptionPolicy;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;

class AuthServiceProvider extends ServiceProvider
{
    protected $policies = [
        ExercisePlan::class => ExercisePlanPolicy::class,
        User::class => SubscriptionPolicy::class,
        ConsultantProfile::class => ConsultantBookingPolicy::class,
    ];

    public function boot(): void
    {
        $this->registerPolicies();
    }
}
