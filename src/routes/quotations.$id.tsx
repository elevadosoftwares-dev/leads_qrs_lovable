import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Eye, Download, Trash2, Plus, FileText } from "lucide-react";
import { AppShell, Card, StatusBadge, btnGhost, inputCls } from "@/components/AppShell";
import { PdfPreview, downloadAttachment } from "@/components/PdfPreview";
import { useStore, canDelete, canEdit, type Attachment, type Status } from "@/lib/store";
import { readFiles, CATEGORIES } from "@/lib/files";

export const Route = createFileRoute("/quotations/$id")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Quotation · Leads QRS" },
      { name: "description", content: "Quotation details, documents and access history." },
      { property: "og:title", content: "Quotation · Leads QRS" },
      { property: "og:description", content: "Quotation details, documents and access history." },
    ],
  }),
  component: Detail,
});

function Detail() {
  const { id } = Route.useParams();
  const { data, update, session, ready, logAccess } = useStore();
  const navigate = useNavigate();
  const [preview, setPreview] = useState<Attachment | null>(null);
  const [cat, setCat] = useState(CATEGORIES[1]);
  const logged = useRef("");
  const q = data.quotations.find((x) => x.id === id);

  useEffect(() => {
    if (ready && q && session && logged.current !== q.id) {
      logged.current = q.id;
      logAccess(q.id, "View");
    }
  }, [ready, q, session, logAccess]);

  if (!q)
    return (
      <AppShell title="Quotation not found">
        <Link to="/quotations" search={{}} className="text-primary">
          Back to list
        </Link>
      </AppShell>
    );
  const company = data.companies.find((c) => c.id === q.companyId);
  const client = data.clients.find((c) => c.id === q.clientId);
  const project = data.projects.find((p) => p.id === q.projectId);
  const bdm = data.bdms.find((b) => b.id === q.preparedForId);
  const logs = data.logs.filter((l) => l.quotationId === q.id);
  const admin = canEdit(session?.role);

  const patch = (p: Partial<typeof q>) =>
    update((d) => ({
      ...d,
      quotations: d.quotations.map((x) => (x.id === q.id ? { ...x, ...p } : x)),
    }));

  const rows: [string, string | undefined][] = [
    ["Lead Group of Company", company?.name],
    ["Client", client?.name],
    ["Project", project?.name],
    ["Point of contact", `${project?.pocName ?? ""} · ${project?.pocPhone ?? ""}`],
    ["Site reference", q.siteReference],
    ["Prepared for (Leads BDM)", bdm?.name],
    ["Prepared by / Added by", q.preparedBy],
    ["Note-1", q.note1],
    ["Note-2", q.note2 || "—"],
    ["Created", new Date(q.createdAt).toLocaleString()],
  ];

  return (
    <AppShell
      title={q.number}
      subtitle={`${client?.name ?? ""} · ${project?.name ?? ""}`}
      actions={
        <div className="flex gap-2">
          <Link to="/quotations" search={{}} className={btnGhost}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          {canDelete(session?.role) && (
            <button
              className={`${btnGhost} text-destructive`}
              onClick={() => {
                if (confirm("Delete this quotation permanently?")) {
                  update((d) => ({
                    ...d,
                    quotations: d.quotations.filter((x) => x.id !== q.id),
                    logs: d.logs.filter((l) => l.quotationId !== q.id),
                  }));
                  navigate({ to: "/quotations", search: {} });
                }
              }}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          )}
        </div>
      }
    >
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card title="Details" right={<StatusBadge status={q.status} />}>
            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {rows.map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {k}
                  </dt>
                  <dd className="mt-0.5 font-medium">{v || "—"}</dd>
                </div>
              ))}
            </dl>
            {admin && (
              <div className="mt-5 grid gap-3 border-t pt-5 sm:grid-cols-2">
                <label className="text-sm font-medium">
                  Update status
                  <select
                    className={`${inputCls} mt-1`}
                    value={q.status}
                    onChange={(e) => patch({ status: e.target.value as Status })}
                  >
                    <option>Pending</option>
                    <option>Successful</option>
                    <option>Failed</option>
                  </select>
                </label>
                {q.status === "Failed" && (
                  <label className="text-sm font-medium">
                    Reason for failure
                    <input
                      className={`${inputCls} mt-1`}
                      defaultValue={q.failReason}
                      onBlur={(e) => patch({ failReason: e.target.value })}
                    />
                  </label>
                )}
              </div>
            )}
          </Card>
          <Card title={`Access History (${logs.length})`} tone="success">
            {logs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No access yet.</p>
            ) : (
              <ul className="divide-y text-sm">
                {logs.slice(0, 30).map((l) => (
                  <li key={l.id} className="flex justify-between py-2">
                    <span>
                      <b>{l.user}</b> · {l.action}
                    </span>
                    <span className="text-muted-foreground">{new Date(l.at).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
        <Card title={`Documents (${q.attachments.length})`} tone="teal">
          <ul className="space-y-2">
            {q.attachments.length === 0 && (
              <li className="text-sm text-muted-foreground">No documents attached.</li>
            )}
            {q.attachments.map((a) => (
              <li key={a.id} className="flex items-center gap-2 rounded-lg border p-2.5">
                <FileText className="h-5 w-5 shrink-0 text-destructive" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{a.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {a.category} · {new Date(a.uploadedAt).toLocaleDateString()}
                  </div>
                </div>
                <button
                  title="Preview"
                  className="rounded-md p-1.5 text-primary hover:bg-info-soft"
                  onClick={() => {
                    setPreview(a);
                    logAccess(q.id, "Preview");
                  }}
                >
                  <Eye className="h-4 w-4" />
                </button>
                <button
                  title="Download"
                  className="rounded-md p-1.5 text-success hover:bg-success-soft"
                  onClick={() => {
                    downloadAttachment(a);
                    logAccess(q.id, "Download");
                  }}
                >
                  <Download className="h-4 w-4" />
                </button>
                {admin && (
                  <button
                    title="Remove"
                    className="rounded-md p-1.5 text-destructive hover:bg-danger-soft"
                    onClick={() =>
                      confirm("Remove this file?") &&
                      patch({ attachments: q.attachments.filter((x) => x.id !== a.id) })
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
          {admin && (
            <div className="mt-4 space-y-2 border-t pt-4">
              <select className={inputCls} value={cat} onChange={(e) => setCat(e.target.value)}>
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <label className={`${btnGhost} w-full cursor-pointer justify-center`}>
                <Plus className="h-4 w-4" />
                Add more PDFs
                <input
                  type="file"
                  accept="application/pdf"
                  multiple
                  className="hidden"
                  onChange={async (e) => {
                    const a = await readFiles(e.target.files, cat ?? "", session?.name ?? "");
                    patch({ attachments: [...q.attachments, ...a] });
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
          )}
        </Card>
      </div>
      <PdfPreview
        file={preview}
        onClose={() => setPreview(null)}
        onDownload={() => {
          if (preview) {
            downloadAttachment(preview);
            logAccess(q.id, "Download");
          }
        }}
      />
    </AppShell>
  );
}
