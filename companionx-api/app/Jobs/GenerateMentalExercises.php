<?php

namespace App\Jobs;

use App\Models\ExercisePlan;
use App\Models\MoodJournal;
use App\Services\ExerciseService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class GenerateMentalExercises implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $timeout = 120;

    private const THROTTLE_HOURS = 4;

    public function __construct(public readonly int $journalId)
    {
        $this->onQueue('default');
    }

    public function handle(ExerciseService $exerciseService): void
    {
        $journal = MoodJournal::find($this->journalId);

        if (!$journal instanceof MoodJournal) {
            Log::warning('GenerateMentalExercises: Journal not found.', ['journal_id' => $this->journalId]);
            return;
        }

        $user = $journal->user;

        if (!$user || !$user->canAccessAiExercises()) {
            return;
        }

        $latestPlan = ExercisePlan::where('user_id', $journal->user_id)
            ->where('origin', 'ai')
            ->latest()
            ->first();

        if ($latestPlan && $latestPlan->created_at->diffInHours(now()) < self::THROTTLE_HOURS) {
            Log::info('GenerateMentalExercises: Skipping, throttled.', [
                'user_id' => $journal->user_id,
                'last_generated' => $latestPlan->created_at->toIso8601String(),
            ]);
            return;
        }

        $exercisePlan = $exerciseService->generateForJournal($journal);
        $title = data_get($exercisePlan, 'journey.headline', 'Daily Recovery Quest');

        ExercisePlan::create([
            'user_id' => $journal->user_id,
            'origin' => 'ai',
            'title' => $title,
            'description' => data_get($exercisePlan, 'journey.motivation', ''),
            'estimated_time' => null,
            'content_json' => $exercisePlan,
        ]);
    }
}
