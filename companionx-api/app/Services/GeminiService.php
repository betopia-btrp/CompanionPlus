<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class GeminiService
{
    public function generate($systemPrompt, $userPrompt)
    {
        $apiKey = env('GEMINI_API_KEY');
        $url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={$apiKey}";
        
        $payload = [
            "contents" => [["parts" => [["text" => "SYSTEM: $systemPrompt \n USER: $userPrompt"]]]],
            "generationConfig" => ["response_mime_type" => "application/json"]
        ];

        $response = Http::withHeaders(['Content-Type' => 'application/json'])->post($url, $payload);

        // --- DEBUG BLOCK ---
        if ($response->failed()) {
            dump("API FAILED! Status: " . $response->status());
            dump("Error Body: ", $response->json());
            return null;
        }

        $resData = $response->json();

        if (!isset($resData['candidates'][0]['content']['parts'][0]['text'])) {
            dump("SAFETY BLOCK! Google refused to answer. Full Response: ", $resData);
            return null;
        }

        $content = $resData['candidates'][0]['content']['parts'][0]['text'];
        $cleanJson = preg_replace('/^```json|```$/m', '', $content);
        return json_decode(trim($cleanJson), true);
    }
}