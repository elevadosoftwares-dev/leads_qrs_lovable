import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Eye, Download, Trash2, Plus, FileText } from "lucide-react";
import { AppShell, Card, StatusBadge, btnGhost, inputCls } from "@/components/AppShell";
import { PdfPreview, downloadAttachment } from "@/components/PdfPreview";
import { canDelete, canEdit, type Status } from "@/lib/permissions";
import { useAction, useQuotation, useSession } from "@/lib/queries";
import {
  CATEGORIES,
  addAttachments,
  deleteAttachment,
  deleteQuotation,
  logAccess,
  updateQuotationStatus,
  type AccessAction,
  type Attachment,
} from "@/lib/quotations.functions";
import { uploadForm } from "@/lib/uploads";

export const Route = createFileRoute("/_authenticated/quotations/$id")({
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
  const { session } = useSession();
  const { data: q, isPending } = useQuotation(id);
  const run = useAction();
  const navigate = useNavigate();
  const [preview, setPreview] = useState<Attachment | null>(null);
  const [cat, setCat] = useState(CATEGORIES[1] ?? "");
  const logged = useRef("");

  const track = (action: AccessAction) =>
    void run(() => logAccess({ data: { quotationId: id, action } }), "quotations");
  useEffect(() => {
    if (q && logged.current !== q.id) {
      logged.current = q.id;
      track("View");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q?.id]);

  if (isPending)
    return (
      <AppShell title="Loading…">
        <p />
      </AppShell>
    );
  if (!q)
    return (
      <AppShell title="Quotation not found">
        <Link to="/quotations" search={{}} className="text-primary">
          Back to list
        </Link>
      </AppShell>
    );
  const admin = canEdit(session?.role);

  const patch = (status: Status, failReason: string) =>
    void run(() => updateQuotationStatus({ data: { id: q.id, status, failReason } }), "quotations");

  const rows: [string, string | undefined][] = [
    ["Lead Group of Company", q.companyName],
    ["Client", q.clientName],
    ["Project", q.projectName],
    ["Point of contact", `${q.pocName} · ${q.pocPhone}`],
    ["Site reference", q.siteReference],
    ["Prepared for (Leads BDM)", q.preparedForName],
    ["Prepared by / Added by", q.preparedBy],
    ["Note-1", q.note1],
    ["Note-2", q.note2 || "—"],
    ["Created", new Date(q.createdAt).toLocaleString()],
  ];
  const accessCount = q.views + q.previews + q.downloads;

  return (
    <AppShell
      title={q.number}
      subtitle={`${q.clientName} · ${q.projectName}`}
      actions={
        <div className="flex gap-2">
          <Link to="/quotations" search={{}} className={btnGhost}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          {canDelete(session?.role) && (
            <button
              className={`${btnGhost} text-destructive`}
              onClick={async () => {
                if (
                  confirm("Delete this quotation permanently?") &&
                  (await run(() => deleteQuotation({ data: { id: q.id } }), "quotations")).ok
                )
                  navigate({ to: "/quotations", search: {} });
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
                    onChange={(e) => patch(e.target.value as Status, q.failReason)}
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
                      onBlur={(e) =>
                        e.target.value !== q.failReason && patch(q.status, e.target.value)
                      }
                    />
                  </label>
                )}
              </div>
            )}
          </Card>
          <Card title={`Access History (${accessCount})`} tone="success">
            {q.logs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No access yet.</p>
            ) : (
              <ul className="divide-y text-sm">
                {q.logs.map((l) => (
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
                    track("Preview");
                  }}
                >
                  <Eye className="h-4 w-4" />
                </button>
                <button
                  title="Download"
                  className="rounded-md p-1.5 text-success hover:bg-success-soft"
                  onClick={() => {
                    downloadAttachment(a);
                    track("Download");
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
                      void run(() => deleteAttachment({ data: { id: a.id } }), "quotations")
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
                    const form = uploadForm(
                      Array.from(e.target.files ?? []).map((file) => ({ file, category: cat })),
                    );
                    e.target.value = "";
                    if (!form) return;
                    form.set("id", q.id);
                    await run(() => addAttachments({ data: form }), "quotations");
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
            track("Download");
          }
        }}
      />
    </AppShell>
  );
}
