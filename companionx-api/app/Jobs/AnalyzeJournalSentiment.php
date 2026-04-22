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

    // Reliability settings
    public int $tries = 3;
    public int $timeout = 120;

    public function __construct(protected MoodJournal $journal)
    {
        //
    }

    public function handle(GeminiService $gemini): void
    {
        // 1. Double check if record exists and has text
        if (!$this->journal->exists || empty($this->journal->text_note)) {
            return;
        }

        $systemPrompt = "You are a Psychiatric Sentiment Analyzer. 
        Return ONLY a JSON object with:
        'sentiment_score': float (0.0 to 1.0)
        'is_at_risk': boolean (true if self-harm/suicide detected)";

        $userPrompt = "Journal Entry: " . $this->journal->text_note;

        try {
            // 2. Call Gemini
            $result = $gemini->generate($systemPrompt, $userPrompt);

            // 3. Debug Logging (Check your laravel.log to see this!)
            if (!$result) {
                Log::error("Sentiment Analysis: Gemini returned NULL for Journal ID: " . $this->journal->id);
                return;
            }

            Log::info("Sentiment Analysis: AI Response for Journal " . $this->journal->id, $result);

            // 4. Update with Data Validation (Handles cases where keys are missing)
            $this->journal->update([
                'sentiment_score' => $result['sentiment_score'] ?? 0.5,
                'is_at_risk' => (bool) ($result['is_at_risk'] ?? false),
            ]);

            // 5. Trigger Safety Protocol
            if ($this->journal->is_at_risk) {
                $this->triggerSafetyAlert();
            }

        } catch (\Exception $e) {
            Log::error("Sentiment Analysis Job failed: " . $e->getMessage());
            $this->fail($e);
        }
    }

    private function triggerSafetyAlert()
    {
        try {
            // Ensure record isn't duplicated for same entry
            SafetyAlert::updateOrCreate(
                ['journal_id' => $this->journal->id],
                [
                    'patient_id' => $this->journal->user_id,
                    'status' => 'new',
                    'severity' => 'critical',
                    'created_at' => now(),
                ]
            );

            Log::warning("CRITICAL SAFETY ALERT CREATED for User: " . $this->journal->user_id);
        } catch (\Exception $e) {
            Log::error("Failed to create SafetyAlert: " . $e->getMessage());
        }
    }
}