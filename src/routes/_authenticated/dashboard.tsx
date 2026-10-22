import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText, XCircle, Clock, Eye, Search } from "lucide-react";
import { AppShell, Card, StatusBadge, inputCls } from "@/components/AppShell";
import { useState } from "react";
import { matchesClientName } from "@/lib/quotation-rules";
import { useQuotations } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Dashboard · Leads QRS" },
      { name: "description", content: "Overview of quotations across group companies." },
      { property: "og:title", content: "Dashboard · Leads QRS" },
      { property: "og:description", content: "Overview of quotations across group companies." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { data: quotations = [] } = useQuotations();
  const [search, setSearch] = useState("");
  const q = quotations.filter((q) => matchesClientName(q.clientName, search));
  const stats = [
    {
      label: "Pending",
      value: q.filter((x) => x.status === "Pending").length,
      icon: Clock,
      cls: "bg-stat-pending text-warning",
    },
    {
      label: "Unsuccessful / Failed",
      value: q.filter((x) => x.status === "Failed").length,
      icon: XCircle,
      cls: "bg-stat-failed text-destructive",
    },
  ];

  return (
    <AppShell title="Welcome to Leads">
      <div className="relative mb-6 max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <input
          type="search"
          aria-label="Search by client name"
          placeholder="Search by client name"
          className={`${inputCls} pl-10`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        {stats.map((s) => (
          <div
            key={s.label}
            className={`rounded-lg border border-border p-2.5 shadow-card ${s.cls}`}
          >
            <s.icon className="h-3 w-3" />
            <div className="mt-1.5 text-lg font-extrabold leading-tight">{s.value}</div>
            <div className="text-xs font-medium opacity-80">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6">
        <Card
          title={search.trim() ? `Matching Quotations (${q.length})` : "Recent Quotations"}
          tone="primary"
          icon={<FileText className="h-5 w-5 text-primary" />}
          right={
            <Link to="/quotations" search={{}} className="text-sm font-semibold text-primary">
              View all
            </Link>
          }
        >
          {q.length === 0 && (
            <p className="text-sm text-muted-foreground">No quotations found for this client.</p>
          )}
          <ul className="divide-y">
            {q.slice(0, search.trim() ? q.length : 6).map((x) => (
              <li key={x.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <Link
                    to="/quotations/$id"
                    params={{ id: x.id }}
                    className="font-semibold text-primary"
                  >
                    {x.number}
                  </Link>
                  <span className="block font-medium sm:ml-2 sm:inline">{x.clientName}</span>
                  <div className="truncate text-sm text-muted-foreground">
                    {x.projectName} · {x.companyName}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-warning-soft px-2 py-0.5 text-xs font-semibold text-warning">
                    <Eye className="h-3 w-3" />
                    {x.views + x.previews + x.downloads}
                  </span>
                  <StatusBadge status={x.status} />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </AppShell>
  );
}
