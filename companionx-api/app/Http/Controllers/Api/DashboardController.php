<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AiRecommendation;
use App\Models\Booking;
use App\Models\ConsultantProfile;
use App\Services\ExerciseProgressService;
use App\Services\ExerciseService;
use App\Services\MatchingService;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class DashboardController extends Controller
{
    public function getRecommendations(Request $request)
    {
        $user = $request->user();
        $recommendation = AiRecommendation::where('user_id', $user->id)
            ->where('rec_type', 'consultant_match')
            ->latest()
            ->first();

        if (!$recommendation) {
            if ($user->onboarding_completed) {
                return response()->json([
                    'status' => 'pending',
                    'message' => 'Your consultant match is being generated.',
                    'matches' => [],
                ], 202);
            }

            return response()->json([
                'status' => 'missing_onboarding',
                'message' => 'Complete onboarding to generate consultant recommendations.',
                'matches' => [],
            ], 404);
        }

        $storedPayload = $this->normalizeConsultantRecommendationPayload($recommendation->content_json);

        return response()->json([
            'status' => $storedPayload['status'],
            'generated_at' => $storedPayload['generated_at'],
            'message' => $storedPayload['message'],
            'profile_summary' => $storedPayload['profile_summary'],
            'matches' => $this->buildMatchedConsultantPayload(collect($storedPayload['matches'])),
        ]);
    }

    public function getExercises(
        Request $request,
        ExerciseService $exerciseService,
        ExerciseProgressService $exerciseProgressService
    ) {
        $user = $request->user();
        $exercise = AiRecommendation::where('user_id', $user->id)
            ->where('rec_type', 'exercise')
            ->latest()
            ->first();

        if (!$exercise) {
            if ($user->onboarding_completed) {
                return response()->json([
                    'status' => 'pending',
                    'message' => 'Your exercise plan is being generated.',
                    'chapters' => [],
                    'progress' => null,
                    'mood_tracker' => $exerciseProgressService->buildMoodTracker($user->id),
                ], 202);
            }

            return response()->json([
                'status' => 'missing_onboarding',
                'message' => 'Complete onboarding to unlock your first exercise plan.',
                'chapters' => [],
                'progress' => null,
                'mood_tracker' => $exerciseProgressService->buildMoodTracker($user->id),
            ], 404);
        }

        $exercisePayload = $exerciseService->normalizeStoredPayload($exercise->content_json);
        $progress = $exerciseProgressService->buildProgressPayload(
            $exercise->exerciseProgress,
            $exercisePayload,
            $exerciseService->badgeTrack()
        );

        return response()->json(array_merge($exercisePayload, [
            'recommendation_id' => $exercise->id,
            'progress' => $progress,
            'mood_tracker' => $exerciseProgressService->buildMoodTracker($user->id),
        ]));
    }

    public function updateExerciseProgress(
        Request $request,
        ExerciseService $exerciseService,
        ExerciseProgressService $exerciseProgressService
    ) {
        $validated = $request->validate([
            'recommendation_id' => 'required|integer|exists:ai_recommendations,id',
            'completed_task_keys' => 'sometimes|array',
            'completed_task_keys.*' => 'string|max:120',
            'review_feeling' => 'sometimes|nullable|string|in:lighter,steadier,hopeful,still_heavy,energized',
            'review_text' => 'sometimes|nullable|string|max:1000',
        ]);

        $recommendation = AiRecommendation::where('id', $validated['recommendation_id'])
            ->where('user_id', $request->user()->id)
            ->where('rec_type', 'exercise')
            ->firstOrFail();

        $exercisePayload = $exerciseService->normalizeStoredPayload($recommendation->content_json);
        $input = [];

        if ($request->exists('completed_task_keys')) {
            $input['completed_task_keys'] = $validated['completed_task_keys'] ?? [];
        }

        if ($request->exists('review_feeling')) {
            $input['review_feeling'] = $validated['review_feeling'] ?? null;
        }

        if ($request->exists('review_text')) {
            $input['review_text'] = $validated['review_text'] ?? null;
        }

        $progress = $exerciseProgressService->updateProgress(
            $request->user(),
            $recommendation,
            $exercisePayload,
            $input,
            $exerciseService->badgeTrack()
        );

        return response()->json([
            'message' => 'Exercise progress updated.',
            'progress' => $progress,
        ]);
    }

    public function remix(Request $request, MatchingService $matchingService)
    {
        $user = $request->user();
        $recommendationPayload = $matchingService->generateRecommendationPayload($user->id);

        if (data_get($recommendationPayload, 'matches', []) === []) {
            return response()->json(['message' => 'AI matching failed. Check logs for details.'], 500);
        }

        AiRecommendation::updateOrCreate(
            ['user_id' => $user->id, 'rec_type' => 'consultant_match'],
            ['content_json' => $recommendationPayload]
        );

        return response()->json([
            'message' => 'AI matched successfully.',
            'data' => [
                'status' => $recommendationPayload['status'],
                'generated_at' => $recommendationPayload['generated_at'],
                'profile_summary' => $recommendationPayload['profile_summary'],
                'matches' => $this->buildMatchedConsultantPayload(collect($recommendationPayload['matches'])),
            ],
        ]);
    }

    public function getNextAppointment(Request $request)
    {
        $user = $request->user();

        $booking = Booking::where('patient_id', $user->id)
            ->where('scheduled_start', '>', now())
            ->whereIn('status', ['pending', 'confirmed'])
            ->with('consultant.user:id,first_name,last_name')
            ->orderBy('scheduled_start')
            ->first();

        if (!$booking) {
            return response()->json([
                'has_upcoming' => false,
                'booking' => null,
            ]);
        }

        return response()->json([
            'has_upcoming' => true,
            'booking' => [
                'id' => $booking->id,
                'status' => $booking->status,
                'scheduled_start' => $booking->scheduled_start->toIso8601String(),
                'scheduled_end' => $booking->scheduled_end->toIso8601String(),
                'consultant' => [
                    'name' => trim(
                        ($booking->consultant->user->first_name ?? '') . ' ' .
                        ($booking->consultant->user->last_name ?? '')
                    ),
                    'specialization' => $booking->consultant->specialization,
                ],
            ],
        ]);
    }

    public function getDashboardSummary(
        Request $request,
        ExerciseService $exerciseService,
        ExerciseProgressService $exerciseProgressService
    ) {
        $user = $request->user();

        $nextBooking = Booking::where('patient_id', $user->id)
            ->where('scheduled_start', '>', now())
            ->whereIn('status', ['pending', 'confirmed'])
            ->with('consultant.user:id,first_name,last_name')
            ->orderBy('scheduled_start')
            ->first();

        $exercise = AiRecommendation::where('user_id', $user->id)
            ->where('rec_type', 'exercise')
            ->latest()
            ->first();

        $moodTracker = $exerciseProgressService->buildMoodTracker($user->id);

        $exerciseData = null;
        if ($exercise) {
            $exercisePayload = $exerciseService->normalizeStoredPayload($exercise->content_json);
            $progress = $exerciseProgressService->buildProgressPayload(
                $exercise->exerciseProgress,
                $exercisePayload,
                $exerciseService->badgeTrack()
            );
            $exerciseData = array_merge($exercisePayload, [
                'recommendation_id' => $exercise->id,
                'progress' => $progress,
            ]);
        }

        return response()->json([
            'next_appointment' => $nextBooking ? [
                'id' => $nextBooking->id,
                'status' => $nextBooking->status,
                'scheduled_start' => $nextBooking->scheduled_start->toIso8601String(),
                'scheduled_end' => $nextBooking->scheduled_end->toIso8601String(),
                'consultant' => [
                    'name' => trim(
                        ($nextBooking->consultant->user->first_name ?? '') . ' ' .
                        ($nextBooking->consultant->user->last_name ?? '')
                    ),
                    'specialization' => $nextBooking->consultant->specialization,
                ],
            ] : null,
            'mood_tracker' => $moodTracker,
            'exercise' => $exerciseData,
        ]);
    }

    private function normalizeConsultantRecommendationPayload(array $payload): array
    {
        if (array_is_list($payload)) {
            return [
                'status' => 'ready',
                'generated_at' => null,
                'message' => 'Top consultant matches generated successfully.',
                'profile_summary' => null,
                'matches' => $payload,
            ];
        }

        return [
            'status' => data_get($payload, 'status', 'ready'),
            'generated_at' => data_get($payload, 'generated_at'),
            'message' => data_get($payload, 'message'),
            'profile_summary' => data_get($payload, 'profile_summary'),
            'matches' => data_get($payload, 'matches', []),
        ];
    }

    private function buildMatchedConsultantPayload(Collection $recData): Collection
    {
        $consultants = ConsultantProfile::whereIn('id', $recData->pluck('consultant_id')->filter())
            ->with('user:id,first_name,last_name,gender')
            ->get()
            ->keyBy('id');

        return $recData
            ->map(function (array $match) use ($consultants) {
                $consultant = $consultants->get((int) ($match['consultant_id'] ?? 0));

                if (!$consultant instanceof ConsultantProfile) {
                    return null;
                }

                $consultant->match_reason = $match['reason'] ?? 'Highly compatible with your profile.';
                $consultant->match_rank = (int) data_get($match, 'rank', 0);

                return $consultant;
            })
            ->filter()
            ->values();
    }
}
