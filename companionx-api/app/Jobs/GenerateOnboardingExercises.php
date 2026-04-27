<?php

namespace App\Jobs;

use App\Models\ExercisePlan;
use App\Services\ExerciseService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class GenerateOnboardingExercises implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $timeout = 120;

    public function __construct(public readonly int $userId)
    {
        $this->onQueue('default');
    }

    public function handle(ExerciseService $exerciseService): void
    {
        try {
            $user = \App\Models\User::find($this->userId);

            if (!$user || !$user->canAccessAiExercises()) {
                return;
            }

            $exercisePlan = $exerciseService->generateForOnboarding($this->userId);
            $title = data_get($exercisePlan, 'journey.headline', 'Grounded Start Quest');

            ExercisePlan::create([
                'user_id' => $this->userId,
                'origin' => 'ai',
                'title' => $title,
                'description' => data_get($exercisePlan, 'journey.motivation', ''),
                'estimated_time' => null,
                'content_json' => $exercisePlan,
            ]);
        } catch (\Throwable $exception) {
            Log::error('GenerateOnboardingExercises failed: ' . $exception->getMessage(), [
                'user_id' => $this->userId,
            ]);
            throw $exception;
        }
    }
}
