<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ConsultantProfile;
use App\Services\SlotHoldService;
use Illuminate\Http\Request;

class BookingFlowController extends Controller
{
    public function slots(Request $request, int $consultantId, SlotHoldService $slotHoldService)
    {
        $consultant = ConsultantProfile::where('id', $consultantId)
            ->where('is_approved', true)
            ->with('user:id,first_name,last_name')
            ->firstOrFail();

        return response()->json([
            'consultant' => [
                'id' => $consultant->id,
                'name' => trim(($consultant->user->first_name ?? '') . ' ' . ($consultant->user->last_name ?? '')),
                'specialization' => $consultant->specialization,
            ],
            'slots' => $slotHoldService->listConsultantSlots($consultant, $request->user()),
        ]);
    }

    public function currentHold(Request $request, SlotHoldService $slotHoldService)
    {
        return response()->json([
            'hold' => $slotHoldService->buildCurrentHoldPayload($request->user()),
        ]);
    }

    public function hold(Request $request, SlotHoldService $slotHoldService)
    {
        $validated = $request->validate([
            'slot_id' => 'required|integer|exists:availability_slots,id',
        ]);

        return response()->json(
            $slotHoldService->holdSlot($request->user(), (int) $validated['slot_id'])
        );
    }

    public function release(Request $request, int $slotId, SlotHoldService $slotHoldService)
    {
        $slotHoldService->releaseHold($request->user(), $slotId);

        return response()->json([
            'message' => 'Slot hold released.',
        ]);
    }
}
