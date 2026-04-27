<?php

namespace App\Services;

use App\Models\ExerciseProgress;
use App\Models\MoodJournal;
use App\Models\OnboardingAnswer;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

class ExerciseService
{
    public function __construct(private readonly GeminiService $geminiService)
    {
    }

    public function generateForOnboarding(int $userId): array
    {
        $onboardingAnswers = OnboardingAnswer::where('user_id', $userId)
            ->orderBy('id')
            ->get(['question_key', 'answer_text']);

        $response = $this->geminiService->generateJson(
            $this->buildOnboardingPrompt($onboardingAnswers, $this->buildPersonalizationContext($userId)),
            [
                'temperature' => 0.35,
                'max_output_tokens' => 2200,
                'system_instruction' => 'You are a clinical strategist creating supportive, non-diagnostic mental wellness exercises. Return only JSON.',
            ]
        );

        $normalized = $this->normalizeResponse(
            $response,
            phase: 'onboarding',
            generatedFrom: [
                'trigger' => 'onboarding',
                'journal_id' => null,
                'entry_count' => 0,
                'trend_window_count' => 0,
            ]
        );

        if ($normalized !== null) {
            return $normalized;
        }

        return $this->fallbackOnboardingResponse();
    }

    public function generateForJournal(MoodJournal $journal): array
    {
        $recentEntries = MoodJournal::where('user_id', $journal->user_id)
            ->latest('created_at')
            ->take(5)
            ->get()
            ->reverse()
            ->values();

        $entryCount = MoodJournal::where('user_id', $journal->user_id)->count();
        $onboardingAnswers = OnboardingAnswer::where('user_id', $journal->user_id)
            ->orderBy('id')
            ->get(['question_key', 'answer_text']);

        $shouldAnalyzeTrend = $entryCount >= 5 && $entryCount % 5 === 0 && $recentEntries->count() === 5;
        $phase = $shouldAnalyzeTrend ? 'adaptive' : 'immediate';

        $response = $this->geminiService->generateJson(
            $this->buildJournalPrompt(
                $journal,
                $onboardingAnswers,
                $recentEntries,
                $shouldAnalyzeTrend,
                $this->buildPersonalizationContext($journal->user_id)
            ),
            [
                'temperature' => 0.4,
                'max_output_tokens' => 2600,
                'system_instruction' => 'You are a clinical strategist creating supportive, non-diagnostic mental wellness exercises. Return only JSON.',
            ]
        );

        $normalized = $this->normalizeResponse(
            $response,
            phase: $phase,
            generatedFrom: [
                'trigger' => 'journal',
                'journal_id' => $journal->id,
                'entry_count' => $entryCount,
                'trend_window_count' => $shouldAnalyzeTrend ? 5 : 0,
            ],
            journal: $journal
        );

        if ($normalized !== null) {
            return $normalized;
        }

        return $this->fallbackJournalResponse($journal, $phase, $recentEntries, $entryCount);
    }

    public function normalizeStoredPayload(array $payload): array
    {
        $normalized = $this->normalizeResponse(
            $payload,
            phase: (string) data_get($payload, 'phase', 'immediate'),
            generatedFrom: [
                'trigger' => data_get($payload, 'generated_from.trigger', 'journal'),
                'journal_id' => data_get($payload, 'generated_from.journal_id'),
                'entry_count' => (int) data_get($payload, 'generated_from.entry_count', 0),
                'trend_window_count' => (int) data_get($payload, 'generated_from.trend_window_count', 0),
            ],
        );

        if ($normalized !== null) {
            return $normalized;
        }

        $phase = $this->normalizePhase((string) data_get($payload, 'phase', 'immediate'), 'immediate');

        if ($phase === 'onboarding') {
            return $this->fallbackOnboardingResponse();
        }

        $journal = null;
        $journalId = data_get($payload, 'generated_from.journal_id');

        if (is_numeric($journalId)) {
            $journal = MoodJournal::find((int) $journalId);
        }

        return $journal instanceof MoodJournal
            ? $this->fallbackJournalResponse(
                $journal,
                $phase,
                collect(),
                (int) data_get($payload, 'generated_from.entry_count', 0)
            )
            : $this->fallbackStoredExerciseResponse(
                $phase,
                [
                    'trigger' => data_get($payload, 'generated_from.trigger', 'journal'),
                    'journal_id' => $journalId,
                    'entry_count' => (int) data_get($payload, 'generated_from.entry_count', 0),
                    'trend_window_count' => (int) data_get($payload, 'generated_from.trend_window_count', 0),
                ],
                is_array(data_get($payload, 'journal')) ? data_get($payload, 'journal') : null
            );
    }

    public function badgeTrack(): array
    {
        return [
            [
                'code' => 'starter_spark',
                'name' => 'Starter Spark',
                'description' => 'You showed up and completed your first chapter.',
                'unlock_after_chapters' => 1,
            ],
            [
                'code' => 'steady_climber',
                'name' => 'Steady Climber',
                'description' => 'Two chapters down — momentum is building.',
                'unlock_after_chapters' => 2,
            ],
            [
                'code' => 'mindful_finisher',
                'name' => 'Mindful Finisher',
                'description' => 'Full guide complete. That takes real commitment.',
                'unlock_after_chapters' => 3,
            ],
        ];
    }

    public function templates(): array
    {
        return [
            [
                'id' => 'calm_foundations',
                'title' => 'Calm Foundations',
                'description' => 'Settle your nervous system with slow breathing, a gentle body scan, and a gratitude pause.',
                'estimated_time' => '15-20 min',
                'content_json' => [
                    'status' => 'ready',
                    'phase' => 'immediate',
                    'journey' => [
                        'headline' => 'Calm Foundations',
                        'motivation' => 'Rebuild a sense of safety through small, repeatable acts of attention.',
                        'total_energy_points' => 36,
                        'badge_track' => $this->badgeTrack(),
                    ],
                    'chapters' => [
                        [
                            'chapter_key' => 'box_breathing',
                            'chapter_title' => 'Breathing Reset',
                            'chapter_goal' => 'Slow your heart rate and shift your nervous system toward calm.',
                            'content' => 'Your breath is the fastest lever you have to influence your nervous system. By extending your exhale, you activate the vagus nerve and signal safety to your body. This chapter walks you through a simple box-breathing pattern — four counts in, hold, out, hold — repeated until your shoulders drop and your mind settles.',
                            'estimated_time' => '6-8 min',
                            'energy_points' => 12,
                            'reflection_prompt' => 'After this breathing exercise, what changed in your body?',
                            'tasks' => [
                                ['task_key' => 'breath_settle', 'title' => 'Find your seat', 'instruction' => 'Sit upright with both feet on the floor. Rest your hands on your thighs and close your eyes.', 'completion_hint' => 'Mark done when seated and settled.'],
                                ['task_key' => 'breath_box', 'title' => 'Box breathing', 'instruction' => 'Inhale for 4 counts, hold for 4 counts, exhale for 4 counts, hold for 4 counts. Repeat 5 full cycles.', 'completion_hint' => 'Mark done after all 5 cycles.'],
                                ['task_key' => 'breath_notice', 'title' => 'Notice the shift', 'instruction' => 'Take one natural breath. Compare how your chest, shoulders, and mind feel now vs. when you started.', 'completion_hint' => 'Mark done after you notice a difference.'],
                            ],
                        ],
                        [
                            'chapter_key' => 'body_scan',
                            'chapter_title' => 'Gentle Body Scan',
                            'chapter_goal' => 'Release stored tension by systematically bringing awareness to each part of your body.',
                            'content' => 'Tension accumulates in places you do not notice — your jaw, your shoulders, your hands. This chapter guides you through a slow scan from crown to toes, inviting each area to soften. The goal is not relaxation on command, but noticing without judgment.',
                            'estimated_time' => '6-8 min',
                            'energy_points' => 12,
                            'reflection_prompt' => 'Where in your body do you tend to hold tension without noticing?',
                            'tasks' => [
                                ['task_key' => 'scan_start', 'title' => 'Crown to forehead', 'instruction' => 'Bring your attention to the top of your head. Slowly move it down your face, noticing your jaw — is it clenched? Soften it.', 'completion_hint' => 'Mark done when you have scanned to your chin.'],
                                ['task_key' => 'scan_mid', 'title' => 'Neck to hands', 'instruction' => 'Move your awareness down your neck, across your shoulders, down your arms to your fingertips. Let each area relax as you exhale.', 'completion_hint' => 'Mark done after reaching your fingertips.'],
                                ['task_key' => 'scan_end', 'title' => 'Torso to toes', 'instruction' => 'Scan your chest, stomach, hips, legs, and feet. Notice any areas of holding and imagine your breath reaching them.', 'completion_hint' => 'Mark done after you finish scanning your feet.'],
                            ],
                        ],
                        [
                            'chapter_key' => 'gratitude_pause',
                            'chapter_title' => 'Gratitude Pause',
                            'chapter_goal' => 'Anchor your mind on something positive before moving on with your day.',
                            'content' => 'Gratitude is not about ignoring difficulty. It is a practice of training your attention to hold two things at once — the hard and the good. This final chapter asks you to name three small things that went well or felt okay, no matter how minor.',
                            'estimated_time' => '4-6 min',
                            'energy_points' => 12,
                            'reflection_prompt' => 'Which of the three things you listed feels most accessible to repeat tomorrow?',
                            'tasks' => [
                                ['task_key' => 'gratitude_three', 'title' => 'Name three things', 'instruction' => 'Write down three small things that went okay today. They can be as simple as "the coffee was hot" or "I took a break."', 'completion_hint' => 'Mark done when three things are written.'],
                                ['task_key' => 'gratitude_one', 'title' => 'Sit with one', 'instruction' => 'Pick one of the three. Close your eyes and replay that moment for 30 seconds. Let yourself feel it.', 'completion_hint' => 'Mark done after 30 seconds.'],
                                ['task_key' => 'gratitude_close', 'title' => 'Close with intention', 'instruction' => 'Place one hand on your chest. Take one slow breath and say to yourself: "I showed up for myself today."', 'completion_hint' => 'Mark done after you say the phrase.'],
                            ],
                        ],
                    ],
                ],
            ],
            [
                'id' => 'stress_reset',
                'title' => 'Stress Reset',
                'description' => 'Release tension through progressive relaxation, reframe a stressful thought, and take one small action.',
                'estimated_time' => '15-20 min',
                'content_json' => [
                    'status' => 'ready',
                    'phase' => 'immediate',
                    'journey' => [
                        'headline' => 'Stress Reset',
                        'motivation' => 'When stress builds, the fastest way out is through the body. This guide helps you release, reframe, and act.',
                        'total_energy_points' => 36,
                        'badge_track' => $this->badgeTrack(),
                    ],
                    'chapters' => [
                        [
                            'chapter_key' => 'progressive_relaxation',
                            'chapter_title' => 'Progressive Relaxation',
                            'chapter_goal' => 'Release physical tension stored in your muscles.',
                            'content' => 'Progressive relaxation works by tensing and then releasing each muscle group. The contrast helps your brain recognize what "letting go" feels like. Move through each area deliberately — tense for 5 seconds, then release slowly.',
                            'estimated_time' => '6-8 min',
                            'energy_points' => 12,
                            'reflection_prompt' => 'Which part of your body was holding the most tension?',
                            'tasks' => [
                                ['task_key' => 'relax_upper', 'title' => 'Upper body release', 'instruction' => 'Tense your shoulders by lifting them toward your ears. Hold for 5 seconds. Release slowly. Repeat 3 times.', 'completion_hint' => 'Mark done after 3 shoulder releases.'],
                                ['task_key' => 'relax_mid', 'title' => 'Hands and jaw', 'instruction' => 'Make tight fists. Hold for 5 seconds. Release. Then clench your jaw. Hold 5 seconds. Release. Repeat both twice.', 'completion_hint' => 'Mark done after 2 rounds.'],
                                ['task_key' => 'relax_lower', 'title' => 'Legs and feet', 'instruction' => 'Tense your thighs and curl your toes downward. Hold 5 seconds. Release. Repeat 3 times.', 'completion_hint' => 'Mark done after 3 rounds.'],
                            ],
                        ],
                        [
                            'chapter_key' => 'reframe_thought',
                            'chapter_title' => 'Thought Reframe',
                            'chapter_goal' => 'Slow down a stressful thought and build a more balanced version.',
                            'content' => 'Stressful thoughts feel urgent and true. The goal here is not to delete them but to create space. Pick one thought that is weighing on you and examine it — is it fully true? What would you say to a friend who had this thought?',
                            'estimated_time' => '6-8 min',
                            'energy_points' => 12,
                            'reflection_prompt' => 'What feels different about the reframed version?',
                            'tasks' => [
                                ['task_key' => 'reframe_name', 'title' => 'Name the thought', 'instruction' => 'Write down one stressful thought as a single sentence. Example: "I am not doing enough."', 'completion_hint' => 'Mark done when the thought is written.'],
                                ['task_key' => 'reframe_test', 'title' => 'Test the evidence', 'instruction' => 'Write one piece of evidence that supports the thought and one that contradicts it.', 'completion_hint' => 'Mark done when both are written.'],
                                ['task_key' => 'reframe_rewrite', 'title' => 'Rewrite with balance', 'instruction' => 'Rewrite the thought as if you were speaking to a close friend with honesty and care.', 'completion_hint' => 'Mark done after rewriting.'],
                            ],
                        ],
                        [
                            'chapter_key' => 'small_action',
                            'chapter_title' => 'One Small Action',
                            'chapter_goal' => 'Convert insight into a single action you can complete in the next 10 minutes.',
                            'content' => 'Stress shrinks your sense of agency. The antidote is one small, completable action. Not a big plan — just one thing that moves you forward. Choose from the tasks below or invent your own.',
                            'estimated_time' => '4-6 min',
                            'energy_points' => 12,
                            'reflection_prompt' => 'How did completing this action change your sense of control?',
                            'tasks' => [
                                ['task_key' => 'action_drink', 'title' => 'Hydrate', 'instruction' => 'Drink a full glass of water slowly. Notice how it feels going down.', 'completion_hint' => 'Mark done when glass is empty.'],
                                ['task_key' => 'action_step_out', 'title' => 'Step outside', 'instruction' => 'Stand outside or by an open window for 2 minutes. Take 5 deep breaths of fresh air.', 'completion_hint' => 'Mark done after 2 minutes.'],
                                ['task_key' => 'action_tidy', 'title' => 'Tidy one surface', 'instruction' => 'Pick one small surface — your desk, a counter, a nightstand. Clear one thing from it.', 'completion_hint' => 'Mark done when the surface is clearer.'],
                            ],
                        ],
                    ],
                ],
            ],
            [
                'id' => 'morning_clarity',
                'title' => 'Morning Clarity',
                'description' => 'Start your day with intention — a wake-up breath practice, intention setting, and a gentle journal prompt.',
                'estimated_time' => '12-15 min',
                'content_json' => [
                    'status' => 'ready',
                    'phase' => 'immediate',
                    'journey' => [
                        'headline' => 'Morning Clarity',
                        'motivation' => 'How you start sets the tone. This short sequence helps you arrive in your day with intention instead of autopilot.',
                        'total_energy_points' => 36,
                        'badge_track' => $this->badgeTrack(),
                    ],
                    'chapters' => [
                        [
                            'chapter_key' => 'wake_up_breath',
                            'chapter_title' => 'Wake-Up Breath',
                            'chapter_goal' => 'Transition from sleep to alertness with controlled breathing.',
                            'content' => 'Morning breathing is different from evening practice — here we want gentle activation, not sedation. Use slightly longer inhales than exhales to invite alertness into your body.',
                            'estimated_time' => '4-5 min',
                            'energy_points' => 12,
                            'reflection_prompt' => 'How does your mind feel after this breathing shift?',
                            'tasks' => [
                                ['task_key' => 'morning_breath_1', 'title' => 'Three grounding breaths', 'instruction' => 'Breathe in through your nose for 4 counts, out through your mouth for 4 counts. Do this 3 times.', 'completion_hint' => 'Mark done after 3 breaths.'],
                                ['task_key' => 'morning_breath_2', 'title' => 'Energizing breaths', 'instruction' => 'Inhale for 4 counts, exhale for 4 counts. On the next breath, inhale for 4, exhale for 6. Repeat 4 times.', 'completion_hint' => 'Mark done after 4 rounds.'],
                                ['task_key' => 'morning_breath_3', 'title' => 'Set a rhythm', 'instruction' => 'Find a natural breath rhythm without counting. Follow it for 10 breaths.', 'completion_hint' => 'Mark done after 10 breaths.'],
                            ],
                        ],
                        [
                            'chapter_key' => 'intention_setting',
                            'chapter_title' => 'Set Your Intention',
                            'chapter_goal' => 'Choose one quality to carry through your day.',
                            'content' => 'An intention is not a to-do. It is a quality you want to embody — patience, curiosity, steadiness, gentleness. Pick one word or phrase and let it shape how you move through the next few hours.',
                            'estimated_time' => '4-5 min',
                            'energy_points' => 12,
                            'reflection_prompt' => 'What made you choose this particular intention today?',
                            'tasks' => [
                                ['task_key' => 'intention_choose', 'title' => 'Choose a word', 'instruction' => 'Pick one word that describes how you want to feel today: patient, calm, focused, kind, steady, or your own.', 'completion_hint' => 'Mark done when you have chosen a word.'],
                                ['task_key' => 'intention_why', 'title' => 'Write why it matters', 'instruction' => 'Write one sentence about why this quality matters for today specifically.', 'completion_hint' => 'Mark done when written.'],
                                ['task_key' => 'intention_anchor', 'title' => 'Anchor it', 'instruction' => 'Place your hand on your chest. Say your intention out loud: "Today I will carry [your word]."', 'completion_hint' => 'Mark done after saying it aloud.'],
                            ],
                        ],
                        [
                            'chapter_key' => 'morning_journal',
                            'chapter_title' => 'Gentle Journal Prompt',
                            'chapter_goal' => 'Clear your mind onto paper before the day claims your attention.',
                            'content' => 'Morning journaling is not about deep analysis — it is about emptying whatever is already there so you start with a cleaner slate. Write whatever comes, without editing or judging.',
                            'estimated_time' => '4-5 min',
                            'energy_points' => 12,
                            'reflection_prompt' => 'What was the easiest thing to write? The hardest?',
                            'tasks' => [
                                ['task_key' => 'journal_brain', 'title' => 'Brain dump', 'instruction' => 'Write everything on your mind right now — tasks, worries, ideas. No structure needed.', 'completion_hint' => 'Mark done after filling half a page.'],
                                ['task_key' => 'journal_today', 'title' => 'One thing for today', 'instruction' => 'Write one thing you are looking forward to today, even if it is small.', 'completion_hint' => 'Mark done when written.'],
                                ['task_key' => 'journal_close', 'title' => 'Close with breath', 'instruction' => 'Read back what you wrote. Take one slow breath. Close the notebook.', 'completion_hint' => 'Mark done after closing.'],
                            ],
                        ],
                    ],
                ],
            ],
            [
                'id' => 'evening_wind_down',
                'title' => 'Evening Wind Down',
                'description' => 'Release the day with tension release, gratitude reflection, and a calming breathing sequence.',
                'estimated_time' => '15-20 min',
                'content_json' => [
                    'status' => 'ready',
                    'phase' => 'immediate',
                    'journey' => [
                        'headline' => 'Evening Wind Down',
                        'motivation' => 'The goal of an evening practice is not to analyze the day but to release it. Let this guide help you transition toward rest.',
                        'total_energy_points' => 36,
                        'badge_track' => $this->badgeTrack(),
                    ],
                    'chapters' => [
                        [
                            'chapter_key' => 'evening_release',
                            'chapter_title' => 'Tension Release',
                            'chapter_goal' => 'Physically let go of the day you just carried.',
                            'content' => 'Your body has been holding the day postures, tension, and accumulated stress. This chapter is a simple invitation to let it go, part by part, before you try to sleep.',
                            'estimated_time' => '6-8 min',
                            'energy_points' => 12,
                            'reflection_prompt' => 'What is one tension you did not realize you were holding?',
                            'tasks' => [
                                ['task_key' => 'evening_tension_1', 'title' => 'Roll your shoulders', 'instruction' => 'Roll your shoulders forward 5 times, then backward 5 times. Let them drop at the end.', 'completion_hint' => 'Mark done after all 10 rolls.'],
                                ['task_key' => 'evening_tension_2', 'title' => 'Neck stretch', 'instruction' => 'Gently tilt your head to the right, hold for 3 breaths. Repeat on the left side.', 'completion_hint' => 'Mark done after both sides.'],
                                ['task_key' => 'evening_tension_3', 'title' => 'Shake it off', 'instruction' => 'Shake your hands and feet gently for 10 seconds. Let the movement travel up your arms and legs.', 'completion_hint' => 'Mark done after 10 seconds.'],
                            ],
                        ],
                        [
                            'chapter_key' => 'evening_gratitude',
                            'chapter_title' => 'Evening Gratitude',
                            'chapter_goal' => 'Find one moment from the day worth carrying forward.',
                            'content' => 'Gratitude at night is different from morning gratitude. Here, you are not setting an intention — you are reviewing the day and choosing one moment that felt okay, warm, or meaningful.',
                            'estimated_time' => '4-6 min',
                            'energy_points' => 12,
                            'reflection_prompt' => 'Why does this particular moment stand out?',
                            'tasks' => [
                                ['task_key' => 'evening_grat_1', 'title' => 'Recall one moment', 'instruction' => 'Think back through your day. Find one moment that felt pleasant, warm, or neutral. It can be very small.', 'completion_hint' => 'Mark done when you recall a moment.'],
                                ['task_key' => 'evening_grat_2', 'title' => 'Describe it', 'instruction' => 'Write 2-3 sentences describing that moment. What happened? Where were you? How did it feel?', 'completion_hint' => 'Mark done when written.'],
                                ['task_key' => 'evening_grat_3', 'title' => 'Thank yourself', 'instruction' => 'Place your hand on your heart and say: "I am grateful I noticed this moment."', 'completion_hint' => 'Mark done after saying it.'],
                            ],
                        ],
                        [
                            'chapter_key' => 'evening_breath',
                            'chapter_title' => 'Calming Breath',
                            'chapter_goal' => 'Signal your nervous system that it is safe to rest.',
                            'content' => 'Longer exhales activate the parasympathetic nervous system. This final breathing pattern uses a 4-7-8 rhythm — inhale for 4, hold for 7, exhale for 8 — to gently guide your body toward rest.',
                            'estimated_time' => '4-6 min',
                            'energy_points' => 12,
                            'reflection_prompt' => 'What changed between your first breath and your last?',
                            'tasks' => [
                                ['task_key' => 'evening_breath_1', 'title' => 'Settle in', 'instruction' => 'Lie down or sit back. Close your eyes. Take 3 natural breaths.', 'completion_hint' => 'Mark done after 3 breaths.'],
                                ['task_key' => 'evening_breath_2', 'title' => '4-7-8 breathing', 'instruction' => 'Inhale through your nose for 4 counts. Hold for 7 counts. Exhale through your mouth for 8 counts. Repeat 4 times.', 'completion_hint' => 'Mark done after 4 cycles.'],
                                ['task_key' => 'evening_breath_3', 'title' => 'Rest in silence', 'instruction' => 'Let your breath return to natural. Rest in silence for 30 seconds. Notice the quiet.', 'completion_hint' => 'Mark done after 30 seconds.'],
                            ],
                        ],
                    ],
                ],
            ],
            [
                'id' => 'energy_boost',
                'title' => 'Energy Boost',
                'description' => 'Lift your energy with gentle movement, cognitive activation, and a commitment to one thing.',
                'estimated_time' => '12-15 min',
                'content_json' => [
                    'status' => 'ready',
                    'phase' => 'immediate',
                    'journey' => [
                        'headline' => 'Energy Boost',
                        'motivation' => 'Low energy often comes from stagnation, not depletion. Movement and activation can shift your state faster than waiting to feel ready.',
                        'total_energy_points' => 36,
                        'badge_track' => $this->badgeTrack(),
                    ],
                    'chapters' => [
                        [
                            'chapter_key' => 'gentle_movement',
                            'chapter_title' => 'Gentle Movement',
                            'chapter_goal' => 'Wake up your body without overwhelming it.',
                            'content' => 'When energy is low, the impulse is to do nothing. But gentle movement actually generates energy. You do not need a workout — just enough motion to remind your body it is capable.',
                            'estimated_time' => '4-5 min',
                            'energy_points' => 12,
                            'reflection_prompt' => 'How does your body feel after moving?',
                            'tasks' => [
                                ['task_key' => 'movement_1', 'title' => 'Stand and stretch', 'instruction' => 'Stand up. Reach your arms overhead and stretch your whole body. Hold for 5 seconds.', 'completion_hint' => 'Mark done after the stretch.'],
                                ['task_key' => 'movement_2', 'title' => 'March in place', 'instruction' => 'March in place for 30 seconds. Lift your knees gently. Swing your arms naturally.', 'completion_hint' => 'Mark done after 30 seconds.'],
                                ['task_key' => 'movement_3', 'title' => 'Side bends', 'instruction' => 'Stand with feet hip-width apart. Gently bend to your right side, hold 3 breaths. Repeat on the left.', 'completion_hint' => 'Mark done after both sides.'],
                            ],
                        ],
                        [
                            'chapter_key' => 'cognitive_activation',
                            'chapter_title' => 'Cognitive Activation',
                            'chapter_goal' => 'Shift your mental state with a simple focusing exercise.',
                            'content' => 'Mental fog is normal when energy is low. The best remedy is not to push harder but to engage in a low-stakes cognitive task that builds momentum.',
                            'estimated_time' => '4-5 min',
                            'energy_points' => 12,
                            'reflection_prompt' => 'Did focusing on something simple change your mental clarity?',
                            'tasks' => [
                                ['task_key' => 'cog_1', 'title' => 'Name 5 things', 'instruction' => 'Look around the room. Name 5 things you can see, 4 you can hear, and 3 you can feel.', 'completion_hint' => 'Mark done after naming all 12.'],
                                ['task_key' => 'cog_2', 'title' => 'Count backward', 'instruction' => 'Count backward from 100 by 7: 100, 93, 86... Go as far as you can.', 'completion_hint' => 'Mark done when you stop.'],
                                ['task_key' => 'cog_3', 'title' => 'One sentence', 'instruction' => 'Write one sentence describing what you want to accomplish in the next hour.', 'completion_hint' => 'Mark done when written.'],
                            ],
                        ],
                        [
                            'chapter_key' => 'commitment',
                            'chapter_title' => 'One Commitment',
                            'chapter_goal' => 'Channel your renewed energy into a single, meaningful action.',
                            'content' => 'Energy without direction dissipates. Use this final chapter to choose one thing to do next — not everything, just one. The momentum you built in the first two chapters is fuel. Now steer it.',
                            'estimated_time' => '4-5 min',
                            'energy_points' => 12,
                            'reflection_prompt' => 'What made you choose this particular action over others?',
                            'tasks' => [
                                ['task_key' => 'commit_1', 'title' => 'Choose one action', 'instruction' => 'Look at your to-do list or think about what needs attention. Pick ONE thing that would feel good to complete.', 'completion_hint' => 'Mark done when you choose.'],
                                ['task_key' => 'commit_2', 'title' => 'Set a 10-minute timer', 'instruction' => 'Commit to working on your chosen action for 10 minutes. Set a timer and begin.', 'completion_hint' => 'Mark done after 10 minutes of focused work.'],
                                ['task_key' => 'commit_3', 'title' => 'Acknowledge the start', 'instruction' => 'Pause. Recognize that starting was the hardest part and you did it. Take one breath.', 'completion_hint' => 'Mark done after acknowledging.'],
                            ],
                        ],
                    ],
                ],
            ],
        ];
    }

    private function buildOnboardingPrompt(Collection $onboardingAnswers, array $personalization): string
    {
        $answers = $onboardingAnswers
            ->map(fn ($answer) => '- ' . $answer->question_key . ': ' . $answer->answer_text)
            ->implode("\n");

        $personalizationJson = json_encode($personalization, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);

        return <<<PROMPT
Create a supportive onboarding exercise plan for a patient.

Onboarding context:
{$answers}

Personalization signals from previous exercise feedback:
{$personalizationJson}

Instructions:
- Act as a clinical strategist, not a diagnostician.
- Build a gamified 3-chapter guide:
  1. Immediate relief (breathing or grounding)
  2. Cognitive work (a simple reframe based on the patient's main concern)
  3. Action step (gentle tasks the patient can finish today)
- Each chapter must feel deeper than a single paragraph. Give a chapter goal, 3 concrete tasks, and a reflection prompt.
- Keep the tone calm, warm, and practical.
- Avoid medical claims or crisis instructions.

Return ONLY valid JSON with this exact shape:
{
  "phase": "onboarding",
  "trend_analysis": {
    "summary": "Short summary of the starting pattern.",
    "direction": "steady"
  },
  "journey": {
    "headline": "A motivating title",
    "motivation": "A short explanation of why this plan matters today.",
    "total_energy_points": 36
  },
  "chapters": [
    {
      "chapter_key": "immediate_relief",
      "chapter_title": "Immediate Relief",
      "chapter_goal": "Why this chapter matters right now.",
      "content": "A coaching paragraph that guides the user through the chapter.",
      "estimated_time": "6-8 min",
      "energy_points": 12,
      "reflection_prompt": "A short reflection question.",
      "tasks": [
        {
          "task_key": "immediate_relief_task_1",
          "title": "Task title",
          "instruction": "Specific instruction",
          "completion_hint": "How the user knows it is done"
        },
        {
          "task_key": "immediate_relief_task_2",
          "title": "Task title",
          "instruction": "Specific instruction",
          "completion_hint": "How the user knows it is done"
        },
        {
          "task_key": "immediate_relief_task_3",
          "title": "Task title",
          "instruction": "Specific instruction",
          "completion_hint": "How the user knows it is done"
        }
      ]
    },
    {
      "chapter_key": "cognitive_work",
      "chapter_title": "Cognitive Work",
      "chapter_goal": "Why this chapter matters right now.",
      "content": "A coaching paragraph that guides the user through the chapter.",
      "estimated_time": "8-10 min",
      "energy_points": 12,
      "reflection_prompt": "A short reflection question.",
      "tasks": [
        {
          "task_key": "cognitive_work_task_1",
          "title": "Task title",
          "instruction": "Specific instruction",
          "completion_hint": "How the user knows it is done"
        },
        {
          "task_key": "cognitive_work_task_2",
          "title": "Task title",
          "instruction": "Specific instruction",
          "completion_hint": "How the user knows it is done"
        },
        {
          "task_key": "cognitive_work_task_3",
          "title": "Task title",
          "instruction": "Specific instruction",
          "completion_hint": "How the user knows it is done"
        }
      ]
    },
    {
      "chapter_key": "action_step",
      "chapter_title": "Action Step",
      "chapter_goal": "Why this chapter matters right now.",
      "content": "A coaching paragraph that guides the user through the chapter.",
      "estimated_time": "10-12 min",
      "energy_points": 12,
      "reflection_prompt": "A short reflection question.",
      "tasks": [
        {
          "task_key": "action_step_task_1",
          "title": "Task title",
          "instruction": "Specific instruction",
          "completion_hint": "How the user knows it is done"
        },
        {
          "task_key": "action_step_task_2",
          "title": "Task title",
          "instruction": "Specific instruction",
          "completion_hint": "How the user knows it is done"
        },
        {
          "task_key": "action_step_task_3",
          "title": "Task title",
          "instruction": "Specific instruction",
          "completion_hint": "How the user knows it is done"
        }
      ]
    }
  ]
}
PROMPT;
    }

    private function buildJournalPrompt(
        MoodJournal $journal,
        Collection $onboardingAnswers,
        Collection $recentEntries,
        bool $shouldAnalyzeTrend,
        array $personalization
    ): string {
        $answers = $onboardingAnswers
            ->map(fn ($answer) => '- ' . $answer->question_key . ': ' . $answer->answer_text)
            ->implode("\n");

        $recentJournalContext = $recentEntries
            ->map(fn (MoodJournal $entry) => [
                'emoji_mood' => $entry->emoji_mood,
                'text_note' => $entry->text_note,
                'created_at' => optional($entry->created_at)->toISOString(),
            ])
            ->values()
            ->all();

        $recentJournalJson = json_encode($recentJournalContext, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
        $personalizationJson = json_encode($personalization, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
        $trendInstruction = $shouldAnalyzeTrend
            ? 'This is the patient\'s 5th, 10th, 15th, etc. entry. Use the last 5 journal entries to infer trends and include a meaningful trend_analysis summary.'
            : 'This is a standard journal-triggered plan. Focus mainly on the current entry, and keep trend_analysis brief.';

        return <<<PROMPT
Create a supportive mental exercise plan for a patient.

Onboarding context:
{$answers}

Current journal entry:
- mood_signal: {$journal->emoji_mood}
- text_note: {$journal->text_note}

Recent journal entries:
{$recentJournalJson}

Personalization signals from previous exercise progress:
{$personalizationJson}

Instructions:
- Act as a clinical strategist, not a diagnostician.
- Build a gamified 3-chapter guide:
  1. Immediate relief (breathing or grounding)
  2. Cognitive work (reframing the thought in the journal)
  3. Action step (concrete tasks for today)
- Each chapter must feel deeper than a single paragraph. Give a chapter goal, 3 concrete tasks, and a reflection prompt.
- {$trendInstruction}
- Use the personalization signals to adjust pacing, encouragement, and task style.
- Keep the tone calm, specific, and practical.
- Avoid medical claims or crisis instructions.

Return ONLY valid JSON with this exact shape:
{
  "phase": "immediate",
  "trend_analysis": {
    "summary": "Short summary of the pattern.",
    "direction": "steady"
  },
  "journey": {
    "headline": "A motivating title",
    "motivation": "A short explanation of why this plan matters today.",
    "total_energy_points": 36
  },
  "chapters": [
    {
      "chapter_key": "immediate_relief",
      "chapter_title": "Immediate Relief",
      "chapter_goal": "Why this chapter matters right now.",
      "content": "A coaching paragraph that guides the user through the chapter.",
      "estimated_time": "6-8 min",
      "energy_points": 12,
      "reflection_prompt": "A short reflection question.",
      "tasks": [
        {
          "task_key": "immediate_relief_task_1",
          "title": "Task title",
          "instruction": "Specific instruction",
          "completion_hint": "How the user knows it is done"
        },
        {
          "task_key": "immediate_relief_task_2",
          "title": "Task title",
          "instruction": "Specific instruction",
          "completion_hint": "How the user knows it is done"
        },
        {
          "task_key": "immediate_relief_task_3",
          "title": "Task title",
          "instruction": "Specific instruction",
          "completion_hint": "How the user knows it is done"
        }
      ]
    },
    {
      "chapter_key": "cognitive_work",
      "chapter_title": "Cognitive Work",
      "chapter_goal": "Why this chapter matters right now.",
      "content": "A coaching paragraph that guides the user through the chapter.",
      "estimated_time": "8-10 min",
      "energy_points": 12,
      "reflection_prompt": "A short reflection question.",
      "tasks": [
        {
          "task_key": "cognitive_work_task_1",
          "title": "Task title",
          "instruction": "Specific instruction",
          "completion_hint": "How the user knows it is done"
        },
        {
          "task_key": "cognitive_work_task_2",
          "title": "Task title",
          "instruction": "Specific instruction",
          "completion_hint": "How the user knows it is done"
        },
        {
          "task_key": "cognitive_work_task_3",
          "title": "Task title",
          "instruction": "Specific instruction",
          "completion_hint": "How the user knows it is done"
        }
      ]
    },
    {
      "chapter_key": "action_step",
      "chapter_title": "Action Step",
      "chapter_goal": "Why this chapter matters right now.",
      "content": "A coaching paragraph that guides the user through the chapter.",
      "estimated_time": "10-12 min",
      "energy_points": 12,
      "reflection_prompt": "A short reflection question.",
      "tasks": [
        {
          "task_key": "action_step_task_1",
          "title": "Task title",
          "instruction": "Specific instruction",
          "completion_hint": "How the user knows it is done"
        },
        {
          "task_key": "action_step_task_2",
          "title": "Task title",
          "instruction": "Specific instruction",
          "completion_hint": "How the user knows it is done"
        },
        {
          "task_key": "action_step_task_3",
          "title": "Task title",
          "instruction": "Specific instruction",
          "completion_hint": "How the user knows it is done"
        }
      ]
    }
  ]
}
PROMPT;
    }

    private function normalizeResponse(
        ?array $response,
        string $phase,
        array $generatedFrom,
        ?MoodJournal $journal = null
    ): ?array {
        if (!is_array($response)) {
            return null;
        }

        $chapters = collect(data_get($response, 'chapters', []))
            ->filter(fn ($chapter) => is_array($chapter))
            ->values()
            ->map(fn (array $chapter, int $index) => $this->normalizeChapter($chapter, $index))
            ->filter(fn (array $chapter) => $chapter['content'] !== '')
            ->take(3)
            ->values();

        if ($chapters->count() !== 3) {
            return null;
        }

        return [
            'status' => 'ready',
            'phase' => $this->normalizePhase((string) data_get($response, 'phase'), $phase),
            'generated_at' => data_get($response, 'generated_at', now()->toISOString()),
            'generated_from' => $generatedFrom,
            'trend_analysis' => [
                'summary' => Str::limit((string) data_get($response, 'trend_analysis.summary', 'Based on the current context, focus on gentle stabilization and one achievable action.'), 240, ''),
                'direction' => $this->normalizeDirection((string) data_get($response, 'trend_analysis.direction', 'steady')),
            ],
            'journey' => [
                'headline' => Str::limit((string) data_get($response, 'journey.headline', 'Daily Recovery Quest'), 80, ''),
                'motivation' => Str::limit((string) data_get($response, 'journey.motivation', 'Move through one grounded step at a time and notice what helps you feel steadier.'), 220, ''),
                'total_energy_points' => $chapters->sum('energy_points'),
                'badge_track' => $this->badgeTrack(),
            ],
            'journal' => $journal ? [
                'id' => $journal->id,
                'emoji_mood' => $journal->emoji_mood,
                'created_at' => optional($journal->created_at)->toISOString(),
            ] : null,
            'chapters' => $chapters->all(),
        ];
    }

    private function normalizeChapter(array $chapter, int $index): array
    {
        $chapterTitle = Str::limit((string) data_get($chapter, 'chapter_title', 'Exercise'), 60, '');
        $chapterKey = $this->normalizeChapterKey((string) data_get($chapter, 'chapter_key', ''), $chapterTitle, $index);
        $content = trim((string) data_get($chapter, 'content', ''));

        $tasks = collect(data_get($chapter, 'tasks', []))
            ->filter(fn ($task) => is_array($task))
            ->values()
            ->map(fn (array $task, int $taskIndex) => $this->normalizeTask($task, $chapterKey, $taskIndex))
            ->filter(fn (array $task) => $task['title'] !== '' && $task['instruction'] !== '')
            ->take(3)
            ->values();

        if ($tasks->count() < 3) {
            $tasks = collect($this->defaultTasksForChapter($chapterKey, $chapterTitle, $content));
        }

        return [
            'chapter_key' => $chapterKey,
            'chapter_title' => $chapterTitle,
            'chapter_goal' => Str::limit((string) data_get($chapter, 'chapter_goal', $this->defaultChapterGoal($chapterTitle)), 160, ''),
            'content' => $content,
            'estimated_time' => Str::limit((string) data_get($chapter, 'estimated_time', '6-10 min'), 20, ''),
            'energy_points' => max(6, min(18, (int) data_get($chapter, 'energy_points', 12))),
            'reflection_prompt' => Str::limit((string) data_get($chapter, 'reflection_prompt', $this->defaultReflectionPrompt($chapterTitle)), 180, ''),
            'tasks' => $tasks->all(),
        ];
    }

    private function normalizeTask(array $task, string $chapterKey, int $taskIndex): array
    {
        $title = trim((string) data_get($task, 'title', ''));

        return [
            'task_key' => $this->normalizeTaskKey((string) data_get($task, 'task_key', ''), $chapterKey, $title, $taskIndex),
            'title' => Str::limit($title, 80, ''),
            'instruction' => Str::limit(trim((string) data_get($task, 'instruction', '')), 220, ''),
            'completion_hint' => Str::limit(trim((string) data_get($task, 'completion_hint', '')), 120, ''),
        ];
    }

    private function fallbackOnboardingResponse(): array
    {
        return [
            'status' => 'ready',
            'phase' => 'onboarding',
            'generated_at' => now()->toISOString(),
            'generated_from' => [
                'trigger' => 'onboarding',
                'journal_id' => null,
                'entry_count' => 0,
                'trend_window_count' => 0,
            ],
            'trend_analysis' => [
                'summary' => 'This initial plan is based on your onboarding answers and gives you a gentle starting point.',
                'direction' => 'steady',
            ],
            'journey' => [
                'headline' => 'Grounded Start Quest',
                'motivation' => 'Build momentum through short wins so your first support routine feels achievable.',
                'total_energy_points' => 36,
                'badge_track' => $this->badgeTrack(),
            ],
            'journal' => null,
            'chapters' => [
                $this->fallbackChapter(
                    'immediate_relief',
                    'Immediate Relief',
                    'Settle your body before you ask your mind to do harder work.',
                    'Use your breath and senses to give your nervous system a quick signal of safety.',
                    '6-8 min',
                    12
                ),
                $this->fallbackChapter(
                    'cognitive_work',
                    'Cognitive Work',
                    'Create a kinder and more balanced version of the story you are telling yourself.',
                    'Take one difficult thought, slow it down, and look at it from a steadier angle.',
                    '8-10 min',
                    12
                ),
                $this->fallbackChapter(
                    'action_step',
                    'Action Step',
                    'Finish today with one real-world act of care that is small enough to complete.',
                    'Turn emotional insight into motion with a low-pressure action you can finish today.',
                    '10-12 min',
                    12
                ),
            ],
        ];
    }

    private function fallbackJournalResponse(
        MoodJournal $journal,
        string $phase,
        Collection $recentEntries,
        int $entryCount
    ): array {
        $trendDirection = $phase === 'adaptive' && $recentEntries->pluck('emoji_mood')->unique()->count() > 2
            ? 'variable'
            : 'steady';

        return [
            'status' => 'ready',
            'phase' => $phase,
            'generated_at' => now()->toISOString(),
            'generated_from' => [
                'trigger' => 'journal',
                'journal_id' => $journal->id,
                'entry_count' => $entryCount,
                'trend_window_count' => $phase === 'adaptive' ? 5 : 0,
            ],
            'trend_analysis' => [
                'summary' => $phase === 'adaptive'
                    ? 'Five-entry trend analysis suggests it is time to respond with consistent, low-pressure routines.'
                    : 'This plan is based on your latest journal entry and will become more adaptive over time.',
                'direction' => $trendDirection,
            ],
            'journey' => [
                'headline' => $phase === 'adaptive' ? 'Pattern Reset Quest' : 'Tonight\'s Recovery Quest',
                'motivation' => 'Move from emotional overload into one grounded sequence of actions you can finish today.',
                'total_energy_points' => 36,
                'badge_track' => $this->badgeTrack(),
            ],
            'journal' => [
                'id' => $journal->id,
                'emoji_mood' => $journal->emoji_mood,
                'created_at' => optional($journal->created_at)->toISOString(),
            ],
            'chapters' => [
                $this->fallbackImmediateReliefChapter(),
                $this->fallbackCognitiveWorkChapter((string) $journal->text_note),
                $this->fallbackActionStepChapter(),
            ],
        ];
    }

    private function fallbackStoredExerciseResponse(string $phase, array $generatedFrom, ?array $journal): array
    {
        $normalizedPhase = $this->normalizePhase($phase, 'immediate');

        return [
            'status' => 'ready',
            'phase' => $normalizedPhase,
            'generated_at' => now()->toISOString(),
            'generated_from' => $generatedFrom,
            'trend_analysis' => [
                'summary' => $normalizedPhase === 'adaptive'
                    ? 'Your recent entries suggest staying with steady, repeatable routines.'
                    : 'This plan keeps the focus on simple grounding, reframing, and one gentle action.',
                'direction' => $normalizedPhase === 'adaptive' ? 'variable' : 'steady',
            ],
            'journey' => [
                'headline' => $normalizedPhase === 'adaptive' ? 'Pattern Reset Quest' : 'Gentle Reset Quest',
                'motivation' => 'Turn today\'s emotional signal into a few concrete wins you can actually complete.',
                'total_energy_points' => 36,
                'badge_track' => $this->badgeTrack(),
            ],
            'journal' => $journal,
            'chapters' => [
                $this->fallbackImmediateReliefChapter(),
                $this->fallbackCognitiveWorkChapter('today\'s difficult thought'),
                $this->fallbackActionStepChapter(),
            ],
        ];
    }

    private function fallbackChapter(
        string $chapterKey,
        string $chapterTitle,
        string $goal,
        string $content,
        string $estimatedTime,
        int $energyPoints
    ): array {
        return [
            'chapter_key' => $chapterKey,
            'chapter_title' => $chapterTitle,
            'chapter_goal' => $goal,
            'content' => $content,
            'estimated_time' => $estimatedTime,
            'energy_points' => $energyPoints,
            'reflection_prompt' => $this->defaultReflectionPrompt($chapterTitle),
            'tasks' => $this->defaultTasksForChapter($chapterKey, $chapterTitle, $content),
        ];
    }

    private function fallbackImmediateReliefChapter(): array
    {
        return [
            'chapter_key' => 'immediate_relief',
            'chapter_title' => 'Immediate Relief',
            'chapter_goal' => 'Help your body step down from overwhelm before you ask yourself to think clearly.',
            'content' => 'Start with physical regulation so your mind has a steadier base. Focus on slowing your breath, softening your shoulders, and reconnecting with the room around you.',
            'estimated_time' => '6-8 min',
            'energy_points' => 12,
            'reflection_prompt' => 'After grounding, what feels even 5 percent calmer in your body?',
            'tasks' => [
                [
                    'task_key' => 'immediate_relief_task_1',
                    'title' => 'Breathing reset',
                    'instruction' => 'Take 8 slow breaths and count 4 seconds in, 4 seconds out.',
                    'completion_hint' => 'Mark done after you finish all 8 breaths.',
                ],
                [
                    'task_key' => 'immediate_relief_task_2',
                    'title' => 'Shoulder release',
                    'instruction' => 'Lift both shoulders gently, hold for 3 seconds, then let them drop. Repeat 3 times.',
                    'completion_hint' => 'Mark done after the third release.',
                ],
                [
                    'task_key' => 'immediate_relief_task_3',
                    'title' => '5-4-3 grounding',
                    'instruction' => 'Name 5 things you see, 4 you feel, and 3 you hear around you.',
                    'completion_hint' => 'Mark done when you finish all 3 grounding rounds.',
                ],
            ],
        ];
    }

    private function fallbackCognitiveWorkChapter(string $note): array
    {
        $reframeTarget = trim($note) !== ''
            ? Str::limit($note, 110, '...')
            : 'the hard thought sitting behind today\'s mood';

        return [
            'chapter_key' => 'cognitive_work',
            'chapter_title' => 'Cognitive Work',
            'chapter_goal' => 'Slow down the loudest thought so it stops steering the entire day.',
            'content' => 'You do not need to argue with every feeling. Instead, pick one thought, look at it gently, and build a version that is more honest and less punishing.',
            'estimated_time' => '8-10 min',
            'energy_points' => 12,
            'reflection_prompt' => 'What sentence feels truer and kinder after this reframe?',
            'tasks' => [
                [
                    'task_key' => 'cognitive_work_task_1',
                    'title' => 'Name the thought',
                    'instruction' => 'Write down the thought "' . $reframeTarget . '" as one clear sentence.',
                    'completion_hint' => 'Mark done once the thought is written plainly.',
                ],
                [
                    'task_key' => 'cognitive_work_task_2',
                    'title' => 'Test the evidence',
                    'instruction' => 'List one fact that supports the thought and one fact that softens it.',
                    'completion_hint' => 'Mark done when both sides are written.',
                ],
                [
                    'task_key' => 'cognitive_work_task_3',
                    'title' => 'Rewrite with balance',
                    'instruction' => 'Rewrite the thought as if you were speaking to a close friend with honesty and care.',
                    'completion_hint' => 'Mark done after writing the kinder version.',
                ],
            ],
        ];
    }

    private function fallbackActionStepChapter(): array
    {
        return [
            'chapter_key' => 'action_step',
            'chapter_title' => 'Action Step',
            'chapter_goal' => 'Convert emotional insight into a gentle real-world win you can actually complete.',
            'content' => 'Choose actions that are small enough to finish and meaningful enough to remind you that momentum is still possible, even on heavy days.',
            'estimated_time' => '10-12 min',
            'energy_points' => 12,
            'reflection_prompt' => 'Which action felt most supportive, and what would you repeat tomorrow?',
            'tasks' => [
                [
                    'task_key' => 'action_step_task_1',
                    'title' => 'Hydration reset',
                    'instruction' => 'Drink one full glass of water slowly and notice how your body feels.',
                    'completion_hint' => 'Mark done when the glass is finished.',
                ],
                [
                    'task_key' => 'action_step_task_2',
                    'title' => 'Fresh-air minute',
                    'instruction' => 'Stand outside or near a window for 5 minutes and take in the air and light.',
                    'completion_hint' => 'Mark done after 5 minutes.',
                ],
                [
                    'task_key' => 'action_step_task_3',
                    'title' => 'Reach out gently',
                    'instruction' => 'Send one low-pressure message to someone safe, even if it is only "thinking of you."',
                    'completion_hint' => 'Mark done after the message is sent.',
                ],
            ],
        ];
    }

    private function defaultTasksForChapter(string $chapterKey, string $chapterTitle, string $content): array
    {
        $chapterType = Str::lower($chapterKey . ' ' . $chapterTitle);

        if (str_contains($chapterType, 'immediate') || str_contains($chapterType, 'relief')) {
            return $this->fallbackImmediateReliefChapter()['tasks'];
        }

        if (str_contains($chapterType, 'cognitive') || str_contains($chapterType, 'reframe')) {
            return $this->fallbackCognitiveWorkChapter($content)['tasks'];
        }

        return $this->fallbackActionStepChapter()['tasks'];
    }

    private function defaultChapterGoal(string $chapterTitle): string
    {
        $title = Str::lower($chapterTitle);

        return match (true) {
            str_contains($title, 'immediate') || str_contains($title, 'relief') => 'Settle your body first so the rest of the plan feels easier to do.',
            str_contains($title, 'cognitive') => 'Create a steadier, more balanced frame for the thoughts weighing on you.',
            default => 'Translate insight into one practical action you can complete today.',
        };
    }

    private function defaultReflectionPrompt(string $chapterTitle): string
    {
        $title = Str::lower($chapterTitle);

        return match (true) {
            str_contains($title, 'immediate') || str_contains($title, 'relief') => 'What shifted in your body after this grounding chapter?',
            str_contains($title, 'cognitive') => 'What thought feels less intense or more balanced now?',
            default => 'What action from this chapter would be worth repeating tomorrow?',
        };
    }

    private function normalizePhase(string $phase, string $fallback): string
    {
        $normalized = Str::lower(trim($phase));

        if (in_array($normalized, ['onboarding', 'immediate', 'adaptive'], true)) {
            return $normalized;
        }

        return $fallback;
    }

    private function normalizeDirection(string $direction): string
    {
        $normalized = Str::lower(trim($direction));

        return in_array($normalized, ['improving', 'steady', 'declining', 'variable'], true)
            ? $normalized
            : 'steady';
    }

    private function normalizeChapterKey(string $providedKey, string $chapterTitle, int $index): string
    {
        $candidate = $this->sanitizeStableKey($providedKey);

        if ($candidate === '') {
            $candidate = $this->sanitizeStableKey($chapterTitle);
        }

        return $candidate !== '' ? $candidate : 'chapter_' . ($index + 1);
    }

    private function normalizeTaskKey(string $providedKey, string $chapterKey, string $title, int $taskIndex): string
    {
        $candidate = $this->sanitizeStableKey($providedKey);

        if ($candidate !== '') {
            return $candidate;
        }

        $titleSlug = $this->sanitizeStableKey($title);

        return $titleSlug !== ''
            ? $chapterKey . '_' . $titleSlug
            : $chapterKey . '_task_' . ($taskIndex + 1);
    }

    private function sanitizeStableKey(string $value): string
    {
        $normalized = Str::lower(trim($value));
        $normalized = preg_replace('/[^a-z0-9_-]+/', '_', $normalized);

        return is_string($normalized) ? trim($normalized, '_') : '';
    }

    private function buildPersonalizationContext(int $userId): array
    {
        $progressHistory = ExerciseProgress::where('user_id', $userId)
            ->latest('updated_at')
            ->take(3)
            ->get([
                'completion_percentage',
                'review_feeling',
                'review_text',
                'earned_badge_name',
                'updated_at',
            ]);

        if ($progressHistory->isEmpty()) {
            return [
                'average_completion' => 0,
                'last_review_feeling' => null,
                'last_review_text' => null,
                'recent_badges' => [],
            ];
        }

        $latest = $progressHistory->first();

        return [
            'average_completion' => (int) round($progressHistory->avg('completion_percentage') ?? 0),
            'last_review_feeling' => $latest?->review_feeling,
            'last_review_text' => $latest?->review_text ? Str::limit((string) $latest->review_text, 180, '') : null,
            'recent_badges' => $progressHistory
                ->pluck('earned_badge_name')
                ->filter()
                ->unique()
                ->values()
                ->all(),
        ];
    }
}
