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
        try {
            // 1. Get User Answers
            $answers = OnboardingAnswer::where('user_id', $userId)->get(['question_key', 'answer_text']);
            
            // 2. Get Available Approved Consultants
            $consultants = ConsultantProfile::where('is_approved', true)
                ->with('user:id,first_name,last_name')
                ->get(['id', 'user_id', 'specialization', 'bio']);

            if ($consultants->isEmpty()) {
                Log::warning("MatchingService: No approved consultants found in DB.");
                return [];
            }

            // 3. Prepare the Prompt
            $prompt = "You are a professional Mental Health Matchmaker. 
            USER PROFILE: " . $answers->toJson() . "
            AVAILABLE CONSULTANTS: " . $consultants->toJson() . "
            
            TASK: Pick top 2 consultants.
            RETURN ONLY VALID RAW JSON ARRAY. No text, no markdown backticks.
            Format: [{\"id\": 1, \"reason\": \"...\"}, {\"id\": 2, \"reason\": \"...\"}]";

            // 4. Call OpenRouter with Timeout
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . env('OPENROUTER_API_KEY'),
                'Content-Type' => 'application/json',
            ])->timeout(30)->post('https://openrouter.ai/api/v1/chat/completions', [
                'model' => 'google/gemini-flash-1.5',
                'messages' => [
                    ['role' => 'system', 'content' => 'You are a technical assistant that outputs only pure JSON.'],
                    ['role' => 'user', 'content' => $prompt]
                ],
                'temperature' => 0.3
            ]);

            if ($response->failed()) {
                Log::error("OpenRouter API Call Failed: " . $response->body());
                return [];
            }

            $content = $response->json()['choices'][0]['message']['content'] ?? '';

            // 5. CLEAN THE JSON (Crucial: removes ```json ... ```)
            $cleanJson = preg_replace('/^```json|```$/m', '', $content);
            $decoded = json_decode(trim($cleanJson), true);

            return is_array($decoded) ? $decoded : [];

        } catch (\Exception $e) {
            Log::error("MatchingService Exception: " . $e->getMessage());
            return [];
        }
    }
}