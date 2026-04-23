"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import api from "@/lib/axios";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  BrainCircuit,
  Calendar,
  HeartPulse,
  LineChart,
  LoaderCircle,
  Plus,
  ShieldAlert,
  Sparkles,
  Trash2,
} from "lucide-react";

type JournalEntry = {
  id: number;
  emoji_mood: string;
  text_note?: string | null;
  sentiment_score?: number | null;
  sentiment_percent?: number | null;
  sentiment_label: string;
  is_at_risk: boolean;
  created_at: string;
  analysis_status: "pending" | "ready";
  analysis: {
    dominant_state?: string | null;
    emotional_shift?: string | null;
    intensity?: string | null;
    recommended_focus?: string | null;
    supportive_insight?: string | null;
    severity?: string | null;
    risk_summary?: string | null;
  };
  safety_alert?: {
    status: string;
    severity: string;
    created_at: string;
  } | null;
};

type JournalDashboard = {
  entries: JournalEntry[];
  summary: {
    entries_count: number;
    analysis_ready_count: number;
    average_sentiment_score?: number | null;
    latest_state?: string | null;
    latest_focus?: string | null;
    latest_sentiment_label?: string | null;
    streak_days: number;
  };
  mood_tracker: {
    entries_count: number;
    average_score?: number | null;
    trend: string;
    points: {
      id: number;
      label?: string | null;
      date: string;
      emoji_mood: string;
      sentiment_score: number;
    }[];
  };
  safety: {
    open_alerts_count: number;
    highest_open_severity?: string | null;
    latest_risk_entry_id?: number | null;
    latest_risk_summary?: string | null;
  };
};

type MoodOption = {
  value: string;
  emoji: string;
  label: string;
};

const moodOptions: MoodOption[] = [
  { value: "happy", emoji: "😊", label: "Good" },
  { value: "neutral", emoji: "😐", label: "Steady" },
  { value: "sad", emoji: "😔", label: "Low" },
  { value: "anxious", emoji: "😰", label: "Anxious" },
  { value: "angry", emoji: "😡", label: "Frustrated" },
];

const emptyDashboard: JournalDashboard = {
  entries: [],
  summary: {
    entries_count: 0,
    analysis_ready_count: 0,
    average_sentiment_score: null,
    latest_state: null,
    latest_focus: null,
    latest_sentiment_label: null,
    streak_days: 0,
  },
  mood_tracker: {
    entries_count: 0,
    average_score: null,
    trend: "steady",
    points: [],
  },
  safety: {
    open_alerts_count: 0,
    highest_open_severity: null,
    latest_risk_entry_id: null,
    latest_risk_summary: null,
  },
};

export default function JournalPage() {
  const [dashboard, setDashboard] = useState<JournalDashboard>(emptyDashboard);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  // FORM STATE
  const [newNote, setNewNote] = useState("");
  const [selectedMood, setSelectedMood] = useState<MoodOption>(moodOptions[0]);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const fetchDashboard = async () => {
    try {
      const res = await api.get("/journal");
      setDashboard(res.data);
    } catch (error) {
      console.error("Error fetching journal", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;

    api
      .get("/journal")
      .then((res) => {
        if (!ignore) {
          setDashboard(res.data);
        }
      })
      .catch((error) => {
        console.error("Error fetching journal", error);
      })
      .finally(() => {
        if (!ignore) {
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setStatusMessage(null);

    try {
      await api.post("/journal", {
        emoji_mood: selectedMood.value,
        text_note: newNote,
      });

      setNewNote("");
      setSelectedMood(moodOptions[0]);
      setShowModal(false);
      setStatusMessage(
        "Journal saved. Sentiment analysis and safety review are running in the background.",
      );
      await fetchDashboard();
    } catch (error) {
      console.error("Failed to save journal", error);
      setStatusMessage("Failed to save journal.");
    } finally {
      setSaving(false);
    }
  };

  const deleteEntry = async (id: number) => {
    if (!confirm("Are you sure you want to delete this journal entry?")) {
      return;
    }

    try {
      await api.delete(`/journal/${id}`);
      setStatusMessage("Journal entry deleted.");
      await fetchDashboard();
    } catch (error) {
      console.error("Failed to delete journal", error);
      setStatusMessage("Could not delete this journal entry.");
    }
  };

  const chartPath = useMemo(
    () => buildChartPath(dashboard.mood_tracker.points),
    [dashboard.mood_tracker.points],
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(20,184,166,0.12),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(239,68,68,0.10),_transparent_26%),linear-gradient(180deg,#f8fafc_0%,#f6fffb_100%)] p-6 md:p-12">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 flex items-center justify-between gap-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-slate-500 transition hover:text-teal-700"
          >
            <ArrowLeft size={20} /> Back to Hub
          </Link>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 rounded-2xl bg-teal-600 px-6 py-3 font-bold text-white shadow-lg shadow-teal-100 transition hover:bg-teal-700"
          >
            <Plus size={20} /> Write Today
          </button>
        </div>

        <section className="mb-8 overflow-hidden rounded-[2.3rem] border border-slate-200 bg-slate-950 px-8 py-9 text-white shadow-2xl shadow-teal-100">
          <div className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-teal-100">
                <Sparkles size={14} />
                Mood Intelligence
              </div>
              <h1 className="text-4xl font-black tracking-tight md:text-5xl">
                Mood History with AI insight, trend tracking, and safety review.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-300">
                Every entry saves instantly. Analysis runs in the queue, then
                turns your journal into a living emotional dashboard.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <SummaryStat
                label="Journal Streak"
                value={`${dashboard.summary.streak_days} day${dashboard.summary.streak_days === 1 ? "" : "s"}`}
                icon={<Calendar size={16} />}
              />
              <SummaryStat
                label="Trend"
                value={dashboard.mood_tracker.trend}
                icon={<LineChart size={16} />}
              />
              <SummaryStat
                label="Latest Focus"
                value={dashboard.summary.latest_focus || "Waiting"}
                icon={<BrainCircuit size={16} />}
              />
              <SummaryStat
                label="Open Alerts"
                value={`${dashboard.safety.open_alerts_count}`}
                icon={<ShieldAlert size={16} />}
                danger={dashboard.safety.open_alerts_count > 0}
              />
            </div>
          </div>
        </section>

        {statusMessage ? (
          <div className="mb-6 rounded-2xl border border-teal-200 bg-white/85 px-5 py-4 text-sm font-semibold text-teal-800 shadow-sm">
            {statusMessage}
          </div>
        ) : null}

        {dashboard.safety.open_alerts_count > 0 ? (
          <div className="mb-6 rounded-[2rem] border border-red-200 bg-red-50 px-6 py-5 text-red-800 shadow-sm">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 shrink-0" size={20} />
              <div>
                <p className="font-black uppercase tracking-[0.18em]">
                  Safety attention active
                </p>
                <p className="mt-2 text-sm leading-7">
                  {dashboard.safety.latest_risk_summary ||
                    "At least one journal entry is currently flagged for urgent review."}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        <section className="mb-8 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[2.2rem] border border-slate-200 bg-white p-7 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-teal-700">
                  Mood Tracker
                </p>
                <h2 className="mt-2 text-3xl font-black text-slate-900">
                  Emotional rhythm over time
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                  This graph combines mood entries and analyzed sentiment so you
                  can see whether things are steady, improving, or dipping.
                </p>
              </div>
              <div className="rounded-[1.7rem] bg-slate-950 px-5 py-4 text-white">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-teal-200">
                  Average score
                </p>
                <p className="mt-2 text-2xl font-black">
                  {dashboard.summary.average_sentiment_score ?? "--"}
                </p>
              </div>
            </div>

            <div className="mt-8 rounded-[2rem] bg-[linear-gradient(180deg,#f8fafc_0%,#ecfeff_100%)] p-5">
              {dashboard.mood_tracker.points.length ? (
                <>
                  <svg
                    viewBox="0 0 100 42"
                    className="h-56 w-full overflow-visible"
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <linearGradient id="journal-line" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#14b8a6" />
                        <stop offset="100%" stopColor="#0f172a" />
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
                    {chartPath ? (
                      <path
                        d={chartPath}
                        fill="none"
                        stroke="url(#journal-line)"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                    ) : null}
                    {dashboard.mood_tracker.points.map((point, index) => {
                      const x =
                        dashboard.mood_tracker.points.length === 1
                          ? 50
                          : (index / (dashboard.mood_tracker.points.length - 1)) * 100;
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

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <MetricCard
                      label="Entries"
                      value={`${dashboard.summary.entries_count}`}
                    />
                    <MetricCard
                      label="Analysis Ready"
                      value={`${dashboard.summary.analysis_ready_count}`}
                    />
                    <MetricCard
                      label="Latest State"
                      value={dashboard.summary.latest_state || "Waiting"}
                    />
                  </div>
                </>
              ) : (
                <div className="rounded-[1.8rem] bg-white px-6 py-12 text-center">
                  <p className="text-xl font-black text-slate-900">
                    Your mood graph will appear here
                  </p>
                  <p className="mt-3 text-sm leading-7 text-slate-500">
                    Add a few journal entries and the AI analysis will start
                    shaping a trend line.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-6">
            <InsightPanel
              title="Latest Emotional Read"
              body={
                dashboard.summary.latest_state
                  ? `Your latest analyzed mood reads as ${dashboard.summary.latest_state}, with a current focus on ${dashboard.summary.latest_focus || "reflection"}.`
                  : "The AI needs a processed journal entry before it can describe your latest emotional pattern."
              }
              icon={<HeartPulse size={18} />}
            />
            <InsightPanel
              title="Sentiment Snapshot"
              body={
                dashboard.summary.latest_sentiment_label
                  ? `Your most recent analyzed entry is currently labeled ${dashboard.summary.latest_sentiment_label}. Keep journaling to give the model a stronger trend signal.`
                  : "No analyzed sentiment snapshot yet."
              }
              icon={<BrainCircuit size={18} />}
            />
            <InsightPanel
              title="Safety Layer"
              body={
                dashboard.safety.open_alerts_count > 0
                  ? `${dashboard.safety.open_alerts_count} open safety alert${dashboard.safety.open_alerts_count === 1 ? "" : "s"} currently exist for review.`
                  : "No open safety alerts right now. The safety layer is still watching every new entry in the background."
              }
              icon={<AlertCircle size={18} />}
              danger={dashboard.safety.open_alerts_count > 0}
            />
          </div>
        </section>

        {loading ? (
          <div className="py-20 text-center text-slate-400">Loading your journey...</div>
        ) : dashboard.entries.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white p-20 text-center">
            <p className="text-lg text-slate-400">
              Your journal is empty. Start writing to unlock sentiment tracking
              and AI pattern insights.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {dashboard.entries.map((entry) => {
              const moodDisplay = resolveMoodOption(entry.emoji_mood);
              const sentimentColor = getSentimentColor(entry.sentiment_score);

              return (
                <div
                  key={entry.id}
                  className={`group rounded-[2rem] border bg-white p-6 shadow-sm transition hover:shadow-md ${
                    entry.is_at_risk ? "border-red-200" : "border-slate-100"
                  }`}
                >
                  <div className="flex items-start justify-between gap-6">
                    <div className="flex items-start gap-5">
                      <span className="text-5xl">{moodDisplay.emoji}</span>
                      <div className="max-w-3xl">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                            {moodDisplay.label}
                          </span>

                          {entry.analysis_status === "pending" ? (
                            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                              AI analysis pending
                            </span>
                          ) : (
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-bold ${sentimentColor}`}
                            >
                              Sentiment {entry.sentiment_percent ?? "--"}% ·{" "}
                              {entry.sentiment_label}
                            </span>
                          )}

                          {entry.analysis.intensity ? (
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                              {entry.analysis.intensity} intensity
                            </span>
                          ) : null}

                          {entry.is_at_risk ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
                              <ShieldAlert size={14} />
                              Safety alert created
                            </span>
                          ) : null}
                        </div>

                        <p className="text-lg font-medium leading-8 text-slate-700">
                          {entry.text_note || "No notes added"}
                        </p>

                        <div className="mt-3 flex items-center gap-2 text-sm text-slate-400">
                          <Calendar size={14} />
                          {new Date(entry.created_at).toLocaleDateString("en-US", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>

                        {entry.analysis_status === "ready" ? (
                          <div className="mt-5 grid gap-4 md:grid-cols-[0.9fr_1.1fr]">
                            <div className="rounded-[1.6rem] bg-slate-50 p-4">
                              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                                AI Read
                              </p>
                              <p className="mt-3 text-sm leading-7 text-slate-700">
                                Dominant state:{" "}
                                <span className="font-bold">
                                  {entry.analysis.dominant_state || "Unknown"}
                                </span>
                                <br />
                                Emotional shift:{" "}
                                <span className="font-bold">
                                  {entry.analysis.emotional_shift || "steady"}
                                </span>
                                <br />
                                Recommended focus:{" "}
                                <span className="font-bold">
                                  {entry.analysis.recommended_focus || "grounding"}
                                </span>
                              </p>
                            </div>

                            <div className="rounded-[1.6rem] bg-teal-50/60 p-4">
                              <p className="text-xs font-black uppercase tracking-[0.18em] text-teal-700">
                                Supportive Insight
                              </p>
                              <p className="mt-3 text-sm leading-7 text-slate-700">
                                {entry.analysis.supportive_insight ||
                                  "No supportive insight available yet."}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-5 rounded-[1.6rem] border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
                            The analysis worker has not finished yet. Refresh in
                            a moment to see the emotional read and safety summary.
                          </div>
                        )}

                        {entry.is_at_risk ? (
                          <div className="mt-5 rounded-[1.6rem] border border-red-100 bg-red-50 p-4 text-sm leading-7 text-red-700">
                            <span className="font-bold">Risk summary:</span>{" "}
                            {entry.analysis.risk_summary ||
                              "This entry was flagged for urgent review."}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <button
                      onClick={() => deleteEntry(entry.id)}
                      className="p-3 text-slate-300 opacity-0 transition group-hover:opacity-100 hover:text-red-500"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {showModal ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-6 backdrop-blur-sm">
            <div className="w-full max-w-xl rounded-[2.5rem] bg-white p-10 shadow-2xl">
              <h2 className="mb-3 text-2xl font-bold text-slate-900">
                How are you feeling today?
              </h2>
              <p className="mb-8 text-sm leading-7 text-slate-500">
                Save the moment quickly. The deeper sentiment read and safety
                review will happen right after in the background.
              </p>

              <div className="mb-8 grid grid-cols-5 gap-3">
                {moodOptions.map((mood) => (
                  <button
                    key={mood.value}
                    onClick={() => setSelectedMood(mood)}
                    className={`rounded-2xl p-3 text-center transition-all ${
                      selectedMood.value === mood.value
                        ? "scale-105 bg-teal-50 shadow-sm"
                        : "opacity-60 hover:opacity-100"
                    }`}
                  >
                    <div className="text-4xl">{mood.emoji}</div>
                    <div className="mt-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                      {mood.label}
                    </div>
                  </button>
                ))}
              </div>

              <textarea
                className="mb-6 h-40 w-full resize-none rounded-2xl border border-slate-100 bg-slate-50 p-5 outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="What's on your mind? (Optional)"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 rounded-2xl py-4 font-bold text-slate-500 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-teal-600 py-4 font-bold text-white shadow-lg shadow-teal-100 transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {saving ? (
                    <LoaderCircle size={18} className="animate-spin" />
                  ) : null}
                  Save Journal
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SummaryStat({
  label,
  value,
  icon,
  danger = false,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  danger?: boolean;
}) {
  return (
    <div
      className={`rounded-[1.7rem] border px-5 py-4 ${
        danger ? "border-red-300 bg-red-500/10" : "border-white/10 bg-white/5"
      }`}
    >
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-slate-200">
        {icon}
        {label}
      </div>
      <p className="mt-3 text-2xl font-black text-white">{value}</p>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white px-4 py-4">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black text-slate-900">{value}</p>
    </div>
  );
}

function InsightPanel({
  title,
  body,
  icon,
  danger = false,
}: {
  title: string;
  body: string;
  icon: ReactNode;
  danger?: boolean;
}) {
  return (
    <div
      className={`rounded-[2rem] border p-6 shadow-sm ${
        danger
          ? "border-red-200 bg-red-50"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${
            danger ? "bg-red-500 text-white" : "bg-slate-950 text-white"
          }`}
        >
          {icon}
        </span>
        <h3 className="text-xl font-black text-slate-900">{title}</h3>
      </div>
      <p className="mt-4 text-sm leading-7 text-slate-600">{body}</p>
    </div>
  );
}

function resolveMoodOption(value: string): MoodOption {
  return (
    moodOptions.find((option) => option.value === value) ??
    moodOptions.find((option) => option.emoji === value) ??
    moodOptions[0]
  );
}

function getSentimentColor(score?: number | null): string {
  if (score === null || score === undefined) {
    return "bg-amber-50 text-amber-700";
  }

  if (score >= 0.75) {
    return "bg-emerald-50 text-emerald-700";
  }

  if (score >= 0.5) {
    return "bg-blue-50 text-blue-700";
  }

  if (score >= 0.25) {
    return "bg-orange-50 text-orange-700";
  }

  return "bg-red-50 text-red-700";
}

function buildChartPath(
  points: JournalDashboard["mood_tracker"]["points"],
): string {
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
