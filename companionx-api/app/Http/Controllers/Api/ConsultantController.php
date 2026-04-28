<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\GenerateConsultantRecommendations;
use App\Jobs\GenerateOnboardingExercises;
use App\Models\AiRecommendation;
use App\Models\ConsultantProfile;
use App\Services\AvailabilityService;
use App\Services\BookingService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

class ConsultantController extends Controller
{
    public function index(Request $request, BookingService $bookingService, AvailabilityService $availabilityService)
    {
        $bookingService->cancelExpiredBookings();

        $consultantsQuery = ConsultantProfile::query()
            ->where('is_approved', true)
            ->with([
                'user:id,first_name,last_name,gender',
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

        $rangeStart = Carbon::today();
        $rangeEnd = Carbon::today()->addDays(7)->endOfDay();

        $user = $request->user();
        $canAccessAi = $user->canAccessAiRecommendations();

        $aiData = $canAccessAi
            ? $this->buildAiData($user)
            : [
                'recommendation_status' => 'premium_required',
                'generated_at' => null,
                'profile_summary' => null,
                'recommended_consultants' => [],
                'chapters' => [],
                'exercise' => null,
            ];

        return response()->json([
            'consultants' => $consultants->map(function (ConsultantProfile $consultant) use ($availabilityService, $rangeStart, $rangeEnd) {
                $windows = $availabilityService->computeWindows($consultant->user_id, $rangeStart, $rangeEnd);

                $consultant->slot_summary = [
                    'available_count' => count($windows),
                    'next_available_slot' => count($windows) > 0 ? $windows[0]['start_datetime'] : null,
                ];

                $consultant->slots = array_map(function (array $window, int $idx) {
                    return [
                        'id' => -($idx + 1),
                        'start_datetime' => $window['start_datetime'],
                        'end_datetime' => $window['end_datetime'],
                        'status' => 'available',
                    ];
                }, $windows, array_keys($windows));

                return $consultant;
            })->values(),
            'ai_data' => $aiData,
            'current_hold' => $bookingService->buildActiveBookingPayload($user),
        ]);
    }

    public function show(Request $request, string $consultantId, BookingService $bookingService, AvailabilityService $availabilityService)
    {
        $bookingService->cancelExpiredBookings();

        $consultant = ConsultantProfile::where('user_id', (int) $consultantId)
            ->where('is_approved', true)
            ->with([
                'user:id,first_name,last_name,gender',
            ])
            ->firstOrFail();

        $rangeStart = $request->has('start_date') ? Carbon::parse($request->start_date) : Carbon::today();
        $rangeEnd = $request->has('end_date') ? Carbon::parse($request->end_date)->endOfDay() : Carbon::today()->addWeeks(4)->endOfDay();

        $windows = $availabilityService->computeWindows($consultant->user_id, $rangeStart, $rangeEnd);

        $windows = $availabilityService->computeWindows($consultant->user_id, $rangeStart, $rangeEnd);

        $slots = array_map(function (array $window, int $idx) {
            return [
                'id' => -($idx + 1),
                'start_datetime' => $window['start_datetime'],
                'end_datetime' => $window['end_datetime'],
                'status' => 'available',
            ];
        }, $windows, array_keys($windows));

        return response()->json([
            'consultant' => [
                'id' => $consultant->user_id,
                'specialization' => $consultant->specialization,
                'bio' => $consultant->bio,
                'average_rating' => (float) $consultant->average_rating,
                'base_rate_bdt' => (float) $consultant->base_rate_bdt,
                'user' => [
                    'first_name' => $consultant->user->first_name,
                    'last_name' => $consultant->user->last_name,
                    'gender' => $consultant->user->gender,
                ],
            ],
            'slots' => $slots,
        ]);
    }

    private function buildAiData($user): array
    {
        $latestConsultantMatch = AiRecommendation::where('user_id', $user->id)
            ->where('rec_type', 'consultant_match')
            ->latest()
            ->first();

        $latestExercise = AiRecommendation::where('user_id', $user->id)
            ->where('rec_type', 'exercise')
            ->latest()
            ->first();

        if ($user->onboarding_completed && !$latestConsultantMatch && !$latestExercise) {
            $pending = AiRecommendation::where('user_id', $user->id)
                ->where('rec_type', 'generation_pending')
                ->where('created_at', '>', now()->subMinutes(5))
                ->exists();

            if (!$pending) {
                AiRecommendation::updateOrCreate(
                    ['user_id' => $user->id, 'rec_type' => 'generation_pending'],
                    ['content_json' => '[]']
                );

                GenerateConsultantRecommendations::dispatch($user->id);
                GenerateOnboardingExercises::dispatch($user->id);
            }
        }

        $storedMatchPayload = $latestConsultantMatch?->content_json ?? [];

        return [
            'recommendation_status' => $this->resolveRecommendationStatus($user, $storedMatchPayload),
            'generated_at' => data_get($storedMatchPayload, 'generated_at'),
            'profile_summary' => data_get($storedMatchPayload, 'profile_summary'),
            'recommended_consultants' => $this->buildMatchedConsultants(
                collect($this->normalizeStoredMatches($storedMatchPayload)),
                app(BookingService::class),
                request()
            ),
            'chapters' => data_get($latestExercise?->content_json, 'chapters', []),
            'exercise' => $latestExercise?->content_json,
        ];
    }

    private function buildMatchedConsultants(Collection $recData, BookingService $bookingService, Request $request): Collection
    {
        $consultants = ConsultantProfile::whereIn('user_id', $recData->pluck('consultant_id')->filter())
            ->with([
                'user:id,first_name,last_name,gender',
            ])
            ->get()
            ->keyBy('user_id');

        $rangeStart = Carbon::today();
        $rangeEnd = Carbon::today()->addDays(7)->endOfDay();
        $availabilityService = app(AvailabilityService::class);

        return $recData
            ->map(function (array $match) use ($consultants, $availabilityService, $rangeStart, $rangeEnd) {
                $consultant = $consultants->get((int) ($match['consultant_id'] ?? 0));

                if (!$consultant instanceof ConsultantProfile) {
                    return null;
                }

                $windows = $availabilityService->computeWindows($consultant->user_id, $rangeStart, $rangeEnd);

                $consultant->match_reason = $match['reason'] ?? 'Strong fit for your profile.';
                $consultant->match_rank = (int) data_get($match, 'rank', 0);
                $consultant->slot_summary = [
                    'available_count' => count($windows),
                    'next_available_slot' => count($windows) > 0 ? $windows[0]['start_datetime'] : null,
                ];
                $consultant->slots = array_map(function (array $window, int $idx) {
                    return [
                        'id' => -($idx + 1),
                        'start_datetime' => $window['start_datetime'],
                        'end_datetime' => $window['end_datetime'],
                        'status' => 'available',
                    ];
                }, $windows, array_keys($windows));

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

    private function resolveRecommendationStatus($user, array $payload): string
    {
        if ($payload !== []) {
            return data_get($payload, 'status', 'ready');
        }

        return $user->onboarding_completed ? 'pending' : 'missing_onboarding';
    }
}
