<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ConsultantSchedulingService;
use Illuminate\Http\Request;

class ConsultantDashboardController extends Controller
{
    public function show(Request $request, ConsultantSchedulingService $consultantSchedulingService)
    {
        return response()->json(
            $consultantSchedulingService->buildDashboardPayload($request->user())
        );
    }

    public function updateProfile(Request $request, ConsultantSchedulingService $consultantSchedulingService)
    {
        $validated = $request->validate([
            'specialization' => 'required|string|max:255',
            'bio' => 'nullable|string|max:2000',
            'base_rate_bdt' => 'required|numeric|min:0|max:50000',
        ]);

        $profile = $consultantSchedulingService->updateProfile($request->user(), $validated);

        return response()->json([
            'message' => 'Consultant profile updated.',
            'consultant' => [
                'id' => $profile->id,
                'specialization' => $profile->specialization,
                'bio' => $profile->bio,
                'base_rate_bdt' => $profile->base_rate_bdt,
                'is_approved' => $profile->is_approved,
                'average_rating' => $profile->average_rating,
            ],
        ]);
    }

    public function storeSlot(Request $request, ConsultantSchedulingService $consultantSchedulingService)
    {
        $validated = $request->validate([
            'start_datetime' => 'required|date|after:now',
            'end_datetime' => 'required|date|after:start_datetime',
        ]);

        $slot = $consultantSchedulingService->createSlot($request->user(), $validated);

        return response()->json([
            'message' => 'Availability slot created.',
            'slot' => $consultantSchedulingService->serializeSlot($slot),
        ], 201);
    }

    public function destroySlot(Request $request, int $slotId, ConsultantSchedulingService $consultantSchedulingService)
    {
        $consultantSchedulingService->deleteSlot($request->user(), $slotId);

        return response()->json([
            'message' => 'Availability slot removed.',
        ]);
    }
}
