<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\OnboardingAnswer;
use App\Models\AiRecommendation;  // <--- IS THIS HERE?
use App\Services\MatchingService; // <--- IS THIS HERE?
use Illuminate\Http\Request;;

class OnboardingController extends Controller
{
   public function store(Request $request)
{
    try {
        $request->validate(['answers' => 'required|array']);
        $user = $request->user();

        // 1. Always save the answers first (This part works)
        foreach ($request->answers as $key => $value) {
            \App\Models\OnboardingAnswer::updateOrCreate(
                ['user_id' => $user->id, 'question_key' => $key],
                ['answer_text' => is_array($value) ? json_encode($value) : (string)$value]
            );
        }

        $user->onboarding_completed = true;
        $user->save();

        // 2. Try the AI matching but DON'T let it crash the request
        try {
            $matchingService = new \App\Services\MatchingService();
            $recommendations = $matchingService->getRecommendedConsultants($user->id);

            if (!empty($recommendations)) {
                \App\Models\AiRecommendation::create([
                    'user_id' => $user->id,
                    'rec_type' => 'consultant_match',
                    'content_json' => $recommendations
                ]);
            }
        } catch (\Exception $aiError) {
            // Log the error so we can fix it later, but keep the request alive!
            \Log::error("AI Matching failed: " . $aiError->getMessage());
        }

        // 3. Always return success so CORS works
        return response()->json(['message' => 'Onboarding successful', 'redirect' => '/dashboard']);

    } catch (\Exception $e) {
        \Log::error("Critical Onboarding Error: " . $e->getMessage());
        return response()->json(['error' => 'Saving failed'], 500);
    }

    }
}