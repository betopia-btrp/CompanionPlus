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

class GenerateMentalExercises implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $timeout = 120;

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

        $exercisePlan = $exerciseService->generateForJournal($journal);

        AiRecommendation::updateOrCreate(
            [
                'user_id' => $journal->user_id,
                'source_journal_id' => $journal->id,
                'rec_type' => 'exercise',
            ],
            [
                'content_json' => $exercisePlan,
            ]
        );
    }
}
