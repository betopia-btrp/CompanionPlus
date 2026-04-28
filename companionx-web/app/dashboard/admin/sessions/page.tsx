"use client";

import { CalendarCheck, VideoCamera } from "@phosphor-icons/react";
import { AdminEmptyState, AdminPageShell, AdminStatusBadge, AdminTableSkeleton } from "../_components/admin-ui";
import { getCollection, useAdminResource } from "../_lib/use-admin-resource";

type Session = {
  id: number;
  status: string;
  patient_name: string;
  consultant_name: string;
  scheduled_start: string;
  scheduled_end: string;
  price_at_booking: number;
};

const emptySessions: { data: Session[] } = { data: [] };

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function AdminSessionsPage() {
  const { data, loading, error } = useAdminResource("/api/admin/bookings", emptySessions);
  const sessions = getCollection(data);

  return (
    <AdminPageShell eyebrow="" title="Sessions" description="Track booking lifecycle, scheduled meetings, payments, and operational session status.">
      {error && <div className="mb-5 border border-amber-500/30 bg-amber-500/5 p-4 font-sans text-xs text-amber-700">{error}</div>}
      {loading ? <AdminTableSkeleton /> : sessions.length === 0 ? <AdminEmptyState title="No sessions found" message="Bookings will appear here when the admin bookings API is connected." /> : (
        <div className="overflow-hidden border border-border bg-card">
          <div className="grid grid-cols-[1.2fr_1.2fr_1fr_0.8fr_0.6fr] border-b border-border px-5 py-3 font-sans text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            <span>Patient</span><span>Consultant</span><span>Schedule</span><span>Revenue</span><span>Status</span>
          </div>
          {sessions.map((session) => (
            <div key={session.id} className="grid grid-cols-[1.2fr_1.2fr_1fr_0.8fr_0.6fr] items-center border-b border-border px-5 py-4 last:border-b-0">
              <p className="font-sans text-sm font-medium text-foreground">{session.patient_name}</p>
              <p className="font-sans text-sm text-muted-foreground">{session.consultant_name}</p>
              <div className="flex items-center gap-2 font-sans text-xs text-muted-foreground"><CalendarCheck size={14} />{formatDate(session.scheduled_start)}</div>
              <p className="font-sans text-sm text-foreground">BDT {session.price_at_booking}</p>
              <AdminStatusBadge tone={session.status === "completed" ? "success" : session.status === "cancelled" ? "danger" : "default"}>{session.status}</AdminStatusBadge>
            </div>
          ))}
        </div>
      )}
      <div className="mt-5 flex items-center gap-2 font-sans text-xs text-muted-foreground"><VideoCamera size={14} /> Session room access remains managed by the existing booking room flow.</div>
    </AdminPageShell>
  );
}
