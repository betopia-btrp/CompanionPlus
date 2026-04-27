<?php

namespace App\Policies;

use App\Models\User;

class SubscriptionPolicy
{
    public function aiExercises(User $user): bool
    {
        return $user->activeSubscription()->exists()
            && ($user->subscriptionPlan?->getFeature('ai_exercise_personalization') ?? false);
    }

    public function aiRecommendations(User $user): bool
    {
        return $user->activeSubscription()->exists()
            && ($user->subscriptionPlan?->getFeature('ai_consultant_recommendations') ?? false);
    }
}
