import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, Card, StatusBadge, inputCls } from "@/components/AppShell";
import { useMasters, useQuotations } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/summary")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Quotation Summary · Leads QRS" },
      { name: "description", content: "See who accessed a quotation, how and when." },
      { property: "og:title", content: "Quotation Summary · Leads QRS" },
      { property: "og:description", content: "See who accessed a quotation, how and when." },
    ],
  }),
  component: Summary,
});

function Summary() {
  const { companies, clients } = useMasters();
  const { data: quotations = [] } = useQuotations();
  const [company, setCompany] = useState("");
  const [client, setClient] = useState("");
  const [search, setSearch] = useState("");
  const rows = quotations.filter(
    (q) =>
      (!company || q.companyId === company) &&
      (!client || q.clientId === client) &&
      (!search ||
        [q.number, q.clientName, q.projectName, q.siteReference]
          .join(" ")
          .toLowerCase()
          .includes(search.toLowerCase())),
  );

  return (
    <AppShell title="Quotation Summary" subtitle="See who accessed a quotation, how and when">
      <div className="mb-6 grid gap-3 rounded-xl border bg-card p-4 shadow-card sm:grid-cols-3">
        <select className={inputCls} value={company} onChange={(e) => setCompany(e.target.value)}>
          <option value="">All Group Companies</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select className={inputCls} value={client} onChange={(e) => setClient(e.target.value)}>
          <option value="">All Clients</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <input
          className={inputCls}
          placeholder="Search quotation, client, project"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <Card title={`Access Summary (${rows.length})`} tone="success">
        <div className="-m-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                {[
                  "Quotation No",
                  "Lead Group of Company",
                  "Client",
                  "Project",
                  "Status",
                  "Views",
                  "Previews",
                  "Downloads",
                  "Last accessed",
                ].map((h) => (
                  <th key={h} className="px-4 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((q) => (
                <tr key={q.id}>
                  <td className="px-4 py-3">
                    <Link
                      to="/quotations/$id"
                      params={{ id: q.id }}
                      className="rounded-md bg-info-soft px-2 py-0.5 font-semibold text-primary"
                    >
                      {q.number}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{q.companyName}</td>
                  <td className="px-4 py-3 font-semibold">{q.clientName}</td>
                  <td className="px-4 py-3">{q.projectName}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={q.status} />
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-info-soft px-2 py-0.5 font-semibold text-primary">
                      {q.views}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-teal-soft px-2 py-0.5 font-semibold text-teal">
                      {q.previews}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-success-soft px-2 py-0.5 font-semibold text-success">
                      {q.downloads}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {q.lastAccessAt
                      ? `${q.lastAccessBy} · ${new Date(q.lastAccessAt).toLocaleString()}`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </AppShell>
  );
}
