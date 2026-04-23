"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import {
  ArrowLeft,
  ArrowRight,
  Brain,
  CheckCircle,
  Clock,
  Lightning,
  TrendUp,
  Trophy,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { AreaChart, Area, CartesianGrid, XAxis, YAxis } from "recharts";

type ExerciseTask = {
  task_key: string;
  title: string;
  instruction: string;
  completion_hint: string;
};

type ExerciseChapter = {
  chapter_key: string;
  chapter_title: string;
  chapter_goal: string;
  content: string;
  estimated_time: string;
  energy_points: number;
  reflection_prompt: string;
  tasks: ExerciseTask[];
};

type Badge = {
  code: string;
  name: string;
  description: string;
  earned_at?: string | null;
};

type BadgeTrackItem = {
  code: string;
  name: string;
  description: string;
  unlock_after_chapters: number;
};

type ChapterStatus = {
  chapter_key: string;
  completed_tasks: number;
  total_tasks: number;
  is_complete: boolean;
};

type ExerciseProgress = {
  completed_task_keys: string[];
  completed_chapter_keys: string[];
  chapter_statuses: ChapterStatus[];
  completed_tasks: number;
  total_tasks: number;
  completion_percentage: number;
  is_complete: boolean;
  badge: Badge | null;
  review: {
    feeling?: string | null;
    text?: string | null;
    submitted_at?: string | null;
  };
};

type MoodPoint = {
  id: number;
  label: string;
  date: string;
  emoji_mood: string;
  sentiment_score: number;
};

type ExerciseRecommendation = {
  status?: "ready" | "pending" | "missing_onboarding";
  recommendation_id?: number;
  message?: string;
  phase?: string;
  generated_at?: string | null;
  generated_from?: {
    trigger?: string;
    entry_count?: number;
    trend_window_count?: number;
  } | null;
  trend_analysis?: {
    summary?: string;
    direction?: string;
  };
  journey?: {
    headline?: string;
    motivation?: string;
    total_energy_points?: number;
    badge_track?: BadgeTrackItem[];
  };
  chapters?: ExerciseChapter[];
  progress?: ExerciseProgress | null;
  mood_tracker?: {
    entries_count: number;
    average_score: number | null;
    trend: string;
    points: MoodPoint[];
  };
};

const feelingOptions = [
  { value: "lighter", label: "Lighter" },
  { value: "steadier", label: "Steadier" },
  { value: "hopeful", label: "Hopeful" },
  { value: "still_heavy", label: "Still Heavy" },
  { value: "energized", label: "Energized" },
];

export default function ExercisesPage() {
  const [data, setData] = useState<ExerciseRecommendation | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingTasks, setSavingTasks] = useState(false);
  const [savingReview, setSavingReview] = useState(false);
  const [reviewFeeling, setReviewFeeling] = useState("");
  const [reviewText, setReviewText] = useState("");
  const router = useRouter();

  useEffect(() => {
    api
      .get("/api/dashboard/exercises")
      .then((res) => {
        setData(res.data);
        setReviewFeeling(res.data?.progress?.review?.feeling ?? "");
        setReviewText(res.data?.progress?.review?.text ?? "");
      })
      .catch((error) => {
        const fallbackData = error.response?.data ?? null;
        setData(fallbackData);
        setReviewFeeling(fallbackData?.progress?.review?.feeling ?? "");
        setReviewText(fallbackData?.progress?.review?.text ?? "");
      })
      .finally(() => setLoading(false));
  }, []);

  const completedTaskKeys = useMemo(
    () => new Set(data?.progress?.completed_task_keys ?? []),
    [data?.progress?.completed_task_keys],
  );

  const chapterStatuses = useMemo(() => {
    return new Map(
      (data?.progress?.chapter_statuses ?? []).map((status) => [
        status.chapter_key,
        status,
      ]),
    );
  }, [data?.progress?.chapter_statuses]);

  const handleToggleTask = async (taskKey: string) => {
    if (!data?.recommendation_id || !data.progress) return;

    const nextTaskKeys = new Set(data.progress.completed_task_keys);
    if (nextTaskKeys.has(taskKey)) {
      nextTaskKeys.delete(taskKey);
    } else {
      nextTaskKeys.add(taskKey);
    }

    setSavingTasks(true);

    try {
      const res = await api.patch("/api/dashboard/exercises/progress", {
        recommendation_id: data.recommendation_id,
        completed_task_keys: Array.from(nextTaskKeys),
      });
      setData((prev) =>
        prev ? { ...prev, progress: res.data.progress } : prev,
      );
    } catch (error: unknown) {
      const message =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { data?: { message?: string } } })
          .response?.data?.message === "string"
          ? ((error as { response?: { data?: { message?: string } } }).response
              ?.data?.message ?? "Could not update exercise progress.")
          : "Could not update exercise progress.";
    } finally {
      setSavingTasks(false);
    }
  };

  const handleReviewSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!data?.recommendation_id) return;

    setSavingReview(true);

    try {
      const res = await api.patch("/api/dashboard/exercises/progress", {
        recommendation_id: data.recommendation_id,
        review_feeling: reviewFeeling || null,
        review_text: reviewText || null,
      });
      setData((prev) =>
        prev ? { ...prev, progress: res.data.progress } : prev,
      );
      setReviewFeeling(res.data.progress.review?.feeling ?? "");
      setReviewText(res.data.progress.review?.text ?? "");
    } catch (error: unknown) {
      const message =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { data?: { message?: string } } })
          .response?.data?.message === "string"
          ? ((error as { response?: { data?: { message?: string } } }).response
              ?.data?.message ?? "Could not save your reflection.")
          : "Could not save your reflection.";
    } finally {
      setSavingReview(false);
    }
  };

  const moodPoints = data?.mood_tracker?.points ?? [];
  const progress = data?.progress;

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-background">
      <div className="mx-auto max-w-6xl px-8 py-10">
        {/* ── Page Header ────────────────────────────────────────── */}
        <header className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <div>
              <p className="font-sans text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
                Adaptive Exercises
              </p>
              <h1 className="font-heading text-xl font-semibold text-foreground">
                Mental Lab
              </h1>
            </div>
          </div>
        </header>

        {/* ── Journey Summary ────────────────────────────────────── */}
        {data?.journey ? (
          <div className="mb-8 border border-border bg-card p-6">
            <div className="mb-4 flex items-center gap-2">
              <Brain size={16} weight="bold" className="text-primary" />
              <span className="font-sans text-xs font-medium tracking-[0.12em] text-primary uppercase border border-primary/40 px-2 py-0.5">
                {data.phase || "Recovery"}
              </span>
              {data.trend_analysis?.direction ? (
                <span className="font-sans text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase border border-border px-2 py-0.5">
                  {data.trend_analysis.direction}
                </span>
              ) : null}
              {typeof data.journey.total_energy_points === "number" ? (
                <span className="font-sans text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase border border-border px-2 py-0.5">
                  {data.journey.total_energy_points} XP
                </span>
              ) : null}
            </div>
            <p className="font-heading text-lg font-medium text-foreground">
              {data.journey.headline ||
                "Your adaptive exercise quest, built from how you are doing."}
            </p>
            <p className="mt-2 font-sans text-sm leading-relaxed text-muted-foreground">
              {data.journey.motivation ||
                "Each chapter gives you practical steps, trackable wins, and reflection space."}
            </p>
          </div>
        ) : null}

        {/* ── Loading State ──────────────────────────────────────── */}
        {loading ? (
          <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="h-60 animate-pulse border border-border bg-muted" />
            <div className="h-60 animate-pulse border border-border bg-muted" />
          </div>
        ) : data?.status === "pending" ||
          data?.status === "missing_onboarding" ? (
          /* ── Pending / Missing Onboarding ───────────────────────── */
          <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <MoodTrackerCard
              moodPoints={moodPoints}
              tracker={data?.mood_tracker}
            />
            <div className="border border-dashed border-border bg-card p-10 text-center">
              <p className="mb-1 font-heading text-sm font-medium text-foreground">
                {data.status === "pending"
                  ? "Your exercise plan is being prepared"
                  : "Your first exercise plan unlocks after onboarding"}
              </p>
              <p className="mx-auto max-w-sm font-sans text-xs text-muted-foreground">
                {data.message ||
                  "Complete the next step and this space will transform into your chapter-based exercise journey."}
              </p>
              <Button
                size="sm"
                className="mt-5 text-xs font-medium"
                onClick={() =>
                  router.push(
                    data.status === "missing_onboarding"
                      ? "/onboarding"
                      : "/dashboard/journal",
                  )
                }
              >
                {data.status === "missing_onboarding"
                  ? "Start Onboarding"
                  : "Write in Mood Journal"}
                <ArrowRight size={14} weight="bold" />
              </Button>
            </div>
          </section>
        ) : data?.chapters?.length ? (
          /* ── Active Chapters ────────────────────────────────────── */
          <div className="space-y-8">
            {/* ── Progress + Badges Row ─────────────────────────────── */}
            <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
              <MoodTrackerCard
                moodPoints={moodPoints}
                tracker={data?.mood_tracker}
              />

              <div className="grid gap-4">
                {/* Progress */}
                <div className="border border-border bg-card p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-sans text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
                        Progress
                      </p>
                      <p className="mt-1 font-heading text-lg font-semibold text-foreground">
                        {progress?.completion_percentage ?? 0}% complete
                      </p>
                    </div>
                    {(savingTasks || savingReview) && (
                      <div className="h-4 w-4 animate-spin border-2 border-primary border-t-transparent" />
                    )}
                  </div>
                  <Progress
                    value={progress?.completion_percentage ?? 0}
                    className="mt-4"
                  >
                    <ProgressLabel className="font-sans text-xs font-medium text-muted-foreground">
                      {progress?.completed_tasks ?? 0} /{" "}
                      {progress?.total_tasks ?? 0} tasks
                    </ProgressLabel>
                    <ProgressValue className="font-sans text-xs font-medium text-muted-foreground" />
                  </Progress>
                  <div className="mt-3 flex items-center justify-between font-sans text-xs text-muted-foreground">
                    <span>{data.journey?.total_energy_points ?? 0} XP</span>
                  </div>
                </div>

                {/* Badge Track */}
                <div className="border border-border bg-card p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Trophy size={16} weight="bold" className="text-primary" />
                    <div>
                      <p className="font-sans text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
                        Badge Track
                      </p>
                      <p className="mt-0.5 font-heading text-sm font-medium text-foreground">
                        {progress?.badge?.name || "First badge waiting"}
                      </p>
                    </div>
                  </div>
                  <p className="font-sans text-xs leading-relaxed text-muted-foreground">
                    {progress?.badge?.description ||
                      "Complete a full chapter to unlock your first reward."}
                  </p>
                  <div className="mt-4 space-y-2">
                    {data.journey?.badge_track?.map((badge) => {
                      const unlocked =
                        (progress?.completed_chapter_keys?.length ?? 0) >=
                        badge.unlock_after_chapters;
                      return (
                        <div
                          key={badge.code}
                          className={`border px-4 py-3 ${
                            unlocked
                              ? "border-primary/40 bg-primary/5"
                              : "border-border bg-muted/30"
                          }`}
                        >
                          <p
                            className={`font-sans text-xs font-medium ${unlocked ? "text-foreground" : "text-muted-foreground"}`}
                          >
                            {badge.name}
                          </p>
                          <p className="mt-0.5 font-sans text-xs text-muted-foreground">
                            {badge.description}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>

            {/* ── Chapters + Sidebar ────────────────────────────────── */}
            <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-4">
                {data.chapters.map((chapter, index) => {
                  const chapterStatus = chapterStatuses.get(
                    chapter.chapter_key,
                  );

                  return (
                    <article
                      key={chapter.chapter_key}
                      className="border border-border bg-card"
                    >
                      {/* Chapter Header */}
                      <div className="p-6 pb-4">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="max-w-2xl">
                            <div className="mb-3 flex items-center gap-2">
                              <Brain
                                size={14}
                                weight="bold"
                                className="text-primary"
                              />
                              <span className="font-sans text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
                                Chapter {index + 1}
                              </span>
                            </div>
                            <h2 className="font-heading text-sm font-semibold text-foreground">
                              {chapter.chapter_title}
                            </h2>
                            <p className="mt-1 font-sans text-xs font-medium text-primary">
                              {chapter.chapter_goal}
                            </p>
                            <p className="mt-3 font-sans text-xs leading-relaxed text-muted-foreground">
                              {chapter.content}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <span className="inline-flex items-center gap-1 border border-border px-2.5 py-1 font-sans text-xs text-muted-foreground">
                              <Clock size={10} weight="bold" />
                              {chapter.estimated_time}
                            </span>
                            <span className="inline-flex items-center gap-1 border border-border px-2.5 py-1 font-sans text-xs text-muted-foreground">
                              <Lightning size={10} weight="bold" />
                              {chapter.energy_points} XP
                            </span>
                            {chapterStatus?.is_complete ? (
                              <span className="inline-flex items-center gap-1 border border-primary/40 bg-primary/5 px-2.5 py-1 font-sans text-xs text-primary">
                                <CheckCircle size={10} weight="bold" />
                                Complete
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      {/* Tasks */}
                      <div className="px-6 pb-4 space-y-2">
                        {chapter.tasks.map((task) => {
                          const checked = completedTaskKeys.has(task.task_key);
                          return (
                            <button
                              key={task.task_key}
                              type="button"
                              onClick={() => handleToggleTask(task.task_key)}
                              disabled={savingTasks}
                              className={`w-full border p-4 text-left transition ${
                                checked
                                  ? "border-primary/40 bg-primary/5"
                                  : "border-border bg-muted/30 hover:border-primary/30"
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <span
                                  className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center border ${
                                    checked
                                      ? "border-primary bg-primary text-primary-foreground"
                                      : "border-border bg-background"
                                  }`}
                                >
                                  {checked && (
                                    <CheckCircle size={10} weight="bold" />
                                  )}
                                </span>
                                <div>
                                  <p className="font-sans text-sm font-medium text-foreground">
                                    {task.title}
                                  </p>
                                  <p className="mt-1 font-sans text-xs leading-relaxed text-muted-foreground">
                                    {task.instruction}
                                  </p>
                                  <p className="mt-2 font-sans text-xs font-medium tracking-[0.1em] text-muted-foreground uppercase">
                                    {task.completion_hint}
                                  </p>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {/* Reflection Prompt */}
                      <div className="border-t border-border bg-muted/30 px-6 py-4">
                        <p className="font-sans text-xs leading-relaxed text-muted-foreground">
                          <span className="font-medium text-foreground">
                            Reflection:
                          </span>{" "}
                          {chapter.reflection_prompt}
                        </p>
                      </div>
                    </article>
                  );
                })}
              </div>

              {/* ── Sidebar ──────────────────────────────────────────── */}
              <aside className="space-y-4">
                {/* Chapter Wins */}
                <div className="border border-border bg-card p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Brain size={16} weight="bold" className="text-primary" />
                    <div>
                      <p className="font-sans text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
                        Chapter Wins
                      </p>
                      <p className="mt-0.5 font-heading text-sm font-medium text-foreground">
                        {progress?.completed_chapter_keys?.length ?? 0} /{" "}
                        {data.chapters.length} chapters
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {data.chapters.map((chapter) => {
                      const chapterStatus = chapterStatuses.get(
                        chapter.chapter_key,
                      );
                      return (
                        <div
                          key={chapter.chapter_key}
                          className="border border-border bg-muted/30 px-4 py-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-sans text-xs font-medium text-foreground">
                              {chapter.chapter_title}
                            </p>
                            <span className="font-sans text-xs text-muted-foreground">
                              {chapterStatus?.completed_tasks ?? 0}/
                              {chapterStatus?.total_tasks ??
                                chapter.tasks.length}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Reflection Form */}
                <form
                  onSubmit={handleReviewSubmit}
                  className="border border-border bg-card p-6"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <TrendUp size={16} weight="bold" className="text-primary" />
                    <div>
                      <p className="font-sans text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
                        After-Exercise Review
                      </p>
                      <p className="mt-0.5 font-heading text-sm font-medium text-foreground">
                        Capture how this felt
                      </p>
                    </div>
                  </div>

                  <p className="mb-4 font-sans text-xs leading-relaxed text-muted-foreground">
                    Your reflection helps the next AI plan adapt its tone, task
                    depth, and pacing.
                  </p>

                  <label className="block font-sans text-foreground">
                    How do you feel after this exercise?
                  </label>
                  <Select
                    value={reviewFeeling}
                    onValueChange={(v) => setReviewFeeling(v ?? "")}
                  >
                    <SelectTrigger className="mt-1.5 w-full">
                      <SelectValue placeholder="Select a feeling" />
                    </SelectTrigger>
                    <SelectContent>
                      {feelingOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <label className="mt-4 block text-foreground">
                    What stood out after finishing these chapters?
                  </label>
                  <textarea
                    value={reviewText}
                    onChange={(event) => setReviewText(event.target.value)}
                    rows={4}
                    placeholder="Example: The breathing helped quickly, but the action step felt most realistic today."
                    className="mt-1.5 w-full border border-border bg-card px-3 py-2 font-sans text-xs leading-relaxed text-foreground outline-none focus:border-primary transition-colors resize-none"
                  />

                  <Button
                    type="submit"
                    size="sm"
                    disabled={savingReview}
                    className="mt-4 text-xs font-medium"
                  >
                    {savingReview ? (
                      <span className="h-3 w-3 animate-spin border-2 border-primary-foreground border-t-transparent" />
                    ) : null}
                    Save Reflection
                  </Button>
                </form>
              </aside>
            </section>
          </div>
        ) : (
          /* ── Empty State ─────────────────────────────────────────── */
          <section className="border border-dashed border-border bg-card p-10 text-center">
            <p className="mb-1 font-heading text-sm font-medium text-foreground">
              Your first exercise plan is almost there
            </p>
            <p className="mx-auto max-w-sm font-sans text-xs text-muted-foreground">
              Journal saves return instantly, and the analysis runs on the queue
              in the background. Once a journal entry is processed, this page
              will fill with your chapter guide, task tracking, and mood graph.
            </p>
            <Button
              size="sm"
              className="mt-5 text-xs font-medium"
              onClick={() => router.push("/dashboard/journal")}
            >
              Write in Mood Journal
              <ArrowRight size={14} weight="bold" />
            </Button>
          </section>
        )}
      </div>
    </div>
  );
}

function MoodTrackerCard({
  moodPoints,
  tracker,
}: {
  moodPoints: MoodPoint[];
  tracker?: ExerciseRecommendation["mood_tracker"];
}) {
  const chartData = moodPoints.map((point) => ({
    label: point.label,
    score: point.sentiment_score,
    mood: point.emoji_mood,
  }));

  const chartConfig = {
    score: {
      label: "Sentiment",
      color: "var(--primary)",
    },
  } satisfies ChartConfig;

  return (
    <div className="border border-border bg-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div>
          <p className="font-sans text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
            Mood Tracker
          </p>
          <h2 className="mt-1 font-heading text-base font-semibold text-foreground">
            30-day emotional rhythm
          </h2>
          <p className="mt-2 font-sans text-xs leading-relaxed text-muted-foreground">
            This graph blends your journal mood signal and sentiment analysis so
            you can see patterns over time.
          </p>
        </div>
        <div className="border border-border bg-muted/30 px-4 py-3">
          <div className="flex items-center gap-1.5 font-sans text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
            <TrendUp size={12} weight="bold" />
            Trend
          </div>
          <p className="mt-1 font-heading text-sm font-medium text-foreground">
            {tracker?.trend || "steady"}
          </p>
          <p className="mt-0.5 font-sans text-xs text-muted-foreground">
            Avg {tracker?.average_score ?? "--"}
          </p>
        </div>
      </div>

      <div className="border border-border bg-muted/30 p-4">
        {chartData.length ? (
          <>
            <ChartContainer
              config={chartConfig}
              className="min-h-[200px] w-full"
            >
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient
                    id="scoreGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="var(--primary)"
                      stopOpacity={0.15}
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--primary)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  className="text-xs"
                />
                <YAxis
                  domain={[0, 1]}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  className="text-xs"
                  width={30}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  fill="url(#scoreGradient)"
                />
              </AreaChart>
            </ChartContainer>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="border border-border bg-card px-3 py-3">
                <p className="font-sans text-xs font-medium tracking-[0.1em] text-muted-foreground uppercase">
                  Entries
                </p>
                <p className="mt-1 font-heading text-sm font-medium text-foreground">
                  {tracker?.entries_count ?? moodPoints.length}
                </p>
              </div>
              <div className="border border-border bg-card px-3 py-3">
                <p className="font-sans text-xs font-medium tracking-[0.1em] text-muted-foreground uppercase">
                  Latest
                </p>
                <p className="mt-1 font-heading text-sm font-medium text-foreground">
                  {moodPoints[moodPoints.length - 1]?.emoji_mood || "--"}
                </p>
              </div>
              <div className="border border-border bg-card px-3 py-3">
                <p className="font-sans text-xs font-medium tracking-[0.1em] text-muted-foreground uppercase">
                  Peak
                </p>
                <p className="mt-1 font-heading text-sm font-medium text-foreground">
                  {Math.max(
                    ...moodPoints.map((p) => p.sentiment_score),
                  ).toFixed(2)}
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="py-8 text-center">
            <p className="font-heading text-sm font-medium text-foreground">
              Your mood graph will appear here
            </p>
            <p className="mt-2 font-sans text-xs text-muted-foreground">
              Add journal entries and this tracker will start drawing your
              emotional rhythm automatically.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
