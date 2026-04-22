<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GeminiService
{
    private string $apiKey;
    private string $baseUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

    public function __construct()
    {
        $this->apiKey = env('GEMINI_API_KEY');
    }

    public function generate($prompt)
    {
        try {
            $response = Http::post("{$this->baseUrl}?key={$this->apiKey}", [
                "contents" => [
                    ["parts" => [["text" => $prompt]]]
                ],
                "generationConfig" => [
                    "response_mime_type" => "application/json",
                ]
            ]);

            if ($response->failed()) {
                Log::error("Gemini API Error: " . $response->body());
                return null;
            }

            // Gemini returns a specific nested structure
            $content = $response->json()['candidates'][0]['content']['parts'][0]['text'];
            return json_decode($content, true);

        } catch (\Exception $e) {
            Log::error("Gemini Service Exception: " . $e->getMessage());
            return null;
        }
    }
}