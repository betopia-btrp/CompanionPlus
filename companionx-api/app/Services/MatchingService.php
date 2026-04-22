<?php

namespace App\Services;

use Illuminate\Support\Collection;
use App\Models\OnboardingAnswer;
use App\Models\ConsultantProfile;
use Illuminate\Support\Facades\Http;
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

    public function getRecommendedConsultants(int $userId): array
    {
        try {
            $answers = OnboardingAnswer::where('user_id', $userId)->get(['question_key', 'answer_text']);
            $consultantsQuery = ConsultantProfile::where('is_approved', true)
                ->with('user:id,first_name,last_name')
                ->select(['id', 'user_id', 'specialization', 'bio']);

            if ($answers->isEmpty()) {
                Log::warning('MatchingService: No onboarding answers found for user.', ['user_id' => $userId]);
                return [];
            }

            $keywords = $this->extractKeywordsWithGemini($answers);

            if (empty($keywords)) {
                $keywords = $this->fallbackKeywords($answers);
            }

            $shortlist = $this->buildShortlist($consultantsQuery, $keywords);

            if ($shortlist->isEmpty()) {
                $shortlist = ConsultantProfile::where('is_approved', true)
                    ->with('user:id,first_name,last_name')
                    ->select(['id', 'user_id', 'specialization', 'bio'])
                    ->get();
            }

            if ($shortlist->isEmpty()) {
                Log::warning("MatchingService: No approved consultants found in DB.");
                return [];
            }

            $ranked = $this->rankConsultants($shortlist, $keywords);

            return $ranked->take(2)->values()->all();

        } catch (\Exception $e) {
            Log::error('MatchingService Exception: ' . $e->getMessage(), ['user_id' => $userId]);
            return [];
        }
    }

    private function extractKeywordsWithGemini(Collection $answers): array
    {
        $apiKey = config('services.gemini.api_key');
        $model = config('services.gemini.model');

        if (blank($apiKey) || blank($model)) {
            Log::warning('MatchingService: GEMINI_API_KEY is not configured.');
            return [];
        }

        $prompt = <<<'PROMPT'
You extract mental-health matching keywords from onboarding answers.
Return ONLY valid JSON with this exact shape:
{"keywords":["stress","career"],"concerns":["stress"],"specializations":["career coach"]}

Rules:
- Use only short, broad keywords.
- Prefer these domains when relevant: depression, anxiety, stress, academic pressure, career, family, relationship, trauma, addiction, self esteem, grief, burnout, mindfulness, confidence, workplace stress, exam anxiety.
- Return at most 5 keywords.
- No markdown, no explanation.
PROMPT;

        $response = Http::timeout(20)->post(
            sprintf(
                'https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s',
                $model,
                $apiKey
            ),
            [
                'contents' => [[
                    'role' => 'user',
                    'parts' => [[
                        'text' => $prompt . "\n\nAnswers:\n" . $answers->toJson(),
                    ]],
                ]],
                'generationConfig' => [
                    'temperature' => 0.2,
                    'responseMimeType' => 'application/json',
                ],
            ]
        );

        if ($response->failed()) {
            Log::error('MatchingService: Gemini keyword extraction failed.', ['body' => $response->body()]);
            return [];
        }

        $content = data_get($response->json(), 'candidates.0.content.parts.0.text', '');
        $decoded = json_decode(trim($content), true);

        if (!is_array($decoded)) {
            return [];
        }

        $keywords = array_merge(
            $decoded['keywords'] ?? [],
            $decoded['concerns'] ?? [],
            $decoded['specializations'] ?? []
        );

        return $this->normalizeKeywords($keywords);
    }

    private function fallbackKeywords(Collection $answers): array
    {
        $text = Str::lower($answers->pluck('answer_text')->implode(' '));

        return collect(self::MATCH_KEYWORDS)
            ->filter(fn (string $keyword) => str_contains($text, Str::lower($keyword)))
            ->values()
            ->all();
    }

    private function buildShortlist($consultantsQuery, array $keywords)
    {
        if (empty($keywords)) {
            return collect();
        }

        return $consultantsQuery
            ->where(function ($query) use ($keywords) {
                foreach ($keywords as $keyword) {
                    $query->orWhere('specialization', 'ilike', '%' . $keyword . '%')
                        ->orWhere('bio', 'ilike', '%' . $keyword . '%');
                }
            })
            ->get();
    }

    private function rankConsultants(Collection $consultants, array $keywords): Collection
    {
        return $consultants
            ->map(function (ConsultantProfile $consultant) use ($keywords) {
                $haystack = Str::lower($consultant->specialization . ' ' . $consultant->bio);

                $matches = collect($keywords)
                    ->filter(fn (string $keyword) => str_contains($haystack, Str::lower($keyword)))
                    ->values();

                $score = $matches->count();

                return [
                    'id' => $consultant->id,
                    'user_id' => $consultant->user_id,
                    'name' => trim(($consultant->user->first_name ?? '') . ' ' . ($consultant->user->last_name ?? '')),
                    'specialization' => $consultant->specialization,
                    'reason' => $matches->isNotEmpty()
                        ? 'Matches: ' . $matches->implode(', ')
                        : 'Broad consultant fit based on specialization and bio.',
                    'score' => $score,
                ];
            })
            ->sortByDesc('score')
            ->values();
    }

    private function normalizeKeywords(array $keywords): array
    {
        return collect($keywords)
            ->filter(fn ($value) => is_string($value) && trim($value) !== '')
            ->map(fn (string $value) => Str::lower(trim($value)))
            ->unique()
            ->take(5)
            ->values()
            ->all();
    }
}