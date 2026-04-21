<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AiRecommendation;
use App\Models\ConsultantProfile;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function getRecommendations(Request $request)
    {
        $userId = $request->user()->id;

        // 1. Get the latest AI recommendation for this user
        $recommendation = AiRecommendation::where('user_id', $userId)
            ->where('rec_type', 'consultant_match')
            ->latest()
            ->first();

        if (!$recommendation) {
            return response()->json(['message' => 'No recommendations yet'], 404);
        }

        // 2. Extract the IDs and the reasons from the JSON
        $recData = $recommendation->content_json; // e.g. [{"id": 1, "reason": "..."}, ...]
        
        $ids = collect($recData)->pluck('id');

        // 3. Fetch the full consultant profiles
        $consultants = ConsultantProfile::whereIn('id', $ids)
            ->with('user:id,first_name,last_name')
            ->get();

        // 4. Merge the AI "Reason" into the consultant object
        $result = $consultants->map(function ($consultant) use ($recData) {
            $aiInfo = collect($recData)->firstWhere('id', $consultant->id);
            $consultant->match_reason = $aiInfo['reason'] ?? 'Highly compatible with your profile.';
            return $consultant;
        });

        return response()->json($result);
    }
}