"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
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
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import confetti from "canvas-confetti";

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

const feelingOptions = [
  { value: "lighter", label: "Lighter" },
  { value: "steadier", label: "Steadier" },
  { value: "hopeful", label: "Hopeful" },
  { value: "still_heavy", label: "Still Heavy" },
  { value: "energized", label: "Energized" },
];

export default function ExerciseDetailPage() {
  const params = useParams();
  const planId = params.planId as string;
  const router = useRouter();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [savingTasks, setSavingTasks] = useState(false);
  const [savingReview, setSavingReview] = useState(false);
  const [reviewFeeling, setReviewFeeling] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [activeChapterIndex, setActiveChapterIndex] = useState(-1);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completedBadge, setCompletedBadge] = useState<{
    name: string;
    description: string;
  } | null>(null);

  useEffect(() => {
    if (!planId) return;
    api
      .get(`/api/exercise-plans/${planId}`)
      .then((res) => {
        setData(res.data);
        setReviewFeeling(res.data?.progress?.review?.feeling ?? "");
        setReviewText(res.data?.progress?.review?.text ?? "");
      })
      .catch(() => router.push("/dashboard/exercises"))
      .finally(() => setLoading(false));
  }, [planId, router]);

  const completedTaskKeys = useMemo(
    () => new Set(data?.progress?.completed_task_keys ?? []),
    [data?.progress?.completed_task_keys],
  );

  const chapterStatuses = useMemo(() => {
    const map = new Map<string, ChapterStatus>();
    (data?.progress?.chapter_statuses ?? []).forEach((s: ChapterStatus) => {
      map.set(s.chapter_key, s);
    });
    return map;
  }, [data?.progress?.chapter_statuses]);

  const chapters: ExerciseChapter[] = data?.chapters ?? [];
  const progress: ExerciseProgress | null = data?.progress ?? null;

  const effectiveChapterIndex = useMemo(() => {
    if (!chapters.length) return -1;
    if (activeChapterIndex >= 0 && activeChapterIndex < chapters.length) {
      return activeChapterIndex;
    }
    const firstIncomplete = chapters.findIndex(
      (ch) => !chapterStatuses.get(ch.chapter_key)?.is_complete,
    );
    return firstIncomplete >= 0 ? firstIncomplete : chapters.length - 1;
  }, [activeChapterIndex, chapters, chapterStatuses]);

  const allComplete = useMemo(() => {
    if (!chapters.length) return false;
    return chapters.every(
      (ch) => chapterStatuses.get(ch.chapter_key)?.is_complete,
    );
  }, [chapters, chapterStatuses]);

  const chapter = useMemo(
    () => (effectiveChapterIndex >= 0 ? chapters[effectiveChapterIndex] : null),
    [chapters, effectiveChapterIndex],
  );

  const chapterStatus = useMemo(() => {
    if (!chapter) return null;
    return chapterStatuses.get(chapter.chapter_key);
  }, [chapter, chapterStatuses]);

  const handleToggleTask = async (taskKey: string) => {
    if (!data?.plan_id || !progress) return;

    const prevChapterCount = progress.completed_chapter_keys?.length ?? 0;
    const nextTaskKeys = new Set(progress.completed_task_keys);
    if (nextTaskKeys.has(taskKey)) {
      nextTaskKeys.delete(taskKey);
    } else {
      nextTaskKeys.add(taskKey);
    }

    setSavingTasks(true);

    try {
      const res = await api.patch("/api/dashboard/exercises/progress", {
        plan_id: data.plan_id,
        completed_task_keys: Array.from(nextTaskKeys),
      });
      const newChapterCount =
        res.data.progress?.completed_chapter_keys?.length ?? 0;
      if (newChapterCount > prevChapterCount) {
        const badge = res.data.progress?.badge;
        if (badge) {
          setCompletedBadge({
            name: badge.name,
            description: badge.description,
          });
          setShowCompletionModal(true);
          confetti({ particleCount: 150, spread: 80, origin: { y: 0.55 } });
        }
      }
      setData((prev: any) =>
        prev ? { ...prev, progress: res.data.progress } : prev,
      );
    } catch {
      /* ignore */
    } finally {
      setSavingTasks(false);
    }
  };

  const handleReviewSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!data?.plan_id) return;
    setSavingReview(true);
    try {
      const res = await api.patch("/api/dashboard/exercises/progress", {
        plan_id: data.plan_id,
        review_feeling: reviewFeeling || null,
        review_text: reviewText || null,
      });
      setData((prev: any) =>
        prev ? { ...prev, progress: res.data.progress } : prev,
      );
      setReviewFeeling(res.data.progress.review?.feeling ?? "");
      setReviewText(res.data.progress.review?.text ?? "");
    } catch {
      /* ignore */
    } finally {
      setSavingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] bg-background">
        <div className="mx-auto max-w-3xl px-8 py-10 space-y-4">
          <div className="h-5 w-32 animate-pulse bg-muted" />
          <div className="h-7 w-56 animate-pulse bg-muted" />
          <div className="h-5 w-80 animate-pulse bg-muted" />
          <div className="mt-8 space-y-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 animate-pulse bg-muted" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!chapter) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] bg-background">
        <div className="mx-auto max-w-3xl px-8 py-10">
          <p className="font-sans text-sm text-muted-foreground">
            Exercise not found.
          </p>
          <Button
            size="sm"
            className="mt-4 text-xs font-medium"
            onClick={() => router.push("/dashboard/exercises")}
          >
            Back to exercises
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-background">
      <div className="mx-auto max-w-3xl px-8 py-10">
        {/* Back */}
        <button
          onClick={() => router.push("/dashboard/exercises")}
          className="mb-6 flex items-center gap-1.5 font-sans text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft size={14} weight="bold" />
          All exercises
        </button>

        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <p className="font-sans text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
              {data?.title || "Exercise"}
            </p>
            <div className="flex items-center gap-3">
              <span className="font-sans text-xs tabular-nums text-muted-foreground">
                {progress?.completed_tasks ?? 0}/{progress?.total_tasks ?? 0}
              </span>
              <div className="flex items-center gap-1.5">
                {chapters.map((ch, i) => {
                  const cs = chapterStatuses.get(ch.chapter_key);
                  const isCurrent = i === effectiveChapterIndex;
                  return (
                    <button
                      key={ch.chapter_key}
                      onClick={() => setActiveChapterIndex(i)}
                      className={`h-[10px] w-[10px] rounded-full transition-all cursor-pointer hover:scale-125 ${
                        cs?.is_complete
                          ? "bg-primary"
                          : isCurrent
                            ? "bg-foreground"
                            : "bg-border hover:bg-muted-foreground"
                      }`}
                      title={ch.chapter_title}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </header>

        {/* Progress bar */}
        {chapterStatus && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="font-sans text-xs text-muted-foreground">
                Chapter {effectiveChapterIndex + 1} of {chapters.length}
              </span>
              <span className="font-sans text-xs tabular-nums text-muted-foreground">
                {chapterStatus.completed_tasks}/{chapterStatus.total_tasks}
              </span>
            </div>
            <Progress
              value={
                (chapterStatus.completed_tasks / chapterStatus.total_tasks) *
                  100 || 0
              }
              className="h-1"
            />
          </div>
        )}

        {/* Phase tags */}
        <div className="mb-4 flex items-center gap-2">
          <Brain size={14} weight="bold" className="text-primary" />
          <span className="font-sans text-xs font-medium tracking-[0.12em] text-primary uppercase">
            {data?.phase || "Recovery"}
          </span>
          <span className="inline-flex items-center gap-1 font-sans text-xs text-muted-foreground">
            <Clock size={10} weight="bold" />
            {chapter.estimated_time}
          </span>
          <span className="inline-flex items-center gap-1 font-sans text-xs text-muted-foreground">
            <Lightning size={10} weight="bold" />
            {chapter.energy_points} XP
          </span>
        </div>

        {/* Chapter title */}
        <h2 className="font-heading text-2xl font-bold text-foreground">
          {chapter.chapter_title}
        </h2>
        <p className="mt-1 font-sans text-sm font-medium text-primary">
          {chapter.chapter_goal}
        </p>
        <p className="mt-4 font-sans text-sm leading-relaxed text-muted-foreground">
          {chapter.content}
        </p>

        {/* Tasks */}
        <div className="mt-8">
          {chapter.tasks.map((task, i) => {
            const checked = completedTaskKeys.has(task.task_key);
            return (
              <button
                key={task.task_key}
                type="button"
                onClick={() => handleToggleTask(task.task_key)}
                disabled={savingTasks}
                className={`w-full flex items-start gap-3 py-5 text-left transition ${
                  i > 0 ? "border-t border-border" : ""
                } ${checked ? "opacity-60" : ""}`}
              >
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border ${
                    checked
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border"
                  }`}
                >
                  {checked && <CheckCircle size={12} weight="bold" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className={`font-sans text-sm font-medium ${
                      checked
                        ? "text-muted-foreground line-through"
                        : "text-foreground"
                    }`}
                  >
                    {task.title}
                  </p>
                  {!checked && (
                    <>
                      <p className="mt-1 font-sans text-sm text-muted-foreground">
                        {task.instruction}
                      </p>
                      <p className="mt-1 font-sans text-xs font-medium tracking-[0.1em] text-muted-foreground uppercase">
                        {task.completion_hint}
                      </p>
                    </>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Reflection */}
        {chapter.reflection_prompt && (
          <div className="mt-6 border-t border-border pt-6">
            <p className="font-sans text-sm leading-relaxed text-muted-foreground italic">
              &ldquo;{chapter.reflection_prompt}&rdquo;
            </p>
          </div>
        )}

        {/* Review form */}
        {chapterStatus?.is_complete && (
          <form
            onSubmit={handleReviewSubmit}
            className="mt-8 border-t border-border pt-8"
          >
            <div className="flex items-center gap-3 mb-5">
              <TrendUp size={18} weight="bold" className="text-primary" />
              <div>
                <p className="font-sans text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
                  Review
                </p>
                <p className="font-sans text-sm font-medium text-foreground">
                  How did this chapter feel?
                </p>
              </div>
            </div>

            <Select
              value={reviewFeeling}
              onValueChange={(v) => setReviewFeeling(v ?? "")}
            >
              <SelectTrigger className="w-full">
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

            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              rows={3}
              placeholder="What stood out?"
              className="mt-3 w-full border border-border bg-card px-3 py-2 font-sans text-sm leading-relaxed text-foreground outline-none resize-none focus:border-primary transition-colors"
            />

            <Button
              type="submit"
              size="sm"
              disabled={savingReview}
              className="mt-3 text-xs font-medium"
            >
              {savingReview ? (
                <span className="mr-1 h-3 w-3 animate-spin border-2 border-primary-foreground border-t-transparent" />
              ) : null}
              Save Review
            </Button>
          </form>
        )}

        {/* Navigation */}
        <div className="mt-10 flex items-center justify-between border-t border-border pt-6">
          {effectiveChapterIndex > 0 ? (
            <button
              onClick={() => setActiveChapterIndex(effectiveChapterIndex - 1)}
              className="flex items-center gap-1.5 font-sans text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft size={14} weight="bold" />
              Previous
            </button>
          ) : (
            <div />
          )}
          {effectiveChapterIndex < chapters.length - 1 ? (
            <button
              onClick={() => setActiveChapterIndex(effectiveChapterIndex + 1)}
              className="flex items-center gap-1.5 font-sans text-sm text-primary transition-colors hover:text-primary/80"
            >
              Next
              <ArrowRight size={14} weight="bold" />
            </button>
          ) : allComplete ? (
            <div />
          ) : (
            <div />
          )}
        </div>

        {/* All-complete banner */}
        {allComplete && (
          <div className="mt-8 border-t border-border pt-8">
            <div className="flex items-center gap-3 mb-6">
              <Trophy size={32} weight="fill" className="text-amber-500" />
              <div>
                <p className="font-heading text-lg font-semibold text-foreground">
                  All chapters complete
                </p>
                <p className="font-sans text-sm text-muted-foreground">
                  Great work finishing this exercise session.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              className="text-xs font-medium"
              onClick={() => router.push("/dashboard/exercises")}
            >
              Back to exercises
              <ArrowRight size={14} weight="bold" />
            </Button>
          </div>
        )}

        {/* Confetti modal */}
        {showCompletionModal && completedBadge && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={() => setShowCompletionModal(false)}
          >
            <div
              className="mx-4 max-w-sm border border-border bg-card p-10 text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <Trophy size={48} weight="fill" className="mx-auto text-amber-500" />
              <h2 className="mt-4 font-heading text-xl font-bold text-foreground">
                Chapter Complete!
              </h2>
              <p className="mt-2 font-heading text-lg font-semibold text-primary">
                {completedBadge.name}
              </p>
              <p className="mt-1 font-sans text-sm text-muted-foreground">
                {completedBadge.description}
              </p>
              <Button
                size="sm"
                className="mt-6 text-xs font-medium"
                onClick={() => setShowCompletionModal(false)}
              >
                Continue
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
