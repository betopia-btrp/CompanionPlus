"use client";

import { useEffect, useMemo, useState } from "react";
import api from "@/lib/axios";
import Link from "next/link";
import {
  ArrowLeft,
  Brain,
  Clock,
  DollarSign,
  Hourglass,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Sparkles,
  Star,
} from "lucide-react";

type Slot = {
  id: number;
  start_datetime: string;
  end_datetime: string;
  is_booked: boolean;
  status: "available" | "held" | "held_by_you" | "booked";
  hold_expires_at?: string | null;
  remaining_seconds?: number | null;
};

type Consultant = {
  id: number;
  specialization: string;
  bio?: string | null;
  average_rating?: number;
  base_rate_bdt: string | number;
  match_reason?: string;
  slot_summary?: {
    available_count: number;
    next_available_slot?: string | null;
  };
  slots?: Slot[];
  user: {
    first_name: string;
    last_name: string;
    gender?: string;
  };
};

type BookingPayload = {
  consultants: Consultant[];
  ai_data: {
    recommendation_status: "ready" | "pending" | "missing_onboarding" | "unavailable";
    generated_at?: string | null;
    profile_summary?: {
      primary_concern?: string;
      preferred_style?: string;
      duration?: string;
      keywords?: string[];
    } | null;
    recommended_consultants: Consultant[];
    chapters?: {
      chapter_title: string;
      content: string;
      estimated_time: string;
    }[];
  };
  current_hold?: {
    slot_id: number;
    consultant_id: number;
    consultant_name: string;
    start_datetime: string;
    end_datetime: string;
    hold_expires_at: string;
    remaining_seconds: number;
  } | null;
};

export default function BookingPage() {
  const [data, setData] = useState<BookingPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [activeHoldSlotId, setActiveHoldSlotId] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState(0);
  const [filters, setFilters] = useState({
    specialization: "",
    max_rate: 5000,
  });

  const fetchData = async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setLoading(true);
    }

    try {
      const res = await api.get("/api/consultants", { params: filters });
      setData(res.data);
    } catch (error) {
      console.error("Error fetching booking data", error);
    } finally {
      if (!options?.silent) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    let ignore = false;

    api
      .get("/api/consultants", { params: filters })
      .then((res) => {
        if (!ignore) {
          setData(res.data);
        }
      })
      .catch((error) => {
        console.error("Error fetching booking data", error);
      })
      .finally(() => {
        if (!ignore) {
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [filters]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const currentHoldRemaining = useMemo(() => {
    const holdExpiry = data?.current_hold?.hold_expires_at;

    if (!holdExpiry) {
      return null;
    }

    if (nowMs === 0) {
      return data?.current_hold?.remaining_seconds ?? null;
    }

    return Math.max(
      0,
      Math.floor((new Date(holdExpiry).getTime() - nowMs) / 1000),
    );
  }, [
    data?.current_hold?.hold_expires_at,
    data?.current_hold?.remaining_seconds,
    nowMs,
  ]);

  const recommendationStatus = data?.ai_data?.recommendation_status;
  const recommendedConsultants = data?.ai_data?.recommended_consultants ?? [];

  const holdSlot = async (slotId: number) => {
    setActiveHoldSlotId(slotId);
    setStatusMessage(null);

    try {
      await api.post("/api/booking/hold", { slot_id: slotId });
      setStatusMessage(
        "Slot held for 15 minutes. Payment comes next in the workflow.",
      );
      await fetchData({ silent: true });
    } catch (error) {
      console.error("Failed to hold slot", error);
      setStatusMessage("Could not hold that slot. It may already be taken.");
    } finally {
      setActiveHoldSlotId(null);
    }
  };

  const releaseHold = async (slotId: number) => {
    setActiveHoldSlotId(slotId);
    setStatusMessage(null);

    try {
      await api.delete(`/api/booking/hold/${slotId}`);
      setStatusMessage("Slot hold released.");
      await fetchData({ silent: true });
    } catch (error) {
      console.error("Failed to release hold", error);
      setStatusMessage("Could not release that hold.");
    } finally {
      setActiveHoldSlotId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 font-bold text-slate-500 transition hover:text-blue-600"
          >
            <ArrowLeft size={20} /> Back to Hub
          </Link>
        </div>

        {data?.current_hold ? (
          <section className="mb-10 rounded-[2rem] border border-blue-200 bg-blue-50 px-7 py-6 shadow-sm">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-blue-700">
                  <Hourglass size={14} />
                  Active Slot Hold
                </div>
                <h2 className="mt-2 text-2xl font-black text-slate-900">
                  {data.current_hold.consultant_name}
                </h2>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  {formatDateTime(data.current_hold.start_datetime)} to{" "}
                  {formatTime(data.current_hold.end_datetime)}
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div className="rounded-[1.4rem] bg-white px-5 py-4 text-center shadow-sm">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">
                    Time left
                  </p>
                  <p className="mt-2 text-3xl font-black text-slate-900">
                    {formatCountdown(currentHoldRemaining ?? 0)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => releaseHold(data.current_hold!.slot_id)}
                  disabled={activeHoldSlotId === data.current_hold.slot_id}
                  className="rounded-2xl border border-blue-200 bg-white px-5 py-4 text-sm font-black text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  Release Hold
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {statusMessage ? (
          <div className="mb-8 rounded-2xl border border-blue-100 bg-white px-5 py-4 text-sm font-semibold text-blue-800 shadow-sm">
            {statusMessage}
          </div>
        ) : null}

        {data?.ai_data?.chapters?.length ? (
          <section className="mb-20">
            <div className="mb-8 flex items-center gap-3">
              <div className="rounded-xl bg-purple-600 p-2.5 text-white shadow-lg shadow-purple-100">
                <Brain size={24} />
              </div>
              <h2 className="text-3xl font-black tracking-tight text-slate-900">
                Personal Healing Lab
              </h2>
              <Sparkles className="text-purple-500" />
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {data.ai_data.chapters.map((chapter, idx) => (
                <div
                  key={chapter.chapter_title}
                  className="group relative overflow-hidden rounded-[2.5rem] border border-purple-100 bg-white p-8 shadow-sm transition-all hover:shadow-xl"
                >
                  <div className="absolute right-0 top-0 p-4 opacity-5 transition-opacity group-hover:opacity-10">
                    <Sparkles size={60} className="text-purple-600" />
                  </div>
                  <span className="mb-4 block text-[10px] font-black uppercase tracking-[0.2em] text-purple-400">
                    Chapter {idx + 1}
                  </span>
                  <h3 className="mb-3 text-xl font-bold text-slate-900">
                    {chapter.chapter_title}
                  </h3>
                  <p className="mb-8 text-sm leading-relaxed text-slate-500">
                    {chapter.content}
                  </p>
                  <div className="flex w-fit items-center gap-2 rounded-lg bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-400">
                    <Clock size={14} /> {chapter.estimated_time}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="mb-20">
          <div className="mb-8 flex items-center justify-between gap-4">
            <div>
              <h2 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
                AI-Suggested For You
              </h2>
              {data?.ai_data?.profile_summary?.primary_concern ? (
                <p className="mt-2 text-sm text-slate-500">
                  Built from your onboarding focus on{" "}
                  <span className="font-semibold text-slate-700">
                    {data.ai_data.profile_summary.primary_concern}
                  </span>
                </p>
              ) : null}
            </div>
            {data?.ai_data?.generated_at ? (
              <span className="rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700">
                Latest match ready
              </span>
            ) : null}
          </div>

          {loading ? (
            <div className="grid gap-8 md:grid-cols-2">
              {[1, 2].map((card) => (
                <div
                  key={card}
                  className="h-64 animate-pulse rounded-[3rem] border border-slate-100 bg-white"
                />
              ))}
            </div>
          ) : recommendationStatus === "ready" &&
            recommendedConsultants.length > 0 ? (
            <div className="grid gap-8 md:grid-cols-2">
              {recommendedConsultants.map((consultant) => (
                <ConsultantCard
                  key={consultant.id}
                  consultant={consultant}
                  isMatch
                  activeHoldSlotId={activeHoldSlotId}
                  onHoldSlot={holdSlot}
                  onReleaseHold={releaseHold}
                />
              ))}
            </div>
          ) : recommendationStatus === "pending" ? (
            <div className="rounded-[3rem] border border-dashed border-blue-200 bg-white p-16 text-center shadow-sm">
              <h3 className="mb-3 text-3xl font-black tracking-tight text-slate-900">
                Your AI match is being prepared
              </h3>
              <p className="mx-auto max-w-2xl text-lg text-slate-500">
                Onboarding is complete. The queue is generating your top 2
                consultant recommendations now.
              </p>
            </div>
          ) : (
            <div className="rounded-[3rem] border border-dashed border-blue-200 bg-white p-16 text-center shadow-sm">
              <h3 className="mb-3 text-3xl font-black tracking-tight text-slate-900">
                Complete onboarding to unlock AI matches
              </h3>
              <p className="mx-auto max-w-2xl text-lg text-slate-500">
                Once onboarding is complete, CompanionX will recommend the top
                consultants for your current mental-health context.
              </p>
              <Link
                href="/onboarding"
                className="mt-8 inline-flex rounded-2xl bg-slate-900 px-10 py-4 font-black text-white transition-all hover:bg-blue-600"
              >
                Start Onboarding
              </Link>
            </div>
          )}
        </section>

        <div className="mb-10 flex flex-col items-end justify-between gap-6 border-t border-slate-200 pt-12 md:flex-row">
          <div>
            <h2 className="mb-2 text-3xl font-black text-slate-900">
              Expert Directory
            </h2>
            <p className="text-slate-500">
              Browse all verified professional consultants in Bangladesh.
            </p>
          </div>

          <div className="flex w-full flex-wrap gap-4 md:w-auto">
            <select
              className="rounded-2xl border border-slate-200 bg-white p-4 font-bold text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-blue-500"
              onChange={(e) => {
                setLoading(true);
                setFilters({ ...filters, specialization: e.target.value });
              }}
            >
              <option value="">All Specializations</option>
              <option value="Psychologist">Clinical Psychologist</option>
              <option value="Student">Student Counselor</option>
              <option value="Career">Career Coach</option>
            </select>

            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 shadow-sm">
              <DollarSign size={18} className="text-slate-400" />
              <input
                type="number"
                placeholder="Max BDT"
                className="w-32 p-4 font-bold text-slate-700 outline-none"
                onChange={(e) => {
                  setLoading(true);
                  setFilters({ ...filters, max_rate: Number(e.target.value) });
                }}
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-8 md:grid-cols-3">
            {[1, 2, 3].map((card) => (
              <div
                key={card}
                className="h-96 animate-pulse rounded-[3rem] border border-slate-100 bg-white"
              />
            ))}
          </div>
        ) : (
          <div className="mb-20 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {data?.consultants?.map((consultant) => (
              <ConsultantCard
                key={consultant.id}
                consultant={consultant}
                activeHoldSlotId={activeHoldSlotId}
                onHoldSlot={holdSlot}
                onReleaseHold={releaseHold}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ConsultantCard({
  consultant,
  isMatch = false,
  activeHoldSlotId,
  onHoldSlot,
  onReleaseHold,
}: {
  consultant: Consultant;
  isMatch?: boolean;
  activeHoldSlotId: number | null;
  onHoldSlot: (slotId: number) => Promise<void>;
  onReleaseHold: (slotId: number) => Promise<void>;
}) {
  const emoji = consultant.user.gender === "female" ? "👩‍⚕️" : "👨‍⚕️";
  const upcomingSlots = consultant.slots ?? [];
  const [expanded, setExpanded] = useState(isMatch);
  const firstAvailableSlot = upcomingSlots.find((slot) => slot.status === "available");

  return (
    <div
      className={`relative flex flex-col rounded-[3rem] border bg-white p-10 shadow-sm transition-all hover:shadow-2xl ${
        isMatch ? "border-blue-300 ring-8 ring-blue-50" : "border-slate-100"
      }`}
    >
      {isMatch ? (
        <div className="absolute right-0 top-0 rounded-bl-[1.5rem] bg-blue-600 px-6 py-2 text-[10px] font-black uppercase tracking-widest text-white shadow-lg">
          Personal Match
        </div>
      ) : null}

      <div className="mb-8 flex items-start justify-between">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-50 text-4xl shadow-inner">
          {emoji}
        </div>
        <div className="flex items-center gap-1 rounded-full border border-amber-100 bg-amber-50 px-4 py-2 text-sm font-black text-amber-600">
          <Star size={16} className="fill-current" />
          {consultant.average_rating || "5.0"}
        </div>
      </div>

      <h3 className="mb-1 text-2xl font-bold text-slate-900 transition-colors hover:text-blue-600">
        {consultant.user.first_name} {consultant.user.last_name}
      </h3>
      <p className="mb-6 text-sm font-bold uppercase tracking-wider text-blue-600">
        {consultant.specialization}
      </p>

      {consultant.match_reason ? (
        <div className="relative mb-8 flex gap-4 rounded-[1.5rem] border border-blue-100 bg-blue-50 p-6 italic">
          <MessageSquare size={20} className="mt-1 shrink-0 text-blue-400" />
          <p className="text-sm leading-relaxed text-slate-700">
            &ldquo;{consultant.match_reason}&rdquo;
          </p>
        </div>
      ) : null}

      <p className={`mb-6 text-sm leading-relaxed text-slate-500 ${expanded ? "" : "line-clamp-3"}`}>
        {consultant.bio || "No biography provided."}
      </p>

      <div className="mb-4 flex gap-3">
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-xs font-black uppercase tracking-[0.18em] text-slate-600 transition hover:border-blue-200 hover:text-blue-700"
        >
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          {expanded ? "Hide Profile" : "View Profile"}
        </button>

        {firstAvailableSlot ? (
          <button
            type="button"
            onClick={() => onHoldSlot(firstAvailableSlot.id)}
            disabled={activeHoldSlotId === firstAvailableSlot.id}
            className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-4 text-xs font-black uppercase tracking-[0.18em] text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {activeHoldSlotId === firstAvailableSlot.id ? "Holding..." : "Book Next Slot"}
          </button>
        ) : null}
      </div>

      <div className={`mb-6 rounded-[1.8rem] border border-slate-100 bg-slate-50 p-5 ${expanded ? "" : "hidden"}`}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
              Slot status
            </p>
            <p className="mt-2 text-lg font-black text-slate-900">
              {consultant.slot_summary?.available_count ?? 0} available
            </p>
          </div>
          {consultant.slot_summary?.next_available_slot ? (
            <div className="text-right">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                Next slot
              </p>
              <p className="mt-2 text-sm font-bold text-slate-700">
                {formatDateTime(consultant.slot_summary.next_available_slot)}
              </p>
            </div>
          ) : null}
        </div>

        <div className="mt-4 space-y-3">
          {upcomingSlots.length ? (
            upcomingSlots.slice(0, 3).map((slot) => (
              <div
                key={slot.id}
                className="rounded-[1.3rem] border border-white bg-white px-4 py-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-slate-900">
                      {formatDateTime(slot.start_datetime)}
                    </p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      {formatTime(slot.end_datetime)}
                    </p>
                  </div>

                  {slot.status === "available" ? (
                    <button
                      type="button"
                      onClick={() => onHoldSlot(slot.id)}
                      disabled={activeHoldSlotId === slot.id}
                      className="rounded-2xl bg-blue-600 px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {activeHoldSlotId === slot.id ? "Holding..." : "Hold 15 min"}
                    </button>
                  ) : slot.status === "held_by_you" ? (
                    <button
                      type="button"
                      onClick={() => onReleaseHold(slot.id)}
                      disabled={activeHoldSlotId === slot.id}
                      className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      Release
                    </button>
                  ) : (
                    <span
                      className={`rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-[0.18em] ${
                        slot.status === "held"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {slot.status === "held" ? "Held" : "Booked"}
                    </span>
                  )}
                </div>

                {slot.status === "held_by_you" && slot.hold_expires_at ? (
                  <p className="mt-3 text-xs font-semibold text-blue-700">
                    Held until {formatTime(slot.hold_expires_at)}
                  </p>
                ) : null}
              </div>
            ))
          ) : (
            <p className="rounded-2xl bg-white px-4 py-4 text-sm text-slate-500">
              No upcoming slots published yet.
            </p>
          )}
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-slate-50 pt-8">
        <div>
          <span className="text-2xl font-black text-slate-900">
            ৳{consultant.base_rate_bdt}
          </span>
          <span className="ml-1 text-xs font-bold text-slate-400">
            /session
          </span>
        </div>
        {firstAvailableSlot ? (
          <button
            type="button"
            onClick={() => onHoldSlot(firstAvailableSlot.id)}
            disabled={activeHoldSlotId === firstAvailableSlot.id}
            className="rounded-2xl bg-blue-600 px-5 py-4 text-xs font-black uppercase tracking-[0.18em] text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {activeHoldSlotId === firstAvailableSlot.id ? "Holding..." : "Book"}
          </button>
        ) : (
          <span className="rounded-2xl bg-slate-100 px-5 py-4 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
            No slots yet
          </span>
        )}
      </div>
    </div>
  );
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatCountdown(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
