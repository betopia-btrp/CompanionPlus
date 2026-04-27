"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Brain,
  CalendarDots,
  CheckCircle,
  Crown,
  Spinner,
  TrendUp,
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
    jitsi_room_uuid: string;
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

type BlogPost = {
  id: number;
  title: string;
  slug: string;
  content?: string;
  excerpt: string | null;
  cover_image_url: string | null;
  created_at: string;
  author?: {
    first_name: string;
    last_name: string;
  };
};

function getTimeUntil(iso: string, now: number = Date.now()) {
  const diff = new Date(iso).getTime() - now;
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



export default function DashboardPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => Date.now());
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [blogsLoading, setBlogsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

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

    // Fetch consultant blogs for all users
    api
      .get("/api/blogs")
      .then((res) => {
        if (!ignore) setBlogs(res.data.data || res.data.blogs || []);
      })
      .catch(() => {
        if (!ignore) setBlogs([]);
      })
      .finally(() => {
        if (!ignore) setBlogsLoading(false);
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

  const [recentPlans, setRecentPlans] = useState<{
    id: number;
    title: string;
    description: string | null;
    estimated_time: string | null;
    origin: string;
    status: string;
    completion_percentage: number;
    badge_name: string | null;
  }[]>([]);

  useEffect(() => {
    api
      .get("/api/dashboard/exercises")
      .then((res) => {
        const plans = res.data?.plans ?? [];
        setRecentPlans(plans.slice(0, 3));
      })
      .catch(() => {});
  }, []);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] bg-background">
        <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">
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
    return <ConsultantDashboard />;
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-background">
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">
        {/* ── Page Header ────────────────────────────────────────────── */}
        <header className="mb-8">
          <div className="flex items-end justify-between">
            <div>
              <p className="mb-1 font-sans text-xs font-medium tracking-wider text-muted-foreground uppercase">
                System Status: Active
              </p>
              <h1 className="font-heading text-2xl font-semibold text-foreground">
                Clinical Overview
              </h1>
            </div>
            <p className="font-sans text-xs text-muted-foreground">
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
                <span className="font-sans text-xs font-medium tracking-[0.12em] text-primary uppercase border border-primary/40 px-2 py-0.5">
                  Next Appointment
                </span>
              </div>

              {appointment ? (
                <div>
                  <p className="mb-1 font-heading text-lg font-medium text-foreground">
                    {appointment.consultant.specialization} Session
                  </p>
                  <p className="mb-6 font-sans text-sm text-muted-foreground">
                    {appointment.consultant.name} &middot;{" "}
                    {appointment.consultant.specialization}
                  </p>

                  <div className="mb-6 flex items-center gap-10">
                    <div>
                      <p className="font-sans text-xs font-medium tracking-[0.1em] text-muted-foreground uppercase">
                        Starts In
                      </p>
                      <p className="mt-0.5 font-mono text-lg font-medium text-foreground">
                        {getTimeUntil(appointment.scheduled_start, now)}
                      </p>
                    </div>
                    <div>
                      <p className="font-sans text-xs font-medium tracking-[0.1em] text-muted-foreground uppercase">
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
                    onClick={() => router.push(`/dashboard/room?room=${appointment.jitsi_room_uuid}`)}
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
                  <p className="mb-5 max-w-xs font-sans text-sm leading-relaxed text-muted-foreground">
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
                  <p className="font-sans text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
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
                        <p className="mt-0.5 font-sans text-xs text-primary">
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
                    <p className="font-sans text-xs text-muted-foreground">
                      Log how you feel today.
                    </p>
                  </div>
                )}
              </div>

              <div className="border-t border-border px-6 py-2.5 text-center">
                <span className="font-sans text-xs font-medium tracking-[0.1em] text-muted-foreground uppercase">
                  View Detailed Metrics
                </span>
              </div>
            </div>
          </Link>
        </div>

        {/* ── Subscription Info ────────────────────────────────────── */}
        <div className="mb-8 border border-border bg-card p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex aspect-square w-10 items-center justify-center border border-primary/30 bg-primary/5">
                <Crown size={18} weight={user?.subscription_plan?.name !== "Free" ? "fill" : "regular"} className={user?.subscription_plan?.name !== "Free" ? "text-amber-500" : "text-muted-foreground"} />
              </div>
              <div>
                <p className="font-heading text-sm font-semibold text-foreground">
                  {user?.subscription_plan?.name ?? "Free"} Plan
                </p>
                <p className="font-sans text-xs text-muted-foreground">
                  {user?.subscription_plan?.name === "Pro"
                    ? "Unlimited AI recommendations, exercises, and sessions."
                    : user?.active_subscription
                      ? `${user.free_sessions_remaining ?? 0} free session${user.free_sessions_remaining !== 1 ? "s" : ""} remaining`
                      : "Upgrade to unlock premium features."}
                </p>
              </div>
            </div>
            {user?.subscription_plan?.name !== "Pro" && (
              <Button
                size="sm"
                className="shrink-0 text-xs font-medium"
                onClick={() => router.push("/pricing")}
              >
                {user?.active_subscription ? "Upgrade" : "See Plans"}
                <ArrowRight size={14} weight="bold" />
              </Button>
            )}
          </div>
        </div>

        {/* ── Consultant Blogs ─────────────────────────────────────── */}
        <section className="mb-8">
          <div className="mb-5 flex items-center gap-2">
            <Brain size={16} weight="bold" className="text-primary" />
            <h2 className="font-heading text-base font-semibold text-foreground">
              Consultant Blogs
            </h2>
          </div>

          {blogsLoading ? (
            <div className="border border-border bg-card p-8 text-center">
              <Spinner size={24} className="animate-spin text-muted-foreground mx-auto" />
              <p className="mt-2 font-sans text-xs text-muted-foreground">Loading blogs…</p>
            </div>
          ) : blogs.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {blogs.map((blog) => (
                <div key={blog.id} className="flex flex-col border border-border bg-card">
                  {blog.cover_image_url && (
                    <div className="h-36 w-full bg-cover bg-center" style={{ backgroundImage: `url(${blog.cover_image_url})` }} />
                  )}
                  <div className="flex-1 p-5">
                    <p className="mb-1.5 font-sans text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
                      {blog.author?.first_name} {blog.author?.last_name}
                    </p>
                    <h3 className="mb-2 font-heading text-sm font-semibold text-foreground">
                      {blog.title}
                    </h3>
                    <p className="font-sans text-xs leading-relaxed text-muted-foreground">
                      {blog.excerpt || blog.content?.slice(0, 120) + (blog.content?.length > 120 ? "…" : "")}
                    </p>
                  </div>
                  <div className="flex items-center justify-between border-t border-border px-5 py-3">
                    <span className="font-sans text-xs text-muted-foreground">
                      {new Date(blog.created_at).toLocaleDateString()}
                    </span>
                    <button
                      className="font-sans text-xs font-semibold uppercase tracking-wider text-primary hover:opacity-80 transition-opacity"
                      onClick={() => router.push("/dashboard/corner")}
                    >
                      Read More
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="border border-border bg-card p-8 text-center">
              <p className="mb-1 font-heading text-sm font-medium text-foreground">
                No consultant blogs yet
              </p>
              <p className="mx-auto max-w-sm font-sans text-xs text-muted-foreground">
                Check back soon for insights and advice from our consultants.
              </p>
            </div>
          )}
        </section>

        {/* ── Mental Exercises ──────────────────────────────────────── */}
        <section className="mb-8">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain size={16} weight="bold" className="text-primary" />
              <h2 className="font-heading text-base font-semibold text-foreground">
                Mental Exercises
              </h2>
            </div>
            <button
              onClick={() => router.push("/dashboard/exercises")}
              className="font-sans text-xs font-medium text-primary transition-colors hover:text-primary/80"
            >
              View all exercises
              <ArrowRight size={12} weight="bold" className="inline ml-0.5" />
            </button>
          </div>

          {recentPlans.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {recentPlans.map((plan) => (
                <button
                  key={plan.id}
                  onClick={() => router.push(`/dashboard/exercises/${plan.id}`)}
                  className="flex flex-col border border-border bg-card p-5 text-left transition hover:border-primary/30 hover:bg-primary/3"
                >
                  <p className="font-heading text-sm font-semibold text-foreground">
                    {plan.title}
                  </p>
                  <p className="mt-1 font-sans text-xs leading-relaxed text-muted-foreground line-clamp-2">
                    {plan.description}
                  </p>
                  <div className="mt-auto pt-4 flex items-center justify-between">
                    <span className="font-sans text-xs text-muted-foreground">
                      {plan.estimated_time}
                    </span>
                    {plan.status === "completed" ? (
                      <span className="inline-flex items-center gap-1 font-sans text-xs text-primary">
                        <CheckCircle size={12} weight="bold" />
                        Done
                      </span>
                    ) : plan.status === "in_progress" ? (
                      <span className="inline-flex items-center gap-1 font-sans text-xs text-muted-foreground">
                        {plan.completion_percentage}%
                      </span>
                    ) : (
                      <span className="font-sans text-xs font-medium text-primary">
                        Start
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <button
              onClick={() => router.push("/dashboard/exercises")}
              className="w-full border border-dashed border-border bg-card p-8 text-center transition hover:border-primary/30 hover:bg-primary/3"
            >
              <Brain size={24} weight="thin" className="mx-auto text-muted-foreground" />
              <p className="mt-3 font-heading text-sm font-medium text-foreground">
                Begin your first exercise
              </p>
              <p className="mt-1 font-sans text-xs text-muted-foreground">
                Choose from guided breathing, body scan, and more.
              </p>
            </button>
          )}
        </section>
      </div>
    </div>
  );
}

type ConsultantDashboardData = {
  consultant: {
    id: number;
    name: string;
    email: string;
    is_approved: boolean;
    specialization: string;
    bio: string | null;
    base_rate_bdt: number;
    average_rating: number;
  };
  stats: {
    today_sessions: number;
    total_patients: number;
    pending_bookings: number;
    upcoming_slots: number;
    booked_slots: number;
    held_slots: number;
    available_slots: number;
  };
  today_schedule: ConsultantBooking[];
  earnings: {
    monthly_total: number;
    change_percent: number;
  };
  session_requests: ConsultantBooking[];
};

type ConsultantBooking = {
  id: number;
  patient_ref: string;
  patient_name: string;
  status: string;
  scheduled_start: string;
  scheduled_end: string;
  price_at_booking: number;
  jitsi_room_uuid: string;
  is_first_time: boolean;
};

function ConsultantDashboard() {
  const [data, setData] = useState<ConsultantDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    api
      .get("/api/consultant/dashboard")
      .then((res) => setData(res.data))
      .catch((err) => {
        console.error("Failed to fetch consultant dashboard", err);
        setData(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleApprove = async (bookingId: number) => {
    try {
      await api.post(`/api/consultant/bookings/${bookingId}/approve`);
      const res = await api.get("/api/consultant/dashboard");
      setData(res.data);
    } catch (err) {
      console.error("Failed to approve booking", err);
    }
  };

  const handleReject = async (bookingId: number) => {
    try {
      await api.post(`/api/consultant/bookings/${bookingId}/reject`);
      const res = await api.get("/api/consultant/dashboard");
      setData(res.data);
    } catch (err) {
      console.error("Failed to reject booking", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] bg-background">
        <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">
          <div className="mb-8 h-6 w-48 animate-pulse bg-muted" />
          <div className="mb-6 h-8 w-64 animate-pulse bg-muted" />
          <div className="grid grid-cols-3 gap-4">
            <div className="h-24 animate-pulse border border-border" />
            <div className="h-24 animate-pulse border border-border" />
            <div className="h-24 animate-pulse border border-border" />
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] bg-background">
        <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">
          <p className="font-sans text-sm text-muted-foreground">
            Failed to load dashboard data.
          </p>
        </div>
      </div>
    );
  }

  const { consultant, stats, today_schedule, earnings, session_requests } = data;
  const today = new Date();

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-background">
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">
        {/* ── Page Header ────────────────────────────────────────── */}
        <header className="mb-8">
          <p className="mb-1 font-sans text-xs text-muted-foreground uppercase">
            Consultant Overview
          </p>
          <h1 className="font-heading text-2xl font-semibold text-foreground">
            Welcome back, {consultant.name}
          </h1>
        </header>

        {/* ── Stats Cards ────────────────────────────────────────── */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="Today's Sessions"
            value={String(stats.today_sessions)}
          />
          <StatCard
            label="Total Users"
            value={stats.total_patients.toLocaleString()}
          />
          <StatCard
            label="Pending Bookings"
            value={String(stats.pending_bookings).padStart(2, "0")}
            highlight
          />
        </div>

        {/* ── Main Content: Schedule + Earnings ──────────────────── */}
        <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
          {/* Today's Schedule */}
          <div className="border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="font-heading text-base font-semibold text-foreground">
                Daily Schedule
              </h2>
              <span className="font-sans text-xs text-muted-foreground">
                {today.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>

            {today_schedule.length > 0 ? (
              <div>
                {today_schedule.map((session) => {
                  const startTime = new Date(session.scheduled_start);
                  const endTime = new Date(session.scheduled_end);
                  const isCurrent =
                    new Date() >= startTime && new Date() <= endTime;
                  const isPast = new Date() > endTime;

                  return (
                    <div
                      key={session.id}
                      className={`flex flex-col gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 last:border-b-0 ${
                        isCurrent ? "bg-primary/5" : ""
                      } ${isPast ? "opacity-50" : ""}`}
                    >
                      <div className="flex items-center gap-4">
                        <span className="font-mono text-sm text-muted-foreground shrink-0">
                          {startTime.toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </span>
                        <div>
                          {isCurrent ? (
                            <span className="font-sans text-xs font-medium text-primary">
                              CURRENT SESSION
                            </span>
                          ) : null}
                          <p className="font-sans text-sm font-medium text-foreground">
                            {session.patient_ref}
                          </p>
                          {session.is_first_time ? (
                            <span className="font-sans text-xs text-muted-foreground">
                              First-time Consultation
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:ml-auto">
                        {isCurrent ? (
                          <Button
                            size="sm"
                            className="text-xs font-medium"
                            onClick={() =>
                              router.push(
                                `/dashboard/room?room=${session.jitsi_room_uuid}`,
                              )
                            }
                          >
                            Resume Call
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs font-medium"
                          >
                            View Notes
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="px-6 py-10 text-center">
                <p className="font-sans text-sm text-muted-foreground">
                  No sessions scheduled for today.
                </p>
              </div>
            )}
          </div>

          {/* Earnings Snapshot */}
          <div className="space-y-4">
            <p className="font-sans text-xs text-muted-foreground uppercase">
              Earnings Snapshot
            </p>
            <div className="border border-border bg-foreground p-6 text-background">
              <p className="font-sans text-xs text-background/60 uppercase">
                Total BDT (This Month)
              </p>
              <p className="mt-2 font-heading text-2xl font-semibold">
                ৳{earnings.monthly_total.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
              </p>
              {earnings.change_percent !== 0 && (
                <div className="mt-3 flex items-center gap-1">
                  <TrendUp size={14} weight="bold" className={earnings.change_percent >= 0 ? "text-emerald-400" : "text-red-400"} />
                  <span className={`font-sans text-xs ${earnings.change_percent >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {earnings.change_percent >= 0 ? "+" : ""}
                    {earnings.change_percent}% vs last month
                  </span>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <p className="font-sans text-xs text-muted-foreground uppercase mt-6">
              Quick Actions
            </p>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-between text-xs font-medium"
              onClick={() => router.push("/dashboard/consultant")}
            >
              New Availability Slot
              <ArrowRight size={14} weight="bold" />
            </Button>
          </div>
        </div>

        {/* ── Session Requests ───────────────────────────────────── */}
        {session_requests.length > 0 && (
          <section>
            <h2 className="mb-4 font-heading text-base font-semibold text-foreground">
              Session Requests
            </h2>
            <div className="border border-border bg-card">
              {/* Table header */}
              <div className="grid grid-cols-4 border-b border-border bg-muted/30 px-6 py-3">
                  <span className="font-sans text-xs font-semibold text-muted-foreground uppercase">
                    Ref
                  </span>
                <span className="font-sans text-xs font-semibold text-muted-foreground uppercase">
                  Requested Time
                </span>
                <span className="font-sans text-xs font-semibold text-muted-foreground uppercase">
                  Status
                </span>
                <span className="font-sans text-xs font-semibold text-muted-foreground uppercase text-right">
                  Actions
                </span>
              </div>

              {session_requests.map((req) => {
                const reqTime = new Date(req.scheduled_start);
                return (
                  <div
                    key={req.id}
                    className="grid grid-cols-4 items-center border-b border-border/50 px-6 py-4 last:border-b-0"
                  >
                    <div>
                      <p className="font-sans text-sm font-medium text-foreground">
                        {req.patient_ref}
                      </p>
                      {req.is_first_time ? (
                        <span className="font-sans text-xs text-muted-foreground">
                          First-time Consultation
                        </span>
                      ) : (
                        <span className="font-sans text-xs text-muted-foreground">
                          Follow-up Session
                        </span>
                      )}
                    </div>
                    <span className="font-sans text-sm text-muted-foreground">
                      {reqTime.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                      ,{" "}
                      {reqTime.toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                    <span className="font-sans text-xs font-medium text-muted-foreground uppercase border border-border px-2 py-0.5 w-fit">
                      Pending
                    </span>
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs font-medium"
                        onClick={() => handleReject(req.id)}
                      >
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        className="text-xs font-medium"
                        onClick={() => handleApprove(req.id)}
                      >
                        Approve
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="border border-border bg-card p-6">
      <p className="font-sans text-xs text-muted-foreground uppercase">
        {label}
      </p>
      <p className={`mt-2 font-heading text-3xl font-semibold ${highlight ? "text-primary" : "text-foreground"}`}>
        {value}
      </p>
    </div>
  );
}
