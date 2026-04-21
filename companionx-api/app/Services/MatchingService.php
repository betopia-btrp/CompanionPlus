<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use App\Models\OnboardingAnswer;
use App\Models\ConsultantProfile;

class MatchingService
{
    public function getRecommendedConsultants($userId)
    {
        // 1. Get User Answers
        $answers = OnboardingAnswer::where('user_id', $userId)->get(['question_key', 'answer_text']);
        
        // 2. Get Available Approved Consultants
        // We only send IDs, specializations, and bios to save tokens
        $consultants = ConsultantProfile::where('is_approved', true)
            ->with('user:id,first_name,last_name')
            ->get(['id', 'user_id', 'specialization', 'bio']);

        // 3. Prepare the Prompt
        $prompt = "You are a professional Mental Health Matchmaker. 
        USER PROFILE: " . $answers->toJson() . "
        AVAILABLE CONSULTANTS: " . $consultants->toJson() . "
        
        TASK:
        1. Analyze the user's primary concern and preferred style.
        2. Select the top 2 consultants who are the best match.
        3. Provide a brief 1-sentence reason why for each.
        
        RETURN ONLY VALID JSON in this format:
        [
          {\"id\": 1, \"reason\": \"...\"},
          {\"id\": 2, \"reason\": \"...\"}
        ]";

        // 4. Call OpenRouter
        $response = Http::withHeaders([
            'Authorization' => 'Bearer ' . env('OPENROUTER_API_KEY'),
            'Content-Type' => 'application/json',
        ])->post('https://openrouter.ai/api/v1/chat/completions', [
            'model' => 'google/gemini-flash-1.5', // Fast and cheap
            'messages' => [
                ['role' => 'system', 'content' => 'You are a helpful medical assistant.'],
                ['role' => 'user', 'content' => $prompt]
            ]
        ]);

        return json_decode($response->json()['choices'][0]['message']['content'], true);
    }
}