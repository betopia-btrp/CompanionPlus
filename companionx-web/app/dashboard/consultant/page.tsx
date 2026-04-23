"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import api from "@/lib/axios";
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  LoaderCircle,
  Save,
  ShieldCheck,
  Trash2,
} from "lucide-react";

type ConsultantDashboardPayload = {
  consultant: {
    id: number;
    name: string;
    email: string;
    is_approved: boolean;
    specialization: string;
    bio?: string | null;
    base_rate_bdt: number;
    average_rating: number;
  };
  stats: {
    upcoming_slots: number;
    booked_slots: number;
    held_slots?: number;
    available_slots: number;
  };
  slots: {
    id: number;
    start_datetime: string;
    end_datetime: string;
    is_booked: boolean;
    status: "available" | "held" | "booked";
    hold_expires_at?: string | null;
  }[];
};

export default function ConsultantDashboardPage() {
  const [data, setData] = useState<ConsultantDashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [creatingSlot, setCreatingSlot] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [profileForm, setProfileForm] = useState({
    specialization: "",
    bio: "",
    base_rate_bdt: "0",
  });
  const [slotForm, setSlotForm] = useState({
    start_datetime: "",
    end_datetime: "",
  });

  const loadDashboard = async () => {
    try {
      const res = await api.get("/api/consultant/dashboard");
      setData(res.data);
      setProfileForm({
        specialization: res.data.consultant.specialization ?? "",
        bio: res.data.consultant.bio ?? "",
        base_rate_bdt: String(res.data.consultant.base_rate_bdt ?? 0),
      });
    } catch (error: unknown) {
      console.error("Failed to load consultant dashboard", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;

    api
      .get("/api/consultant/dashboard")
      .then((res) => {
        if (!ignore) {
          setData(res.data);
          setProfileForm({
            specialization: res.data.consultant.specialization ?? "",
            bio: res.data.consultant.bio ?? "",
            base_rate_bdt: String(res.data.consultant.base_rate_bdt ?? 0),
          });
        }
      })
      .catch((error) => {
        console.error("Failed to load consultant dashboard", error);
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

  const sortedSlots = useMemo(() => {
    return [...(data?.slots ?? [])].sort(
      (a, b) =>
        new Date(a.start_datetime).getTime() -
        new Date(b.start_datetime).getTime(),
    );
  }, [data?.slots]);

  const handleProfileSave = async () => {
    setSavingProfile(true);
    setStatusMessage(null);

    try {
      await api.patch("/api/consultant/profile", {
        specialization: profileForm.specialization,
        bio: profileForm.bio || null,
        base_rate_bdt: Number(profileForm.base_rate_bdt),
      });
      setStatusMessage("Consultant profile updated.");
      await loadDashboard();
    } catch (error: unknown) {
      console.error("Failed to update consultant profile", error);
      setStatusMessage("Could not update consultant profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleCreateSlot = async () => {
    setCreatingSlot(true);
    setStatusMessage(null);

    try {
      await api.post("/api/consultant/slots", slotForm);
      setSlotForm({ start_datetime: "", end_datetime: "" });
      setStatusMessage("Availability slot created.");
      await loadDashboard();
    } catch (error: unknown) {
      console.error("Failed to create slot", error);
      setStatusMessage("Could not create slot. Check for overlap or invalid times.");
    } finally {
      setCreatingSlot(false);
    }
  };

  const handleDeleteSlot = async (slotId: number) => {
    try {
      await api.delete(`/api/consultant/slots/${slotId}`);
      setStatusMessage("Availability slot removed.");
      await loadDashboard();
    } catch (error: unknown) {
      console.error("Failed to delete slot", error);
      setStatusMessage("Could not remove that slot.");
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.10),_transparent_28%),linear-gradient(180deg,#f8fafc_0%,#eef6ff_100%)] px-6 py-8 md:px-10 md:py-12">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 flex items-center justify-between gap-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-blue-700"
          >
            <ArrowLeft size={18} /> Back to Dashboard
          </Link>
        </div>

        <section className="mb-8 overflow-hidden rounded-[2.4rem] border border-slate-200 bg-slate-950 px-8 py-10 text-white shadow-2xl shadow-blue-100">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-blue-100">
                <ShieldCheck size={14} />
                Consultant Scheduling
              </div>
              <h1 className="text-4xl font-black tracking-tight md:text-5xl">
                Publish your profile and session availability.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-300">
                This is the scheduling foundation for booking, payment, and
                private room access. Slots created here will drive the next steps
                of the counseling workflow.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard label="Upcoming" value={`${data?.stats.upcoming_slots ?? 0}`} />
              <StatCard label="Available" value={`${data?.stats.available_slots ?? 0}`} />
              <StatCard label="Held" value={`${data?.stats.held_slots ?? 0}`} />
            </div>
          </div>
        </section>

        {statusMessage ? (
          <div className="mb-6 rounded-2xl border border-blue-200 bg-white/90 px-5 py-4 text-sm font-semibold text-blue-800 shadow-sm">
            {statusMessage}
          </div>
        ) : null}

        {loading ? (
          <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <div className="h-[28rem] animate-pulse rounded-[2rem] border border-slate-200 bg-white/80" />
            <div className="h-[28rem] animate-pulse rounded-[2rem] border border-slate-200 bg-white/80" />
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <section className="space-y-6">
              <div className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm">
                <div className="mb-6 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">
                      Consultant Profile
                    </p>
                    <h2 className="mt-2 text-2xl font-black text-slate-900">
                      {data?.consultant.name || "Consultant"}
                    </h2>
                  </div>
                  <span
                    className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.18em] ${
                      data?.consultant.is_approved
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {data?.consultant.is_approved ? "Approved" : "Pending approval"}
                  </span>
                </div>

                <div className="grid gap-5">
                  <label className="text-sm font-bold text-slate-700">
                    Specialization
                    <input
                      value={profileForm.specialization}
                      onChange={(event) =>
                        setProfileForm((prev) => ({
                          ...prev,
                          specialization: event.target.value,
                        }))
                      }
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white"
                    />
                  </label>

                  <label className="text-sm font-bold text-slate-700">
                    Session Rate (BDT)
                    <input
                      type="number"
                      min="0"
                      value={profileForm.base_rate_bdt}
                      onChange={(event) =>
                        setProfileForm((prev) => ({
                          ...prev,
                          base_rate_bdt: event.target.value,
                        }))
                      }
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white"
                    />
                  </label>

                  <label className="text-sm font-bold text-slate-700">
                    Bio
                    <textarea
                      rows={6}
                      value={profileForm.bio}
                      onChange={(event) =>
                        setProfileForm((prev) => ({
                          ...prev,
                          bio: event.target.value,
                        }))
                      }
                      className="mt-2 w-full rounded-[1.7rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white"
                    />
                  </label>
                </div>

                <button
                  type="button"
                  onClick={handleProfileSave}
                  disabled={savingProfile}
                  className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {savingProfile ? (
                    <LoaderCircle size={16} className="animate-spin" />
                  ) : (
                    <Save size={16} />
                  )}
                  Save Profile
                </button>
              </div>

              <div className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">
                  Add Session Slot
                </p>
                <h2 className="mt-2 text-2xl font-black text-slate-900">
                  Define your next availability window
                </h2>

                <div className="mt-6 grid gap-4">
                  <label className="text-sm font-bold text-slate-700">
                    Start time
                    <input
                      type="datetime-local"
                      value={slotForm.start_datetime}
                      onChange={(event) =>
                        setSlotForm((prev) => ({
                          ...prev,
                          start_datetime: event.target.value,
                        }))
                      }
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white"
                    />
                  </label>

                  <label className="text-sm font-bold text-slate-700">
                    End time
                    <input
                      type="datetime-local"
                      value={slotForm.end_datetime}
                      onChange={(event) =>
                        setSlotForm((prev) => ({
                          ...prev,
                          end_datetime: event.target.value,
                        }))
                      }
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white"
                    />
                  </label>
                </div>

                <button
                  type="button"
                  onClick={handleCreateSlot}
                  disabled={creatingSlot}
                  className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-4 text-sm font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {creatingSlot ? (
                    <LoaderCircle size={16} className="animate-spin" />
                  ) : (
                    <CalendarDays size={16} />
                  )}
                  Create Slot
                </button>
              </div>
            </section>

            <section className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">
                    Upcoming Slots
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-slate-900">
                    Your published session windows
                  </h2>
                </div>
              </div>

              {sortedSlots.length === 0 ? (
                <div className="rounded-[1.8rem] border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
                  <p className="text-lg font-black text-slate-900">
                    No availability slots yet
                  </p>
                  <p className="mt-3 text-sm leading-7 text-slate-500">
                    Create your first slot on the left. These windows will become
                    the source of truth for patient booking and payment later.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sortedSlots.map((slot) => (
                    <div
                      key={slot.id}
                      className="flex flex-col gap-4 rounded-[1.8rem] border border-slate-200 bg-slate-50 px-5 py-5 md:flex-row md:items-center md:justify-between"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                            {slot.status}
                          </span>
                          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-blue-700">
                            <Clock3 size={12} className="mr-1 inline-flex" />
                            {formatDuration(slot.start_datetime, slot.end_datetime)}
                          </span>
                        </div>
                        <p className="mt-3 text-base font-black text-slate-900">
                          {formatDateTime(slot.start_datetime)}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          Ends at {formatTime(slot.end_datetime)}
                        </p>
                        {slot.status === "held" && slot.hold_expires_at ? (
                          <p className="mt-1 text-xs font-semibold text-amber-700">
                            Hold expires at {formatTime(slot.hold_expires_at)}
                          </p>
                        ) : null}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteSlot(slot.id)}
                        disabled={slot.is_booked}
                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-600 transition hover:border-red-200 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Trash2 size={16} />
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.7rem] border border-white/10 bg-white/5 px-5 py-4">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-100">
        {label}
      </p>
      <p className="mt-3 text-3xl font-black text-white">{value}</p>
    </div>
  );
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
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

function formatDuration(start: string, end: string) {
  const diff = new Date(end).getTime() - new Date(start).getTime();
  const minutes = Math.max(0, Math.round(diff / 60000));

  return `${minutes} min`;
}
