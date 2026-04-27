<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\SessionNote;
use Illuminate\Http\Request;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class SessionNoteController extends Controller
{
    use AuthorizesRequests;

    public function show(Request $request, $bookingId)
    {
        $user = $request->user();

        $booking = Booking::where('id', $bookingId)
            ->where('consultant_id', $user->id)
            ->firstOrFail();

        $note = SessionNote::where('booking_id', $booking->id)->first();

        return response()->json([
            'notes' => $note?->notes,
            'private_notes' => $note?->private_notes,
        ]);
    }

    public function update(Request $request, $bookingId)
    {
        $user = $request->user();

        $validated = $request->validate([
            'notes' => 'sometimes|nullable|string|max:5000',
            'private_notes' => 'sometimes|nullable|string|max:5000',
        ]);

        $booking = Booking::where('id', $bookingId)
            ->where('consultant_id', $user->id)
            ->firstOrFail();

        $note = SessionNote::updateOrCreate(
            ['booking_id' => $booking->id],
            [
                'consultant_id' => $user->id,
                'notes' => $validated['notes'] ?? null,
                'private_notes' => $validated['private_notes'] ?? null,
            ]
        );

        return response()->json([
            'message' => 'Session notes saved.',
            'notes' => $note->notes,
            'private_notes' => $note->private_notes,
        ]);
    }
}
