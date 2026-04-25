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
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale/en-US";
import { Plus, Trash, VideoCamera, Clock, X } from "@phosphor-icons/react";
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

const DnDCalendar = withDragAndDrop(Calendar) as React.ComponentType<any>;

type Slot = {
  id: number;
  start_datetime: string;
  end_datetime: string;
  status: "available" | "held" | "booked" | "pending" | "confirmed";
  source_template_id: number | null;
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
  slots: Slot[];
  bookings: Booking[];
  templates: Template[];
};

type RBCEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: {
    type: "slot" | "booking";
    status: string;
    slotId?: number;
    bookingId?: number;
    jitsiRoomUuid?: string;
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

  // Selected event popover
  const [selectedEvent, setSelectedEvent] = useState<RBCEvent | null>(null);
  const [popoverPos, setPopoverPos] = useState<{ x: number; y: number } | null>(
    null,
  );

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

  // Map to RBC events
  const events: RBCEvent[] = useMemo(() => {
    if (!data) return [];

    const slotEvents: RBCEvent[] = data.slots.map((slot) => ({
      id: `slot-${slot.id}`,
      title: `${formatTimeShort(new Date(slot.start_datetime))} – ${formatTimeShort(new Date(slot.end_datetime))}`,
      start: new Date(slot.start_datetime),
      end: new Date(slot.end_datetime),
      resource: {
        type: "slot" as const,
        status: slot.status,
        slotId: slot.id,
      },
    }));

    const bookingEvents: RBCEvent[] = data.bookings.map((b) => ({
      id: `booking-${b.id}`,
      title: `${b.patient_ref} · ${b.status}`,
      start: new Date(b.scheduled_start),
      end: new Date(b.scheduled_end),
      resource: {
        type: "booking" as const,
        status: b.status,
        bookingId: b.id,
        jitsiRoomUuid: b.jitsi_room_uuid,
      },
    }));

    return [...slotEvents, ...bookingEvents];
  }, [data]);

  // Event styling
  const eventPropGetter = useCallback((event: RBCEvent) => {
    if (event.resource.type === "booking") {
      return {
        className:
          "!bg-primary/15 !border-primary/40 !text-primary !border !rounded-none !text-xs",
      };
    }

    switch (event.resource.status) {
      case "available":
        return {
          className:
            "!bg-emerald-500/15 !border-emerald-500/40 !text-emerald-700 !border !rounded-none !text-xs",
        };
      case "held":
        return {
          className:
            "!bg-amber-500/15 !border-amber-500/40 !text-amber-700 !border !rounded-none !text-xs",
        };
      default:
        return {
          className:
            "!bg-primary/15 !border-primary/40 !text-primary !border !rounded-none !text-xs",
        };
    }
  }, []);

  // Handlers
  const handleSelectSlot = useCallback((slotInfo: SlotInfo) => {
    const start = slotInfo.start;
    const end = slotInfo.end;

    setCreateForm({
      start_datetime: toLocalInput(start),
      end_datetime: toLocalInput(end),
    });
    setShowCreateModal(true);
  }, []);

  const quickDeleteSlot = useCallback(
    async (slotId: number, e: React.MouseEvent) => {
      e.stopPropagation();
      try {
        const res = await api.delete(`/api/consultant/slots/${slotId}`);
        setStatusMessage(res.data.message || "Slot removed.");
        await fetchSchedule();
      } catch (error: any) {
        console.error("Failed to delete slot", error);
        const msg = error.response?.data?.message || "Could not remove slot.";
        setStatusMessage(msg);
      }
    },
    [fetchSchedule],
  );

  const handleSelectEvent = useCallback(
    (event: RBCEvent, e: React.SyntheticEvent) => {
      const nativeEvent = e as React.MouseEvent;
      setSelectedEvent(event);
      setPopoverPos({ x: nativeEvent.clientX, y: nativeEvent.clientY });
    },
    [],
  );

  const handleEventDrop = useCallback(
    async ({
      event,
      start,
      end,
    }: {
      event: RBCEvent;
      start: Date;
      end: Date;
    }) => {
      if (event.resource.type !== "slot") return;

      try {
        await api.patch(`/api/consultant/slots/${event.resource.slotId}`, {
          start_datetime: start.toISOString(),
          end_datetime: end.toISOString(),
        });
        setStatusMessage("Slot moved.");
        await fetchSchedule();
      } catch (error) {
        console.error("Failed to move slot", error);
        setStatusMessage("Could not move slot.");
        await fetchSchedule();
      }
    },
    [fetchSchedule],
  );

  const handleEventResize = useCallback(
    async ({
      event,
      start,
      end,
    }: {
      event: RBCEvent;
      start: Date;
      end: Date;
    }) => {
      if (event.resource.type !== "slot") return;

      try {
        await api.patch(`/api/consultant/slots/${event.resource.slotId}`, {
          start_datetime: start.toISOString(),
          end_datetime: end.toISOString(),
        });
        setStatusMessage("Slot resized.");
        await fetchSchedule();
      } catch (error) {
        console.error("Failed to resize slot", error);
        setStatusMessage("Could not resize slot.");
        await fetchSchedule();
      }
    },
    [fetchSchedule],
  );

  const handleCreateSlot = useCallback(async () => {
    setCreating(true);
    try {
      await api.post("/api/consultant/slots", {
        start_datetime: toUtcISO(createForm.start_datetime),
        end_datetime: toUtcISO(createForm.end_datetime),
      });
      setShowCreateModal(false);
      setStatusMessage("Slot created.");
      await fetchSchedule();
    } catch (error) {
      console.error("Failed to create slot", error);
      setStatusMessage("Could not create slot. Check for overlap.");
    } finally {
      setCreating(false);
    }
  }, [createForm, fetchSchedule]);

  const handleDeleteSlot = useCallback(
    async (slotId: number) => {
      try {
        const res = await api.delete(`/api/consultant/slots/${slotId}`);
        setSelectedEvent(null);
        setPopoverPos(null);
        setStatusMessage(res.data.message || "Slot removed.");
        await fetchSchedule();
      } catch (error: any) {
        console.error("Failed to delete slot", error);
        const msg = error.response?.data?.message || "Could not remove slot.";
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

  // Close popover on outside click
  useEffect(() => {
    if (!popoverPos) return;
    const handler = () => {
      setPopoverPos(null);
      setSelectedEvent(null);
    };
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, [popoverPos]);

  // Custom event component
  const EventComponent = useCallback(({ event }: EventProps<RBCEvent>) => {
    return (
      <div className="flex w-full items-center justify-between gap-1 truncate px-1">
        <div className="flex items-center gap-1 truncate">
          {event.resource.type === "booking" && (
            <VideoCamera size={10} weight="bold" className="shrink-0" />
          )}
          <span className="truncate text-[11px] font-medium">{event.title}</span>
        </div>
        {event.resource.type === "slot" && (
          <button
            onClick={(e) => quickDeleteSlot(event.resource.slotId!, e)}
            className="shrink-0 p-0.5 text-muted-foreground hover:text-destructive"
            title="Delete slot"
          >
            <Trash size={10} weight="bold" />
          </button>
        )}
      </div>
    );
  }, [quickDeleteSlot]);

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
        {/* ── Header ──────────────────────────────────────────────── */}
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

        {/* ── Templates Bar ───────────────────────────────────────── */}
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

        {/* ── Calendar ─────────────────────────────────────────────── */}
        <div className="border border-border bg-card p-4">
          {loading ? (
            <div className="h-[600px] flex items-center justify-center">
              <div className="font-sans text-sm text-muted-foreground">
                Loading schedule...
              </div>
            </div>
          ) : (
            <DnDCalendar
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
              onEventDrop={handleEventDrop}
              onEventResize={handleEventResize}
              eventPropGetter={eventPropGetter}
              components={{ event: EventComponent }}
              selectable
              resizable
              step={30}
              timeslots={1}
              min={new Date(2024, 0, 1, 0, 0)}
              max={new Date(2024, 0, 1, 23, 59)}
              defaultView="week"
              views={["day", "week", "month"]}
              toolbar
              popup
              scrollToTime={new Date(2024, 0, 1, 8, 0)}
            />
          )}
        </div>

        {/* ── Event Popover ───────────────────────────────────────── */}
        {selectedEvent && popoverPos && (
          <div
            className="fixed z-50 border border-border bg-card shadow-lg p-4 w-64"
            style={{ left: popoverPos.x, top: popoverPos.y }}
            onClick={(e) => e.stopPropagation()}
          >
            {selectedEvent.resource.type === "slot" && (
              <>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Clock size={14} weight="bold" className="text-emerald-600" />
                    <span className="font-sans text-xs font-medium text-foreground">
                      Availability Slot
                    </span>
                    <span
                      className={`font-sans text-[10px] font-medium uppercase tracking-wider border px-1.5 py-0.5 ${
                        selectedEvent.resource.status === "available"
                          ? "border-emerald-500/40 text-emerald-700 bg-emerald-500/10"
                          : "border-amber-500/40 text-amber-700 bg-amber-500/10"
                      }`}
                    >
                      {selectedEvent.resource.status}
                    </span>
                  </div>
                  <button
                    onClick={() =>
                      handleDeleteSlot(selectedEvent.resource.slotId!)
                    }
                    className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                    title="Delete slot"
                  >
                    <Trash size={14} weight="bold" />
                  </button>
                </div>
                <p className="font-sans text-xs text-muted-foreground mb-1">
                  {format(selectedEvent.start, "EEE, MMM d")}
                </p>
                <p className="font-sans text-sm font-medium text-foreground mb-4">
                  {formatTimeShort(selectedEvent.start)} –{" "}
                  {formatTimeShort(selectedEvent.end)}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs font-medium border-destructive/40 text-destructive hover:bg-destructive/10"
                  onClick={() =>
                    handleDeleteSlot(selectedEvent.resource.slotId!)
                  }
                >
                  <Trash size={12} weight="bold" />
                  Delete Slot
                </Button>
              </>
            )}
            {selectedEvent.resource.type === "booking" && (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <VideoCamera
                    size={14}
                    weight="bold"
                    className="text-primary"
                  />
                  <span className="font-sans text-xs font-medium text-foreground">
                    Booking
                  </span>
                  <span className="ml-auto font-sans text-[10px] font-medium uppercase tracking-wider border border-primary/40 text-primary bg-primary/10 px-1.5 py-0.5">
                    {selectedEvent.resource.status}
                  </span>
                </div>
                <p className="font-sans text-xs text-muted-foreground mb-1">
                  {format(selectedEvent.start, "EEE, MMM d")}
                </p>
                <p className="font-sans text-sm font-medium text-foreground mb-4">
                  {formatTimeShort(selectedEvent.start)} –{" "}
                  {formatTimeShort(selectedEvent.end)}
                </p>
                {selectedEvent.resource.status === "confirmed" && (
                  <Button
                    size="sm"
                    className="w-full text-xs font-medium"
                    onClick={() =>
                      router.push(
                        `/dashboard/room?room=${selectedEvent.resource.jitsiRoomUuid}`,
                      )
                    }
                  >
                    <VideoCamera size={12} weight="bold" />
                    Join Session
                  </Button>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Create Slot Modal ───────────────────────────────────── */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-sm border border-border bg-card p-6">
              <h2 className="font-heading text-lg font-semibold text-foreground mb-4">
                Create Slot
              </h2>
              <div className="space-y-4 mb-4">
                <div>
                  <label className="font-sans text-xs text-muted-foreground">
                    Start
                  </label>
                  <Input
                    type="datetime-local"
                    value={createForm.start_datetime}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        start_datetime: e.target.value,
                      })
                    }
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <label className="font-sans text-xs text-muted-foreground">
                    End
                  </label>
                  <Input
                    type="datetime-local"
                    value={createForm.end_datetime}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        end_datetime: e.target.value,
                      })
                    }
                    className="mt-1 text-xs"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs font-medium"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="flex-1 text-xs font-medium"
                  onClick={handleCreateSlot}
                  disabled={creating}
                >
                  {creating ? "Creating..." : "Create Slot"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── Template Modal ─────────────────────────────────────── */}
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

      {/* ── RBC overrides to match design system ─────────────────── */}
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
