<?php

namespace App\Services;

use App\Models\MoodJournal;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class SentimentAnalysisService
{
    private const HIGH_RISK_PHRASES = [
        'kill myself',
        'end my life',
        'want to die',
        'suicide',
        'self harm',
        'hurt myself',
        'no reason to live',
        'better off dead',
        // Passive ideation patterns
        'what if i wasn\'t around',
        'what if i just wasn\'t around',
        'would be better off without me',
        'world would be fine without me',
        'world would just close over',
        'don\'t want to be here',
        'not sure i want to wake up',
        'just want it to stop',
        'just want the pain to stop',
        'no reason to keep going',
        'no point in going on',
        'tired of living',
        'can\'t go on anymore',
        'everyone would be better off',
        'nobody would miss me',
        'wish i could disappear',
        'wish i wasn\'t here',
    ];

    private const TEXT_SENTIMENT_KEYWORDS = [
        'very_negative' => [
            'dread', 'heaviness', 'overwhelmed', 'can\'t stop crying',
            'falling apart', 'breaking down', 'empty', 'hopeless',
            'worthless', 'numb', 'hollow', 'desperate', 'suffocating',
            'drowning', 'trapped', 'can\'t breathe', 'shaking',
        ],
        'negative' => [
            'scared', 'anxious', 'worried', 'exhausted', 'drained',
            'heavy', 'struggling', 'difficult', 'hard', 'pain',
            'hurt', 'sad', 'down', 'low', 'bad', 'terrible',
            'awful', 'miserable', 'lonely', 'isolated', 'afraid',
        ],
        'neutral' => [
            'okay', 'fine', 'normal', 'alright', 'managing',
            'getting by', 'could be worse', 'not great not bad',
        ],
        'positive' => [
            'grateful', 'hopeful', 'better', 'good', 'happy',
            'calm', 'peaceful', 'relief', 'progress', 'proud',
            'connected', 'supported', 'lighter', 'clearer',
        ],
    ];

    public function __construct(private readonly GeminiService $geminiService)
    {
    }

    public function analyze(MoodJournal $journal): array
    {
        if (blank($journal->text_note)) {
            Log::info('SentimentAnalysis: No text, using emoji fallback.', [
                'journal_id' => $journal->id,
                'emoji_mood' => $journal->emoji_mood,
            ]);

            return $this->fallbackAnalysis($journal);
        }

        Log::info('SentimentAnalysis: Calling Gemini API.', [
            'journal_id' => $journal->id,
            'text_length' => strlen($journal->text_note),
        ]);

        $response = $this->geminiService->generateJson(
            $this->buildPrompt($journal),
            [
                'temperature' => 0.1,
                'max_output_tokens' => 900,
                'system_instruction' => 'You analyze journal text for sentiment and mental-health safety triage. Return only JSON.',
            ]
        );

        if (is_array($response)) {
            Log::info('SentimentAnalysis: Gemini responded successfully.', [
                'journal_id' => $journal->id,
                'raw_score' => data_get($response, 'sentiment_score'),
                'raw_is_at_risk' => data_get($response, 'is_at_risk'),
            ]);

            return $this->normalizeAnalysis($response, $journal);
        }

        Log::warning('SentimentAnalysis: Gemini failed, using text-keyword fallback.', [
            'journal_id' => $journal->id,
        ]);

        return $this->fallbackAnalysis($journal);
    }

    public function buildEntryPayload(MoodJournal $journal): array
    {
        $analysis = is_array($journal->analysis_json) ? $journal->analysis_json : [];
        $status = $journal->sentiment_score === null ? 'pending' : 'ready';
        $score = $journal->sentiment_score;

        return [
            'id' => $journal->id,
            'emoji_mood' => $this->normalizeMoodSignal((string) $journal->emoji_mood),
            'text_note' => $journal->text_note,
            'sentiment_score' => $score,
            'sentiment_percent' => $score !== null ? (int) round($score * 100) : null,
            'sentiment_label' => $this->sentimentLabelFromScore($score),
            'is_at_risk' => (bool) $journal->is_at_risk,
            'created_at' => optional($journal->created_at)->toISOString(),
            'analysis_status' => $status,
            'analysis' => [
                'dominant_state' => data_get($analysis, 'dominant_state'),
                'emotional_shift' => data_get($analysis, 'emotional_shift'),
                'intensity' => data_get($analysis, 'intensity'),
                'recommended_focus' => data_get($analysis, 'recommended_focus'),
                'supportive_insight' => data_get($analysis, 'supportive_insight'),
                'severity' => data_get($analysis, 'severity', $journal->is_at_risk ? 'high' : 'low'),
                'risk_summary' => data_get($analysis, 'risk_summary'),
            ],
            'safety_alert' => $journal->safetyAlert ? [
                'status' => $journal->safetyAlert->status,
                'severity' => $journal->safetyAlert->severity,
                'created_at' => optional($journal->safetyAlert->created_at)->toISOString(),
            ] : null,
        ];
    }

    public function scoreForMoodSignal(string $moodSignal): float
    {
        return match ($this->normalizeMoodSignal($moodSignal)) {
            'happy' => 0.82,
            'neutral' => 0.55,
            'sad' => 0.32,
            'anxious' => 0.22,
            'angry' => 0.26,
            default => 0.50,
        };
    }

    private function scoreFromTextKeywords(string $text): float
    {
        $text = Str::lower($text);
        $scores = [];

        foreach (self::TEXT_SENTIMENT_KEYWORDS['very_negative'] as $keyword) {
            if (str_contains($text, $keyword)) {
                $scores[] = 0.12;
            }
        }

        foreach (self::TEXT_SENTIMENT_KEYWORDS['negative'] as $keyword) {
            if (str_contains($text, $keyword)) {
                $scores[] = 0.30;
            }
        }

        foreach (self::TEXT_SENTIMENT_KEYWORDS['neutral'] as $keyword) {
            if (str_contains($text, $keyword)) {
                $scores[] = 0.55;
            }
        }

        foreach (self::TEXT_SENTIMENT_KEYWORDS['positive'] as $keyword) {
            if (str_contains($text, $keyword)) {
                $scores[] = 0.75;
            }
        }

        if (empty($scores)) {
            return 0.45;
        }

        return max(0.0, min(1.0, (float) array_sum($scores) / count($scores)));
    }

    public function sentimentLabelFromScore(?float $score): string
    {
        if ($score === null) {
            return 'Pending';
        }

        if ($score >= 0.75) {
            return 'Stable';
        }

        if ($score >= 0.5) {
            return 'Mixed';
        }

        if ($score >= 0.25) {
            return 'Low';
        }

        return 'Critical';
    }

    public function normalizeMoodSignal(string $moodSignal): string
    {
        $normalized = Str::lower(trim($moodSignal));

        return match ($normalized) {
            '😊', 'happy', 'good', 'calm' => 'happy',
            '😐', 'neutral', 'okay' => 'neutral',
            '😔', 'sad', 'low' => 'sad',
            '😰', 'anxious', 'worried' => 'anxious',
            '😡', 'angry', 'frustrated' => 'angry',
            default => $normalized,
        };
    }

    private function buildPrompt(MoodJournal $journal): string
    {
        return <<<PROMPT
Analyze the following mood journal entry for emotional sentiment and safety risk.

Entry context:
- mood_signal: {$journal->emoji_mood}
- text_note: {$journal->text_note}

Return ONLY valid JSON with this exact shape:
{
  "sentiment_score": 0.42,
  "is_at_risk": false,
  "severity": "low",
  "dominant_state": "overwhelmed",
  "emotional_shift": "steady",
  "intensity": "high",
  "recommended_focus": "grounding",
  "supportive_insight": "A short, warm, non-diagnostic insight.",
  "risk_summary": "Short explanation of the risk signal."
}

Rules:
- sentiment_score must be a float from 0.0 to 1.0 where 0 is very distressed and 1 is very positive.
- is_at_risk must be true when there is meaningful concern about self-harm, suicide, or urgent crisis language.
- severity must be one of: low, medium, high, critical.
- dominant_state should be a short emotional descriptor.
- emotional_shift must be one of: improving, steady, dipping, volatile.
- intensity must be one of: low, medium, high.
- recommended_focus must be one of: grounding, reframing, rest, connection, reflection.
- supportive_insight must be brief, warm, and practical.
- risk_summary must briefly explain why the entry is or is not risky.
- No markdown, no commentary.
PROMPT;
    }

    private function normalizeAnalysis(array $response, MoodJournal $journal): array
    {
        $score = $this->normalizeScore(data_get($response, 'sentiment_score'));
        $isAtRisk = (bool) data_get($response, 'is_at_risk', false);
        $severity = $this->normalizeSeverity((string) data_get($response, 'severity', $isAtRisk ? 'high' : 'medium'));

        return [
            'sentiment_score' => $score,
            'is_at_risk' => $isAtRisk,
            'severity' => $severity,
            'dominant_state' => Str::limit((string) data_get($response, 'dominant_state', $this->defaultDominantState($journal)), 60, ''),
            'emotional_shift' => $this->normalizeShift((string) data_get($response, 'emotional_shift', 'steady')),
            'intensity' => $this->normalizeIntensity((string) data_get($response, 'intensity', 'medium')),
            'recommended_focus' => $this->normalizeRecommendedFocus((string) data_get($response, 'recommended_focus', $this->defaultRecommendedFocus($journal))),
            'supportive_insight' => Str::limit((string) data_get($response, 'supportive_insight', 'This entry suggests you may benefit from one grounded, low-pressure step before asking more of yourself.'), 240, ''),
            'risk_summary' => Str::limit((string) data_get($response, 'risk_summary', $isAtRisk
                ? 'The wording suggests meaningful risk and should be reviewed urgently.'
                : 'No urgent crisis language detected, but the entry still reflects emotional strain.'
            ), 220, ''),
        ];
    }

    private function fallbackAnalysis(MoodJournal $journal): array
    {
        $text = Str::lower((string) $journal->text_note);
        $riskDetected = collect(self::HIGH_RISK_PHRASES)->contains(
            fn (string $phrase) => str_contains($text, $phrase)
        );
        $moodSignal = (string) $journal->emoji_mood;

        // Use text-based scoring when text exists, emoji only as last resort
        $score = filled($text) ? $this->scoreFromTextKeywords($text) : $this->scoreForMoodSignal($moodSignal);

        return [
            'sentiment_score' => $score,
            'is_at_risk' => $riskDetected,
            'severity' => $riskDetected ? 'high' : 'low',
            'dominant_state' => $this->defaultDominantState($journal),
            'emotional_shift' => 'steady',
            'intensity' => $score <= 0.3 ? 'high' : ($score <= 0.55 ? 'medium' : 'low'),
            'recommended_focus' => $this->defaultRecommendedFocus($journal),
            'supportive_insight' => $riskDetected
                ? 'This entry sounds especially heavy. Keep the next step very small and prioritize immediate human support.'
                : 'This entry suggests a meaningful emotional load. A short grounding action may help you regain a little steadiness.',
            'risk_summary' => $riskDetected
                ? 'Fallback screening detected high-risk phrases in the journal text.'
                : 'No urgent crisis language was detected in fallback screening.',
        ];
    }

    private function defaultDominantState(MoodJournal $journal): string
    {
        return match ($this->normalizeMoodSignal((string) $journal->emoji_mood)) {
            'happy' => 'settled',
            'neutral' => 'balanced',
            'sad' => 'heavy',
            'anxious' => 'overwhelmed',
            'angry' => 'frustrated',
            default => 'reflective',
        };
    }

    private function defaultRecommendedFocus(MoodJournal $journal): string
    {
        return match ($this->normalizeMoodSignal((string) $journal->emoji_mood)) {
            'happy' => 'reflection',
            'neutral' => 'reflection',
            'sad' => 'connection',
            'anxious' => 'grounding',
            'angry' => 'rest',
            default => 'grounding',
        };
    }

    private function normalizeScore(mixed $score): float
    {
        return max(0.0, min(1.0, (float) $score));
    }

    private function normalizeSeverity(string $severity): string
    {
        $normalized = Str::lower(trim($severity));

        return in_array($normalized, ['low', 'medium', 'high', 'critical'], true)
            ? $normalized
            : 'medium';
    }

    private function normalizeShift(string $shift): string
    {
        $normalized = Str::lower(trim($shift));

        return in_array($normalized, ['improving', 'steady', 'dipping', 'volatile'], true)
            ? $normalized
            : 'steady';
    }

    private function normalizeIntensity(string $intensity): string
    {
        $normalized = Str::lower(trim($intensity));

        return in_array($normalized, ['low', 'medium', 'high'], true)
            ? $normalized
            : 'medium';
    }

    private function normalizeRecommendedFocus(string $focus): string
    {
        $normalized = Str::lower(trim($focus));

        return in_array($normalized, ['grounding', 'reframing', 'rest', 'connection', 'reflection'], true)
            ? $normalized
            : 'grounding';
    }
}
