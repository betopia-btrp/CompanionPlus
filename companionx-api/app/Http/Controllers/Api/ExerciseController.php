<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AiRecommendation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class ExerciseController extends Controller
{
    /**
     * Display a listing of the AI-generated exercises for the authenticated patient.
     */
    public function index(Request $request)
    {
        try {
            $user = $request->user();

            // Fetch the latest 'exercise' record from the ai_recommendations table
            $recommendation = AiRecommendation::where('user_id', $user->id)
                ->where('rec_type', 'exercise')
                ->latest()
                ->first();

            // If no exercises found, return an empty array
            if (!$recommendation) {
                return response()->json([], 200);
            }

            /**
             * Note: content_json is automatically cast to an array 
             * because we added the cast in the AiRecommendation model.
             */
            return response()->json($recommendation->content_json);

        } catch (\Exception $e) {
            Log::error("ExerciseController Error: " . $e->getMessage());
            return response()->json([
                'message' => 'Failed to fetch mental exercises',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * (Optional) Force a manual refresh of exercises via AI
     */
    public function refresh(Request $request)
    {
        try {
            $exerciseService = new \App\Services\ExerciseService();
            $user = $request->user();
            
            // Re-generate based on recent journal history
            $exerciseService->generateAdaptiveExercises($user->id);

            $newRec = AiRecommendation::where('user_id', $user->id)
                ->where('rec_type', 'exercise')
                ->latest()
                ->first();

            return response()->json([
                'message' => 'AI has updated your exercises.',
                'data' => $newRec ? $newRec->content_json : []
            ]);

        } catch (\Exception $e) {
            return response()->json(['message' => 'AI refresh failed'], 500);
        }
    }
}