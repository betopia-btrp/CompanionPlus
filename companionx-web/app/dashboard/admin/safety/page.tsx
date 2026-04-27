"use client";

import { BellRinging, CheckCircle, ShieldWarning } from "@phosphor-icons/react";
import api from "@/lib/axios";
import { AdminEmptyState, AdminPageShell, AdminStatusBadge, AdminTableSkeleton } from "../_components/admin-ui";
import { getCollection, useAdminResource } from "../_lib/use-admin-resource";

type SafetyAlert = {
  id: number;
  patient_name: string;
  severity: string;
  status: string;
  excerpt: string | null;
  created_at: string;
  resolved_at: string | null;
};

const emptyAlerts: { data: SafetyAlert[] } = { data: [] };

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

async function resolveAlert(alertId: number) {
  await api.patch(`/api/admin/safety-alerts/${alertId}`, { status: "resolved" });
  window.location.reload();
}

export default function AdminSafetyPage() {
  const { data, loading, error } = useAdminResource("/api/admin/safety-alerts", emptyAlerts);
  const alerts = getCollection(data);

  return (
    <AdminPageShell eyebrow="Admin Console" title="Safety Alerts" description="Review and resolve high-priority user safety escalations from journal risk detection.">
      {error && <div className="mb-5 border border-amber-500/30 bg-amber-500/5 p-4 font-sans text-xs text-amber-700">{error}</div>}
      {loading ? <AdminTableSkeleton /> : alerts.length === 0 ? <AdminEmptyState title="No safety alerts" message="Open risk alerts will appear here when the admin safety API is connected." /> : (
        <div className="space-y-4">
          {alerts.map((alert) => (
            <div key={alert.id} className="border border-border bg-card p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex gap-3">
                  <div className="flex size-10 items-center justify-center border border-rose-500/30 bg-rose-500/5 text-rose-600">
                    {alert.severity === "high" ? <ShieldWarning size={18} /> : <BellRinging size={18} />}
                  </div>
                  <div>
                    <p className="font-heading text-base font-semibold text-foreground">{alert.patient_name}</p>
                    <p className="font-sans text-xs text-muted-foreground">Created {formatDate(alert.created_at)}</p>
                    {alert.excerpt && <p className="mt-3 max-w-2xl font-sans text-sm leading-relaxed text-muted-foreground">{alert.excerpt}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <AdminStatusBadge tone={alert.severity === "high" ? "danger" : "warning"}>{alert.severity}</AdminStatusBadge>
                  <AdminStatusBadge tone={alert.status === "resolved" ? "success" : "danger"}>{alert.status}</AdminStatusBadge>
                </div>
              </div>
              {alert.status !== "resolved" && (
                <button onClick={() => resolveAlert(alert.id)} className="mt-5 inline-flex items-center gap-2 border border-primary px-3 py-2 font-sans text-xs font-medium text-primary transition-colors hover:bg-primary hover:text-primary-foreground">
                  <CheckCircle size={14} />Mark Resolved
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </AdminPageShell>
  );
}
