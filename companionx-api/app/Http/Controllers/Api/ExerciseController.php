<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ExercisePlan;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class ExerciseController extends Controller
{
    public function index(Request $request)
    {
        try {
            $user = $request->user();

            $plan = ExercisePlan::where('user_id', $user->id)
                ->where('origin', 'ai')
                ->latest()
                ->first();

            if (!$plan) {
                return response()->json([], 200);
            }

            return response()->json($plan->content_json);
        } catch (\Exception $e) {
            Log::error("ExerciseController Error: " . $e->getMessage());
            return response()->json([
                'message' => 'Failed to fetch mental exercises',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function refresh(Request $request)
    {
        try {
            $exerciseService = new \App\Services\ExerciseService();
            $user = $request->user();

            $exerciseService->generateAdaptiveExercises($user->id);

            $plan = ExercisePlan::where('user_id', $user->id)
                ->where('origin', 'ai')
                ->latest()
                ->first();

            return response()->json([
                'message' => 'AI has updated your exercises.',
                'data' => $plan ? $plan->content_json : [],
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => 'AI refresh failed'], 500);
        }
    }
}
