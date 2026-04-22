<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GeminiService
{
    private ?string $apiKey;
    private string $model;

    public function __construct()
    {
        $this->apiKey = config('services.gemini.api_key');
        $this->model = config('services.gemini.model', 'gemini-1.5-flash');
    }

    public function generate(string $systemPrompt, string $userPrompt): ?array
    {
        if (blank($this->apiKey)) {
            Log::error('GeminiService: API Key is missing.');
            return null;
        }

        // We use the stable v1 endpoint
        $url = "https://generativelanguage.googleapis.com/v1/models/{$this->model}:generateContent?key={$this->apiKey}";

        $payload = [
            'contents' => [
                [
                    'parts' => [
                        ['text' => "SYSTEM INSTRUCTION: $systemPrompt\n\nUSER INPUT: $userPrompt\n\nIMPORTANT: Return ONLY a raw JSON object/array. No markdown. No conversational text."]
                    ]
                ]
            ],
            'generationConfig' => [
                'temperature' => 0.5,
            ]
        ];

        try {
            $response = Http::timeout(30)->post($url, $payload);

            if ($response->failed()) {
                Log::error('GeminiService API Error: ', [
                    'status' => $response->status(),
                    'body' => $response->json()
                ]);
                return null;
            }

            $content = data_get($response->json(), 'candidates.0.content.parts.0.text');

            if (blank($content)) {
                Log::warning('GeminiService: Empty content returned.');
                return null;
            }

            // Remove any markdown code block wrappers
            $cleanJson = preg_replace('/^```json|```$/m', '', $content);
            $decoded = json_decode(trim($cleanJson), true);

            return is_array($decoded) ? $decoded : null;

        } catch (\Exception $e) {
            Log::error('GeminiService Exception: ' . $e->getMessage());
            return null;
        }
    }
}