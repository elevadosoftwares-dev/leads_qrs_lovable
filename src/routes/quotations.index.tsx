import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Trash2, Eye } from "lucide-react";
import { AppShell, Card, StatusBadge, btnPrimary, inputCls } from "@/components/AppShell";
import { useStore, canDelete } from "@/lib/store";

export const Route = createFileRoute("/quotations/")({
  validateSearch: (s: Record<string, unknown>): { company?: string | undefined } => ({
    company: typeof s["company"] === "string" ? (s["company"] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Quotations · Leads QRS" },
      { name: "description", content: "Search, preview and download quotations." },
      { property: "og:title", content: "Quotations · Leads QRS" },
      { property: "og:description", content: "Search, preview and download quotations." },
    ],
  }),
  component: List,
});

function List() {
  const { data, update, session, isAdmin } = useStore();
  const sp = Route.useSearch();
  const [company, setCompany] = useState(sp.company ?? "");
  const [client, setClient] = useState("");
  const [project, setProject] = useState("");
  const [status, setStatus] = useState("");
  const [qno, setQno] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const name = (arr: { id: string; name: string }[], id: string) =>
    arr.find((x) => x.id === id)?.name ?? "—";

  const rows = useMemo(
    () =>
      data.quotations
        .filter(
          (q) =>
            (!company || q.companyId === company) &&
            (!client || q.clientId === client) &&
            (!project || q.projectId === project) &&
            (!status || q.status === status) &&
            (!qno || q.number.toLowerCase().includes(qno.toLowerCase())) &&
            (!from || q.createdAt.slice(0, 10) >= from) &&
            (!to || q.createdAt.slice(0, 10) <= to),
        )
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [data.quotations, company, client, project, status, qno, from, to],
  );

  const del = (id: string) => {
    if (!canDelete(session?.role)) return;
    if (confirm("Delete this quotation permanently?"))
      update((d) => ({
        ...d,
        quotations: d.quotations.filter((q) => q.id !== id),
        logs: d.logs.filter((l) => l.quotationId !== id),
      }));
  };

  return (
    <AppShell
      title="Quotations"
      subtitle="Search, preview and download quotations sent to clients"
      actions={
        isAdmin ? (
          <Link to="/quotations/new" className={btnPrimary}>
            <Plus className="h-4 w-4" />
            Add Quotation
          </Link>
        ) : undefined
      }
    >
      <div className="mb-6 grid gap-3 rounded-xl border bg-card p-4 shadow-card sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <select className={inputCls} value={company} onChange={(e) => setCompany(e.target.value)}>
          <option value="">All Group Companies</option>
          {data.companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <input
          className={inputCls}
          placeholder="Quotation no."
          value={qno}
          onChange={(e) => setQno(e.target.value)}
        />
        <select
          className={inputCls}
          value={client}
          onChange={(e) => {
            setClient(e.target.value);
            setProject("");
          }}
        >
          <option value="">All Clients</option>
          {data.clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select className={inputCls} value={project} onChange={(e) => setProject(e.target.value)}>
          <option value="">All Projects</option>
          {data.projects
            .filter((p) => !client || p.clientId === client)
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
        </select>
        <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All Status</option>
          <option>Pending</option>
          <option>Successful</option>
          <option>Failed</option>
        </select>
        <input
          type="date"
          className={inputCls}
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          title="From date"
        />
        <input
          type="date"
          className={inputCls}
          value={to}
          onChange={(e) => setTo(e.target.value)}
          title="To date"
        />
      </div>
      <Card title={`Quotation List (${rows.length})`}>
        <div className="-m-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                {[
                  "Quotation No",
                  "Lead Group of Company",
                  "Client",
                  "Project",
                  "POC",
                  "Prepared For",
                  "Prepared By / Added By",
                  "Files",
                  "Status",
                  "",
                ].map((h) => (
                  <th key={h} className="px-4 py-3 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-muted-foreground">
                    No records found
                  </td>
                </tr>
              )}
              {rows.map((q) => {
                const p = data.projects.find((x) => x.id === q.projectId);
                return (
                  <tr key={q.id} className="hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <span className="rounded-md bg-info-soft px-2 py-0.5 font-semibold text-primary">
                        {q.number}
                      </span>
                    </td>
                    <td className="px-4 py-3">{name(data.companies, q.companyId)}</td>
                    <td className="px-4 py-3 font-semibold">{name(data.clients, q.clientId)}</td>
                    <td className="px-4 py-3">{p?.name}</td>
                    <td className="px-4 py-3">{p?.pocName}</td>
                    <td className="px-4 py-3">{name(data.bdms, q.preparedForId)}</td>
                    <td className="px-4 py-3">{q.preparedBy}</td>
                    <td className="px-4 py-3">{q.attachments.length}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={q.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Link
                          to="/quotations/$id"
                          params={{ id: q.id }}
                          className="rounded-md p-2 text-primary hover:bg-info-soft"
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        {canDelete(session?.role) && (
                          <button
                            onClick={() => del(q.id)}
                            className="rounded-md p-2 text-destructive hover:bg-danger-soft"
                            title="Delete (Admin only)"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </AppShell>
  );
}
