import type { ReactNode } from "react";

type AdminPageShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  children: ReactNode;
};

export function AdminPageShell({
  eyebrow,
  title,
  description,
  actions,
  children,
}: AdminPageShellProps) {
  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-background">
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-10">
        <header className="mb-8 flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-sans text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              {eyebrow}
            </p>
            <h1 className="mt-1 font-heading text-2xl font-semibold text-foreground">
              {title}
            </h1>
            <p className="mt-2 max-w-2xl font-sans text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          </div>
          {actions && <div className="shrink-0">{actions}</div>}
        </header>
        {children}
      </div>
    </div>
  );
}

type AdminStatCardProps = {
  label: string;
  value: string | number;
  detail: string;
  tone?: "default" | "success" | "warning" | "danger";
};

const toneClass = {
  default: "text-primary",
  success: "text-emerald-600",
  warning: "text-amber-600",
  danger: "text-rose-600",
};

export function AdminStatCard({ label, value, detail, tone = "default" }: AdminStatCardProps) {
  return (
    <div className="border border-border bg-card p-5">
      <p className="font-sans text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <p className={`mt-3 font-heading text-3xl font-semibold ${toneClass[tone]}`}>
        {value}
      </p>
      <p className="mt-2 font-sans text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

export function AdminStatusBadge({ children, tone = "default" }: { children: ReactNode; tone?: AdminStatCardProps["tone"] }) {
  return (
    <span className={`inline-flex border px-2 py-0.5 font-sans text-[10px] font-semibold uppercase tracking-[0.12em] ${toneClass[tone]} border-current/30 bg-current/5`}>
      {children}
    </span>
  );
}

export function AdminEmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className="border border-border bg-card p-8 text-center">
      <p className="font-heading text-sm font-semibold text-foreground">{title}</p>
      <p className="mx-auto mt-2 max-w-md font-sans text-xs leading-relaxed text-muted-foreground">
        {message}
      </p>
    </div>
  );
}

export function AdminTableSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4].map((item) => (
        <div key={item} className="h-16 animate-pulse border border-border bg-muted" />
      ))}
    </div>
  );
}
