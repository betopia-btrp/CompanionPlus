<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ConsultantProfile;
use App\Services\BookingService;
use Illuminate\Http\Request;

class BookingFlowController extends Controller
{
    public function slots(Request $request, int $consultantId, BookingService $bookingService)
    {
        $consultant = ConsultantProfile::where('id', $consultantId)
            ->where('is_approved', true)
            ->with('user:id,first_name,last_name')
            ->firstOrFail();

        return response()->json([
            'consultant' => [
                'id' => $consultant->user_id,
                'name' => trim(($consultant->user->first_name ?? '') . ' ' . ($consultant->user->last_name ?? '')),
                'specialization' => $consultant->specialization,
            ],
            'slots' => $bookingService->listConsultantSlots($consultant, $request->user()),
        ]);
    }

    public function currentHold(Request $request, BookingService $bookingService)
    {
        return response()->json([
            'hold' => $bookingService->buildActiveBookingPayload($request->user()),
        ]);
    }

    public function hold(Request $request, BookingService $bookingService)
    {
        $validated = $request->validate([
            'slot_id' => 'required|integer|exists:availability_slots,id',
        ]);

        return response()->json(
            $bookingService->bookSlot($request->user(), (int) $validated['slot_id'])
        );
    }

    public function release(Request $request, int $slotId, BookingService $bookingService)
    {
        $bookingService->cancelBooking($request->user(), $slotId);

        return response()->json([
            'message' => 'Booking cancelled.',
        ]);
    }
}
