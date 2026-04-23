<?php

namespace App\Services;

use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GeminiService
{
    private const DEFAULT_TIMEOUT_SECONDS = 45;

    private string $apiKey;

    private string $model;

    private string $apiVersion;

    private string $baseUrl;

    public function __construct()
    {
        $this->apiKey = (string) config('services.gemini.api_key', '');
        $this->model = (string) config('services.gemini.model', 'gemini-1.5-flash');
        $this->apiVersion = (string) config('services.gemini.api_version', 'v1');
        $this->baseUrl = rtrim((string) config('services.gemini.base_url', 'https://generativelanguage.googleapis.com'), '/');
    }

    public function generateJson(string $prompt, array $options = []): ?array
    {
        if (blank($this->apiKey)) {
            Log::warning('GeminiService: GEMINI_API_KEY is not configured.');

            return null;
        }

        $payload = [
            'contents' => [[
                'role' => 'user',
                'parts' => [[
                    'text' => $prompt,
                ]],
            ]],
            'safetySettings' => $options['safety_settings'] ?? $this->mentalHealthSafetySettings(),
            'generationConfig' => array_filter([
                'temperature' => $options['temperature'] ?? 0.2,
                'maxOutputTokens' => $options['max_output_tokens'] ?? 2048,
                'response_mime_type' => 'application/json',
            ], static fn ($value) => $value !== null),
        ];

        if (!empty($options['response_schema'])) {
            $payload['generationConfig']['response_schema'] = $options['response_schema'];
        }

        if (!empty($options['system_instruction'])) {
            $payload['systemInstruction'] = [
                'parts' => [[
                    'text' => $options['system_instruction'],
                ]],
            ];
        }

        try {
            $response = Http::timeout($options['timeout'] ?? self::DEFAULT_TIMEOUT_SECONDS)
                ->retry(2, 500, throw: false)
                ->withHeaders([
                    'x-goog-api-key' => $this->apiKey,
                    'Content-Type' => 'application/json',
                ])
                ->post($this->endpoint(), $payload);

            if ($response->failed()) {
                Log::error('GeminiService: API request failed.', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);

                return null;
            }

            $content = data_get($response->json(), 'candidates.0.content.parts.0.text');

            if (!is_string($content) || trim($content) === '') {
                Log::warning('GeminiService: Empty response content.', [
                    'prompt_feedback' => data_get($response->json(), 'promptFeedback'),
                ]);

                return null;
            }

            $cleanedContent = $this->cleanJsonContent($content);
            $decoded = json_decode($cleanedContent, true);

            if (!is_array($decoded)) {
                Log::warning('GeminiService: Failed to decode JSON response.', [
                    'raw_content' => $cleanedContent,
                    'json_error' => json_last_error_msg(),
                ]);

                return null;
            }

            return $decoded;
        } catch (RequestException $exception) {
            Log::error('GeminiService: Request exception.', [
                'message' => $exception->getMessage(),
            ]);
        } catch (\Throwable $exception) {
            Log::error('GeminiService: Unexpected exception.', [
                'message' => $exception->getMessage(),
            ]);
        }

        return null;
    }

    private function endpoint(): string
    {
        return sprintf('%s/%s/models/%s:generateContent', $this->baseUrl, $this->apiVersion, $this->model);
    }

    private function cleanJsonContent(string $content): string
    {
        $cleaned = preg_replace('/^```json|```$/m', '', trim($content));

        return is_string($cleaned) ? trim($cleaned) : trim($content);
    }

    private function mentalHealthSafetySettings(): array
    {
        return [
            [
                'category' => 'HARM_CATEGORY_HARASSMENT',
                'threshold' => 'BLOCK_NONE',
            ],
            [
                'category' => 'HARM_CATEGORY_HATE_SPEECH',
                'threshold' => 'BLOCK_NONE',
            ],
            [
                'category' => 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
                'threshold' => 'BLOCK_NONE',
            ],
            [
                'category' => 'HARM_CATEGORY_DANGEROUS_CONTENT',
                'threshold' => 'BLOCK_NONE',
            ],
            [
                'category' => 'HARM_CATEGORY_CIVIC_INTEGRITY',
                'threshold' => 'BLOCK_NONE',
            ],
        ];
    }
}
