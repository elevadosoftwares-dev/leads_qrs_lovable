import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Plus, X, FileText, Eye } from "lucide-react";
import { AppShell, Card, Field, btnPrimary, btnGhost, inputCls } from "@/components/AppShell";
import { useStore, uid, type Attachment, type Status } from "@/lib/store";
import { PdfPreview, downloadAttachment } from "@/components/PdfPreview";
import { Button } from "@/components/ui/button";
import { manualQuotationNumber } from "@/lib/quotation-rules";
import { readFiles, CATEGORIES } from "@/lib/files";

export const Route = createFileRoute("/quotations/new")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Add Quotation · Leads QRS" },
      { name: "description", content: "Create a new quotation with documents." },
      { property: "og:title", content: "Add Quotation · Leads QRS" },
      { property: "og:description", content: "Create a new quotation with documents." },
    ],
  }),
  component: NewQuotation,
});

function NewQuotation() {
  const { data, update, session, isAdmin } = useStore();
  const navigate = useNavigate();
  const [f, setF] = useState({
    number: "",
    companyId: "",
    clientId: "",
    projectId: "",
    siteReference: "",
    preparedForId: "",
    preparedBy: "",
    note1: "",
    note2: "",
    amount: "",
    status: "Pending" as Status,
    failReason: "",
  });
  const [files, setFiles] = useState<Attachment[]>([]);
  const [preview, setPreview] = useState<Attachment | null>(null);
  const [cat, setCat] = useState(CATEGORIES[0]);
  const [newClient, setNewClient] = useState<null | {
    name: string;
    email: string;
    mobile: string;
  }>(null);
  const [newProject, setNewProject] = useState<null | {
    name: string;
    pocName: string;
    pocEmail: string;
    pocPhone: string;
  }>(null);
  const [err, setErr] = useState("");
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));

  if (!isAdmin)
    return (
      <AppShell title="Add Quotation">
        <p className="text-muted-foreground">You have view-only access.</p>
      </AppShell>
    );

  const saveClient = () => {
    if (!newClient?.name.trim()) return;
    const id = uid();
    update((d) => ({ ...d, clients: [...d.clients, { id, ...newClient }] }));
    setF((p) => ({ ...p, clientId: id, projectId: "" }));
    setNewClient(null);
  };
  const saveProject = () => {
    if (!newProject?.name || !f.clientId) return;
    const id = uid();
    update((d) => ({
      ...d,
      projects: [...d.projects, { id, clientId: f.clientId, ...newProject }],
    }));
    set("projectId", id);
    setNewProject(null);
  };

  const submit = () => {
    if (
      !manualQuotationNumber(f.number) ||
      !f.companyId ||
      !f.clientId ||
      !f.projectId ||
      !f.siteReference ||
      !f.preparedForId ||
      !f.preparedBy
    )
      return setErr("Please fill all required fields.");
    if (f.note1.length < 15 || f.note1.length > 60)
      return setErr("Note-1 must be 15–60 characters.");
    if (
      data.quotations.some(
        (q) =>
          q.companyId === f.companyId &&
          q.number.toLowerCase() === manualQuotationNumber(f.number).toLowerCase(),
      )
    )
      return setErr("This quotation number already exists for the selected company.");
    const id = uid();
    update((d) => ({
      ...d,
      quotations: [
        ...d.quotations,
        {
          id,
          ...f,
          number: manualQuotationNumber(f.number),
          amount: Number(f.amount) || 0,
          attachments: files,
          createdAt: new Date().toISOString(),
        },
      ],
    }));
    navigate({ to: "/quotations/$id", params: { id } });
  };

  const project = data.projects.find((p) => p.id === f.projectId);

  return (
    <AppShell
      title="Add Quotation"
      subtitle="Quotation details and documents shared with the client"
      actions={
        <Link to="/quotations" search={{}} className={btnGhost}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
      }
    >
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card title="Lead Group of Company & Number" tone="teal">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Lead Group of Company" required>
                <select
                  className={inputCls}
                  value={f.companyId}
                  onChange={(e) => set("companyId", e.target.value)}
                >
                  <option value="">Select group company</option>
                  {data.companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Quotation No" required>
                <input
                  className={inputCls}
                  value={f.number}
                  onChange={(e) => set("number", e.target.value)}
                />
              </Field>
            </div>
          </Card>

          <Card title="Client & Project">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Field label="Client Name" required>
                  <select
                    className={inputCls}
                    value={f.clientId}
                    onChange={(e) => {
                      set("clientId", e.target.value);
                      set("projectId", "");
                    }}
                  >
                    <option value="">Select client</option>
                    {data.clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => setNewClient({ name: "", email: "", mobile: "" })}
                  className="mt-1 text-xs font-semibold text-primary"
                >
                  + New client
                </Button>
              </div>
              <div>
                <Field label="Project Name" required>
                  <select
                    className={inputCls}
                    disabled={!f.clientId}
                    value={f.projectId}
                    onChange={(e) => set("projectId", e.target.value)}
                  >
                    <option value="">
                      {f.clientId ? "Select project" : "Select a client first"}
                    </option>
                    {data.projects
                      .filter((p) => p.clientId === f.clientId)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                  </select>
                </Field>
                {f.clientId && (
                  <Button
                    variant="ghost"
                    type="button"
                    onClick={() =>
                      setNewProject({ name: "", pocName: "", pocEmail: "", pocPhone: "" })
                    }
                    className="mt-1 text-xs font-semibold text-primary"
                  >
                    + New project
                  </Button>
                )}
              </div>
            </div>

            {newClient && (
              <div className="mt-4 grid gap-3 rounded-lg bg-info-soft p-4 sm:grid-cols-3">
                <input
                  className={inputCls}
                  placeholder="Client name *"
                  value={newClient.name}
                  onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                />
                <div className="flex gap-2 sm:col-span-3">
                  <Button variant="ghost" type="button" className={btnPrimary} onClick={saveClient}>
                    Save client
                  </Button>
                  <Button
                    variant="ghost"
                    type="button"
                    className={btnGhost}
                    onClick={() => setNewClient(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
            {newProject && (
              <div className="mt-4 grid gap-3 rounded-lg bg-teal-soft p-4 sm:grid-cols-2">
                <input
                  className={inputCls}
                  placeholder="Project name *"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                />
                <input
                  className={inputCls}
                  placeholder="POC name"
                  value={newProject.pocName}
                  onChange={(e) => setNewProject({ ...newProject, pocName: e.target.value })}
                />
                <input
                  className={inputCls}
                  placeholder="POC phone"
                  value={newProject.pocPhone}
                  onChange={(e) => setNewProject({ ...newProject, pocPhone: e.target.value })}
                />
                <div className="flex gap-2 sm:col-span-2">
                  <Button
                    variant="ghost"
                    type="button"
                    className={btnPrimary}
                    onClick={saveProject}
                  >
                    Save project
                  </Button>
                  <Button
                    variant="ghost"
                    type="button"
                    className={btnGhost}
                    onClick={() => setNewProject(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
            {project && (
              <div className="mt-4 rounded-lg border border-dashed p-3 text-sm">
                <span className="font-semibold">Point of contact:</span> {project.pocName || "—"} ·{" "}
                {project.pocPhone}
              </div>
            )}
          </Card>

          <Card title="Quotation Details" tone="warning">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Site Reference" required>
                <input
                  className={inputCls}
                  value={f.siteReference}
                  onChange={(e) => set("siteReference", e.target.value)}
                />
              </Field>
              <Field label="Prepared For (Leads BDM)" required>
                <select
                  className={inputCls}
                  value={f.preparedForId}
                  onChange={(e) => set("preparedForId", e.target.value)}
                >
                  <option value="">Select BDM</option>
                  {data.bdms.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Prepared By / Added By" required>
                <select
                  className={inputCls}
                  value={f.preparedBy}
                  onChange={(e) => set("preparedBy", e.target.value)}
                >
                  <option value="">Select staff</option>
                  {data.preparers.map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Status">
                <select
                  className={inputCls}
                  value={f.status}
                  onChange={(e) => set("status", e.target.value)}
                >
                  <option>Pending</option>
                  <option>Successful</option>
                  <option>Failed</option>
                </select>
              </Field>
              {f.status === "Failed" && (
                <Field label="Reason for failure">
                  <input
                    className={inputCls}
                    value={f.failReason}
                    onChange={(e) => set("failReason", e.target.value)}
                  />
                </Field>
              )}
              <div className="sm:col-span-2">
                <Field label="Note-1" required hint={`(15–60 chars · ${f.note1.length})`}>
                  <input
                    maxLength={60}
                    className={inputCls}
                    value={f.note1}
                    onChange={(e) => set("note1", e.target.value)}
                  />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Note-2" hint="(optional)">
                  <input
                    className={inputCls}
                    value={f.note2}
                    onChange={(e) => set("note2", e.target.value)}
                  />
                </Field>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Documents" tone="success">
            <div className="space-y-3">
              <select className={inputCls} value={cat} onChange={(e) => setCat(e.target.value)}>
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <label className={`${btnGhost} w-full cursor-pointer justify-center`}>
                <Plus className="h-4 w-4" />
                Attach PDFs (multiple)
                <input
                  type="file"
                  accept="application/pdf"
                  multiple
                  className="hidden"
                  onChange={async (e) => {
                    const a = await readFiles(e.target.files, cat ?? "", session?.name ?? "");
                    setFiles((p) => [...p, ...a]);
                    e.target.value = "";
                  }}
                />
              </label>
              <p className="text-xs text-muted-foreground">PDF · max 5 MB each</p>
              <ul className="space-y-2">
                {files.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center gap-2 rounded-lg bg-muted p-2 text-sm"
                  >
                    <FileText className="h-4 w-4 shrink-0 text-destructive" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{a.name}</div>
                      <div className="text-xs text-muted-foreground">{a.category}</div>
                    </div>
                    <Button
                      variant="ghost"
                      title="Preview"
                      className="h-8 w-8 p-0 text-primary hover:bg-info-soft"
                      onClick={() => setPreview(a)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => setFiles((p) => p.filter((x) => x.id !== a.id))}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          </Card>
          {err && <p className="text-sm text-destructive">{err}</p>}
          <div className="flex gap-2">
            <Link to="/quotations" search={{}} className={btnGhost}>
              Cancel
            </Link>
            <Button
              variant="ghost"
              onClick={submit}
              className={`${btnPrimary} flex-1 justify-center`}
            >
              Save Quotation
            </Button>
          </div>
        </div>
      </div>
      <PdfPreview
        file={preview}
        onClose={() => setPreview(null)}
        onDownload={() => {
          if (preview) downloadAttachment(preview);
        }}
      />
    </AppShell>
  );
}
