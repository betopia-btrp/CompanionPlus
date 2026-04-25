"use client";

import { useEffect, useMemo, useState } from "react";
import api from "@/lib/axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  Hourglass,
  Star,
  VideoCamera,
  CaretDown,
  CaretUp,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Slot = {
  id: number;
  start_datetime: string;
  end_datetime: string;
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
    recommendation_status:
      | "ready"
      | "pending"
      | "missing_onboarding"
      | "unavailable";
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

export default function BookingPage() {
  const [data, setData] = useState<BookingPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeHoldSlotId, setActiveHoldSlotId] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState(0);
  const [filters, setFilters] = useState({
    specialization: "",
    max_rate: 5000,
  });
  const router = useRouter();

  const fetchData = async (options?: { silent?: boolean }) => {
    if (!options?.silent) setLoading(true);
    try {
      const res = await api.get("/api/consultants", { params: filters });
      setData(res.data);
    } catch (error) {
      console.error("Error fetching booking data", error);
    } finally {
      if (!options?.silent) setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    api
      .get("/api/consultants", { params: filters })
      .then((res) => {
        if (!ignore) setData(res.data);
      })
      .catch((error) => {
        console.error("Error fetching booking data", error);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [filters]);

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const currentHoldRemaining = useMemo(() => {
    const holdExpiry = data?.current_hold?.hold_expires_at;
    if (!holdExpiry) return null;
    if (nowMs === 0) return data?.current_hold?.remaining_seconds ?? null;
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

    try {
      await api.post("/api/booking/hold", { slot_id: slotId });
      await fetchData({ silent: true });
    } catch (error) {
      console.error("Failed to hold slot", error);
    } finally {
      setActiveHoldSlotId(null);
    }
  };

  const releaseHold = async (slotId: number) => {
    setActiveHoldSlotId(slotId);

    try {
      await api.delete(`/api/booking/hold/${slotId}`);
      await fetchData({ silent: true });
    } catch (error) {
      console.error("Failed to release hold", error);
    } finally {
      setActiveHoldSlotId(null);
    }
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-background">
      <div className="mx-auto max-w-6xl px-8 py-10">
        {/* ── Page Header ────────────────────────────────────────── */}
        <header className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <div>
              <p className="font-sans text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
                Session Booking
              </p>
              <h1 className="font-heading text-xl font-semibold text-foreground">
                Find a Consultant
              </h1>
            </div>
          </div>
        </header>

        {/* ── Active Hold ────────────────────────────────────────── */}
        {data?.current_hold ? (
          <div className="mb-6 border border-primary/40 bg-primary/5 p-6">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div>
                <span className="font-sans text-xs font-medium tracking-[0.12em] text-primary uppercase border border-primary/40 px-2 py-0.5">
                  Active Slot Hold
                </span>
                <p className="mt-2 font-heading text-lg font-medium text-foreground">
                  {data.current_hold.consultant_name}
                </p>
                <p className="mt-1 font-sans text-sm text-muted-foreground">
                  {formatDateTime(data.current_hold.start_datetime)} &ndash;{" "}
                  {formatTime(data.current_hold.end_datetime)}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="border border-border bg-card px-5 py-4 text-center">
                  <p className="font-sans text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
                    Time Left
                  </p>
                  <p className="mt-1 font-mono text-2xl font-semibold text-foreground">
                    {formatCountdown(currentHoldRemaining ?? 0)}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs font-medium"
                  onClick={() => releaseHold(data.current_hold!.slot_id)}
                  disabled={activeHoldSlotId === data.current_hold.slot_id}
                >
                  Release Hold
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {/* ── AI Recommendations ─────────────────────────────────── */}
        <section className="mb-10">
          <div className="mb-5 flex items-center gap-2">
            <VideoCamera size={16} weight="bold" className="text-primary" />
            <h2 className="font-heading text-base font-semibold text-foreground">
              AI-Suggested For You
            </h2>
          </div>

          {data?.ai_data?.profile_summary?.primary_concern ? (
            <p className="mb-5 font-sans text-xs text-muted-foreground">
              Built from your onboarding focus on{" "}
              <span className="font-medium text-foreground">
                {data.ai_data.profile_summary.primary_concern}
              </span>
            </p>
          ) : null}

          {loading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[1, 2].map((card) => (
                <div
                  key={card}
                  className="h-48 animate-pulse border border-border bg-muted"
                />
              ))}
            </div>
          ) : recommendationStatus === "ready" &&
            recommendedConsultants.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
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
            <div className="border border-dashed border-border bg-card p-10 text-center">
              <p className="mb-1 font-heading text-sm font-medium text-foreground">
                Your AI match is being prepared
              </p>
              <p className="mx-auto max-w-sm font-sans text-xs text-muted-foreground">
                Onboarding is complete. The queue is generating your top
                consultant recommendations now.
              </p>
            </div>
          ) : (
            <div className="border border-dashed border-border bg-card p-10 text-center">
              <p className="mb-1 font-heading text-sm font-medium text-foreground">
                Complete onboarding to unlock AI matches
              </p>
              <p className="mx-auto max-w-sm font-sans text-xs text-muted-foreground">
                Once onboarding is complete, CompanionX will recommend the top
                consultants for your current context.
              </p>
              <Button
                size="sm"
                className="mt-5 text-xs font-medium"
                onClick={() => router.push("/onboarding")}
              >
                Start Onboarding
                <ArrowRight size={14} weight="bold" />
              </Button>
            </div>
          )}
        </section>

        {/* ── Expert Directory ───────────────────────────────────── */}
        <section>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="font-sans text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
                Expert Directory
              </p>
              <h2 className="mt-1 font-heading text-base font-semibold text-foreground">
                All Verified Consultants
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <Select
                onValueChange={(value) => {
                  setLoading(true);
                  setFilters({
                    ...filters,
                    specialization: String(value ?? ""),
                  });
                }}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Specializations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Specializations</SelectItem>
                  <SelectItem value="Psychologist">
                    Clinical Psychologist
                  </SelectItem>
                  <SelectItem value="Student">Student Counselor</SelectItem>
                  <SelectItem value="Career">Career Coach</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-1.5 border border-border bg-card px-3 py-2">
                <span className="font-sans text-xs text-muted-foreground">
                  ৳
                </span>
                <input
                  type="number"
                  placeholder="Max BDT"
                  className="w-20 font-sans text-xs text-foreground outline-none"
                  onChange={(e) => {
                    setLoading(true);
                    setFilters({
                      ...filters,
                      max_rate: Number(e.target.value),
                    });
                  }}
                />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((card) => (
                <div
                  key={card}
                  className="h-72 animate-pulse border border-border bg-muted"
                />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
        </section>
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
  const [expanded, setExpanded] = useState(isMatch);
  const upcomingSlots = consultant.slots ?? [];
  const firstAvailableSlot = upcomingSlots.find(
    (slot) => slot.status === "available",
  );

  return (
    <div
      className={`flex flex-col border bg-card transition-colors ${
        isMatch ? "border-primary/40" : "border-border hover:border-primary/30"
      }`}
    >
      {/* ── Card Header ──────────────────────────────────────────── */}
      <div className="p-5 pb-4">
        {isMatch ? (
          <span className="mb-3 inline-block font-sans text-xs font-medium tracking-[0.12em] text-primary uppercase border border-primary/40 px-2 py-0.5">
            Personal Match
          </span>
        ) : null}

        <div className="flex items-start justify-between">
          <div>
            <p className="font-heading text-sm font-semibold text-foreground">
              {consultant.user.first_name} {consultant.user.last_name}
            </p>
            <p className="mt-0.5 font-sans text-xs font-medium tracking-wider text-primary uppercase">
              {consultant.specialization}
            </p>
          </div>
          <div className="flex items-center gap-1 font-sans text-xs text-muted-foreground">
            <Star size={12} weight="fill" className="text-amber-500" />
            {consultant.average_rating || "5.0"}
          </div>
        </div>
      </div>

      {/* ── Match Reason ─────────────────────────────────────────── */}
      {consultant.match_reason ? (
        <div className="mx-5 mb-4 border border-border bg-muted/30 p-4">
          <p className="font-sans text-xs leading-relaxed text-muted-foreground italic">
            &ldquo;{consultant.match_reason}&rdquo;
          </p>
        </div>
      ) : null}

      {/* ── Bio ──────────────────────────────────────────────────── */}
      <div className="px-5 pb-4">
        <p
          className={`font-sans text-xs leading-relaxed text-muted-foreground ${
            expanded ? "" : "line-clamp-3"
          }`}
        >
          {consultant.bio || "No biography provided."}
        </p>
      </div>

      {/* ── Actions ──────────────────────────────────────────────── */}
      <div className="px-5 pb-4 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="flex items-center gap-1 font-sans text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? (
            <CaretUp size={12} weight="bold" />
          ) : (
            <CaretDown size={12} weight="bold" />
          )}
          {expanded ? "Hide" : "View"} Slots
        </button>
      </div>

      {/* ── Slots Panel ──────────────────────────────────────────── */}
      {expanded ? (
        <div className="mx-5 mb-4 border border-border bg-muted/30 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="font-sans text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
                Availability
              </p>
              <p className="mt-0.5 font-sans text-sm font-medium text-foreground">
                {consultant.slot_summary?.available_count ?? 0} slots available
              </p>
            </div>
            {consultant.slot_summary?.next_available_slot ? (
              <div className="text-right">
                <p className="font-sans text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
                  Next Slot
                </p>
                <p className="mt-0.5 font-sans text-xs text-foreground">
                  {formatDateTime(consultant.slot_summary.next_available_slot)}
                </p>
              </div>
            ) : null}
          </div>

          <div className="space-y-2">
            {upcomingSlots.length ? (
              upcomingSlots.slice(0, 3).map((slot) => (
                <div
                  key={slot.id}
                  className="border border-border bg-card px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-sans text-xs font-medium text-foreground">
                        {formatDateTime(slot.start_datetime)}
                      </p>
                      <p className="font-sans text-xs text-muted-foreground">
                        until {formatTime(slot.end_datetime)}
                      </p>
                    </div>

                    {slot.status === "available" ? (
                      <Button
                        size="sm"
                        variant="default"
                        className="text-xs font-medium"
                        onClick={() => onHoldSlot(slot.id)}
                        disabled={activeHoldSlotId === slot.id}
                      >
                        {activeHoldSlotId === slot.id
                          ? "Holding..."
                          : "Hold 15 min"}
                      </Button>
                    ) : slot.status === "held_by_you" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs font-medium"
                        onClick={() => onReleaseHold(slot.id)}
                        disabled={activeHoldSlotId === slot.id}
                      >
                        Release
                      </Button>
                    ) : (
                      <span className="font-sans text-xs font-medium text-muted-foreground uppercase">
                        {slot.status === "held" ? "Held" : "Booked"}
                      </span>
                    )}
                  </div>

                  {slot.status === "held_by_you" && slot.hold_expires_at ? (
                    <p className="mt-2 font-sans text-xs text-primary">
                      Held until {formatTime(slot.hold_expires_at)}
                    </p>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="font-sans text-xs text-muted-foreground">
                No upcoming slots published yet.
              </p>
            )}
          </div>
        </div>
      ) : null}

      {/* ── Footer: Price + Book ─────────────────────────────────── */}
      <div className="mt-auto flex items-center justify-between border-t border-border px-5 py-4">
        <div>
          <span className="font-heading text-lg font-semibold text-foreground">
            ৳{consultant.base_rate_bdt}
          </span>
          <span className="ml-1 font-sans text-xs text-muted-foreground">
            /session
          </span>
        </div>
        {firstAvailableSlot ? (
          <Button
            size="sm"
            className="text-xs font-medium"
            onClick={() => onHoldSlot(firstAvailableSlot.id)}
            disabled={activeHoldSlotId === firstAvailableSlot.id}
          >
            {activeHoldSlotId === firstAvailableSlot.id
              ? "Holding..."
              : "Book Slot"}
            <ArrowRight size={12} weight="bold" />
          </Button>
        ) : (
          <span className="font-sans text-xs font-medium text-muted-foreground uppercase">
            No slots yet
          </span>
        )}
      </div>
    </div>
  );
}
