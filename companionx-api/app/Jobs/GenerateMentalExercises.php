<?php

namespace App\Jobs;

use App\Models\AiRecommendation;
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

        // Throttle: skip if exercise was generated less than THROTTLE_HOURS ago
        $latestExercise = AiRecommendation::where('user_id', $journal->user_id)
            ->where('rec_type', 'exercise')
            ->latest()
            ->first();

        if ($latestExercise && $latestExercise->created_at->diffInHours(now()) < self::THROTTLE_HOURS) {
            Log::info('GenerateMentalExercises: Skipping, throttled.', [
                'user_id' => $journal->user_id,
                'last_generated' => $latestExercise->created_at->toIso8601String(),
            ]);

            return;
        }

        Log::info('GenerateMentalExercises: Starting.', [
            'journal_id' => $journal->id,
            'user_id' => $journal->user_id,
        ]);

        $exercisePlan = $exerciseService->generateForJournal($journal);

        Log::info('GenerateMentalExercises: Plan generated, saving.', [
            'user_id' => $journal->user_id,
            'has_chapters' => count(data_get($exercisePlan, 'chapters', [])),
            'phase' => data_get($exercisePlan, 'phase'),
        ]);

        // One exercise plan per user, overwritten each time
        AiRecommendation::updateOrCreate(
            [
                'user_id' => $journal->user_id,
                'rec_type' => 'exercise',
            ],
            [
                'source_journal_id' => $journal->id,
                'content_json' => $exercisePlan,
            ]
        );
    }
}
