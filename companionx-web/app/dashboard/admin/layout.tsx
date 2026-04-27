"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchCurrentUser, type AuthUser } from "@/lib/auth";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let active = true;
    const timeout = window.setTimeout(() => {
      fetchCurrentUser()
        .then((currentUser) => {
          if (!active) return;
          if (!currentUser) {
            router.replace("/login");
            return;
          }
          if (currentUser.system_role !== "admin") {
            router.replace("/dashboard");
            return;
          }
          setUser(currentUser);
          setLoading(false);
        })
        .catch(() => {
          if (active) router.replace("/login");
        });
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [router]);

  if (loading || user?.system_role !== "admin") {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] bg-background">
        <div className="mx-auto max-w-7xl px-4 py-10 md:px-8">
          <div className="h-6 w-44 animate-pulse bg-muted" />
          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="h-32 animate-pulse border border-border bg-muted" />
            <div className="h-32 animate-pulse border border-border bg-muted" />
            <div className="h-32 animate-pulse border border-border bg-muted" />
          </div>
        </div>
      </div>
    );
  }

  return children;
}
