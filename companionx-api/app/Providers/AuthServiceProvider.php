<?php

namespace App\Providers;

use App\Models\ExercisePlan;
use App\Models\User;
use App\Policies\ExercisePlanPolicy;
use App\Policies\SubscriptionPolicy;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;

class AuthServiceProvider extends ServiceProvider
{
    protected $policies = [
        ExercisePlan::class => ExercisePlanPolicy::class,
        User::class => SubscriptionPolicy::class,
    ];

    public function boot(): void
    {
        $this->registerPolicies();
    }
}
