"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import { Hourglass } from "@phosphor-icons/react";
import { fetchCurrentUser, logout, type AuthUser } from "@/lib/auth";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    fetchCurrentUser()
      .then((currentUser) => {
        setUser(currentUser);
        if (!currentUser) {
          router.replace("/login");
          return;
        }
      })
      .catch(() => router.replace("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  const isUnapprovedConsultant =
    user?.system_role === "consultant" && user.is_approved === false;
  const isProfilePage = pathname.startsWith("/dashboard/consultant");

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-44 animate-pulse bg-muted" />
      </div>
    );
  }

  if (isUnapprovedConsultant && !isProfilePage) {
    return <PendingApprovalGate />;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border/80 bg-background/90 px-6 backdrop-blur-md">
          <SidebarTrigger className="-ml-1" />
          <div className="h-4 w-px bg-border" />
          <span className="font-heading text-sm font-semibold tracking-tight text-foreground">
            Dashboard
          </span>
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}

function PendingApprovalGate() {
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    window.location.href = "/login";
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="mx-auto max-w-md border border-border bg-card p-10 text-center">
        <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full border border-amber-400/40 bg-amber-400/10">
          <Hourglass size={32} className="text-amber-500" />
        </div>
        <h1 className="mb-3 font-heading text-xl font-semibold text-foreground">
          Profile Under Review
        </h1>
        <p className="mb-2 font-sans text-sm leading-relaxed text-muted-foreground">
          Your consultant profile is pending approval from an admin. You will be
          able to access your full dashboard once an admin reviews and approves
          your application.
        </p>
        <p className="mb-8 font-sans text-xs text-muted-foreground">
          In the meantime, you can update your profile settings.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="text-xs font-medium"
            onClick={() => router.push("/dashboard/consultant")}
          >
            Edit Profile
          </Button>
          <Button
            size="sm"
            className="text-xs font-medium"
            onClick={handleLogout}
          >
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}
