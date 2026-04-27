"use client";

import { MagnifyingGlass, UsersThree } from "@phosphor-icons/react";
import { useState } from "react";
import { AdminEmptyState, AdminPageShell, AdminStatusBadge, AdminTableSkeleton } from "../_components/admin-ui";
import { getCollection, useAdminResource } from "../_lib/use-admin-resource";

type AdminUser = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  system_role: string;
  onboarding_completed?: boolean;
  created_at: string;
};

const emptyUsers: { data: AdminUser[] } = { data: [] };

export default function AdminUsersPage() {
  const [query, setQuery] = useState("");
  const { data, loading, error } = useAdminResource("/api/admin/users", emptyUsers);
  const users = getCollection(data).filter((user) => `${user.first_name} ${user.last_name} ${user.email} ${user.system_role}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <AdminPageShell eyebrow="Admin Console" title="Users" description="Review patient, consultant, and admin accounts across the platform.">
      <div className="mb-5 flex items-center gap-3 border border-border bg-card px-4 py-3">
        <MagnifyingGlass size={16} className="text-muted-foreground" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search users by name, email, or role" className="w-full bg-transparent font-sans text-sm text-foreground outline-none placeholder:text-muted-foreground" />
      </div>
      {error && <div className="mb-5 border border-amber-500/30 bg-amber-500/5 p-4 font-sans text-xs text-amber-700">{error}</div>}
      {loading ? <AdminTableSkeleton /> : users.length === 0 ? <AdminEmptyState title="No users found" message="Users will appear here when the admin users API is connected." /> : (
        <div className="overflow-hidden border border-border bg-card">
          <div className="grid grid-cols-[1.2fr_1.4fr_0.7fr_0.7fr] border-b border-border px-5 py-3 font-sans text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            <span>Name</span><span>Email</span><span>Role</span><span>Status</span>
          </div>
          {users.map((user) => (
            <div key={user.id} className="grid grid-cols-[1.2fr_1.4fr_0.7fr_0.7fr] items-center border-b border-border px-5 py-4 last:border-b-0">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center border border-border bg-muted font-sans text-xs font-bold text-muted-foreground"><UsersThree size={15} /></div>
                <p className="font-sans text-sm font-medium text-foreground">{user.first_name} {user.last_name}</p>
              </div>
              <p className="font-sans text-sm text-muted-foreground">{user.email}</p>
              <AdminStatusBadge tone={user.system_role === "admin" ? "danger" : user.system_role === "consultant" ? "success" : "default"}>{user.system_role}</AdminStatusBadge>
              <AdminStatusBadge tone={user.onboarding_completed ? "success" : "warning"}>{user.onboarding_completed ? "active" : "setup"}</AdminStatusBadge>
            </div>
          ))}
        </div>
      )}
    </AdminPageShell>
  );
}
