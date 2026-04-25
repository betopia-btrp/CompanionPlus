<?php

namespace App\Services;

use App\Models\ConsultantProfile;
use App\Models\OnboardingAnswer;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class MatchingService
{
    private const MATCH_KEYWORDS = [
        'depression',
        'anxiety',
        'stress',
        'academic pressure',
        'career',
        'family',
        'relationship',
        'trauma',
        'addiction',
        'self esteem',
        'grief',
        'burnout',
        'mindfulness',
        'confidence',
        'workplace stress',
        'exam anxiety',
    ];

    private const THERAPY_STYLE_HINTS = [
        'action-oriented (cbt/tools)' => ['cbt', 'tools', 'mindfulness', 'stress management', 'coach'],
        'gentle & empathetic (listening)' => ['listening', 'support', 'counselor', 'therapist', 'grief'],
        'deep-dive (past/childhood)' => ['trauma', 'family', 'relationship', 'childhood'],
        'i am not sure' => ['support', 'general', 'wellness'],
    ];

    public function __construct(private readonly GeminiService $geminiService)
    {
    }

    public function generateRecommendationPayload(int $userId): array
    {
        $answers = OnboardingAnswer::where('user_id', $userId)
            ->orderBy('id')
            ->get(['question_key', 'answer_text']);

        $consultants = ConsultantProfile::where('is_approved', true)
            ->with('user:id,first_name,last_name,gender')
            ->select(['id', 'user_id', 'specialization', 'bio', 'base_rate_bdt', 'average_rating'])
            ->get();

        if ($answers->isEmpty()) {
            Log::warning('MatchingService: No onboarding answers found.', ['user_id' => $userId]);

            return [
                'status' => 'unavailable',
                'generated_at' => now()->toISOString(),
                'message' => 'No onboarding answers were found for this user.',
                'matches' => [],
            ];
        }

        if ($consultants->isEmpty()) {
            Log::warning('MatchingService: No approved consultants found.', ['user_id' => $userId]);

            return [
                'status' => 'unavailable',
                'generated_at' => now()->toISOString(),
                'message' => 'No approved consultants are available yet.',
                'matches' => [],
            ];
        }

        $patientProfile = $this->buildPatientProfile($answers);
        $shortlistedConsultants = $this->shortlistConsultants($consultants, $patientProfile);
        $catalog = $shortlistedConsultants
            ->take(10)
            ->map(fn (ConsultantProfile $consultant) => [
                'id' => $consultant->user_id,
                'specialization' => $consultant->specialization,
                'bio' => $consultant->bio,
                'average_rating' => (float) $consultant->average_rating,
                'base_rate_bdt' => (float) $consultant->base_rate_bdt,
            ])
            ->values()
            ->all();

        $response = $this->geminiService->generateJson(
            $this->buildPrompt($patientProfile, $catalog),
            [
                'temperature' => 0.2,
                'max_output_tokens' => 1400,
                'system_instruction' => 'You are a mental-health consultation matcher. Return only JSON and never include patient identity.',
            ]
        );

        $matches = $this->normalizeGeminiMatches($response, $consultants);

        if ($matches === []) {
            $matches = $this->fallbackMatches($shortlistedConsultants, $patientProfile);
        }

        return [
            'status' => $matches === [] ? 'unavailable' : 'ready',
            'generated_at' => now()->toISOString(),
            'message' => $matches === []
                ? 'No consultant match could be generated from the current data.'
                : 'Top consultant matches generated successfully.',
            'profile_summary' => [
                'primary_concern' => $patientProfile['primary_concern'],
                'keywords' => $patientProfile['keywords'],
                'preferred_style' => $patientProfile['preferred_style'],
                'duration' => $patientProfile['duration'],
            ],
            'matches' => $matches,
        ];
    }

    public function getRecommendedConsultants(int $userId): array
    {
        return data_get($this->generateRecommendationPayload($userId), 'matches', []);
    }

    private function buildPatientProfile(Collection $answers): array
    {
        $answersByKey = $answers
            ->mapWithKeys(fn ($answer) => [$answer->question_key => $answer->answer_text])
            ->all();

        $haystack = Str::lower(implode(' ', $answersByKey));
        $keywords = collect(self::MATCH_KEYWORDS)
            ->filter(fn (string $keyword) => str_contains($haystack, Str::lower($keyword)))
            ->take(5)
            ->values()
            ->all();

        return [
            'primary_concern' => $answersByKey['primary_concern'] ?? 'General support',
            'duration' => $answersByKey['duration'] ?? 'Unknown',
            'preferred_style' => $answersByKey['therapist_style'] ?? 'I am not sure',
            'daily_functioning' => $answersByKey['daily_functioning'] ?? null,
            'sleep_impact' => $answersByKey['sleep_impact'] ?? null,
            'social_life' => $answersByKey['social_life'] ?? null,
            'physical_symptoms' => $answersByKey['physical_symptoms'] ?? null,
            'keywords' => $keywords,
        ];
    }

    private function shortlistConsultants(Collection $consultants, array $patientProfile): Collection
    {
        $keywords = collect($patientProfile['keywords'] ?? []);
        $styleHints = collect(
            self::THERAPY_STYLE_HINTS[Str::lower((string) $patientProfile['preferred_style'])] ?? []
        );

        return $consultants
            ->map(function (ConsultantProfile $consultant) use ($keywords, $styleHints, $patientProfile) {
                $haystack = Str::lower(trim($consultant->specialization . ' ' . ($consultant->bio ?? '')));

                $keywordScore = $keywords
                    ->filter(fn (string $keyword) => str_contains($haystack, Str::lower($keyword)))
                    ->count();

                $styleScore = $styleHints
                    ->filter(fn (string $hint) => str_contains($haystack, Str::lower($hint)))
                    ->count();

                $concernScore = str_contains($haystack, Str::lower((string) $patientProfile['primary_concern']))
                    ? 2
                    : 0;

                $consultant->matching_score = $keywordScore + $styleScore + $concernScore;

                return $consultant;
            })
            ->sortByDesc('matching_score')
            ->values();
    }

    private function buildPrompt(array $patientProfile, array $catalog): string
    {
        $consultantCatalog = json_encode($catalog, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
        $profile = json_encode([
            'primary_concern' => $patientProfile['primary_concern'],
            'duration' => $patientProfile['duration'],
            'preferred_style' => $patientProfile['preferred_style'],
            'keywords' => $patientProfile['keywords'],
            'daily_functioning' => $patientProfile['daily_functioning'],
            'sleep_impact' => $patientProfile['sleep_impact'],
            'social_life' => $patientProfile['social_life'],
            'physical_symptoms' => $patientProfile['physical_symptoms'],
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);

        return <<<PROMPT
Patient profile:
{$profile}

Approved consultants:
{$consultantCatalog}

Task:
- Pick the top 2 consultant matches for this patient.
- Use symptoms, duration, therapy preference, and overall fit.
- Reasons should be meaningful, specific, and reference the consultant's bio or specialization.
- Never mention names, emails, or anything outside the data above.
- Keep each reason under 220 characters.

Return ONLY valid JSON with this exact shape:
{
  "matches": [
    {
      "consultant_id": 1,
      "reason": "Why this consultant matches the patient."
    },
    {
      "consultant_id": 2,
      "reason": "Why this consultant matches the patient."
    }
  ]
}
PROMPT;
    }

    private function normalizeGeminiMatches(?array $response, Collection $consultants): array
    {
        if (!is_array($response) || !isset($response['matches']) || !is_array($response['matches'])) {
            return [];
        }

        return collect($response['matches'])
            ->map(function ($match, int $index) use ($consultants) {
                $consultantId = (int) data_get($match, 'consultant_id');
                $consultant = $consultants->firstWhere('id', $consultantId);

                if (!$consultant instanceof ConsultantProfile) {
                    return null;
                }

                return [
                    'consultant_id' => $consultant->user_id,
                    'user_id' => $consultant->user_id,
                    'name' => trim(($consultant->user->first_name ?? '') . ' ' . ($consultant->user->last_name ?? '')),
                    'specialization' => $consultant->specialization,
                    'reason' => Str::limit((string) data_get($match, 'reason', ''), 220, ''),
                    'rank' => $index + 1,
                ];
            })
            ->filter()
            ->unique('consultant_id')
            ->take(2)
            ->values()
            ->all();
    }

    private function fallbackMatches(Collection $consultants, array $patientProfile): array
    {
        $keywords = collect($patientProfile['keywords'] ?? []);
        $styleHints = collect(
            self::THERAPY_STYLE_HINTS[Str::lower((string) $patientProfile['preferred_style'])] ?? []
        );

        return $consultants
            ->take(10)
            ->values()
            ->map(function (ConsultantProfile $consultant, int $index) use ($keywords, $styleHints, $patientProfile) {
                $haystack = Str::lower(trim($consultant->specialization . ' ' . ($consultant->bio ?? '')));
                $matchedKeywords = $keywords
                    ->filter(fn (string $keyword) => str_contains($haystack, Str::lower($keyword)))
                    ->values();

                $matchedStyleHints = $styleHints
                    ->filter(fn (string $hint) => str_contains($haystack, Str::lower($hint)))
                    ->values();

                $reasonParts = collect([
                    $matchedKeywords->isNotEmpty() ? 'Aligned with ' . $matchedKeywords->implode(', ') : null,
                    $matchedStyleHints->isNotEmpty() ? 'supports a ' . $patientProfile['preferred_style'] . ' approach' : null,
                ])->filter()->values();

                return [
                    'consultant_id' => $consultant->user_id,
                    'user_id' => $consultant->user_id,
                    'name' => trim(($consultant->user->first_name ?? '') . ' ' . ($consultant->user->last_name ?? '')),
                    'specialization' => $consultant->specialization,
                    'reason' => $reasonParts->isNotEmpty()
                        ? Str::finish($reasonParts->implode(' and '), '.')
                        : 'Broad fit based on approved specialization and bio.',
                    'rank' => $index + 1,
                ];
            })
            ->take(2)
            ->values()
            ->all();
    }
}
