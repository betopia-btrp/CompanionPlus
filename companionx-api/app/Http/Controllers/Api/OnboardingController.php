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

        // 1. Save all 10 answers (This is the most important part)
        foreach ($request->answers as $key => $value) {
            \App\Models\OnboardingAnswer::updateOrCreate(
                ['user_id' => $user->id, 'question_key' => $key],
                ['answer_text' => is_array($value) ? json_encode($value) : (string)$value]
            );
        }

        // 2. Mark user as finished
        $user->onboarding_completed = true;
        $user->save();

        // 3. TRY AI Matching & Exercises (But don't crash if it fails)
        try {
            // Run Consultant Matching
            $matchingService = new \App\Services\MatchingService();
            $recs = $matchingService->getRecommendedConsultants($user->id);
            if (!empty($recs)) {
                \App\Models\AiRecommendation::create([
                    'user_id' => $user->id,
                    'rec_type' => 'consultant_match',
                    'content_json' => $recs
                ]);
            }

            // Run Initial Exercises
            $exerciseService = new \App\Services\ExerciseService();
            $exerciseService->generateInitialExercises($user->id);

        } catch (\Exception $aiError) {
            // If AI fails, we just log it. The user doesn't see an error.
            \Log::error("Onboarding AI background tasks failed: " . $aiError->getMessage());
        }

        return response()->json([
            'message' => 'Onboarding successful',
            'onboarding_completed' => true
        ], 200);

    } catch (\Exception $e) {
        \Log::error("CRITICAL Onboarding Save Error: " . $e->getMessage());
        return response()->json(['message' => 'Server Error: ' . $e->getMessage()], 500);
    }
}
}