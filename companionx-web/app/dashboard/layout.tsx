"use client";

import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
