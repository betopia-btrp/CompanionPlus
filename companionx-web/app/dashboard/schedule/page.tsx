"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import api from "@/lib/axios";
import { useRouter } from "next/navigation";
import {
  Calendar,
  dateFnsLocalizer,
  View,
  SlotInfo,
  EventProps,
} from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale/en-US";
import { Plus, Trash, VideoCamera, X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";

const locales = { "en-US": enUS };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

type Window = {
  start_datetime: string;
  end_datetime: string;
};

type Override = {
  id: number;
  start_datetime: string;
  end_datetime: string;
  type: "available" | "blocked";
  reason: string | null;
};

type Booking = {
  id: number;
  patient_ref: string;
  patient_name: string;
  status: string;
  scheduled_start: string;
  scheduled_end: string;
  jitsi_room_uuid: string;
};

type Template = {
  id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
};

type ScheduleData = {
  windows: Window[];
  overrides: Override[];
  bookings: Booking[];
  templates: Template[];
  used_hours?: number;
  max_hours?: number | null;
};

type RBCEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: {
    type: "window" | "override" | "booking";
    status: string;
    overrideId?: number;
    overrideType?: string;
    bookingId?: number;
    jitsiRoomUuid?: string;
    patientName?: string;
    patientRef?: string;
  };
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatTimeShort(d: Date) {
  return format(d, "h:mm a");
}

function toDateString(d: Date) {
  return format(d, "yyyy-MM-dd");
}

/** Convert a Date to local datetime-local string (no timezone) */
function toLocalInput(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${mo}-${da}T${h}:${mi}`;
}

/** Convert a datetime-local string to UTC ISO string for the API */
function toUtcISO(local: string): string {
  const d = new Date(local);
  return d.toISOString();
}

export default function SchedulePage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<View>("week");
  const [data, setData] = useState<ScheduleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const router = useRouter();

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    start_datetime: "",
    end_datetime: "",
  });
  const [creating, setCreating] = useState(false);

  // Selected event dialog
  const [selectedEvent, setSelectedEvent] = useState<RBCEvent | null>(null);

  // Template modal
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateBlocks, setTemplateBlocks] = useState([
    { day_of_week: 1, start_time: "09:00", end_time: "12:00" },
  ]);
  const [creatingTemplate, setCreatingTemplate] = useState(false);

  // Fetch range based on current view/date
  const getDateRange = useCallback(() => {
    const d = currentDate;
    let start: Date, end: Date;

    if (currentView === "day") {
      start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
    } else if (currentView === "month") {
      start = new Date(d.getFullYear(), d.getMonth(), 1);
      end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
    } else {
      // week
      const dayOfWeek = d.getDay();
      start = new Date(d.getFullYear(), d.getMonth(), d.getDate() - dayOfWeek);
      end = new Date(
        d.getFullYear(),
        d.getMonth(),
        d.getDate() - dayOfWeek + 6,
        23,
        59,
        59,
      );
    }

    return { start: toDateString(start), end: toDateString(end) };
  }, [currentDate, currentView]);

  const fetchSchedule = useCallback(async () => {
    try {
      const { start, end } = getDateRange();
      const res = await api.get("/api/consultant/schedule", {
        params: { start_date: start, end_date: end },
      });
      setData(res.data);
    } catch (error) {
      console.error("Failed to load schedule", error);
    } finally {
      setLoading(false);
    }
  }, [getDateRange]);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  const events: RBCEvent[] = useMemo(() => {
    if (!data) return [];

    const windowEvents: RBCEvent[] = (data.windows ?? []).map((w, i) => ({
      id: `window-${i}`,
      title: `${formatTimeShort(new Date(w.start_datetime))} – ${formatTimeShort(new Date(w.end_datetime))}`,
      start: new Date(w.start_datetime),
      end: new Date(w.end_datetime),
      resource: { type: "window" as const, status: "available" },
    }));

    const overrideEvents: RBCEvent[] = (data.overrides ?? [])
      .filter((o: any) => o.type === "blocked")
      .map((o: any) => ({
      id: `override-${o.id}`,
      title: o.type === "blocked"
        ? `Blocked${o.reason ? `: ${o.reason}` : ""}`
        : `Extra time${o.reason ? `: ${o.reason}` : ""}`,
      start: new Date(o.start_datetime),
      end: new Date(o.end_datetime),
      resource: { type: "override" as const, status: o.type === "blocked" ? "blocked" : "available", overrideId: o.id, overrideType: o.type },
    }));

    const bookingEvents: RBCEvent[] = (data.bookings ?? []).map((b: any) => ({
      id: `booking-${b.id}`,
      title: `${b.patient_ref} · ${b.status}`,
      start: new Date(b.scheduled_start),
      end: new Date(b.scheduled_end),
      resource: { type: "booking" as const, status: b.status, bookingId: b.id, jitsiRoomUuid: b.jitsi_room_uuid, patientName: b.patient_name, patientRef: b.patient_ref },
    }));

    return [...windowEvents, ...overrideEvents, ...bookingEvents];
  }, [data]);

  const handleCreateOverride = useCallback(
    async (type: "available" | "blocked") => {
      setCreating(true);
      try {
        await api.post("/api/consultant/overrides", {
          start_datetime: toUtcISO(createForm.start_datetime),
          end_datetime: toUtcISO(createForm.end_datetime),
          type,
        });
        setShowCreateModal(false);
        setStatusMessage(type === "available" ? "Extra availability added." : "Time blocked.");
        await fetchSchedule();
      } catch {
        setStatusMessage("Could not save override.");
      } finally {
        setCreating(false);
      }
    },
    [createForm, fetchSchedule],
  );

  const handleSelectSlot = useCallback((slotInfo: SlotInfo) => {
    const start = slotInfo.start;
    const end = slotInfo.end;
    setCreateForm({
      start_datetime: toLocalInput(start),
      end_datetime: toLocalInput(end),
    });
    setShowCreateModal(true);
  }, []);

  const handleSelectEvent = useCallback((event: RBCEvent) => {
    setSelectedEvent(event);
  }, []);

  const eventPropGetter = useCallback((event: RBCEvent) => {
    if (event.resource.type === "booking") {
      return { className: "!bg-primary/15 !border-primary/40 !text-primary !border !rounded-none !text-xs" };
    }
    if (event.resource.type === "override") {
      return { className: "!bg-red-500/10 !border-red-500/40 !text-red-700 !border !rounded-none !text-xs" };
    }
    return { className: "!bg-emerald-500/10 !border-emerald-500/30 !text-emerald-700 !border !border-dashed !rounded-none !text-xs" };
  }, []);

  const handleDeleteOverride = useCallback(
    async (overrideId: number) => {
      try {
        const res = await api.delete(`/api/consultant/overrides/${overrideId}`);
        setSelectedEvent(null);
        setStatusMessage(res.data.message || "Override removed.");
        await fetchSchedule();
      } catch (error: any) {
        const msg = error.response?.data?.message || "Could not remove override.";
        setStatusMessage(msg);
      }
    },
    [fetchSchedule],
  );

  // Template handlers
  const addTemplateBlock = useCallback(() => {
    setTemplateBlocks((prev) => [
      ...prev,
      { day_of_week: 1, start_time: "09:00", end_time: "12:00" },
    ]);
  }, []);

  const removeTemplateBlock = useCallback((index: number) => {
    setTemplateBlocks((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateTemplateBlock = useCallback(
    (index: number, field: string, value: string | number) => {
      setTemplateBlocks((prev) =>
        prev.map((block, i) =>
          i === index ? { ...block, [field]: value } : block,
        ),
      );
    },
    [],
  );

  const handleCreateTemplates = useCallback(async () => {
    setCreatingTemplate(true);
    try {
      for (const block of templateBlocks) {
        await api.post("/api/consultant/templates", block);
      }
      setShowTemplateModal(false);
      setStatusMessage("Templates saved. Slots generated.");
      await fetchSchedule();
    } catch (error) {
      console.error("Failed to create templates", error);
      setStatusMessage("Could not save templates.");
    } finally {
      setCreatingTemplate(false);
    }
  }, [templateBlocks, fetchSchedule]);

  const handleDeleteTemplate = useCallback(
    async (templateId: number) => {
      try {
        await api.delete(`/api/consultant/templates/${templateId}`);
        setStatusMessage("Template removed.");
        await fetchSchedule();
      } catch (error) {
        console.error("Failed to delete template", error);
        setStatusMessage("Could not remove template.");
      }
    },
    [fetchSchedule],
  );


  // Custom event component
  const EventComponent = useCallback(({ event }: EventProps<RBCEvent>) => {
    return (
      <div className="flex w-full items-center justify-between gap-1 truncate px-1">
        <div className="flex items-center gap-1 truncate">
          {event.resource.type === "booking" && (
            <VideoCamera size={10} weight="bold" className="shrink-0" />
          )}
          {event.resource.type === "override" && event.resource.overrideType === "blocked" && (
            <X size={10} weight="bold" className="shrink-0" />
          )}
          <span className="truncate text-[11px] font-medium">{event.title}</span>
        </div>
      </div>
    );
  }, []);

  // Group templates by day for display
  const templatesByDay = useMemo(() => {
    const grouped: Record<number, Template[]> = {};
    (data?.templates ?? []).forEach((t) => {
      if (!grouped[t.day_of_week]) grouped[t.day_of_week] = [];
      grouped[t.day_of_week].push(t);
    });
    return grouped;
  }, [data?.templates]);

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-background">
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-10">
        {/*  Header  */}
        <header className="mb-6 flex items-center justify-between">
          <div>
            <p className="font-sans text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
              Consultant Schedule
            </p>
            <h1 className="font-heading text-2xl font-semibold text-foreground">
              Availability & Bookings
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="text-xs font-medium"
              onClick={() => {
                setTemplateBlocks([
                  { day_of_week: 1, start_time: "09:00", end_time: "12:00" },
                ]);
                setShowTemplateModal(true);
              }}
            >
              <Plus size={14} weight="bold" />
              Weekly Template
            </Button>
          </div>
        </header>

        {/*  Monthly Hours  */}
        {data && (
          <div className="mb-4 border border-border bg-card px-5 py-3 flex items-center gap-4 flex-wrap">
            <span className="font-sans text-[10px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
              Monthly Hours
            </span>
            <div className="flex items-center gap-2">
              <span className="font-sans text-sm font-semibold text-foreground">
                {data.used_hours ?? 0}
              </span>
              <span className="font-sans text-xs text-muted-foreground">
                / {data.max_hours !== null && data.max_hours !== undefined ? `${data.max_hours} hr used` : "Unlimited"}
              </span>
            </div>
            {data.max_hours !== null && data.max_hours !== undefined && (
              <div className="flex-1 max-w-40 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    (data.used_hours ?? 0) / data.max_hours > 0.8
                      ? "bg-red-500"
                      : (data.used_hours ?? 0) / data.max_hours > 0.6
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                  }`}
                  style={{ width: `${Math.min(100, ((data.used_hours ?? 0) / data.max_hours) * 100)}%` }}
                />
              </div>
            )}
          </div>
        )}

        {statusMessage && (
          <div className="mb-4 border border-border bg-card px-5 py-3 font-sans text-xs text-foreground flex items-center justify-between">
            <span>{statusMessage}</span>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/*  Templates Bar  */}
        {data?.templates && data.templates.length > 0 && (
          <div className="mb-4 border border-border bg-card px-5 py-3 flex items-center gap-4 flex-wrap">
            <span className="font-sans text-[10px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
              Templates:
            </span>
            {Object.entries(templatesByDay).map(([day, templates]) => (
              <div key={day} className="flex items-center gap-1.5">
                <span className="font-sans text-xs font-medium text-foreground">
                  {DAY_NAMES[Number(day)]}:
                </span>
                {templates.map((t) => (
                  <span
                    key={t.id}
                    className="inline-flex items-center gap-1 border border-border bg-muted/30 px-2 py-0.5 font-sans text-[11px] text-muted-foreground"
                  >
                    {t.start_time}–{t.end_time}
                    <button
                      onClick={() => handleDeleteTemplate(t.id)}
                      className="ml-0.5 text-muted-foreground hover:text-destructive"
                    >
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            ))}
          </div>
        )}

        {/*  Calendar  */}
        <div className="border border-border bg-card p-4">
          {loading ? (
            <div className="h-[600px] flex items-center justify-center">
              <div className="font-sans text-sm text-muted-foreground">
                Loading schedule...
              </div>
            </div>
          ) : (
            <Calendar
              key={toDateString(currentDate)}
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              style={{ height: 650 }}
              view={currentView}
              date={currentDate}
              onView={(view: View) => setCurrentView(view)}
              onNavigate={(date: Date) => setCurrentDate(date)}
              onSelectSlot={handleSelectSlot}
              onSelectEvent={handleSelectEvent}
              eventPropGetter={eventPropGetter}
              components={{ event: EventComponent }}
              selectable
              step={30}
              timeslots={1}
              min={new Date(2024, 0, 1, 0, 0)}
              max={new Date(2024, 0, 1, 23, 59)}
              defaultView="week"
              views={["day", "week", "month"]}
              toolbar
              popup
              scrollToTime={new Date(2024, 0, 1, 6, 0)}
            />
          )}
        </div>

        {/*  Event Popover  */}
        {selectedEvent && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={() => setSelectedEvent(null)}
          >
            <div
              className="w-full max-w-sm border border-border bg-card p-6"
              onClick={(e) => e.stopPropagation()}
            >
              {selectedEvent.resource.type === "override" ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <X size={16} weight="bold" className={selectedEvent.resource.overrideType === "blocked" ? "text-red-600" : "text-emerald-600"} />
                      <span className="font-sans text-sm font-medium text-foreground">
                        {selectedEvent.resource.overrideType === "blocked" ? "Blocked Time" : "Extra Availability"}
                      </span>
                    </div>
                  </div>
                  <p className="font-sans text-xs text-muted-foreground mb-1">
                    {format(selectedEvent.start, "EEE, MMM d")}
                  </p>
                  <p className="font-sans text-sm font-medium text-foreground mb-5">
                    {formatTimeShort(selectedEvent.start)} – {formatTimeShort(selectedEvent.end)}
                  </p>
                  <div className="flex gap-3">
                    <Button variant="outline" size="sm" className="flex-1 text-xs font-medium" onClick={() => setSelectedEvent(null)}>
                      Close
                    </Button>
                    <Button size="sm" className="flex-1 text-xs font-medium border-destructive/40 text-destructive hover:bg-destructive/10" variant="outline"
                      onClick={() => { handleDeleteOverride(selectedEvent.resource.overrideId!); setSelectedEvent(null); }}>
                      <Trash size={12} weight="bold" />
                      Remove
                    </Button>
                  </div>
                </>
              ) : selectedEvent.resource.type === "booking" ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <VideoCamera size={16} weight="bold" className="text-primary" />
                      <span className="font-sans text-sm font-medium text-foreground">
                        Booking
                      </span>
                    </div>
                    <span className="font-sans text-[10px] font-medium uppercase tracking-wider border border-primary/40 text-primary bg-primary/10 px-1.5 py-0.5">
                      {selectedEvent.resource.status}
                    </span>
                  </div>
                  <p className="font-sans text-sm font-medium text-foreground mb-1">
                    {selectedEvent.resource.patientRef || "Patient"}
                  </p>
                  <p className="font-sans text-xs text-muted-foreground mb-1">
                    {format(selectedEvent.start, "EEE, MMM d")}
                  </p>
                  <p className="font-sans text-sm text-foreground mb-5">
                    {formatTimeShort(selectedEvent.start)} –{" "}
                    {formatTimeShort(selectedEvent.end)}
                  </p>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs font-medium"
                      onClick={() => setSelectedEvent(null)}
                    >
                      Close
                    </Button>
                    {selectedEvent.resource.status === "confirmed" && (
                      <Button
                        size="sm"
                        className="flex-1 text-xs font-medium"
                        onClick={() =>
                          router.push(
                            `/dashboard/room?room=${selectedEvent.resource.jitsiRoomUuid}`,
                          )
                        }
                      >
                        <VideoCamera size={12} weight="bold" />
                        Join
                      </Button>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        )}

        {/*  Create Override Modal  */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-sm border border-border bg-card p-6">
              <h2 className="font-heading text-lg font-semibold text-foreground mb-4">
                Override Availability
              </h2>
              <p className="font-sans text-xs text-muted-foreground mb-4">
                Add extra availability or block time for this slot.
              </p>
              <div className="space-y-4 mb-4">
                <div>
                  <label className="font-sans text-xs text-muted-foreground">Start</label>
                  <Input type="datetime-local" value={createForm.start_datetime}
                    onChange={(e) => setCreateForm({ ...createForm, start_datetime: e.target.value })}
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <label className="font-sans text-xs text-muted-foreground">End</label>
                  <Input type="datetime-local" value={createForm.end_datetime}
                    onChange={(e) => setCreateForm({ ...createForm, end_datetime: e.target.value })}
                    className="mt-1 text-xs"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" size="sm" className="flex-1 text-xs font-medium" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button variant="outline" size="sm" className="flex-1 text-xs font-medium" onClick={() => handleCreateOverride("blocked")} disabled={creating}>
                  {creating ? "Saving..." : "Block Time"}
                </Button>
                <Button size="sm" className="flex-1 text-xs font-medium" onClick={() => handleCreateOverride("available")} disabled={creating}>
                  {creating ? "Saving..." : "Add Available"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/*  Template Modal  */}
        {showTemplateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-lg border border-border bg-card p-6">
              <h2 className="font-heading text-lg font-semibold text-foreground mb-2">
                Weekly Templates
              </h2>
              <p className="font-sans text-xs text-muted-foreground mb-4">
                Define your recurring availability. Each block generates 30-min
                slots for the next 4 weeks.
              </p>

              <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                {templateBlocks.map((block, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 border border-border bg-muted/30 px-4 py-3"
                  >
                    <select
                      value={block.day_of_week}
                      onChange={(e) =>
                        updateTemplateBlock(
                          i,
                          "day_of_week",
                          Number(e.target.value),
                        )
                      }
                      className="border border-border bg-background px-2 py-1.5 font-sans text-xs text-foreground"
                    >
                      {DAY_NAMES.map((name, idx) => (
                        <option key={idx} value={idx}>
                          {name}
                        </option>
                      ))}
                    </select>
                    <Input
                      type="time"
                      value={block.start_time}
                      onChange={(e) =>
                        updateTemplateBlock(i, "start_time", e.target.value)
                      }
                      className="w-28 text-xs"
                    />
                    <span className="font-sans text-xs text-muted-foreground">
                      to
                    </span>
                    <Input
                      type="time"
                      value={block.end_time}
                      onChange={(e) =>
                        updateTemplateBlock(i, "end_time", e.target.value)
                      }
                      className="w-28 text-xs"
                    />
                    {templateBlocks.length > 1 && (
                      <button
                        onClick={() => removeTemplateBlock(i)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <Button
                variant="outline"
                size="sm"
                className="mb-4 text-xs font-medium w-full"
                onClick={addTemplateBlock}
              >
                <Plus size={14} weight="bold" />
                Add Block
              </Button>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs font-medium"
                  onClick={() => setShowTemplateModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="flex-1 text-xs font-medium"
                  onClick={handleCreateTemplates}
                  disabled={creatingTemplate}
                >
                  {creatingTemplate ? "Saving..." : "Save Templates"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/*  RBC overrides to match design system  */}
      <style jsx global>{`
        .rbc-calendar {
          font-family: inherit;
        }
        .rbc-toolbar {
          margin-bottom: 1rem;
          padding: 0.5rem 0;
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
          font-family: var(--font-heading);
          font-weight: 600 !important;
          font-size: 1rem !important;
        }
        .rbc-header {
          font-family: var(--font-sans);
          font-size: 0.75rem !important;
          font-weight: 500 !important;
          color: var(--muted-foreground) !important;
          padding: 0.5rem 0 !important;
          border-bottom: 1px solid var(--border) !important;
        }
        .rbc-time-slot {
          border-top: 1px solid var(--border) !important;
          height: 40px !important;
          min-height: 40px !important;
        }
        .rbc-timeslot-group {
          border-bottom: 1px solid var(--border) !important;
          min-height: 40px !important;
        }
        .rbc-time-content {
          border-left: 1px solid var(--border) !important;
        }
        .rbc-time-header-content {
          border-left: 1px solid var(--border) !important;
        }
        .rbc-day-slot {
          border-right: 1px solid var(--border) !important;
          position: relative !important;
        }
        .rbc-day-slot .rbc-slot-selection {
          position: absolute !important;
          left: 0 !important;
          right: 0 !important;
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
          pointer-events: none !important;
        }
        .rbc-selected-cell {
          background-color: var(--primary) !important;
          opacity: 0.06 !important;
        }
        .rbc-addons-dnd-draggable-event {
          cursor: grab !important;
        }
        .rbc-addons-dnd-drag-preview {
          opacity: 0.8 !important;
          z-index: 20 !important;
        }
      `}</style>
    </div>
  );
}
