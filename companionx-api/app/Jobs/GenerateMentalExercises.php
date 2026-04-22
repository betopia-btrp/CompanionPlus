<?php

namespace App\Jobs;

use App\Models\AiRecommendation;
use App\Models\MoodJournal;
use App\Services\GeminiService;
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

    public function __construct(protected MoodJournal $journal) {}

    public function handle(GeminiService $gemini): void
    {
        try {
            $systemPrompt = "You are a professional AI Therapist. Based on the user's mood and journal note, generate a 3-chapter mental exercise guide.";
            
            $userPrompt = "Mood: {$this->journal->emoji_mood}. Note: '{$this->journal->text_note}'. 
            Provide exactly 3 chapters: 
            Chapter 1: Immediate Grounding (Short term), 
            Chapter 2: Deep Reflection (Emotional work), 
            Chapter 3: Actionable Step (Task for today).
            Return ONLY a raw JSON array of objects with keys 'chapter_title', 'content', and 'estimated_time'.";

            $result = $gemini->generate($systemPrompt, $userPrompt);

            if (!empty($result)) {
                AiRecommendation::updateOrCreate(
                    [
                        'user_id' => $this->journal->user_id,
                        'rec_type' => 'exercise',
                    ],
                    [
                        'source_journal_id' => $this->journal->id,
                        'content_json' => $result,
                    ]
                );
            }
        } catch (\Throwable $e) {
            Log::error('GenerateMentalExercises failed: ' . $e->getMessage());
            throw $e;
        }
    }
}