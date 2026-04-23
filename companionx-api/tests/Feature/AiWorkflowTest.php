<?php

use App\Jobs\AnalyzeJournalSentiment;
use App\Jobs\GenerateConsultantRecommendations;
use App\Jobs\GenerateMentalExercises;
use App\Jobs\GenerateOnboardingExercises;
use App\Models\AiRecommendation;
use App\Models\ConsultantProfile;
use App\Models\ExerciseProgress;
use App\Models\MoodJournal;
use App\Models\OnboardingAnswer;
use App\Models\SafetyAlert;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Laravel\Sanctum\Sanctum;

it('queues consultant recommendations after onboarding is completed', function () {
    Queue::fake();

    $user = User::factory()->create([
        'system_role' => 'patient',
    ]);

    Sanctum::actingAs($user);

    $response = $this->postJson('/api/onboarding', [
        'answers' => [
            'primary_concern' => 'Anxiety & Overthinking',
            'duration' => 'Several months',
            'therapist_style' => 'Action-oriented (CBT/Tools)',
        ],
    ]);

    $response
        ->assertOk()
        ->assertJsonPath('recommendation_status', 'queued')
        ->assertJsonPath('exercise_status', 'queued');

    Queue::assertPushed(GenerateConsultantRecommendations::class);
    Queue::assertPushed(GenerateOnboardingExercises::class);
});

it('stores a structured consultant recommendation payload', function () {
    Http::fake([
        'https://generativelanguage.googleapis.com/*' => Http::response([
            'candidates' => [[
                'content' => [
                    'parts' => [[
                        'text' => json_encode([
                            'matches' => [
                                [
                                    'consultant_id' => 1,
                                    'reason' => 'Strong CBT fit for anxiety and overthinking.',
                                ],
                                [
                                    'consultant_id' => 2,
                                    'reason' => 'Helpful for stress management with practical tools.',
                                ],
                            ],
                        ]),
                    ]],
                ],
            ]],
        ], 200),
    ]);

    $patient = User::factory()->create([
        'system_role' => 'patient',
        'onboarding_completed' => true,
    ]);

    OnboardingAnswer::create([
        'user_id' => $patient->id,
        'question_key' => 'primary_concern',
        'answer_text' => 'Anxiety & Overthinking',
    ]);

    OnboardingAnswer::create([
        'user_id' => $patient->id,
        'question_key' => 'therapist_style',
        'answer_text' => 'Action-oriented (CBT/Tools)',
    ]);

    $consultantOneUser = User::factory()->create(['system_role' => 'consultant']);
    $consultantTwoUser = User::factory()->create(['system_role' => 'consultant']);

    ConsultantProfile::create([
        'id' => 1,
        'user_id' => $consultantOneUser->id,
        'specialization' => 'Clinical Psychologist',
        'bio' => 'Expert in CBT and anxiety support.',
        'base_rate_bdt' => 1500,
        'is_approved' => true,
        'average_rating' => 4.9,
    ]);

    ConsultantProfile::create([
        'id' => 2,
        'user_id' => $consultantTwoUser->id,
        'specialization' => 'Stress Management',
        'bio' => 'Uses practical grounding tools for stress and burnout.',
        'base_rate_bdt' => 1300,
        'is_approved' => true,
        'average_rating' => 4.7,
    ]);

    app(GenerateConsultantRecommendations::class, ['userId' => $patient->id])
        ->handle(app(\App\Services\MatchingService::class));

    $stored = AiRecommendation::where('user_id', $patient->id)
        ->where('rec_type', 'consultant_match')
        ->first();

    expect($stored)->not->toBeNull();
    expect($stored->content_json['status'])->toBe('ready');
    expect($stored->content_json['matches'])->toHaveCount(2);
    expect($stored->content_json['profile_summary']['preferred_style'])->toBe('Action-oriented (CBT/Tools)');
});

it('returns pending recommendations when onboarding is complete but the queue has not finished yet', function () {
    $user = User::factory()->create([
        'system_role' => 'patient',
        'onboarding_completed' => true,
    ]);

    Sanctum::actingAs($user);

    $this->getJson('/api/dashboard/recommendations')
        ->assertStatus(202)
        ->assertJsonPath('status', 'pending');
});

it('creates an onboarding exercise plan after onboarding answers are available', function () {
    $patient = User::factory()->create([
        'system_role' => 'patient',
        'onboarding_completed' => true,
    ]);

    OnboardingAnswer::create([
        'user_id' => $patient->id,
        'question_key' => 'primary_concern',
        'answer_text' => 'Career & Workplace Stress',
    ]);

    OnboardingAnswer::create([
        'user_id' => $patient->id,
        'question_key' => 'therapist_style',
        'answer_text' => 'Gentle & Empathetic (Listening)',
    ]);

    app(GenerateOnboardingExercises::class, ['userId' => $patient->id])
        ->handle(app(\App\Services\ExerciseService::class));

    $exercise = AiRecommendation::where('user_id', $patient->id)
        ->where('rec_type', 'exercise')
        ->whereNull('source_journal_id')
        ->first();

    expect($exercise)->not->toBeNull();
    expect($exercise->content_json['phase'])->toBe('onboarding');
    expect($exercise->content_json['generated_from']['trigger'])->toBe('onboarding');
    expect($exercise->content_json['chapters'])->toHaveCount(3);
    expect($exercise->content_json['chapters'][0]['tasks'])->toHaveCount(3);
    expect($exercise->content_json['journey']['total_energy_points'])->toBe(36);
});

it('queues sentiment and exercise jobs after saving a journal entry', function () {
    Queue::fake();

    $user = User::factory()->create([
        'system_role' => 'patient',
    ]);

    Sanctum::actingAs($user);

    $response = $this->postJson('/api/journal', [
        'emoji_mood' => 'sad',
        'text_note' => 'I feel overwhelmed and worried about everything.',
    ]);

    $response
        ->assertCreated()
        ->assertJsonPath('analysis_status', 'queued')
        ->assertJsonPath('exercise_status', 'queued');

    Queue::assertPushed(AnalyzeJournalSentiment::class);
    Queue::assertPushed(GenerateMentalExercises::class);
});

it('updates sentiment and creates a safety alert for high-risk journal entries', function () {
    config()->set('services.gemini.api_key', 'test-key');

    Http::fake([
        'https://generativelanguage.googleapis.com/*' => Http::response([
            'candidates' => [[
                'content' => [
                    'parts' => [[
                        'text' => json_encode([
                            'sentiment_score' => 0.08,
                            'is_at_risk' => true,
                            'severity' => 'critical',
                            'dominant_state' => 'hopeless',
                            'emotional_shift' => 'dipping',
                            'intensity' => 'high',
                            'recommended_focus' => 'connection',
                            'supportive_insight' => 'This entry sounds very heavy.',
                            'risk_summary' => 'The note contains active self-harm language.',
                        ]),
                    ]],
                ],
            ]],
        ], 200),
    ]);

    $user = User::factory()->create([
        'system_role' => 'patient',
    ]);

    $journal = MoodJournal::create([
        'user_id' => $user->id,
        'emoji_mood' => 'anxious',
        'text_note' => 'I feel like I want to die and I am not safe right now.',
    ]);

    app(AnalyzeJournalSentiment::class, ['journalId' => $journal->id])
        ->handle(app(\App\Services\SentimentAnalysisService::class));

    $journal->refresh();

    expect($journal->sentiment_score)->toBe(0.08);
    expect($journal->is_at_risk)->toBeTrue();
    expect($journal->analysis_json['dominant_state'])->toBe('hopeless');
    expect($journal->analysis_json['recommended_focus'])->toBe('connection');

    $alert = SafetyAlert::where('journal_id', $journal->id)->first();

    expect($alert)->not->toBeNull();
    expect($alert->severity)->toBe('critical');
});

it('returns a structured journal dashboard payload with summary and tracker data', function () {
    $user = User::factory()->create([
        'system_role' => 'patient',
    ]);

    $journal = MoodJournal::create([
        'user_id' => $user->id,
        'emoji_mood' => 'anxious',
        'text_note' => 'Feeling pressure and spiraling a bit.',
        'sentiment_score' => 0.24,
        'is_at_risk' => true,
        'analysis_json' => [
            'dominant_state' => 'overwhelmed',
            'emotional_shift' => 'dipping',
            'intensity' => 'high',
            'recommended_focus' => 'grounding',
            'supportive_insight' => 'Slow things down and ground first.',
            'severity' => 'high',
            'risk_summary' => 'The language suggests elevated distress.',
        ],
    ]);

    SafetyAlert::create([
        'journal_id' => $journal->id,
        'patient_id' => $user->id,
        'status' => 'new',
        'severity' => 'high',
    ]);

    Sanctum::actingAs($user);

    $this->getJson('/api/journal')
        ->assertOk()
        ->assertJsonPath('summary.entries_count', 1)
        ->assertJsonPath('summary.latest_state', 'overwhelmed')
        ->assertJsonPath('summary.latest_focus', 'grounding')
        ->assertJsonPath('mood_tracker.entries_count', 1)
        ->assertJsonPath('entries.0.analysis.supportive_insight', 'Slow things down and ground first.')
        ->assertJsonPath('entries.0.safety_alert.severity', 'high')
        ->assertJsonPath('safety.open_alerts_count', 1);
});

it('returns the latest stored exercise recommendation', function () {
    $user = User::factory()->create([
        'system_role' => 'patient',
    ]);

    AiRecommendation::create([
        'user_id' => $user->id,
        'source_journal_id' => null,
        'rec_type' => 'exercise',
        'content_json' => [
            'phase' => 'immediate',
            'trend_analysis' => [
                'summary' => 'Staying steady.',
                'direction' => 'steady',
            ],
            'chapters' => [
                ['chapter_title' => 'Immediate Relief', 'content' => 'Breathe slowly.', 'estimated_time' => '3 min'],
                ['chapter_title' => 'Cognitive Work', 'content' => 'Name the thought.', 'estimated_time' => '5 min'],
                ['chapter_title' => 'Action Step', 'content' => 'Take a short walk.', 'estimated_time' => '10 min'],
            ],
        ],
    ]);

    Sanctum::actingAs($user);

    $this->getJson('/api/dashboard/exercises')
        ->assertOk()
        ->assertJsonStructure(['recommendation_id'])
        ->assertJsonPath('phase', 'immediate')
        ->assertJsonCount(3, 'chapters')
        ->assertJsonCount(3, 'chapters.0.tasks')
        ->assertJsonPath('progress.total_tasks', 9)
        ->assertJsonPath('mood_tracker.entries_count', 0);
});

it('uses adaptive exercise generation only on every 5th journal entry', function () {
    $user = User::factory()->create([
        'system_role' => 'patient',
    ]);

    OnboardingAnswer::create([
        'user_id' => $user->id,
        'question_key' => 'primary_concern',
        'answer_text' => 'Stress',
    ]);

    for ($i = 1; $i <= 5; $i++) {
        MoodJournal::create([
            'user_id' => $user->id,
            'emoji_mood' => 'neutral',
            'text_note' => 'Entry ' . $i,
        ]);
    }

    $fifthJournal = MoodJournal::where('user_id', $user->id)->latest('id')->firstOrFail();
    $exercisePlan = app(\App\Services\ExerciseService::class)->generateForJournal($fifthJournal);

    expect($exercisePlan['phase'])->toBe('adaptive');
    expect($exercisePlan['generated_from']['trend_window_count'])->toBe(5);
    expect($exercisePlan['chapters'][0]['tasks'])->toHaveCount(3);
});

it('stores exercise progress, earned badge, and reflection data', function () {
    $user = User::factory()->create([
        'system_role' => 'patient',
    ]);

    $recommendation = AiRecommendation::create([
        'user_id' => $user->id,
        'source_journal_id' => null,
        'rec_type' => 'exercise',
        'content_json' => [
            'phase' => 'immediate',
            'journey' => [
                'headline' => 'Daily Recovery Quest',
                'motivation' => 'Take small steps.',
                'total_energy_points' => 36,
            ],
            'trend_analysis' => [
                'summary' => 'Steady.',
                'direction' => 'steady',
            ],
            'chapters' => [
                [
                    'chapter_key' => 'immediate_relief',
                    'chapter_title' => 'Immediate Relief',
                    'chapter_goal' => 'Calm the body.',
                    'content' => 'Ground yourself first.',
                    'estimated_time' => '6-8 min',
                    'energy_points' => 12,
                    'reflection_prompt' => 'What eased?',
                    'tasks' => [
                        ['task_key' => 'immediate_relief_task_1', 'title' => 'Breathe', 'instruction' => 'Take 8 breaths.', 'completion_hint' => 'After 8 breaths'],
                        ['task_key' => 'immediate_relief_task_2', 'title' => 'Stretch', 'instruction' => 'Relax your shoulders.', 'completion_hint' => 'After 3 rounds'],
                        ['task_key' => 'immediate_relief_task_3', 'title' => 'Ground', 'instruction' => 'Name what you see.', 'completion_hint' => 'After 3 senses'],
                    ],
                ],
                [
                    'chapter_key' => 'cognitive_work',
                    'chapter_title' => 'Cognitive Work',
                    'chapter_goal' => 'Reframe the thought.',
                    'content' => 'Slow the thought down.',
                    'estimated_time' => '8-10 min',
                    'energy_points' => 12,
                    'reflection_prompt' => 'What changed?',
                    'tasks' => [
                        ['task_key' => 'cognitive_work_task_1', 'title' => 'Write', 'instruction' => 'Name the thought.', 'completion_hint' => 'When written'],
                        ['task_key' => 'cognitive_work_task_2', 'title' => 'Test', 'instruction' => 'Look for evidence.', 'completion_hint' => 'When both sides are listed'],
                        ['task_key' => 'cognitive_work_task_3', 'title' => 'Rewrite', 'instruction' => 'Use kinder language.', 'completion_hint' => 'When rewritten'],
                    ],
                ],
                [
                    'chapter_key' => 'action_step',
                    'chapter_title' => 'Action Step',
                    'chapter_goal' => 'Do one thing today.',
                    'content' => 'Choose a gentle action.',
                    'estimated_time' => '10-12 min',
                    'energy_points' => 12,
                    'reflection_prompt' => 'What felt possible?',
                    'tasks' => [
                        ['task_key' => 'action_step_task_1', 'title' => 'Hydrate', 'instruction' => 'Drink water.', 'completion_hint' => 'After one glass'],
                        ['task_key' => 'action_step_task_2', 'title' => 'Walk', 'instruction' => 'Step outside.', 'completion_hint' => 'After 5 minutes'],
                        ['task_key' => 'action_step_task_3', 'title' => 'Message', 'instruction' => 'Text someone safe.', 'completion_hint' => 'After sending'],
                    ],
                ],
            ],
        ],
    ]);

    Sanctum::actingAs($user);

    $this->patchJson('/api/dashboard/exercises/progress', [
        'recommendation_id' => $recommendation->id,
        'completed_task_keys' => [
            'immediate_relief_task_1',
            'immediate_relief_task_2',
            'immediate_relief_task_3',
        ],
        'review_feeling' => 'steadier',
        'review_text' => 'The first chapter helped me settle down.',
    ])
        ->assertOk()
        ->assertJsonPath('progress.completed_tasks', 3)
        ->assertJsonPath('progress.completed_chapter_keys.0', 'immediate_relief')
        ->assertJsonPath('progress.badge.name', 'Starter Spark')
        ->assertJsonPath('progress.review.feeling', 'steadier');

    $progress = ExerciseProgress::where('user_id', $user->id)
        ->where('recommendation_id', $recommendation->id)
        ->first();

    expect($progress)->not->toBeNull();
    expect($progress->completion_percentage)->toBe(33);
    expect($progress->earned_badge_name)->toBe('Starter Spark');
});

it('returns mood tracker data with the exercise response', function () {
    $user = User::factory()->create([
        'system_role' => 'patient',
    ]);

    AiRecommendation::create([
        'user_id' => $user->id,
        'source_journal_id' => null,
        'rec_type' => 'exercise',
        'content_json' => [
            'phase' => 'immediate',
            'trend_analysis' => [
                'summary' => 'Steady.',
                'direction' => 'steady',
            ],
            'chapters' => [
                ['chapter_title' => 'Immediate Relief', 'content' => 'Breathe slowly.', 'estimated_time' => '3 min'],
                ['chapter_title' => 'Cognitive Work', 'content' => 'Name the thought.', 'estimated_time' => '5 min'],
                ['chapter_title' => 'Action Step', 'content' => 'Take a short walk.', 'estimated_time' => '10 min'],
            ],
        ],
    ]);

    MoodJournal::create([
        'user_id' => $user->id,
        'emoji_mood' => 'sad',
        'text_note' => 'Heavy day.',
        'sentiment_score' => 0.28,
    ]);

    MoodJournal::create([
        'user_id' => $user->id,
        'emoji_mood' => 'happy',
        'text_note' => 'Feeling a bit better.',
        'sentiment_score' => 0.74,
    ]);

    Sanctum::actingAs($user);

    $this->getJson('/api/dashboard/exercises')
        ->assertOk()
        ->assertJsonPath('mood_tracker.entries_count', 2)
        ->assertJsonPath('mood_tracker.average_score', 0.51)
        ->assertJsonCount(2, 'mood_tracker.points');
});
