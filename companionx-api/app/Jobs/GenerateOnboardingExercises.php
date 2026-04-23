<?php

namespace App\Jobs;

use App\Models\AiRecommendation;
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
            $exercisePlan = $exerciseService->generateForOnboarding($this->userId);

            AiRecommendation::updateOrCreate(
                [
                    'user_id' => $this->userId,
                    'source_journal_id' => null,
                    'rec_type' => 'exercise',
                ],
                [
                    'content_json' => $exercisePlan,
                ]
            );
        } catch (\Throwable $exception) {
            Log::error('GenerateOnboardingExercises failed: ' . $exception->getMessage(), [
                'user_id' => $this->userId,
            ]);

            throw $exception;
        }
    }
}
