<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ConsultantProfile;
use App\Models\AiRecommendation; // Added import
use Illuminate\Http\Request;

class ConsultantController extends Controller
{
    public function index(Request $request)
    {
        try {
            $user = $request->user();

            // --- 1. FETCH MANUAL SEARCH RESULTS ---
            $query = ConsultantProfile::where('is_approved', true)->with('user');

            if ($request->filled('specialization')) {
                $query->where('specialization', 'like', '%' . $request->specialization . '%');
            }

            if ($request->filled('max_rate')) {
                $query->where('base_rate_bdt', '<=', $request->max_rate);
            }

            $allConsultants = $query->orderBy('average_rating', 'desc')->get();


            // --- 2. FETCH AI CONSULTANT MATCHES ---
            $aiMatchRecord = AiRecommendation::where('user_id', $user->id)
                ->where('rec_type', 'consultant_match')
                ->latest()
                ->first();

            $recommendedConsultants = [];
            if ($aiMatchRecord && is_array($aiMatchRecord->content_json)) {
                $recData = $aiMatchRecord->content_json;
                $ids = collect($recData)->pluck('id');

                // Fetch full profiles for the IDs recommended by AI
                $profiles = ConsultantProfile::whereIn('id', $ids)->with('user')->get();

                // Attach the "reason" provided by AI to each profile
                $recommendedConsultants = $profiles->map(function ($profile) use ($recData) {
                    $matchInfo = collect($recData)->firstWhere('id', $profile->id);
                    $profile->match_reason = $matchInfo['reason'] ?? 'Highly compatible with your profile.';
                    return $profile;
                });
            }


            // --- 3. FETCH AI MENTAL EXERCISE CHAPTERS ---
            $exerciseRecord = AiRecommendation::where('user_id', $user->id)
                ->where('rec_type', 'exercise')
                ->latest()
                ->first();

            $chapters = $exerciseRecord ? $exerciseRecord->content_json : null;


            // --- 4. RETURN COMBINED DATA ---
            return response()->json([
                'consultants' => $allConsultants, // For manual browsing
                'ai_data' => [
                    'recommended_consultants' => $recommendedConsultants, // For "AI Match" section
                    'chapters' => $chapters // For "Mental Lab" section
                ]
            ]);

        } catch (\Throwable $e) {
            return response()->json([
                'error' => 'Backend Error',
                'message' => $e->getMessage()
            ], 500);
        }
    }
}