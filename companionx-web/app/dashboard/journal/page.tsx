"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import api from "@/lib/axios";
import Link from "next/link";
import {
  ArrowLeft,
  CaretLeft,
  CaretRight,
  Plus,
  Check,
  TrendUp,
} from "@phosphor-icons/react";

type JournalEntry = {
  id: number;
  emoji_mood: string;
  text_note: string | null;
  sentiment_score: number | null;
  created_at: string;
};

type JournalDashboard = {
  entries: JournalEntry[];
  mood_tracker: {
    points: {
      id: number;
      label: string;
      date: string;
      emoji_mood: string;
      sentiment_score: number;
    }[];
  };
};

type MoodOption = {
  value: string;
  emoji: string;
};

const moodOptions: MoodOption[] = [
  { value: "happy", emoji: "😊" },
  { value: "neutral", emoji: "😐" },
  { value: "sad", emoji: "😔" },
  { value: "anxious", emoji: "😰" },
  { value: "angry", emoji: "😡" },
];

function getEmojiForMood(mood: string): string {
  const map: Record<string, string> = {
    happy: "😊",
    neutral: "😐",
    sad: "😔",
    anxious: "😰",
    angry: "😡",
  };
  return map[mood] || mood;
}

function getMoodColor(mood: string): string {
  const map: Record<string, string> = {
    happy: "text-emerald-500",
    neutral: "text-sky-500",
    sad: "text-violet-500",
    anxious: "text-amber-500",
    angry: "text-rose-500",
  };
  return map[mood] || "text-muted-foreground";
}

function getDayKey(date: Date): string {
  return date.toISOString().split("T")[0];
}

function formatDayLabel(date: Date): { day: string; num: number } {
  const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  return { day: days[date.getDay()], num: date.getDate() };
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatWeekRange(dates: Date[]): string {
  if (dates.length === 0) return "";
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const first = dates[0].toLocaleDateString("en-US", opts);
  const last = dates[dates.length - 1].toLocaleDateString("en-US", opts);
  return `${first} – ${last}`;
}

function AutoGrowTextarea({
  value,
  onChange,
  placeholder,
  onKeyDown,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const resize = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 128) + "px";
  }, []);

  useEffect(() => {
    resize();
  }, [value, resize]);

  return (
    <textarea
      ref={ref}
      rows={1}
      className="w-full resize-none overflow-hidden border-b border-border bg-transparent px-1 py-1 font-sans text-[14px] leading-relaxed placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
    />
  );
}

export default function JournalPage() {
  const [dashboard, setDashboard] = useState<JournalDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  const [weekOffset, setWeekOffset] = useState(0);

  const days = useMemo(() => {
    const result: { date: Date; key: string }[] = [];
    const today = new Date();
    const startOffset = weekOffset * 7;
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i - startOffset);
      result.push({ date: d, key: getDayKey(d) });
    }
    return result;
  }, [weekOffset]);

  const todayKey = getDayKey(new Date());
  const [selectedDay, setSelectedDay] = useState(todayKey);

  const [showNewEntry, setShowNewEntry] = useState(false);
  const [newMood, setNewMood] = useState<MoodOption>(moodOptions[0]);
  const [newNote, setNewNote] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchDashboard = async () => {
    try {
      const res = await api.get("/api/journal");
      setDashboard(res.data);
    } catch (err) {
      console.error("Failed to fetch journal", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const entriesByDay = useMemo(() => {
    if (!dashboard) return [];
    return dashboard.entries
      .filter((e) => getDayKey(new Date(e.created_at)) === selectedDay)
      .sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
  }, [dashboard, selectedDay]);

  const handleSave = async () => {
    if (!newNote.trim()) return;
    setSaving(true);
    try {
      await api.post("/api/journal", {
        emoji_mood: newMood.value,
        text_note: newNote,
      });
      setNewNote("");
      setNewMood(moodOptions[0]);
      setShowNewEntry(false);
      await fetchDashboard();
    } catch (err) {
      console.error("Failed to save", err);
    } finally {
      setSaving(false);
    }
  };

  const chartPath = useMemo(() => {
    if (!dashboard) return "";
    const points = dashboard.mood_tracker.points.slice(-14);
    if (points.length < 2) return "";
    const w = 200;
    const h = 120;
    const pad = 10;
    const graphHeight = h - pad * 2;
    return points
      .map((p, i) => {
        const x = pad + (i / (points.length - 1)) * (w - pad * 2);
        const y = h - pad - p.sentiment_score * graphHeight;
        return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ");
  }, [dashboard]);

  const areaPath = useMemo(() => {
    if (!chartPath) return "";
    const w = 200;
    const h = 120;
    const pad = 10;
    return `${chartPath} L ${w - pad} ${h - pad} L ${pad} ${h - pad} Z`;
  }, [chartPath]);

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-background">
      <div className="mx-auto max-w-6xl px-8 py-10">
        <header className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <div>
              <p className="font-sans text-[10px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
                Mood Journal
              </p>
              <h1 className="font-heading text-xl font-semibold text-foreground">
                Journal Archive
              </h1>
            </div>
          </div>
        </header>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <p className="font-sans text-sm text-muted-foreground">
              Loading...
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_240px]">
            {/* ── Right: Sentiment Trend ─────────────────────── */}
            <div className="order-1 border border-border bg-card p-5 lg:order-none">
              <div className="mb-4 flex items-center justify-between">
                <p className="font-sans text-[10px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
                  Sentiment Trend
                </p>
                <TrendUp size={16} weight="bold" className="text-primary" />
              </div>
              {/* Day selector with week nav */}
              <div className="mb-6">
                <div className="mb-3 flex items-center justify-between">
                  <button
                    onClick={() => setWeekOffset((w) => w + 1)}
                    className="flex h-7 w-7 items-center justify-center border border-border text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
                  >
                    <CaretLeft size={14} weight="bold" />
                  </button>
                  <span className="font-sans text-[11px] font-medium text-muted-foreground">
                    {formatWeekRange(days.map((d) => d.date))}
                  </span>
                  <button
                    onClick={() => setWeekOffset((w) => Math.max(0, w - 1))}
                    disabled={weekOffset === 0}
                    className="flex h-7 w-7 items-center justify-center border border-border text-muted-foreground transition-colors hover:border-primary hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <CaretRight size={14} weight="bold" />
                  </button>
                </div>

                <div className="flex gap-0 overflow-x-auto border-b border-border">
                  {days.map(({ date, key }) => {
                    const { day, num } = formatDayLabel(date);
                    const isActive = key === selectedDay;
                    const isToday = key === todayKey && weekOffset === 0;
                    return (
                      <button
                        key={key}
                        onClick={() => setSelectedDay(key)}
                        className={`flex min-w-[64px] flex-1 flex-col items-center border-b-2 px-3 py-3 font-sans text-[11px] transition-colors ${
                          isActive
                            ? "border-primary text-primary"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <span className="font-medium tracking-wider uppercase">
                          {day}
                        </span>
                        <span
                          className={`mt-0.5 text-base font-semibold ${
                            isToday && !isActive ? "text-foreground" : ""
                          }`}
                        >
                          {num}
                        </span>
                        {isToday && (
                          <span className="mt-0.5 h-1 w-1 rounded-full bg-primary" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Entries timeline — pl-8=32px, line at 11px, dots at -left-27px from child(32px) = 5px, center=11px ✓ */}
              <div className="relative pl-8">
                <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />

                {entriesByDay.length === 0 && !showNewEntry ? (
                  <div className="py-8">
                    <p className="font-sans text-sm text-muted-foreground">
                      No entries for this day.
                    </p>
                  </div>
                ) : (
                  entriesByDay.map((entry) => {
                    const entryEmoji = getEmojiForMood(entry.emoji_mood);
                    const moodColor = getMoodColor(entry.emoji_mood);
                    return (
                      <div key={entry.id} className="relative mb-6 pb-6">
                        <div
                          className={`absolute -left-[27px] top-[3px] h-3 w-3 rounded-full border-2 bg-background ${moodColor.replace("text-", "border-")}`}
                        />
                        <span className="font-mono text-[11px] text-muted-foreground">
                          {formatTime(entry.created_at)}
                        </span>
                        <div className="mt-2 flex items-start gap-2.5">
                          <span className={`text-xl leading-none ${moodColor}`}>
                            {entryEmoji}
                          </span>
                          <p className="font-sans text-[14px] leading-relaxed text-foreground whitespace-pre-wrap">
                            {entry.text_note || "—"}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}

                {showNewEntry ? (
                  <div className="relative mb-6 pb-6">
                    <div className="absolute -left-[27px] top-[3px] h-3 w-3 rounded-full border-2 border-primary bg-primary" />
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {new Date().toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                      })}
                    </span>
                    <div className="mt-2">
                      <div className="mb-2 flex gap-1">
                        {moodOptions.map((m) => (
                          <button
                            key={m.value}
                            onClick={() => setNewMood(m)}
                            className={`flex h-7 w-7 items-center justify-center border text-sm transition-all ${
                              newMood.value === m.value
                                ? "border-primary bg-primary/10"
                                : "border-border bg-background hover:border-primary/30"
                            }`}
                          >
                            {m.emoji}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-end gap-2">
                        <div className="flex-1">
                          <AutoGrowTextarea
                            value={newNote}
                            onChange={setNewNote}
                            placeholder="How are you feeling?"
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleSave();
                              }
                            }}
                          />
                        </div>
                        <button
                          onClick={handleSave}
                          disabled={saving || !newNote.trim()}
                          className="flex h-8 w-8 shrink-0 items-center justify-center border border-primary bg-primary text-primary-foreground transition-opacity disabled:opacity-40"
                        >
                          <Check size={16} weight="bold" />
                        </button>
                      </div>
                      <p className="mt-1 font-sans text-[10px] text-muted-foreground">
                        Shift+Enter for new line
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="relative mb-6 pb-6">
                    <div className="absolute -left-[27px] top-[3px] h-3 w-3 rounded-full border-2 border-dashed border-muted-foreground/30 bg-background" />
                    <button
                      onClick={() => setShowNewEntry(true)}
                      className="mt-0.5 flex items-center gap-2 font-sans text-[13px] text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Plus size={16} weight="bold" />
                      Add entry
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* ── Left: Days + Entries ───────────────────────── */}
            <div className="order-2 lg:order-none">
              <div className="mb-4 flex items-center justify-between">
                <p className="font-sans text-[10px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
                  Sentiment Trend
                </p>
                <TrendUp size={16} weight="bold" className="text-primary" />
              </div>

              {dashboard && dashboard.mood_tracker.points.length > 0 ? (
                <div>
                  <svg
                    viewBox="0 0 200 120"
                    className="w-full"
                    style={{ height: 120 }}
                  >
                    {[
                      { val: 1, label: "100%" },
                      { val: 0.5, label: "50%" },
                      { val: 0, label: "0%" },
                    ].map(({ val, label }) => {
                      const y = 10 + val * 100;
                      return (
                        <g key={val}>
                          <line
                            x1="10"
                            x2="190"
                            y1={y}
                            y2={y}
                            stroke="currentColor"
                            className="text-border"
                            strokeWidth="0.5"
                          />
                          <text
                            x="6"
                            y={y}
                            textAnchor="end"
                            dominantBaseline="middle"
                            fontSize="7"
                            className="fill-muted-foreground"
                          >
                            {label}
                          </text>
                        </g>
                      );
                    })}
                    {areaPath && (
                      <path
                        d={areaPath}
                        fill="currentColor"
                        className="text-primary/5"
                      />
                    )}
                    {chartPath && (
                      <path
                        d={chartPath}
                        fill="none"
                        stroke="currentColor"
                        className="text-primary"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}
                    {dashboard.mood_tracker.points.slice(-14).map((p, i) => {
                      const pts = dashboard.mood_tracker.points.slice(-14);
                      const x = 10 + (i / Math.max(pts.length - 1, 1)) * 180;
                      const y = 110 - p.sentiment_score * 100;
                      const emoji = getEmojiForMood(p.emoji_mood);
                      return (
                        <g key={p.id}>
                          <circle
                            cx={x}
                            cy={y}
                            r="14"
                            fill="currentColor"
                            className="text-background"
                          />
                          <text
                            x={x}
                            y={y}
                            textAnchor="middle"
                            dominantBaseline="central"
                            fontSize="16"
                          >
                            {emoji}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                  <div className="mt-3 flex justify-between font-sans text-[9px] text-muted-foreground">
                    {dashboard.mood_tracker.points.slice(-14).map((p, i) => (
                      <span
                        key={p.id}
                        className={
                          i ===
                          dashboard.mood_tracker.points.slice(-14).length - 1
                            ? "text-primary font-medium"
                            : ""
                        }
                      >
                        {p.label}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center">
                  <p className="font-sans text-[12px] text-muted-foreground">
                    No data yet
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
