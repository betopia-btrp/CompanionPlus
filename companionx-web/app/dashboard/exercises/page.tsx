"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import api from "@/lib/axios";
import {
  ArrowLeft,
  Award,
  Brain,
  CheckCircle2,
  Clock3,
  LineChart,
  LoaderCircle,
  MessageCircleHeart,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";

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
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    api
      .get("/dashboard/exercises")
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
    if (!data?.recommendation_id || !data.progress) {
      return;
    }

    const nextTaskKeys = new Set(data.progress.completed_task_keys);

    if (nextTaskKeys.has(taskKey)) {
      nextTaskKeys.delete(taskKey);
    } else {
      nextTaskKeys.add(taskKey);
    }

    setSavingTasks(true);
    setStatusMessage(null);

    try {
      const res = await api.patch("/dashboard/exercises/progress", {
        recommendation_id: data.recommendation_id,
        completed_task_keys: Array.from(nextTaskKeys),
      });

      setData((prev) =>
        prev
          ? {
              ...prev,
              progress: res.data.progress,
            }
          : prev,
      );
      setStatusMessage("Progress saved.");
    } catch (error: unknown) {
      const message =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { data?: { message?: string } } }).response
          ?.data?.message === "string"
          ? (error as { response?: { data?: { message?: string } } }).response
              ?.data?.message
          : "Could not update exercise progress.";

      setStatusMessage(message);
    } finally {
      setSavingTasks(false);
    }
  };

  const handleReviewSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!data?.recommendation_id) {
      return;
    }

    setSavingReview(true);
    setStatusMessage(null);

    try {
      const res = await api.patch("/dashboard/exercises/progress", {
        recommendation_id: data.recommendation_id,
        review_feeling: reviewFeeling || null,
        review_text: reviewText || null,
      });

      setData((prev) =>
        prev
          ? {
              ...prev,
              progress: res.data.progress,
            }
          : prev,
      );
      setReviewFeeling(res.data.progress.review?.feeling ?? "");
      setReviewText(res.data.progress.review?.text ?? "");
      setStatusMessage("Reflection saved.");
    } catch (error: unknown) {
      const message =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { data?: { message?: string } } }).response
          ?.data?.message === "string"
          ? (error as { response?: { data?: { message?: string } } }).response
              ?.data?.message
          : "Could not save your reflection.";

      setStatusMessage(message);
    } finally {
      setSavingReview(false);
    }
  };

  const moodPoints = data?.mood_tracker?.points ?? [];
  const progress = data?.progress;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(20,184,166,0.14),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(249,115,22,0.12),_transparent_28%),linear-gradient(180deg,#f8fafc_0%,#eefbf8_100%)] px-6 py-8 md:px-10 md:py-12">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 flex items-center justify-between gap-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-teal-700"
          >
            <ArrowLeft size={18} /> Back to Hub
          </Link>
          <div className="rounded-full border border-teal-200 bg-white/85 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-teal-700 shadow-sm">
            Mental Lab
          </div>
        </div>

        <section className="mb-8 overflow-hidden rounded-[2.6rem] border border-slate-200 bg-slate-950 px-8 py-10 text-white shadow-2xl shadow-teal-100 md:px-12">
          <div className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-teal-100">
                <Sparkles size={14} />
                Gamified Recovery
              </div>
              <h1 className="max-w-3xl text-4xl font-black tracking-tight md:text-5xl">
                {data?.journey?.headline ||
                  "Your adaptive exercise quest, built from how you are doing."}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-300 md:text-lg">
                {data?.journey?.motivation ||
                  "Each chapter gives you practical steps, trackable wins, and reflection space so support feels personal and alive."}
              </p>

              <div className="mt-6 flex flex-wrap gap-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-200">
                {data?.phase ? (
                  <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-emerald-200">
                    {data.phase}
                  </span>
                ) : null}
                {data?.trend_analysis?.direction ? (
                  <span className="rounded-full bg-white/10 px-3 py-1 text-blue-100">
                    {data.trend_analysis.direction}
                  </span>
                ) : null}
                {typeof data?.journey?.total_energy_points === "number" ? (
                  <span className="rounded-full bg-white/10 px-3 py-1 text-amber-100">
                    {data.journey.total_energy_points} energy points
                  </span>
                ) : null}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-teal-100">
                  <TrendingUp size={16} />
                  Trend Signal
                </div>
                <p className="text-sm leading-relaxed text-slate-200">
                  {data?.trend_analysis?.summary ||
                    "Save mood journal entries to generate deeper adaptive guidance."}
                </p>
              </div>

              <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-100">
                  <Award size={16} />
                  Current Badge
                </div>
                {progress?.badge ? (
                  <>
                    <p className="text-lg font-black text-white">
                      {progress.badge.name}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-slate-300">
                      {progress.badge.description}
                    </p>
                  </>
                ) : (
                  <p className="text-sm leading-relaxed text-slate-300">
                    Complete your first chapter to unlock your first badge.
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        {statusMessage ? (
          <div className="mb-6 rounded-2xl border border-teal-200 bg-white/85 px-5 py-4 text-sm font-semibold text-teal-800 shadow-sm">
            {statusMessage}
          </div>
        ) : null}

        {loading ? (
          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="h-[24rem] animate-pulse rounded-[2rem] border border-slate-200 bg-white/80" />
            <div className="h-[24rem] animate-pulse rounded-[2rem] border border-slate-200 bg-white/80" />
          </div>
        ) : data?.status === "pending" || data?.status === "missing_onboarding" ? (
          <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <MoodTrackerCard moodPoints={moodPoints} tracker={data?.mood_tracker} />
            <div className="rounded-[2.4rem] border border-dashed border-slate-300 bg-white/80 px-8 py-12 shadow-sm">
              <h2 className="text-2xl font-black text-slate-900">
                {data.status === "pending"
                  ? "Your exercise plan is being prepared"
                  : "Your first exercise plan unlocks after onboarding"}
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-500">
                {data.message ||
                  "Complete the next step and this space will transform into your chapter-based exercise journey."}
              </p>
              <Link
                href={
                  data.status === "missing_onboarding"
                    ? "/onboarding"
                    : "/dashboard/journal"
                }
                className="mt-8 inline-flex rounded-2xl bg-teal-600 px-6 py-4 text-sm font-black text-white transition hover:bg-teal-700"
              >
                {data.status === "missing_onboarding"
                  ? "Start Onboarding"
                  : "Write in Mood Journal"}
              </Link>
            </div>
          </section>
        ) : data?.chapters?.length ? (
          <div className="space-y-8">
            <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
              <MoodTrackerCard moodPoints={moodPoints} tracker={data?.mood_tracker} />

              <div className="grid gap-6">
                <div className="rounded-[2.2rem] border border-slate-200 bg-white p-7 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-teal-700">
                        Progress
                      </p>
                      <h2 className="mt-2 text-2xl font-black text-slate-900">
                        {progress?.completion_percentage ?? 0}% complete
                      </h2>
                    </div>
                    {(savingTasks || savingReview) && (
                      <LoaderCircle className="animate-spin text-teal-500" size={20} />
                    )}
                  </div>

                  <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,#14b8a6_0%,#f59e0b_100%)] transition-all"
                      style={{
                        width: `${progress?.completion_percentage ?? 0}%`,
                      }}
                    />
                  </div>

                  <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
                    <span>
                      {progress?.completed_tasks ?? 0} / {progress?.total_tasks ?? 0} tasks
                      done
                    </span>
                    <span>{data.journey?.total_energy_points ?? 0} energy points</span>
                  </div>
                </div>

                <div className="rounded-[2.2rem] border border-amber-200 bg-[linear-gradient(145deg,#fff7ed_0%,#fffbeb_100%)] p-7 shadow-sm">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-lg">
                      <Award size={20} />
                    </span>
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-700">
                        Badge Track
                      </p>
                      <h2 className="text-2xl font-black text-slate-900">
                        {progress?.badge?.name || "First badge waiting"}
                      </h2>
                    </div>
                  </div>

                  <p className="mt-4 text-sm leading-7 text-slate-600">
                    {progress?.badge?.description ||
                      "Complete a full chapter to unlock your first reward and build momentum."}
                  </p>

                  <div className="mt-5 grid gap-3">
                    {data.journey?.badge_track?.map((badge) => {
                      const unlocked =
                        (progress?.completed_chapter_keys?.length ?? 0) >=
                        badge.unlock_after_chapters;

                      return (
                        <div
                          key={badge.code}
                          className={`rounded-2xl border px-4 py-3 text-sm ${
                            unlocked
                              ? "border-amber-300 bg-white text-slate-700"
                              : "border-white/70 bg-white/60 text-slate-400"
                          }`}
                        >
                          <p className="font-black">{badge.name}</p>
                          <p className="mt-1 leading-6">{badge.description}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="grid gap-6">
                {data.chapters.map((chapter, index) => {
                  const chapterStatus = chapterStatuses.get(chapter.chapter_key);

                  return (
                    <article
                      key={chapter.chapter_key}
                      className="overflow-hidden rounded-[2.2rem] border border-slate-200 bg-white p-8 shadow-sm"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="max-w-2xl">
                          <div className="mb-4 flex items-center gap-3">
                            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg">
                              <Brain size={20} />
                            </span>
                            <div>
                              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
                                Chapter {index + 1}
                              </p>
                              <h2 className="text-2xl font-black tracking-tight text-slate-900">
                                {chapter.chapter_title}
                              </h2>
                            </div>
                          </div>

                          <p className="text-sm font-semibold text-teal-700">
                            {chapter.chapter_goal}
                          </p>
                          <p className="mt-4 text-sm leading-7 text-slate-600">
                            {chapter.content}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-3">
                          <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700">
                            <Clock3 size={14} />
                            {chapter.estimated_time}
                          </span>
                          <span className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-4 py-2 text-xs font-bold text-teal-700">
                            <Sparkles size={14} />
                            {chapter.energy_points} XP
                          </span>
                          {chapterStatus?.is_complete ? (
                            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700">
                              <CheckCircle2 size={14} />
                              Chapter complete
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div className="mt-8 grid gap-4">
                        {chapter.tasks.map((task) => {
                          const checked = completedTaskKeys.has(task.task_key);

                          return (
                            <button
                              key={task.task_key}
                              type="button"
                              onClick={() => handleToggleTask(task.task_key)}
                              disabled={savingTasks}
                              className={`rounded-[1.7rem] border p-5 text-left transition ${
                                checked
                                  ? "border-emerald-200 bg-emerald-50/80"
                                  : "border-slate-200 bg-slate-50/70 hover:border-teal-200 hover:bg-teal-50/40"
                              }`}
                            >
                              <div className="flex items-start gap-4">
                                <span
                                  className={`mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                                    checked
                                      ? "border-emerald-500 bg-emerald-500 text-white"
                                      : "border-slate-300 bg-white text-transparent"
                                  }`}
                                >
                                  <CheckCircle2 size={14} />
                                </span>
                                <div>
                                  <p className="text-base font-black text-slate-900">
                                    {task.title}
                                  </p>
                                  <p className="mt-2 text-sm leading-7 text-slate-600">
                                    {task.instruction}
                                  </p>
                                  <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                                    {task.completion_hint}
                                  </p>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      <div className="mt-6 rounded-[1.8rem] bg-slate-950 px-5 py-4 text-sm leading-7 text-slate-200">
                        <span className="font-black text-white">Reflection prompt:</span>{" "}
                        {chapter.reflection_prompt}
                      </div>
                    </article>
                  );
                })}
              </div>

              <aside className="space-y-6">
                <div className="rounded-[2.2rem] border border-slate-200 bg-white p-7 shadow-sm">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-lg">
                      <Target size={20} />
                    </span>
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-teal-700">
                        Chapter Wins
                      </p>
                      <h2 className="text-2xl font-black text-slate-900">
                        {progress?.completed_chapter_keys?.length ?? 0} /{" "}
                        {data.chapters.length} chapters finished
                      </h2>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    {data.chapters.map((chapter) => {
                      const chapterStatus = chapterStatuses.get(chapter.chapter_key);

                      return (
                        <div
                          key={chapter.chapter_key}
                          className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-black text-slate-800">
                              {chapter.chapter_title}
                            </p>
                            <span className="text-sm font-semibold text-slate-500">
                              {chapterStatus?.completed_tasks ?? 0}/
                              {chapterStatus?.total_tasks ?? chapter.tasks.length}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <form
                  onSubmit={handleReviewSubmit}
                  className="rounded-[2.2rem] border border-slate-200 bg-white p-7 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500 text-white shadow-lg">
                      <MessageCircleHeart size={20} />
                    </span>
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-rose-700">
                        After-Exercise Review
                      </p>
                      <h2 className="text-2xl font-black text-slate-900">
                        Capture how this felt
                      </h2>
                    </div>
                  </div>

                  <p className="mt-4 text-sm leading-7 text-slate-600">
                    Your reflection helps the next AI plan adapt its tone, task
                    depth, and pacing.
                  </p>

                  <label className="mt-6 block text-sm font-bold text-slate-700">
                    How do you feel after this exercise?
                  </label>
                  <select
                    value={reviewFeeling}
                    onChange={(event) => setReviewFeeling(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-teal-400 focus:bg-white"
                  >
                    <option value="">Select a feeling</option>
                    {feelingOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>

                  <label className="mt-5 block text-sm font-bold text-slate-700">
                    What stood out after finishing these chapters?
                  </label>
                  <textarea
                    value={reviewText}
                    onChange={(event) => setReviewText(event.target.value)}
                    rows={6}
                    placeholder="Example: The breathing helped quickly, but the action step felt most realistic today."
                    className="mt-2 w-full rounded-[1.6rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-700 outline-none transition focus:border-teal-400 focus:bg-white"
                  />

                  <button
                    type="submit"
                    disabled={savingReview}
                    className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {savingReview ? (
                      <LoaderCircle size={16} className="animate-spin" />
                    ) : (
                      <MessageCircleHeart size={16} />
                    )}
                    Save Reflection
                  </button>
                </form>
              </aside>
            </section>
          </div>
        ) : (
          <section className="rounded-[2.5rem] border border-dashed border-slate-300 bg-white/80 px-8 py-14 text-center shadow-sm">
            <h2 className="text-2xl font-black text-slate-900">
              Your first exercise plan is almost there
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-500">
              Journal saves return instantly, and the analysis runs on the queue
              in the background. Once a journal entry is processed, this page
              will fill with your chapter guide, task tracking, and mood graph.
            </p>
            <Link
              href="/dashboard/journal"
              className="mt-8 inline-flex rounded-2xl bg-teal-600 px-6 py-4 text-sm font-black text-white transition hover:bg-teal-700"
            >
              Write in Mood Journal
            </Link>
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
  const path = buildChartPath(moodPoints);

  return (
    <div className="rounded-[2.3rem] border border-slate-200 bg-white p-7 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-teal-700">
            Mood Tracker
          </p>
          <h2 className="mt-2 text-3xl font-black text-slate-900">
            30-day emotional rhythm
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
            This graph blends your journal mood signal and sentiment analysis so
            you can see patterns over time.
          </p>
        </div>

        <div className="rounded-[1.8rem] bg-slate-950 px-5 py-4 text-white">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-teal-200">
            <LineChart size={14} />
            Trend
          </div>
          <p className="mt-2 text-2xl font-black">
            {tracker?.trend || "steady"}
          </p>
          <p className="mt-1 text-sm text-slate-300">
            Avg score {tracker?.average_score ?? "--"}
          </p>
        </div>
      </div>

      <div className="mt-8 rounded-[2rem] bg-[linear-gradient(180deg,#f8fafc_0%,#ecfeff_100%)] p-5">
        {moodPoints.length ? (
          <>
            <div className="relative">
              <svg
                viewBox="0 0 100 42"
                className="h-56 w-full overflow-visible"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="mood-line" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#14b8a6" />
                    <stop offset="100%" stopColor="#f97316" />
                  </linearGradient>
                </defs>
                {[10, 20, 30].map((line) => (
                  <line
                    key={line}
                    x1="0"
                    x2="100"
                    y1={line}
                    y2={line}
                    stroke="#cbd5e1"
                    strokeDasharray="2 3"
                    strokeWidth="0.3"
                  />
                ))}
                {path ? (
                  <path
                    d={path}
                    fill="none"
                    stroke="url(#mood-line)"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                ) : null}
                {moodPoints.map((point, index) => {
                  const x =
                    moodPoints.length === 1
                      ? 50
                      : (index / (moodPoints.length - 1)) * 100;
                  const y = 38 - point.sentiment_score * 30;

                  return (
                    <circle
                      key={point.id}
                      cx={x}
                      cy={y}
                      r="1.8"
                      fill="#0f172a"
                      stroke="#ffffff"
                      strokeWidth="0.8"
                    />
                  );
                })}
              </svg>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-white px-4 py-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                  Entries
                </p>
                <p className="mt-2 text-2xl font-black text-slate-900">
                  {tracker?.entries_count ?? moodPoints.length}
                </p>
              </div>
              <div className="rounded-2xl bg-white px-4 py-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                  Latest mood
                </p>
                <p className="mt-2 text-2xl font-black text-slate-900">
                  {moodPoints[moodPoints.length - 1]?.emoji_mood || "--"}
                </p>
              </div>
              <div className="rounded-2xl bg-white px-4 py-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                  Highest point
                </p>
                <p className="mt-2 text-2xl font-black text-slate-900">
                  {Math.max(...moodPoints.map((point) => point.sentiment_score)).toFixed(2)}
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-[1.8rem] bg-white px-6 py-10 text-center">
            <p className="text-lg font-black text-slate-900">
              Your mood graph will appear here
            </p>
            <p className="mt-3 text-sm leading-7 text-slate-500">
              Add a few journal entries and this tracker will start drawing your
              emotional rhythm automatically.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function buildChartPath(points: MoodPoint[]) {
  if (points.length < 2) {
    return "";
  }

  return points
    .map((point, index) => {
      const x = (index / (points.length - 1)) * 100;
      const y = 38 - point.sentiment_score * 30;

      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
}
