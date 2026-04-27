"use client";

import { useEffect, useMemo, useState } from "react";
import api from "@/lib/axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CalendarBlank,
  Star,
  VideoCamera,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  slots?: {
    id: number;
    start_datetime: string;
    end_datetime: string;
    status: string;
  }[];
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
      | "unavailable"
      | "premium_required";
    generated_at?: string | null;
    profile_summary?: {
      primary_concern?: string;
      preferred_style?: string;
      duration?: string;
      keywords?: string[];
    } | null;
    recommended_consultants: Consultant[];
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
  const [filters, setFilters] = useState({
    specialization: "",
    max_rate: 5000,
  });
  const router = useRouter();

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

  const recommendationStatus = data?.ai_data?.recommendation_status;
  const recommendedConsultants = data?.ai_data?.recommended_consultants ?? [];

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
          ) : recommendationStatus === "premium_required" ? (
            <div className="relative overflow-hidden border border-border bg-card">
              <div className="absolute inset-0 backdrop-blur-sm bg-card/40 z-10 flex items-center justify-center">
                <div className="text-center px-6 py-8">
                  <VideoCamera size={24} weight="bold" className="mx-auto mb-3 text-muted-foreground" />
                  <p className="mb-1 font-heading text-sm font-medium text-foreground">
                    Unlock AI-Powered Recommendations
                  </p>
                  <p className="mx-auto max-w-xs font-sans text-xs text-muted-foreground mb-5">
                    Upgrade to Pro for personalized consultant matches, AI exercises, and more.
                  </p>
                  <Button size="sm" className="text-xs font-medium" onClick={() => router.push("/pricing")}>
                    Upgrade to Pro
                  </Button>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2 p-10 opacity-30 pointer-events-none select-none">
                {[1, 2].map((card) => (
                  <div key={card} className="h-48 border border-border bg-muted" />
                ))}
              </div>
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
}: {
  consultant: Consultant;
  isMatch?: boolean;
}) {
  const router = useRouter();

  const availableDays = useMemo(() => {
    if (!consultant.slots) return [];
    const days = new Set<number>();
    consultant.slots.forEach((s) => {
      if (s.status === "available") {
        days.add(new Date(s.start_datetime).getDay());
      }
    });
    return Array.from(days).sort();
  }, [consultant.slots]);

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const formatNextSlot = (iso?: string | null) => {
    if (!iso) return null;
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

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
            {consultant.average_rating ?? "—"}
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
        <p className="font-sans text-xs leading-relaxed text-muted-foreground line-clamp-3">
          {consultant.bio || "No biography provided."}
        </p>
      </div>

      {/* ── Availability ─────────────────────────────────────────── */}
      <div className="px-5 pb-4">
        {consultant.slot_summary && consultant.slot_summary.available_count > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CalendarBlank size={14} weight="bold" className="text-emerald-600" />
              <span className="font-sans text-xs font-medium text-emerald-700">
                {consultant.slot_summary.available_count} slot
                {consultant.slot_summary.available_count > 1 ? "s" : ""} available
              </span>
              {consultant.slot_summary.next_available_slot && (
                <span className="font-sans text-xs text-muted-foreground">
                  · Next: {formatNextSlot(consultant.slot_summary.next_available_slot)}
                </span>
              )}
            </div>
            {availableDays.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="font-sans text-[10px] font-medium text-muted-foreground tracking-wider uppercase">
                  Available:
                </span>
                {dayNames.map((name, i) => (
                  <span
                    key={i}
                    className={`font-sans text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 border ${
                      availableDays.includes(i)
                        ? "border-emerald-500/40 text-emerald-700 bg-emerald-500/10"
                        : "border-transparent text-muted-foreground/30"
                    }`}
                  >
                    {name.slice(0, 2)}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <CalendarBlank size={14} weight="bold" className="text-muted-foreground/40" />
            <span className="font-sans text-xs text-muted-foreground/40">
              No upcoming slots
            </span>
          </div>
        )}
      </div>

      {/* ── Footer: Price + Book ─────────────────────────────────── */}
      <div className="mt-auto flex items-center justify-between border-t border-border px-5 py-4">
        <div>
          <span className="font-heading text-lg font-semibold text-foreground">
            ৳{consultant.base_rate_bdt}
          </span>
          <span className="ml-1 font-sans text-xs text-muted-foreground">
            /hr
          </span>
        </div>
        <Button
          size="sm"
          className="text-xs font-medium"
          onClick={() => router.push(`/dashboard/booking/${consultant.id}`)}
        >
          Book Slot
          <ArrowRight size={12} weight="bold" />
        </Button>
      </div>
    </div>
  );
}
