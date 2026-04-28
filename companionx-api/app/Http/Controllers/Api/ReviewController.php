<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\ConsultantProfile;
use App\Models\Review;
use Illuminate\Http\Request;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class ReviewController extends Controller
{
    use AuthorizesRequests;

    public function store(Request $request)
    {
        $validated = $request->validate([
            'booking_id' => 'required|integer|exists:bookings,id',
            'rating' => 'required|integer|min:1|max:5',
            'comment' => 'sometimes|nullable|string|max:2000',
        ]);

        $user = $request->user();

        $booking = Booking::where('id', $validated['booking_id'])
            ->where('patient_id', $user->id)
            ->firstOrFail();

        if ($booking->status !== 'completed') {
            return response()->json(['message' => 'Can only review completed sessions.'], 422);
        }

        $review = Review::updateOrCreate(
            ['booking_id' => $booking->id],
            [
                'patient_id' => $user->id,
                'consultant_id' => $booking->consultant_id,
                'rating' => $validated['rating'],
                'comment' => $validated['comment'] ?? null,
            ]
        );

        $this->recalculateAverageRating($booking->consultant_id);

        return response()->json([
            'message' => 'Review submitted.',
            'review' => [
                'id' => $review->id,
                'rating' => $review->rating,
                'comment' => $review->comment,
                'created_at' => $review->created_at,
            ],
        ]);
    }

    public function consultantReviews(Request $request, $consultantId)
    {
        $reviews = Review::where('consultant_id', $consultantId)
            ->with('patient:id,first_name,last_name')
            ->latest()
            ->paginate(10);

        return response()->json($reviews);
    }

    private function recalculateAverageRating(int $consultantId): void
    {
        $avg = Review::where('consultant_id', $consultantId)
            ->avg('rating');

        ConsultantProfile::where('user_id', $consultantId)
            ->update(['average_rating' => round($avg ?? 0, 2)]);
    }
}
