"use client";

import { CheckCircle, Stethoscope, XCircle } from "@phosphor-icons/react";
import api from "@/lib/axios";
import { AdminEmptyState, AdminPageShell, AdminStatusBadge, AdminTableSkeleton } from "../_components/admin-ui";
import { getCollection, useAdminResource } from "../_lib/use-admin-resource";

type Consultant = {
  id: number;
  user_id: number;
  name: string;
  email: string;
  specialization: string;
  base_rate_bdt: number;
  average_rating: number | null;
  is_approved: boolean;
};

const emptyConsultants: { data: Consultant[] } = { data: [] };

async function setApproval(consultantId: number, approved: boolean) {
  await api.patch(`/api/admin/consultants/${consultantId}/approval`, { is_approved: approved });
  window.location.reload();
}

export default function AdminConsultantsPage() {
  const { data, loading, error } = useAdminResource("/api/admin/consultants", emptyConsultants);
  const consultants = getCollection(data);

  return (
    <AdminPageShell eyebrow="Admin Console" title="Consultants" description="Review consultant profiles, approval state, specialties, pricing, and marketplace readiness.">
      {error && <div className="mb-5 border border-amber-500/30 bg-amber-500/5 p-4 font-sans text-xs text-amber-700">{error}</div>}
      {loading ? <AdminTableSkeleton /> : consultants.length === 0 ? <AdminEmptyState title="No consultants found" message="Consultant profiles will appear here when the admin consultants API is connected." /> : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {consultants.map((consultant) => (
            <div key={consultant.id} className="border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-3">
                  <div className="flex size-10 items-center justify-center border border-primary/30 bg-primary/5 text-primary"><Stethoscope size={18} /></div>
                  <div>
                    <p className="font-heading text-base font-semibold text-foreground">{consultant.name}</p>
                    <p className="font-sans text-xs text-muted-foreground">{consultant.email}</p>
                  </div>
                </div>
                <AdminStatusBadge tone={consultant.is_approved ? "success" : "warning"}>{consultant.is_approved ? "approved" : "pending"}</AdminStatusBadge>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-3 border-t border-border pt-4">
                <div><p className="font-sans text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Specialty</p><p className="mt-1 font-sans text-sm text-foreground">{consultant.specialization}</p></div>
                <div><p className="font-sans text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Rate</p><p className="mt-1 font-sans text-sm text-foreground">BDT {consultant.base_rate_bdt}</p></div>
                <div><p className="font-sans text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Rating</p><p className="mt-1 font-sans text-sm text-foreground">{consultant.average_rating ?? "New"}</p></div>
              </div>
              <div className="mt-5 flex gap-2">
                <button onClick={() => setApproval(consultant.id, true)} className="inline-flex items-center gap-2 border border-emerald-600 px-3 py-2 font-sans text-xs font-medium text-emerald-600 transition-colors hover:bg-emerald-600 hover:text-white"><CheckCircle size={14} />Approve</button>
                <button onClick={() => setApproval(consultant.id, false)} className="inline-flex items-center gap-2 border border-rose-600 px-3 py-2 font-sans text-xs font-medium text-rose-600 transition-colors hover:bg-rose-600 hover:text-white"><XCircle size={14} />Suspend</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminPageShell>
  );
}
