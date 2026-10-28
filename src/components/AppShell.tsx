import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import {
  LayoutDashboard,
  FileText,
  BarChart3,
  Building2,
  Users,
  UserCircle2,
  Mail,
  LogOut,
  Briefcase,
} from "lucide-react";
import { useStore } from "@/lib/store";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/quotations", label: "Quotations", icon: FileText },
  { to: "/summary", label: "Quotation Summary", icon: BarChart3 },
] as const;
const master = [
  { to: "/masters/companies", label: "Lead Group of Company", icon: Building2 },
  { to: "/masters/clients", label: "Clients & Projects", icon: Briefcase },
  { to: "/masters/bdms", label: "Leads BDM", icon: UserCircle2 },
  { to: "/masters/preparers", label: "Prepared By / Added By", icon: UserCircle2 },
  { to: "/masters/users", label: "Manage Users", icon: Users },
  { to: "/mail-settings", label: "Mail Settings", icon: Mail },
] as const;

export function AppShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { session, ready, logout, isAdmin } = useStore();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (ready && !session) navigate({ to: "/" });
  }, [ready, session, navigate]);
  if (!ready || !session) return null;

  const item = (n: { to: string; label: string; icon: typeof FileText }) => {
    const active = path.startsWith(n.to);
    return (
      <Link
        key={n.to}
        to={n.to}
        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${active ? "bg-sidebar-primary text-sidebar-primary-foreground" : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}
      >
        <n.icon className="h-4 w-4" /> {n.label}
      </Link>
    );
  };

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex items-center gap-3 px-5 py-6">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-hero text-lg font-bold text-primary-foreground">
            L
          </div>
          <div>
            <div className="font-bold text-sidebar-accent-foreground">Leads QRS</div>
            <div className="text-xs opacity-70">Quotation Retrieval</div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3">
          <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider opacity-50">
            Menu
          </div>
          {nav.map(item)}
          {isAdmin && (
            <>
              <div className="px-3 pb-2 pt-5 text-[11px] font-semibold uppercase tracking-wider opacity-50">
                Master
              </div>
              {master.map(item)}
            </>
          )}
        </nav>
        <div className="border-t border-sidebar-border p-4">
          <div className="text-sm font-semibold text-sidebar-accent-foreground">{session.name}</div>
          <div className="mb-3 text-xs opacity-70">
            {session.role}
            {session.role === "User" ? " · view only" : ""}
          </div>
          <button
            onClick={async () => {
              await logout();
              navigate({ to: "/" });
            }}
            className="flex items-center gap-2 text-sm opacity-80 hover:opacity-100"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-6 lg:p-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          {actions}
        </div>
        {children}
      </main>
    </div>
  );
}

export const inputCls =
  "h-10 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40";
export const btnPrimary =
  "inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50";
export const btnGhost =
  "inline-flex h-10 items-center gap-2 rounded-lg border border-input bg-card px-4 text-sm font-medium hover:bg-accent";

export function Card({
  title,
  icon,
  tone = "primary",
  right,
  children,
}: {
  title?: string;
  icon?: ReactNode;
  tone?: "primary" | "success" | "destructive" | "teal" | "warning";
  right?: ReactNode;
  children: ReactNode;
}) {
  const bar = {
    primary: "bg-primary",
    success: "bg-success",
    destructive: "bg-destructive",
    teal: "bg-teal",
    warning: "bg-warning",
  }[tone];
  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-card">
      <div className={`h-1 ${bar}`} />
      {title && (
        <div className="flex items-center justify-between gap-3 border-b px-5 py-4">
          <div className="flex items-center gap-3 font-semibold">
            {icon}
            {title}
          </div>
          {right}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "Successful"
      ? "bg-success-soft text-success"
      : status === "Failed"
        ? "bg-danger-soft text-destructive"
        : "bg-warning-soft text-warning";
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
      {status}
    </span>
  );
}

export function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive"> *</span>}
        {hint && <span className="ml-1 text-xs text-muted-foreground">{hint}</span>}
      </span>
      {children}
    </label>
  );
}
