"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarBlank,
  ArrowRight,
  Clock,
  BookOpen,
  Brain,
  PlayCircle,
  VideoCamera,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import api from "@/lib/axios";
import { fetchCurrentUser, type AuthUser } from "@/lib/auth";

type MoodPoint = {
  id: number;
  label: string;
  date: string;
  emoji_mood: string;
  sentiment_score: number;
};

type ExerciseTask = {
  title: string;
  task_key: string;
  instruction: string;
  completion_hint: string;
};

type ExerciseChapter = {
  chapter_key: string;
  chapter_title: string;
  chapter_goal: string;
  content: string;
  tasks: ExerciseTask[];
  energy_points: number;
  estimated_time: string;
  reflection_prompt: string;
};

type ExerciseData = {
  recommendation_id: number;
  phase: string;
  status: string;
  journey?: {
    headline: string;
    motivation: string;
    total_energy_points: number;
    badge_track: { code: string; name: string; description: string }[];
  };
  chapters: ExerciseChapter[];
  progress?: {
    completed_task_keys: string[];
    completion_percentage: number;
  } | null;
};

type DashboardData = {
  next_appointment: {
    id: number;
    status: string;
    scheduled_start: string;
    scheduled_end: string;
    consultant: {
      name: string;
      specialization: string;
    };
  } | null;
  mood_tracker: {
    entries_count: number;
    average_score: number | null;
    trend: string;
    points: MoodPoint[];
  };
  exercise: ExerciseData | null;
};

function getTimeUntil(iso: string) {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff < 0) return "00:00:00";
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const secs = Math.floor((diff % (1000 * 60)) / 1000);
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function getMoodLabel(score: number) {
  if (score >= 0.6) return "Elevated Resilience";
  if (score >= 0.2) return "Positive Trend";
  if (score >= -0.2) return "Steady State";
  if (score >= -0.6) return "Needs Attention";
  return "Support Recommended";
}

function getCategoryLabel(chapterKey: string): string {
  const map: Record<string, string> = {
    immediate_relief: "PHYSIOLOGICAL REGULATION",
    cognitive_work: "COGNITIVE RESTRUCTURING",
    action_step: "BEHAVIORAL ACTIVATION",
    grounding: "METACONSCIOUSNESS",
  };
  return map[chapterKey] ?? "EXERCISE";
}

// Placeholder images for exercise cards (gradient backgrounds)
const exerciseImages = [
  "bg-gradient-to-br from-slate-100 to-slate-200",
  "bg-gradient-to-br from-slate-200 to-slate-300",
  "bg-gradient-to-br from-slate-100 to-slate-300",
];

export default function DashboardPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let ignore = false;

    fetchCurrentUser()
      .then((currentUser) => {
        if (ignore) return;
        setUser(currentUser);

        if (!currentUser) {
          router.push("/login");
          return;
        }

        if (currentUser.system_role === "consultant") {
          setLoading(false);
          return;
        }

        api
          .get("/api/dashboard/summary")
          .then((res) => {
            if (!ignore) setData(res.data);
          })
          .catch(() => {
            if (!ignore) setData(null);
          })
          .finally(() => {
            if (!ignore) setLoading(false);
          });
      })
      .catch(() => {
        if (!ignore) {
          setLoading(false);
          router.push("/login");
        }
      });

    return () => {
      ignore = true;
    };
  }, [router]);

  const chartData = useMemo(() => {
    const points = data?.mood_tracker?.points ?? [];
    const last7 = points.slice(-7);
    if (last7.length === 0) return [];
    return last7.map((p) => ({
      ...p,
      height: Math.round(((p.sentiment_score + 1) / 2) * 100),
    }));
  }, [data]);

  const appointment = data?.next_appointment;
  const hasMoodData = (data?.mood_tracker?.entries_count ?? 0) > 0;
  const exercise = data?.exercise;
  const chapters = exercise?.chapters ?? [];
  const progress = exercise?.progress;
  const completedKeys = new Set(progress?.completed_task_keys ?? []);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] bg-background">
        <div className="mx-auto max-w-6xl px-8 py-10">
          <div className="mb-8 h-6 w-48 animate-pulse bg-muted" />
          <div className="mb-6 h-8 w-64 animate-pulse bg-muted" />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="h-60 animate-pulse border border-border" />
            <div className="h-60 animate-pulse border border-border" />
          </div>
        </div>
      </div>
    );
  }

  if (user?.system_role === "consultant") {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] bg-background">
        <div className="mx-auto max-w-6xl px-8 py-10">
          <header className="mb-8">
            <p className="mb-1 font-sans text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
              Consultant Control Center
            </p>
            <h1 className="font-heading text-2xl font-semibold text-foreground">
              Welcome back, {user?.first_name || "..."}
            </h1>
          </header>
          <div className="border border-border p-8">
            <h2 className="mb-3 font-heading text-xl font-semibold text-foreground">
              Scheduling comes first.
            </h2>
            <p className="mb-6 max-w-lg font-sans text-sm leading-relaxed text-muted-foreground">
              Build your consultant profile, set your base session rate, and
              publish clear availability windows.
            </p>
            <Button
              variant="default"
              size="sm"
              className="px-5 text-xs font-medium"
              onClick={() => router.push("/dashboard/consultant")}
            >
              Open Consultant Dashboard
              <ArrowRight size={14} weight="bold" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-background">
      <div className="mx-auto max-w-6xl px-8 py-10">
        {/* ── Page Header ────────────────────────────────────────────── */}
        <header className="mb-8">
          <div className="flex items-end justify-between">
            <div>
              <p className="mb-1 font-sans text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                System Status: Active
              </p>
              <h1 className="font-heading text-2xl font-semibold text-foreground">
                Clinical Overview
              </h1>
            </div>
            <p className="font-sans text-[12px] text-muted-foreground">
              Last Sync:{" "}
              {new Date().toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
              ,{" "}
              {new Date().toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
          </div>
        </header>

        {/* ── Top Row: Appointment + Mood ───────────────────────────── */}
        <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* ── Next Appointment ──────────────────────────────────── */}
          <div className="relative border border-border bg-card">
            <div className="absolute right-5 top-5 opacity-20">
              <VideoCamera size={48} weight="thin" className="text-primary" />
            </div>

            <div className="p-6 pr-20">
              <div className="mb-4">
                <span className="font-sans text-[10px] font-medium tracking-[0.12em] text-primary uppercase border border-primary/40 px-2 py-0.5">
                  Next Appointment
                </span>
              </div>

              {appointment ? (
                <div>
                  <p className="mb-1 font-heading text-lg font-medium text-foreground">
                    {appointment.consultant.specialization} Session
                  </p>
                  <p className="mb-6 font-sans text-[13px] text-muted-foreground">
                    {appointment.consultant.name} &middot;{" "}
                    {appointment.consultant.specialization}
                  </p>

                  <div className="mb-6 flex items-center gap-10">
                    <div>
                      <p className="font-sans text-[10px] font-medium tracking-[0.1em] text-muted-foreground uppercase">
                        Starts In
                      </p>
                      <p className="mt-0.5 font-mono text-lg font-medium text-foreground">
                        {getTimeUntil(appointment.scheduled_start)}
                      </p>
                    </div>
                    <div>
                      <p className="font-sans text-[10px] font-medium tracking-[0.1em] text-muted-foreground uppercase">
                        Method
                      </p>
                      <p className="mt-0.5 font-sans text-sm text-foreground">
                        Secure Video
                      </p>
                    </div>
                  </div>

                  <Button
                    className="text-xs font-medium"
                    size="sm"
                    onClick={() => router.push("/dashboard/room")}
                  >
                    Join Session Now
                    <ArrowRight size={14} weight="bold" />
                  </Button>
                </div>
              ) : (
                <div className="py-4">
                  <p className="mb-1 font-heading text-lg font-medium text-foreground">
                    No upcoming appointment
                  </p>
                  <p className="mb-5 max-w-xs font-sans text-[13px] leading-relaxed text-muted-foreground">
                    Book a session with a professional consultant to start your
                    healing journey.
                  </p>
                  <Button
                    size="sm"
                    className="text-xs font-medium"
                    onClick={() => router.push("/dashboard/booking")}
                  >
                    Book a Session
                    <ArrowRight size={14} weight="bold" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* ── Mood Sentiment ────────────────────────────────────── */}
          <Link href="/dashboard/journal" className="block">
            <div className="h-full border border-border bg-card transition-colors hover:border-primary/30">
              <div className="p-6">
                <div className="mb-4">
                  <p className="font-sans text-[10px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
                    Sentiment Analysis
                  </p>
                  <p className="mt-0.5 font-sans text-sm text-muted-foreground">
                    Last Mood Analysis
                  </p>
                </div>

                {hasMoodData && chartData.length > 0 ? (
                  <div>
                    {/* Bar chart */}
                    <div
                      className="mb-5 flex items-end gap-2"
                      style={{ height: 80 }}
                    >
                      {chartData.map((point, i) => {
                        const barHeight = Math.max(
                          8,
                          (point.height / 100) * 70,
                        );
                        const isLatest = i === chartData.length - 1;
                        const isPositive = point.sentiment_score >= 0;

                        return (
                          <div
                            key={point.id}
                            className="flex flex-1 flex-col items-center"
                          >
                            <div
                              className={`w-full transition-all ${
                                isLatest
                                  ? isPositive
                                    ? "bg-primary"
                                    : "bg-amber-500"
                                  : "bg-muted"
                              }`}
                              style={{ height: barHeight }}
                            />
                          </div>
                        );
                      })}
                    </div>

                    {/* Summary */}
                    <div className="text-center">
                      <p className="font-heading text-sm font-medium text-foreground">
                        {data?.mood_tracker?.average_score != null
                          ? getMoodLabel(data.mood_tracker.average_score)
                          : "No data"}
                      </p>
                      {data?.mood_tracker?.average_score != null && (
                        <p className="mt-0.5 font-sans text-[11px] text-primary">
                          +
                          {(
                            data.mood_tracker.average_score * 100
                          ).toFixed(0)}
                          % Improvement vs. Baseline
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="py-6 text-center">
                    <p className="mb-1 font-heading text-sm font-medium text-foreground">
                      Start tracking your mood
                    </p>
                    <p className="font-sans text-[12px] text-muted-foreground">
                      Log how you feel today.
                    </p>
                  </div>
                )}
              </div>

              <div className="border-t border-border px-6 py-2.5 text-center">
                <span className="font-sans text-[10px] font-medium tracking-[0.1em] text-muted-foreground uppercase">
                  View Detailed Metrics
                </span>
              </div>
            </div>
          </Link>
        </div>

        {/* ── AI-Generated Exercises ─────────────────────────────────── */}
        <section className="mb-8">
          <div className="mb-5 flex items-center gap-2">
            <Brain size={16} weight="bold" className="text-primary" />
            <h2 className="font-heading text-base font-semibold text-foreground">
              AI-Generated Exercises
            </h2>
          </div>

          {chapters.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {chapters.map((chapter, idx) => {
                const chapterTasks = chapter.tasks ?? [];
                const completedCount = chapterTasks.filter((t) =>
                  completedKeys.has(t.task_key),
                ).length;
                const isComplete =
                  chapterTasks.length > 0 &&
                  completedCount === chapterTasks.length;

                return (
                  <div
                    key={chapter.chapter_key}
                    className="flex flex-col border border-border bg-card"
                  >
                    {/* Image placeholder */}
                    <div
                      className={`h-36 ${exerciseImages[idx % exerciseImages.length]} flex items-center justify-center`}
                    >
                      <Brain
                        size={32}
                        weight="thin"
                        className="text-muted-foreground/40"
                      />
                    </div>

                    <div className="flex-1 p-5">
                      <p className="mb-1.5 font-sans text-[10px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
                        {getCategoryLabel(chapter.chapter_key)}
                      </p>
                      <h3 className="mb-2 font-heading text-[15px] font-semibold text-foreground">
                        {chapter.chapter_title}
                      </h3>
                      <p className="font-sans text-[12px] leading-relaxed text-muted-foreground">
                        {chapter.content}
                      </p>
                    </div>

                    <div className="flex items-center justify-between border-t border-border px-5 py-3">
                      <span className="font-sans text-[11px] text-muted-foreground">
                        {chapter.estimated_time}
                      </span>
                      <button
                        className="font-sans text-[11px] font-semibold uppercase tracking-wider text-primary hover:opacity-80 transition-opacity"
                        onClick={() => router.push("/dashboard/exercises")}
                      >
                        {isComplete ? "Review" : "Begin Exercise"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="border border-border bg-card p-8 text-center">
              <p className="mb-1 font-heading text-sm font-medium text-foreground">
                No exercises yet
              </p>
              <p className="mx-auto max-w-sm font-sans text-[12px] text-muted-foreground">
                Complete onboarding to generate your personalized exercise plan.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
