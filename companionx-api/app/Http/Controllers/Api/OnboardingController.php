<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\GenerateConsultantRecommendations;
use App\Models\OnboardingAnswer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class OnboardingController extends Controller
{
    public function store(Request $request)
    {
        try {
            $user = $request->user();
            $answers = $request->input('answers');

            if (!is_array($answers)) {
                $answers = $request->except(['answers']);
            }

            if (!is_array($answers) || empty($answers)) {
                return response()->json([
                    'error' => 'Invalid payload. Send either {"answers": {...}} or the answers object directly.',
                ], 422);
            }

            foreach ($answers as $key => $value) {
                OnboardingAnswer::updateOrCreate(
                    ['user_id' => $user->id, 'question_key' => $key],
                    ['answer_text' => is_array($value) ? json_encode($value) : (string) $value]
                );
            }

            $user->onboarding_completed = true;
            $user->save();

            GenerateConsultantRecommendations::dispatch($user->id);

            return response()->json(['message' => 'Onboarding successful', 'redirect' => '/dashboard']);
        } catch (\Throwable $e) {
            Log::error('Critical Onboarding Error: ' . $e->getMessage());

            return response()->json(['error' => 'Saving failed'], 500);
        }
    }
}