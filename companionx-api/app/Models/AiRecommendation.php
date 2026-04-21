<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use App\Models\OnboardingAnswer;
use App\Models\ConsultantProfile;
use Illuminate\Support\Facades\Log;

class MatchingService
{
    public function getRecommendedConsultants($userId)
    {
        // 1. Get User Onboarding Answers
        $answers = OnboardingAnswer::where('user_id', $userId)->get(['question_key', 'answer_text']);
        
        // 2. Get Available Approved Consultants
        $consultants = ConsultantProfile::where('is_approved', true)
            ->with('user:id,first_name,last_name')
            ->get(['id', 'specialization', 'bio']);

        // Check if we even have consultants to recommend
        if ($consultants->isEmpty()) {
            return [];
        }

        // 3. Prepare a very strict prompt to ensure valid JSON
        $prompt = "You are a professional Mental Health Matchmaker. 
        USER PROFILE: " . $answers->toJson() . "
        AVAILABLE CONSULTANTS: " . $consultants->toJson() . "
        
        TASK:
        1. Select the top 2 consultants who best match the user's concerns and preferred style.
        2. Provide a brief 1-sentence reason for each match.
        
        IMPORTANT: Return ONLY a raw JSON array. No markdown, no backticks, no text before or after.
        Format: [{\"id\": 1, \"reason\": \"Explanation\"}, {\"id\": 2, \"reason\": \"Explanation\"}]";

        try {
            // 4. Call OpenRouter
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . env('OPENROUTER_API_KEY'),
                'Content-Type' => 'application/json',
                'HTTP-Referer' => 'http://localhost:3000', // Required by some OpenRouter models
            ])->timeout(30)->post('https://openrouter.ai/api/v1/chat/completions', [
                'model' => 'google/gemini-flash-1.5',
                'messages' => [
                    ['role' => 'system', 'content' => 'You are a technical assistant that outputs only pure JSON.'],
                    ['role' => 'user', 'content' => $prompt]
                ],
                'temperature' => 0.3, // Lower temperature for more consistent JSON
            ]);

            if ($response->failed()) {
                Log::error("OpenRouter API Failed: " . $response->body());
                return [];
            }

            $content = $response->json()['choices'][0]['message']['content'];

            // 5. Clean the response (Remove AI markdown backticks if present)
            $cleanJson = preg_replace('/^```json|```$/m', '', $content);
            $decoded = json_decode(trim($cleanJson), true);

            // Return the array of {id, reason}
            return is_array($decoded) ? $decoded : [];

        } catch (\Exception $e) {
            Log::error("MatchingService Error: " . $e->getMessage());
            return [];
        }
    }
}