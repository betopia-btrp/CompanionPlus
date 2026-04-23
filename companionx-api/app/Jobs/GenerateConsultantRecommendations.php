<?php

namespace App\Jobs;

use App\Models\AiRecommendation;
use App\Services\MatchingService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class GenerateConsultantRecommendations implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $userId;
    public int $tries = 3;
    public int $timeout = 120;

    /**
     * Create a new job instance.
     */
    public function __construct(int $userId)
    {
        $this->userId = $userId;
        $this->onQueue('default');
    }

    /**
     * Execute the job.
     */
    public function handle(MatchingService $matchingService): void
    {
        try {
            $recommendationPayload = $matchingService->generateRecommendationPayload($this->userId);

            if (!empty($recommendationPayload)) {
                AiRecommendation::updateOrCreate(
                    [
                        'user_id' => $this->userId,
                        'rec_type' => 'consultant_match',
                    ],
                    [
                        'content_json' => $recommendationPayload,
                    ]
                );
            }
        } catch (\Throwable $e) {
            Log::error('GenerateConsultantRecommendations failed: ' . $e->getMessage(), [
                'user_id' => $this->userId,
            ]);

            throw $e;
        }
    }
}
