<?php

namespace App\Jobs;

use App\Models\MoodJournal;
use App\Models\SafetyAlert;
use App\Services\GeminiService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class AnalyzeJournalSentiment implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Create a new job instance.
     */
    public function __construct(protected MoodJournal $journal)
    {
        //
    }

    /**
     * Execute the job.
     */
    public function handle(GeminiService $gemini): void
    {
        // Don't process if there is no text
        if (empty($this->journal->text_note)) {
            return;
        }

        $systemPrompt = "You are a specialized Psychiatric Sentiment Analyzer. Analyze the provided journal entry for emotional state and safety risks. 
        Return ONLY a JSON object with:
        1. 'sentiment_score': a float between 0.0 (extremely negative/distressed) and 1.0 (extremely positive/joyful).
        2. 'is_at_risk': a boolean. Set to TRUE only if the text indicates self-harm, suicidal ideation, or immediate danger to self/others.";

        $userPrompt = "Journal Entry to analyze: " . $this->journal->text_note;

        try {
            // Call Gemini (using the 2-argument fix)
            $result = $gemini->generate($systemPrompt, $userPrompt);

            if ($result) {
                // Update the journal record
                $this->journal->update([
                    'sentiment_score' => $result['sentiment_score'] ?? 0.5,
                    'is_at_risk' => $result['is_at_risk'] ?? false,
                ]);

                // SAFETY PROTOCOL: If the AI detects risk, create a Safety Alert
                if ($this->journal->is_at_risk) {
                    $this->triggerSafetyAlert();
                }
            }
        } catch (\Exception $e) {
            Log::error("Sentiment Analysis Job failed for Journal ID {$this->journal->id}: " . $e->getMessage());
        }
    }

    /**
     * Internal method to trigger safety protocol
     */
    private function triggerSafetyAlert()
    {
        try {
            SafetyAlert::create([
                'journal_id' => $this->journal->id,
                'patient_id' => $this->journal->user_id,
                'status' => 'new',
                'severity' => 'critical'
            ]);

            // Note: In a real app, you would also trigger an immediate Email/SMS to the Admin here.
            Log::warning("CRITICAL SAFETY ALERT: User ID {$this->journal->user_id} flagged for risk in journal entry.");
        } catch (\Exception $e) {
            Log::error("Failed to create SafetyAlert record: " . $e->getMessage());
        }
    }
}