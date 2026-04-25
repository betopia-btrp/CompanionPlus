<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AiRecommendation;
use App\Models\ConsultantProfile;
use App\Services\BookingService;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class ConsultantController extends Controller
{
    public function index(Request $request, BookingService $bookingService)
    {
        $bookingService->cancelExpiredBookings();

        $consultantsQuery = ConsultantProfile::query()
            ->where('is_approved', true)
            ->with([
                'user:id,first_name,last_name,gender',
                'availabilitySlots' => fn ($query) => $query
                    ->where('start_datetime', '>', now())
                    ->orderBy('start_datetime'),
            ]);

        if ($request->filled('specialization')) {
            $consultantsQuery->where('specialization', 'ilike', '%' . $request->string('specialization')->trim() . '%');
        }

        if ($request->filled('max_rate')) {
            $consultantsQuery->where('base_rate_bdt', '<=', (float) $request->input('max_rate'));
        }

        $consultants = $consultantsQuery
            ->orderBy('average_rating', 'desc')
            ->orderBy('user_id')
            ->get();

        $latestConsultantMatch = AiRecommendation::where('user_id', $request->user()->id)
            ->where('rec_type', 'consultant_match')
            ->latest()
            ->first();

        $latestExercise = AiRecommendation::where('user_id', $request->user()->id)
            ->where('rec_type', 'exercise')
            ->latest()
            ->first();

        $storedMatchPayload = $latestConsultantMatch?->content_json ?? [];

        return response()->json([
            'consultants' => $consultants->map(function (ConsultantProfile $consultant) use ($bookingService, $request) {
                $consultant->slot_summary = [
                    'available_count' => $consultant->availabilitySlots
                        ->filter(fn ($slot) => $bookingService->serializeSlot($slot, $request->user())['status'] === 'available')
                        ->count(),
                    'next_available_slot' => optional($consultant->availabilitySlots->first())->start_datetime?->toISOString(),
                ];
                $consultant->slots = $consultant->availabilitySlots
                    ->map(fn ($slot) => $bookingService->serializeSlot($slot, $request->user()))
                    ->values();

                return $consultant;
            })->values(),
            'ai_data' => [
                'recommendation_status' => $this->resolveRecommendationStatus($request, $storedMatchPayload),
                'generated_at' => data_get($storedMatchPayload, 'generated_at'),
                'profile_summary' => data_get($storedMatchPayload, 'profile_summary'),
                'recommended_consultants' => $this->buildMatchedConsultants(
                    collect($this->normalizeStoredMatches($storedMatchPayload)),
                    $bookingService,
                    $request
                ),
                'chapters' => data_get($latestExercise?->content_json, 'chapters', []),
                'exercise' => $latestExercise?->content_json,
            ],
            'current_hold' => $bookingService->buildActiveBookingPayload($request->user()),
        ]);
    }

    private function buildMatchedConsultants(Collection $recData, BookingService $bookingService, Request $request): Collection
    {
        $consultants = ConsultantProfile::whereIn('user_id', $recData->pluck('consultant_id')->filter())
            ->with([
                'user:id,first_name,last_name,gender',
                'availabilitySlots' => fn ($query) => $query
                    ->where('start_datetime', '>', now())
                    ->orderBy('start_datetime'),
            ])
            ->get()
            ->keyBy('user_id');

        return $recData
            ->map(function (array $match) use ($consultants, $bookingService, $request) {
                $consultant = $consultants->get((int) ($match['consultant_id'] ?? 0));

                if (!$consultant instanceof ConsultantProfile) {
                    return null;
                }

                $consultant->match_reason = $match['reason'] ?? 'Strong fit for your profile.';
                $consultant->match_rank = (int) data_get($match, 'rank', 0);
                $consultant->slot_summary = [
                    'available_count' => $consultant->availabilitySlots
                        ->filter(fn ($slot) => $bookingService->serializeSlot($slot, $request->user())['status'] === 'available')
                        ->count(),
                    'next_available_slot' => optional($consultant->availabilitySlots->first())->start_datetime?->toISOString(),
                ];
                $consultant->slots = $consultant->availabilitySlots
                    ->map(fn ($slot) => $bookingService->serializeSlot($slot, $request->user()))
                    ->values();

                return $consultant;
            })
            ->filter()
            ->values();
    }

    private function normalizeStoredMatches(array $payload): array
    {
        if (array_is_list($payload)) {
            return $payload;
        }

        return data_get($payload, 'matches', []);
    }

    private function resolveRecommendationStatus(Request $request, array $payload): string
    {
        if ($payload !== []) {
            return data_get($payload, 'status', 'ready');
        }

        return $request->user()->onboarding_completed ? 'pending' : 'missing_onboarding';
    }
}
