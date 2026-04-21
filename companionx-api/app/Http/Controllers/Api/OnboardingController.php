<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\OnboardingAnswer;
use App\Models\AiRecommendation; // Import this
use App\Models\User;
use App\Services\MatchingService; // Import the service
use Illuminate\Http\Request;

class OnboardingController extends Controller
{
    public function store(Request $request)
    {
        $request->validate([
            'answers' => 'required|array'
        ]);

        $userId = $request->user()->id;

        // 1. Save the 10 answers
        foreach ($request->answers as $key => $value) {
            OnboardingAnswer::create([
                'user_id' => $userId,
                'question_key' => $key,
                'answer_text' => is_array($value) ? json_encode($value) : (string)$value 
            ]);
        }

        // 2. Mark onboarding as completed
        $user = $request->user();
        $user->onboarding_completed = true;
        $user->save();

        // 3. Trigger the Smart AI Matching
        try {
            $matchingService = new MatchingService();
            $recommendations = $matchingService->getRecommendedConsultants($userId);

            // Save the result to the DB
            AiRecommendation::create([
                'user_id' => $userId,
                'rec_type' => 'consultant_match',
                'content_json' => $recommendations
            ]);

            return response()->json([
                'message' => 'Onboarding successful and AI matches found',
                'recommendations' => $recommendations
            ]);

        } catch (\Exception $e) {
            // Even if AI fails, onboarding is still "saved"
            return response()->json([
                'message' => 'Onboarding saved, but AI matching delayed.',
                'error' => $e->getMessage()
            ]);
        }
    }
}