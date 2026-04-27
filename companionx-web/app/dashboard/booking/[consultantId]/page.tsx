"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  Calendar,
  dateFnsLocalizer,
  View,
  SlotInfo,
} from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale/en-US";
import api from "@/lib/axios";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  ArrowRight,
  Spinner,
  Star,
  VideoCamera,
} from "@phosphor-icons/react";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { toast } from "sonner";

const locales = { "en-US": enUS };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

type Slot = {
  id: number;
  start_datetime: string;
  end_datetime: string;
  status: string;
};

type ConsultantData = {
  consultant: {
    id: number;
    specialization: string;
    bio?: string | null;
    average_rating: number;
    base_rate_bdt: number;
    user: {
      first_name: string;
      last_name: string;
      gender?: string;
    };
  };
  slots: Slot[];
};

type RBCEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: {
    type: "slot" | "selection";
    slotId?: number;
  };
};

export default function ConsultantBookingPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const consultantId = params.consultantId as string;

  const [data, setData] = useState<ConsultantData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selection, setSelection] = useState<{ start: Date; end: Date } | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [completeLoading, setCompleteLoading] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<View>("week");
  const [freeSessions, setFreeSessions] = useState(0);

  useEffect(() => {
    Promise.all([
      api.get(`/api/consultants/${consultantId}`),
      api.get("/api/me"),
    ])
      .then(([consultantRes, userRes]) => {
        setData(consultantRes.data);
        setFreeSessions(userRes.data.free_sessions_remaining ?? 0);
      })
      .catch(() => router.push("/dashboard/booking"))
      .finally(() => setLoading(false));
  }, [consultantId, router]);

  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    if (sessionId && !completeLoading) {
      setCompleteLoading(true);
      api
        .post("/api/bookings/complete", {
          session_id: sessionId,
        })
        .then(() => {
          toast.success("Payment successful! Your session is confirmed.");
        })
        .catch(() => {
          toast.error("Payment verification failed. Please contact support.");
        })
        .finally(() => {
          setCompleteLoading(false);
          const url = new URL(window.location.href);
          url.searchParams.delete("session_id");
          window.history.replaceState({}, "", url.pathname);
        });
    }
  }, [sessionId]);

  const events: RBCEvent[] = useMemo(() => {
    if (!data) return [];
    const slotEvents: RBCEvent[] = data.slots.map((slot) => ({
      id: `slot-${slot.id}`,
      title: "Available",
      start: new Date(slot.start_datetime),
      end: new Date(slot.end_datetime),
      resource: { type: "slot" as const, slotId: slot.id },
    }));

    if (selection) {
      slotEvents.push({
        id: "user-selection",
        title: "Your Selection",
        start: selection.start,
        end: selection.end,
        resource: { type: "selection" as const },
      });
    }

    return slotEvents;
  }, [data, selection]);

  const handleSelectSlot = (slotInfo: SlotInfo) => {
    const { start, end } = slotInfo;
    const isWithinSlot = data?.slots.some(
      (s) =>
        new Date(s.start_datetime) <= start && new Date(s.end_datetime) >= end,
    );
    if (isWithinSlot) {
      setSelection({ start, end });
    }
  };

  const handleSelectEvent = (event: RBCEvent) => {
    if (event.resource.type === "slot") {
      setSelection({ start: event.start, end: event.end });
    }
  };

  const handleCheckout = async () => {
    if (!selection) return;
    setCheckoutLoading(true);
    try {
      const res = await api.post("/api/bookings/checkout", {
        consultant_id: Number(consultantId),
        scheduled_start: selection.start.toISOString(),
        scheduled_end: selection.end.toISOString(),
        success_url: `${window.location.origin}/dashboard/booking/${consultantId}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${window.location.origin}/dashboard/booking/${consultantId}`,
      });

      if (res.data.free_session) {
        toast.success("Session booked with your free session credit!");
        setSelection(null);
        setCheckoutLoading(false);
      } else {
        window.location.href = res.data.url;
      }
    } catch {
      toast.error("Failed to initiate checkout.");
      setCheckoutLoading(false);
    }
  };

  const formatTime = (d: Date) =>
    d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });

  const formatDate = (d: Date) =>
    d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });

  const eventPropGetter = (event: RBCEvent) => {
    if (event.resource.type === "selection") {
      return {
        className:
          "!bg-blue-500/25 !border-blue-500/60 !text-blue-800 !border !rounded-none !text-xs !font-medium",
      };
    }
    return {
      className:
        "!bg-emerald-500/20 !border-emerald-500/50 !text-emerald-800 !border !rounded-none !text-xs !font-medium",
    };
  };

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center bg-background">
        <Spinner size={24} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) return null;

  const c = data.consultant;
  const sel = selection;
  const totalMinutes = sel ? Math.round((sel.end.getTime() - sel.start.getTime()) / 60000) : 0;
  const hours = totalMinutes / 60;
  const totalFee = Math.round(c.base_rate_bdt * hours);
  const isFree = freeSessions > 0;

  const formatDuration = () => {
    if (totalMinutes < 60) return `${totalMinutes} min`;
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return m > 0 ? `${h} hr ${m} min` : `${h} hr`;
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-background">
      <div className="mx-auto max-w-6xl px-8 py-10">
        {/* ── Back ─────────────────────────────────────────────────── */}
        <button
          onClick={() => router.push("/dashboard/booking")}
          className="mb-6 flex items-center gap-1.5 font-sans text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={14} weight="bold" />
          Back to consultants
        </button>

        {/* ── Consultant Header ───────────────────────────────────── */}
        <div className="mb-8 border border-border bg-card p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-heading text-xl font-semibold text-foreground">
                {c.user.first_name} {c.user.last_name}
              </p>
              <p className="mt-0.5 font-sans text-xs font-medium tracking-wider text-primary uppercase">
                {c.specialization}
              </p>
              <div className="mt-3 flex items-center gap-1 font-sans text-xs text-muted-foreground">
                <Star size={12} weight="fill" className="text-amber-500" />
                {c.average_rating ?? "—"}
              </div>
            </div>
            <div className="text-right">
              <p className="font-heading text-2xl font-bold text-foreground">
                ৳{c.base_rate_bdt}
              </p>
              <p className="font-sans text-xs text-muted-foreground">
                /hr
              </p>
            </div>
          </div>
          {c.bio && (
            <p className="mt-4 font-sans text-sm leading-relaxed text-muted-foreground">
              {c.bio}
            </p>
          )}
        </div>

        {/* ── Calendar + Selection ────────────────────────────────── */}
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 border border-border bg-card p-4">
            <h3 className="mb-4 font-heading text-sm font-semibold text-foreground">
              Select a time slot
            </h3>
            <p className="mb-4 font-sans text-xs text-muted-foreground">
              Drag across the calendar to choose your session time. Green blocks
              show available periods.
            </p>
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              style={{ height: 550 }}
              view={currentView}
              date={currentDate}
              onView={(v: View) => setCurrentView(v)}
              onNavigate={(d: Date) => setCurrentDate(d)}
              views={["week", "day"]}
              selectable
              onSelectSlot={handleSelectSlot}
              onSelectEvent={handleSelectEvent}
              eventPropGetter={eventPropGetter}
              step={30}
              timeslots={2}
              min={new Date(2024, 0, 1, 0, 0)}
              max={new Date(2024, 0, 1, 23, 59)}
              toolbar
            />
          </div>

          {/* ── Sidebar ──────────────────────────────────────────── */}
          <div className="border border-border bg-card p-6">
            <h3 className="mb-4 font-heading text-sm font-semibold text-foreground">
              Your Booking
            </h3>

            {sel ? (
              <div className="space-y-4">
                {freeSessions > 0 && (
                  <div className="flex items-center gap-2 border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
                    <div className="size-2 rounded-full bg-emerald-500 shrink-0" />
                    <span className="font-sans text-xs text-emerald-700">
                      {freeSessions} free session{freeSessions > 1 ? "s" : ""} remaining
                    </span>
                  </div>
                )}

                <div>
                  <p className="mt-1 font-heading text-base font-medium text-foreground">
                    {formatDate(sel.start)}
                  </p>
                  <p className="font-sans text-sm text-muted-foreground">
                    {formatTime(sel.start)} &ndash;{" "}
                    {formatTime(sel.end)}
                  </p>
                  <p className="mt-1 font-sans text-xs text-muted-foreground">
                    {formatDuration()} × ৳{c.base_rate_bdt}/hr
                  </p>
                </div>

                <div className="border-t border-border pt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-sans text-sm text-muted-foreground">
                      Session Fee
                    </span>
                    <span className="font-heading text-lg font-semibold text-foreground">
                      ৳{totalFee}
                    </span>
                  </div>
                  {isFree && (
                    <div className="flex items-center justify-between">
                      <span className="font-sans text-sm text-emerald-600">
                        Free session credit
                      </span>
                      <span className="font-sans text-sm font-medium text-emerald-600">
                        −৳{totalFee}
                      </span>
                    </div>
                  )}
                </div>

                <div className="border-t border-border pt-4">
                  <div className="flex items-center justify-between">
                    <span className="font-sans text-sm font-medium text-foreground">
                      {isFree ? "Total Due" : "Total"}
                    </span>
                    <span className="font-heading text-xl font-bold text-foreground">
                      ৳{isFree ? 0 : totalFee}
                    </span>
                  </div>
                </div>

                <Button
                  className="w-full text-sm font-medium"
                  onClick={handleCheckout}
                  disabled={checkoutLoading}
                >
                  {checkoutLoading ? (
                    <span className="flex items-center gap-2">
                      <Spinner size={14} className="animate-spin" />
                      Processing...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      {isFree ? "Confirm Free Session" : "Confirm & Pay"}
                      <ArrowRight size={14} weight="bold" />
                    </span>
                  )}
                </Button>
              </div>
            ) : (
              <div className="text-center py-8">
                <VideoCamera
                  size={24}
                  weight="bold"
                  className="mx-auto mb-3 text-muted-foreground"
                />
                <p className="font-sans text-sm text-muted-foreground">
                  Select a time range on the calendar to book a session.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx global>{`
        .rbc-calendar {
          font-family: inherit;
        }
        .rbc-toolbar {
          margin-bottom: 1rem;
        }
        .rbc-toolbar button {
          border: 1px solid var(--border) !important;
          background: var(--background) !important;
          color: var(--foreground) !important;
          font-size: 0.75rem !important;
          font-weight: 500 !important;
          padding: 0.375rem 0.75rem !important;
          border-radius: 0 !important;
          font-family: inherit !important;
        }
        .rbc-toolbar button.rbc-active {
          background: var(--primary) !important;
          color: var(--primary-foreground) !important;
          border-color: var(--primary) !important;
        }
        .rbc-toolbar-label {
          font-weight: 600 !important;
          font-size: 1rem !important;
        }
        .rbc-header {
          font-size: 0.75rem !important;
          font-weight: 500 !important;
          color: var(--muted-foreground) !important;
          padding: 0.5rem 0 !important;
          border-bottom: 1px solid var(--border) !important;
        }
        .rbc-time-slot {
          border-top: 1px solid var(--border) !important;
          min-height: 30px !important;
        }
        .rbc-timeslot-group {
          border-bottom: 1px solid var(--border) !important;
        }
        .rbc-time-content {
          border-left: 1px solid var(--border) !important;
        }
        .rbc-time-header-content {
          border-left: 1px solid var(--border) !important;
        }
        .rbc-day-slot {
          border-right: 1px solid var(--border) !important;
        }
        .rbc-today {
          background-color: transparent !important;
        }
        .rbc-current-time-indicator {
          background-color: var(--primary) !important;
        }
        .rbc-slot-selection {
          background-color: var(--primary) !important;
          opacity: 0.15 !important;
          border: 2px solid var(--primary) !important;
          z-index: 10 !important;
        }
      `}</style>
    </div>
  );
}
