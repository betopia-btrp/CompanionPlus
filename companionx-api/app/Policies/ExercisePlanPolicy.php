<?php

namespace App\Policies;

use App\Models\ExercisePlan;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class ExercisePlanPolicy
{
    use HandlesAuthorization;

    public function before(User $user, string $ability): bool|null
    {
        if ($user->system_role === 'admin') {
            return true;
        }

        return null;
    }

    public function view(User $user, ExercisePlan $plan): bool
    {
        if ($plan->user_id === null && $plan->origin === 'template') {
            return true;
        }

        if ($plan->user_id === $user->id && $plan->origin === 'ai') {
            return true;
        }

        return false;
    }

    public function track(User $user, ExercisePlan $plan): bool
    {
        if ($plan->user_id === null && $plan->origin === 'template') {
            return true;
        }

        if ($plan->user_id === $user->id && $plan->origin === 'ai') {
            return $user->activeSubscription()->exists()
                && ($user->subscriptionPlan?->getFeature('ai_exercise_personalization') ?? false);
        }

        return false;
    }
}
