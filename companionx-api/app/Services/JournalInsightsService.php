<?php

namespace App\Services;

use App\Models\MoodJournal;
use App\Models\SafetyAlert;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

class JournalInsightsService
{
    public function __construct(private readonly SentimentAnalysisService $sentimentAnalysisService)
    {
    }

    public function buildPayload(int $userId): array
    {
        $journals = MoodJournal::where('user_id', $userId)
            ->with('safetyAlert')
            ->orderByDesc('created_at')
            ->get();

        $entries = $journals
            ->map(fn (MoodJournal $journal) => $this->sentimentAnalysisService->buildEntryPayload($journal))
            ->values();

        return [
            'entries' => $entries->all(),
            'summary' => $this->buildSummary($journals, $entries),
            'mood_tracker' => $this->buildMoodTracker($entries),
            'safety' => $this->buildSafetyPayload($userId, $journals),
        ];
    }

    private function buildSummary(Collection $journals, Collection $entries): array
    {
        $readyEntries = $entries->filter(fn (array $entry) => $entry['analysis_status'] === 'ready')->values();
        $scores = $readyEntries->pluck('sentiment_score')->filter(fn ($score) => $score !== null)->values();
        $latestReady = $readyEntries->first();
        $streakDays = $this->calculateStreak($journals);

        return [
            'entries_count' => $entries->count(),
            'analysis_ready_count' => $readyEntries->count(),
            'average_sentiment_score' => $scores->isNotEmpty() ? round((float) $scores->avg(), 2) : null,
            'latest_state' => data_get($latestReady, 'analysis.dominant_state'),
            'latest_focus' => data_get($latestReady, 'analysis.recommended_focus'),
            'latest_sentiment_label' => data_get($latestReady, 'sentiment_label', 'Pending'),
            'streak_days' => $streakDays,
        ];
    }

    private function buildMoodTracker(Collection $entries): array
    {
        $points = $entries
            ->take(30)
            ->reverse()
            ->values()
            ->map(function (array $entry) {
                $createdAt = is_string($entry['created_at'] ?? null)
                    ? Carbon::parse($entry['created_at'])
                    : null;

                return [
                    'id' => $entry['id'],
                    'label' => optional($createdAt)?->format('M j'),
                    'date' => $entry['created_at'],
                    'emoji_mood' => $entry['emoji_mood'],
                    'sentiment_score' => round((float) ($entry['sentiment_score'] ?? $this->sentimentAnalysisService->scoreForMoodSignal($entry['emoji_mood'])), 2),
                ];
            })
            ->values();

        return [
            'entries_count' => $points->count(),
            'average_score' => $points->isNotEmpty() ? round((float) $points->avg('sentiment_score'), 2) : null,
            'trend' => $this->detectTrend($points),
            'points' => $points->all(),
        ];
    }

    private function buildSafetyPayload(int $userId, Collection $journals): array
    {
        $openAlerts = SafetyAlert::where('patient_id', $userId)
            ->whereNull('resolved_at')
            ->orderByDesc('created_at')
            ->get();

        $latestRiskEntry = $journals->first(fn (MoodJournal $journal) => $journal->is_at_risk);

        return [
            'open_alerts_count' => $openAlerts->count(),
            'highest_open_severity' => $this->highestSeverity($openAlerts->pluck('severity')->all()),
            'latest_risk_entry_id' => $latestRiskEntry?->id,
            'latest_risk_summary' => data_get($latestRiskEntry?->analysis_json, 'risk_summary'),
        ];
    }

    private function calculateStreak(Collection $journals): int
    {
        $dates = $journals
            ->map(fn (MoodJournal $journal) => optional($journal->created_at)->toDateString())
            ->filter()
            ->unique()
            ->values();

        if ($dates->isEmpty()) {
            return 0;
        }

        $streak = 0;
        $cursor = now()->startOfDay();

        foreach ($dates as $date) {
            if ($date === $cursor->toDateString()) {
                $streak++;
                $cursor->subDay();
                continue;
            }

            if ($streak === 0 && $date === $cursor->copy()->subDay()->toDateString()) {
                $streak++;
                $cursor->subDays(2);
                continue;
            }

            break;
        }

        return $streak;
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
            return 'dipping';
        }

        return 'steady';
    }

    private function highestSeverity(array $severities): ?string
    {
        $priority = [
            'low' => 1,
            'medium' => 2,
            'high' => 3,
            'critical' => 4,
        ];

        $resolved = collect($severities)
            ->filter(fn ($severity) => is_string($severity))
            ->sortByDesc(fn ($severity) => $priority[$severity] ?? 0)
            ->first();

        return is_string($resolved) ? $resolved : null;
    }
}
