<?php

namespace App\Jobs;

use App\Models\MoodJournal;
use App\Models\SafetyAlert;
use App\Services\SentimentAnalysisService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class AnalyzeJournalSentiment implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $timeout = 120;

    public function __construct(public readonly int $journalId)
    {
        $this->onQueue('default');
    }

    public function handle(SentimentAnalysisService $sentimentAnalysisService): void
    {
        $journal = MoodJournal::find($this->journalId);

        if (!$journal instanceof MoodJournal) {
            Log::warning('AnalyzeJournalSentiment: Journal not found.', ['journal_id' => $this->journalId]);

            return;
        }

        Log::info('AnalyzeJournalSentiment: Starting analysis.', [
            'journal_id' => $journal->id,
            'user_id' => $journal->user_id,
            'has_text' => filled($journal->text_note),
            'emoji_mood' => $journal->emoji_mood,
        ]);

        $analysis = $sentimentAnalysisService->analyze($journal);

        Log::info('AnalyzeJournalSentiment: Analysis complete.', [
            'journal_id' => $journal->id,
            'sentiment_score' => $analysis['sentiment_score'],
            'is_at_risk' => $analysis['is_at_risk'],
            'severity' => $analysis['severity'],
            'dominant_state' => $analysis['dominant_state'],
        ]);

        $journal->update([
            'sentiment_score' => $analysis['sentiment_score'],
            'is_at_risk' => $analysis['is_at_risk'],
            'analysis_json' => [
                'dominant_state' => $analysis['dominant_state'] ?? null,
                'emotional_shift' => $analysis['emotional_shift'] ?? null,
                'intensity' => $analysis['intensity'] ?? null,
                'recommended_focus' => $analysis['recommended_focus'] ?? null,
                'supportive_insight' => $analysis['supportive_insight'] ?? null,
                'severity' => $analysis['severity'] ?? null,
                'risk_summary' => $analysis['risk_summary'] ?? null,
            ],
        ]);

        if (($analysis['is_at_risk'] ?? false) === true) {
            Log::warning('AnalyzeJournalSentiment: SAFETY ALERT triggered.', [
                'journal_id' => $journal->id,
                'user_id' => $journal->user_id,
                'severity' => $analysis['severity'],
                'risk_summary' => $analysis['risk_summary'],
            ]);

            SafetyAlert::updateOrCreate(
                ['journal_id' => $journal->id],
                [
                    'patient_id' => $journal->user_id,
                    'status' => 'new',
                    'severity' => $analysis['severity'] ?? 'high',
                ]
            );
        }
    }
}
