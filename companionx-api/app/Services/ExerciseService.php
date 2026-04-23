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
                'description' => 'Unlocked after completing your first chapter.',
                'unlock_after_chapters' => 1,
            ],
            [
                'code' => 'steady_climber',
                'name' => 'Steady Climber',
                'description' => 'Unlocked after completing two chapters in one guide.',
                'unlock_after_chapters' => 2,
            ],
            [
                'code' => 'mindful_finisher',
                'name' => 'Mindful Finisher',
                'description' => 'Unlocked after completing the full three-chapter guide.',
                'unlock_after_chapters' => 3,
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
