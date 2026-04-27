"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  House,
  CalendarBlank,
  BookOpen,
  Brain,
  VideoCamera,
  SignOut,
  Sparkle,
  Wallet,
  Clock,
  Article,
  ShieldCheck,
  UsersThree,
  Stethoscope,
  BellRinging,
  CalendarCheck,
  Newspaper,
} from "@phosphor-icons/react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { fetchCurrentUser, logout, type AuthUser } from "@/lib/auth";

const patientNav = [
  { title: "Dashboard", href: "/dashboard", icon: House },
  { title: "Book Session", href: "/dashboard/booking", icon: CalendarBlank },
  { title: "My Sessions", href: "/dashboard/bookings", icon: Clock },
  { title: "Journal", href: "/dashboard/journal", icon: BookOpen },
  { title: "Exercises", href: "/dashboard/exercises", icon: Brain },
  { title: "Consultant's Corner", href: "/dashboard/corner", icon: Article },
  { title: "Session Room", href: "/dashboard/room", icon: VideoCamera },
];

const consultantNav = [
  { title: "Dashboard", href: "/dashboard", icon: House },
  { title: "Schedule", href: "/dashboard/schedule", icon: CalendarBlank },
  { title: "Bookings", href: "/dashboard/bookings", icon: BookOpen },
  { title: "Consultant's Corner", href: "/dashboard/consultant/corner", icon: Article },
  { title: "Earnings", href: "/dashboard/earnings", icon: Wallet },
  { title: "Session Room", href: "/dashboard/room", icon: VideoCamera },
];

const adminNav = [
  { title: "Overview", href: "/dashboard/admin", icon: ShieldCheck },
  { title: "Users", href: "/dashboard/admin/users", icon: UsersThree },
  { title: "Consultants", href: "/dashboard/admin/consultants", icon: Stethoscope },
  { title: "Sessions", href: "/dashboard/admin/sessions", icon: CalendarCheck },
  { title: "Safety Alerts", href: "/dashboard/admin/safety", icon: BellRinging },
  { title: "Content", href: "/dashboard/admin/content", icon: Newspaper },
];

export function AppSidebar() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    fetchCurrentUser().then(setUser);
  }, []);

  const isConsultant = user?.system_role === "consultant";
  const isAdmin = user?.system_role === "admin";
  const nav = isAdmin ? adminNav : isConsultant ? consultantNav : patientNav;

  const avatarLabel =
    `${user?.first_name?.[0] ?? ""}${user?.last_name?.[0] ?? ""}`.trim() || "U";

  const handleLogout = async () => {
    await logout();
    window.location.href = "/login";
  };

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/dashboard" />}>
              <div className="flex aspect-square size-8 items-center justify-center border border-primary bg-primary/10 text-primary">
                <Sparkle size={16} weight="bold" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="font-heading text-[15px] font-semibold tracking-tight">
                  CompanionX
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {isAdmin ? "Admin Console" : isConsultant ? "Consultant Portal" : "User Portal"}
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="font-sans text-[10px] font-semibold tracking-[0.1em]">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {nav.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" &&
                    pathname.startsWith(item.href + "/"));

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      render={<Link href={item.href} />}
                      isActive={isActive}
                      tooltip={item.title}
                      className={isActive ? "!bg-primary/10 !text-primary !font-medium" : ""}
                    >
                      <item.icon weight={isActive ? "bold" : "regular"} />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

      </SidebarContent>

      <SidebarSeparator />

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/dashboard/profile" />}>
              <div className="flex aspect-square size-8 items-center justify-center border border-border bg-muted font-sans text-xs font-bold text-muted-foreground">
                {avatarLabel}
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-sans text-[13px] font-medium">
                  {user?.first_name
                    ? `${user.first_name} ${user.last_name ?? ""}`
                    : "Loading..."}
                </span>
                <span className="truncate text-[11px] text-muted-foreground">
                  {user?.subscription_plan?.name ?? "Free"} &middot; {isAdmin ? "Admin" : isConsultant ? "Consultant" : "User"}
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout} tooltip="Sign out">
              <SignOut />
              <span>Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
