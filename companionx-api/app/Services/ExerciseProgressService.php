<?php

namespace App\Services;

use App\Models\AiRecommendation;
use App\Models\ExerciseProgress;
use App\Models\MoodJournal;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

class ExerciseProgressService
{
    public function buildProgressPayload(?ExerciseProgress $progress, array $exercisePayload, array $badgeTrack): array
    {
        $chapters = collect(data_get($exercisePayload, 'chapters', []));
        $taskKeys = $this->taskKeyCollection($chapters);
        $completedTaskKeys = collect($progress?->completed_task_keys ?? [])
            ->filter(fn ($taskKey) => $taskKeys->contains($taskKey))
            ->values();

        $completedChapterKeys = $this->buildCompletedChapterKeys($chapters, $completedTaskKeys);
        $chapterStatuses = $this->buildChapterStatuses($chapters, $completedTaskKeys);
        $completionPercentage = $taskKeys->isEmpty()
            ? 0
            : (int) round(($completedTaskKeys->count() / $taskKeys->count()) * 100);

        $badge = $this->resolveBadge($badgeTrack, $completedChapterKeys->count(), $progress?->earned_badge_at?->toISOString());

        return [
            'completed_task_keys' => $completedTaskKeys->all(),
            'completed_chapter_keys' => $completedChapterKeys->all(),
            'chapter_statuses' => $chapterStatuses,
            'completed_tasks' => $completedTaskKeys->count(),
            'total_tasks' => $taskKeys->count(),
            'completion_percentage' => $completionPercentage,
            'is_complete' => $taskKeys->isNotEmpty() && $completedTaskKeys->count() === $taskKeys->count(),
            'badge' => $badge,
            'review' => [
                'feeling' => $progress?->review_feeling,
                'text' => $progress?->review_text,
                'submitted_at' => optional($progress?->review_submitted_at)->toISOString(),
            ],
        ];
    }

    public function updateProgress(
        User $user,
        AiRecommendation $recommendation,
        array $exercisePayload,
        array $input,
        array $badgeTrack
    ): array {
        $progress = ExerciseProgress::firstOrNew([
            'user_id' => $user->id,
            'recommendation_id' => $recommendation->id,
        ]);

        $chapters = collect(data_get($exercisePayload, 'chapters', []));
        $taskKeys = $this->taskKeyCollection($chapters);
        $completedTaskKeys = array_key_exists('completed_task_keys', $input)
            ? collect($input['completed_task_keys'])
                ->filter(fn ($taskKey) => is_string($taskKey) && $taskKeys->contains($taskKey))
                ->unique()
                ->values()
            : collect($progress->completed_task_keys ?? [])
                ->filter(fn ($taskKey) => $taskKeys->contains($taskKey))
                ->values();

        $completedChapterKeys = $this->buildCompletedChapterKeys($chapters, $completedTaskKeys);
        $completionPercentage = $taskKeys->isEmpty()
            ? 0
            : (int) round(($completedTaskKeys->count() / $taskKeys->count()) * 100);

        $badge = $this->resolveBadge($badgeTrack, $completedChapterKeys->count(), optional($progress->earned_badge_at)->toISOString());
        $existingBadgeOrder = $this->badgeOrder($badgeTrack, $progress->earned_badge_code);
        $newBadgeOrder = $this->badgeOrder($badgeTrack, data_get($badge, 'code'));

        $progress->completed_task_keys = $completedTaskKeys->all();
        $progress->completed_chapter_keys = $completedChapterKeys->all();
        $progress->completion_percentage = $completionPercentage;

        if (array_key_exists('review_feeling', $input)) {
            $progress->review_feeling = $this->normalizeReviewFeeling($input['review_feeling']);
        }

        if (array_key_exists('review_text', $input)) {
            $progress->review_text = $this->normalizeReviewText($input['review_text']);
        }

        $progress->review_submitted_at = ($progress->review_feeling || $progress->review_text)
            ? now()
            : null;

        if ($newBadgeOrder >= $existingBadgeOrder && $badge !== null) {
            $progress->earned_badge_code = $badge['code'];
            $progress->earned_badge_name = $badge['name'];

            if ($progress->earned_badge_at === null || $newBadgeOrder > $existingBadgeOrder) {
                $progress->earned_badge_at = now();
            }
        }

        $progress->completed_at = $taskKeys->isNotEmpty() && $completedTaskKeys->count() === $taskKeys->count()
            ? ($progress->completed_at ?? now())
            : null;

        $progress->save();

        return $this->buildProgressPayload($progress->fresh(), $exercisePayload, $badgeTrack);
    }

    public function buildMoodTracker(int $userId): array
    {
        $entries = MoodJournal::where('user_id', $userId)
            ->latest('created_at')
            ->take(30)
            ->get()
            ->reverse()
            ->values();

        if ($entries->isEmpty()) {
            return [
                'entries_count' => 0,
                'average_score' => null,
                'trend' => 'steady',
                'points' => [],
            ];
        }

        $points = $entries->map(function (MoodJournal $entry) {
            $score = $entry->sentiment_score ?? $this->fallbackScoreFromMood((string) $entry->emoji_mood);

            return [
                'id' => $entry->id,
                'date' => optional($entry->created_at)->toDateString(),
                'label' => optional($entry->created_at)->format('M j'),
                'emoji_mood' => $entry->emoji_mood,
                'sentiment_score' => round((float) $score, 2),
            ];
        })->values();

        return [
            'entries_count' => $points->count(),
            'average_score' => round((float) $points->avg('sentiment_score'), 2),
            'trend' => $this->detectTrend($points),
            'points' => $points->all(),
        ];
    }

    private function buildCompletedChapterKeys(Collection $chapters, Collection $completedTaskKeys): Collection
    {
        return $chapters
            ->map(function (array $chapter) use ($completedTaskKeys) {
                $taskKeys = collect($chapter['tasks'] ?? [])
                    ->pluck('task_key')
                    ->filter();

                if ($taskKeys->isEmpty()) {
                    return null;
                }

                return $taskKeys->diff($completedTaskKeys)->isEmpty()
                    ? data_get($chapter, 'chapter_key')
                    : null;
            })
            ->filter()
            ->values();
    }

    private function buildChapterStatuses(Collection $chapters, Collection $completedTaskKeys): array
    {
        return $chapters
            ->map(function (array $chapter) use ($completedTaskKeys) {
                $taskKeys = collect($chapter['tasks'] ?? [])
                    ->pluck('task_key')
                    ->filter()
                    ->values();

                $completedCount = $taskKeys
                    ->filter(fn ($taskKey) => $completedTaskKeys->contains($taskKey))
                    ->count();

                return [
                    'chapter_key' => data_get($chapter, 'chapter_key'),
                    'completed_tasks' => $completedCount,
                    'total_tasks' => $taskKeys->count(),
                    'is_complete' => $taskKeys->isNotEmpty() && $completedCount === $taskKeys->count(),
                ];
            })
            ->values()
            ->all();
    }

    private function taskKeyCollection(Collection $chapters): Collection
    {
        return $chapters
            ->flatMap(fn (array $chapter) => collect($chapter['tasks'] ?? [])->pluck('task_key'))
            ->filter(fn ($taskKey) => is_string($taskKey) && $taskKey !== '')
            ->unique()
            ->values();
    }

    private function resolveBadge(array $badgeTrack, int $completedChapters, ?string $earnedAt): ?array
    {
        $badge = collect($badgeTrack)
            ->filter(fn (array $candidate) => $completedChapters >= (int) ($candidate['unlock_after_chapters'] ?? 99))
            ->sortBy('unlock_after_chapters')
            ->last();

        if (!$badge) {
            return null;
        }

        return [
            'code' => $badge['code'],
            'name' => $badge['name'],
            'description' => $badge['description'],
            'earned_at' => $earnedAt,
        ];
    }

    private function badgeOrder(array $badgeTrack, ?string $badgeCode): int
    {
        if ($badgeCode === null) {
            return 0;
        }

        $badge = collect($badgeTrack)
            ->first(fn (array $candidate) => $candidate['code'] === $badgeCode);

        return (int) ($badge['unlock_after_chapters'] ?? 0);
    }

    private function normalizeReviewFeeling(mixed $value): ?string
    {
        if (!is_string($value)) {
            return null;
        }

        $normalized = Str::lower(trim($value));

        return in_array($normalized, ['lighter', 'steadier', 'hopeful', 'still_heavy', 'energized'], true)
            ? $normalized
            : null;
    }

    private function normalizeReviewText(mixed $value): ?string
    {
        if (!is_string($value)) {
            return null;
        }

        $text = trim($value);

        return $text !== '' ? Str::limit($text, 1000, '') : null;
    }

    private function detectTrend(Collection $points): string
    {
        if ($points->count() < 4) {
            return 'steady';
        }

        $firstHalf = $points->take((int) floor($points->count() / 2))->avg('sentiment_score');
        $secondHalf = $points->skip((int) floor($points->count() / 2))->avg('sentiment_score');
        $delta = (float) $secondHalf - (float) $firstHalf;

        if ($delta >= 0.12) {
            return 'improving';
        }

        if ($delta <= -0.12) {
            return 'declining';
        }

        return 'steady';
    }

    private function fallbackScoreFromMood(string $moodSignal): float
    {
        return match (Str::lower(trim($moodSignal))) {
            'happy', 'good', 'calm' => 0.82,
            'neutral', 'okay' => 0.55,
            'sad', 'low' => 0.32,
            'anxious', 'worried' => 0.22,
            'angry', 'frustrated' => 0.26,
            default => 0.50,
        };
    }
}
