<?php

namespace App\Services;

use App\Models\OnboardingAnswer;
use App\Models\MoodJournal;
use App\Models\AiRecommendation;
use App\Services\GeminiService;
use Illuminate\Support\Facades\Log;

class ExerciseService
{
    public function generateInitialExercises($userId)
    {
        $answers = OnboardingAnswer::where('user_id', $userId)->get();
        if ($answers->isEmpty()) return null;

        $systemPrompt = "You are a Clinical Psychologist. Suggest 3 evidence-based mental health exercises in a RAW JSON array. No conversational text.";
        $userPrompt = "Patient Onboarding Data: " . $answers->toJson();

        return $this->process($userId, $systemPrompt, $userPrompt);
    }

    public function generateAdaptiveExercises($userId)
    {
        // 1. Get the 5 journals you mentioned
        $journals = MoodJournal::where('user_id', $userId)->latest()->take(5)->get();
        if ($journals->isEmpty()) return null;

        $systemPrompt = "You are an AI Mental Health Strategist. Analyze the trend of these 5 journals and provide 3 updated exercises in a JSON array. Each object must have: title, description, category, and why_now (explaining the trend).";
        $userPrompt = "User's Last 5 Mood Entries: " . $journals->toJson();

        return $this->process($userId, $systemPrompt, $userPrompt);
    }

    private function process($userId, $system, $user)
    {
        $gemini = new GeminiService();
        $result = $gemini->generate($system, $user);

        if ($result) {
            return AiRecommendation::updateOrCreate(
                ['user_id' => $userId, 'rec_type' => 'exercise'],
                ['content_json' => $result]
            );
        }
        
        Log::error("ExerciseService: Gemini returned null for user " . $userId);
        return null;
    }
}