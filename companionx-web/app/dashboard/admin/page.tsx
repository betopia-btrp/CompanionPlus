"use client";

import Link from "next/link";
import {
  BellRinging,
  CalendarCheck,
  Newspaper,
  ShieldCheck,
  Stethoscope,
  UsersThree,
} from "@phosphor-icons/react";
import { AdminEmptyState, AdminPageShell, AdminStatCard, AdminStatusBadge, AdminTableSkeleton } from "./_components/admin-ui";
import { useAdminResource } from "./_lib/use-admin-resource";

type AdminSummary = {
  stats: {
    users: number;
    consultants: number;
    pending_consultants: number;
    active_bookings: number;
    open_safety_alerts: number;
    published_posts: number;
  };
  recent_alerts: Array<{
    id: number;
    severity: string;
    status: string;
    patient_name: string;
    created_at: string;
  }>;
  recent_bookings: Array<{
    id: number;
    status: string;
    patient_name: string;
    consultant_name: string;
    scheduled_start: string;
  }>;
};

const emptySummary: AdminSummary = {
  stats: {
    users: 0,
    consultants: 0,
    pending_consultants: 0,
    active_bookings: 0,
    open_safety_alerts: 0,
    published_posts: 0,
  },
  recent_alerts: [],
  recent_bookings: [],
};

const quickLinks = [
  { title: "Users", href: "/dashboard/admin/users", icon: UsersThree, detail: "Search and audit accounts" },
  { title: "Consultants", href: "/dashboard/admin/consultants", icon: Stethoscope, detail: "Approve provider profiles" },
  { title: "Safety Alerts", href: "/dashboard/admin/safety", icon: BellRinging, detail: "Review active risk flags" },
  { title: "Content", href: "/dashboard/admin/content", icon: Newspaper, detail: "Moderate consultant posts" },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function AdminDashboardPage() {
  const { data, loading, error } = useAdminResource("/api/admin/summary", emptySummary);

  return (
    <AdminPageShell
      eyebrow=""
      title="Operations Overview"
      description="Monitor platform health, user activity, safety escalations, and consultant operations from one control surface."
    >
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <AdminStatCard label="Total Users" value={data.stats.users} detail="Registered patient accounts" />
        <AdminStatCard label="Consultants" value={data.stats.consultants} detail={`${data.stats.pending_consultants} pending approval`} tone="success" />
        <AdminStatCard label="Open Alerts" value={data.stats.open_safety_alerts} detail="Safety items needing review" tone={data.stats.open_safety_alerts > 0 ? "danger" : "default"} />
        <AdminStatCard label="Active Sessions" value={data.stats.active_bookings} detail="Upcoming or in-progress bookings" />
        <AdminStatCard label="Published Posts" value={data.stats.published_posts} detail="Consultant's Corner articles" />
      </div>

      {error && <div className="mb-6 border border-amber-500/30 bg-amber-500/5 p-4 font-sans text-xs text-amber-700">{error}</div>}

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {quickLinks.map((item) => (
          <Link key={item.href} href={item.href} className="group border border-border bg-card p-5 transition-colors hover:border-primary/40">
            <item.icon size={22} weight="thin" className="text-primary" />
            <p className="mt-4 font-heading text-sm font-semibold text-foreground group-hover:text-primary">{item.title}</p>
            <p className="mt-1 font-sans text-xs text-muted-foreground">{item.detail}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="border border-border bg-card">
          <div className="flex items-center gap-2 border-b border-border px-5 py-4">
            <ShieldCheck size={16} className="text-primary" />
            <h2 className="font-heading text-sm font-semibold text-foreground">Recent Safety Alerts</h2>
          </div>
          <div className="p-5">
            {loading ? <AdminTableSkeleton /> : data.recent_alerts.length === 0 ? (
              <AdminEmptyState title="No recent alerts" message="Safety escalations will appear here as soon as the backend admin API returns them." />
            ) : data.recent_alerts.map((alert) => (
              <div key={alert.id} className="flex items-center justify-between border-b border-border py-3 last:border-b-0">
                <div>
                  <p className="font-sans text-sm font-medium text-foreground">{alert.patient_name}</p>
                  <p className="font-sans text-xs text-muted-foreground">{formatDate(alert.created_at)}</p>
                </div>
                <AdminStatusBadge tone={alert.severity === "high" ? "danger" : "warning"}>{alert.severity}</AdminStatusBadge>
              </div>
            ))}
          </div>
        </section>

        <section className="border border-border bg-card">
          <div className="flex items-center gap-2 border-b border-border px-5 py-4">
            <CalendarCheck size={16} className="text-primary" />
            <h2 className="font-heading text-sm font-semibold text-foreground">Recent Bookings</h2>
          </div>
          <div className="p-5">
            {loading ? <AdminTableSkeleton /> : data.recent_bookings.length === 0 ? (
              <AdminEmptyState title="No booking activity" message="Booking activity will populate once the admin summary endpoint is available." />
            ) : data.recent_bookings.map((booking) => (
              <div key={booking.id} className="flex items-center justify-between border-b border-border py-3 last:border-b-0">
                <div>
                  <p className="font-sans text-sm font-medium text-foreground">{booking.patient_name}</p>
                  <p className="font-sans text-xs text-muted-foreground">{booking.consultant_name} · {formatDate(booking.scheduled_start)}</p>
                </div>
                <AdminStatusBadge>{booking.status}</AdminStatusBadge>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AdminPageShell>
  );
}
