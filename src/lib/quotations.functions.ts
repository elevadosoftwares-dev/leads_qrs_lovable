import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { parse } from "@/lib/validate";
import { requireAdmin, requireAuth } from "@/lib/auth-middleware";
import { manualQuotationNumber } from "@/lib/quotation-rules";
import type { Status } from "@/lib/permissions";

export type AccessAction = "View" | "Preview" | "Download";

export interface QuotationRow {
  id: string;
  number: string;
  companyId: string;
  companyName: string;
  clientId: string;
  clientName: string;
  projectId: string;
  projectName: string;
  pocName: string;
  pocPhone: string;
  siteReference: string;
  preparedForId: string;
  preparedForName: string;
  preparedBy: string;
  note1: string;
  note2: string;
  status: Status;
  failReason: string;
  createdAt: string;
  files: number;
  views: number;
  previews: number;
  downloads: number;
  lastAccessBy: string | null;
  lastAccessAt: string | null;
}

export interface Attachment {
  id: string;
  name: string;
  category: string;
  size: number;
  uploadedAt: string;
  uploadedBy: string;
}

export interface AccessLog {
  id: string;
  user: string;
  action: AccessAction;
  at: string;
}

export interface QuotationDetail extends QuotationRow {
  attachments: Attachment[];
  logs: AccessLog[];
}

export const CATEGORIES = [
  "Quotation PDF",
  "Revised Quotation",
  "Acknowledged PDF",
  "Purchase Order",
  "Supporting Document",
];

/** Largest PDF accepted on upload. */
export const MAX_FILE = 5 * 1024 * 1024;

const SELECT_ROWS = `
  SELECT q.id, q.number, q.company_id, c.name AS company_name, q.client_id, k.name AS client_name,
         q.project_id, p.name AS project_name, p.poc_name, p.poc_phone, q.site_reference,
         q.prepared_for_id, b.name AS prepared_for_name, q.prepared_by, q.note1, q.note2,
         q.status, q.fail_reason, q.created_at,
         (SELECT COUNT(*) FROM dbo.attachments a WHERE a.quotation_id = q.id) AS files,
         ISNULL(l.views, 0) AS views, ISNULL(l.previews, 0) AS previews,
         ISNULL(l.downloads, 0) AS downloads, last.user_name AS last_access_by,
         last.at AS last_access_at
    FROM dbo.quotations q
    JOIN dbo.companies c ON c.id = q.company_id
    JOIN dbo.clients k ON k.id = q.client_id
    JOIN dbo.projects p ON p.id = q.project_id
    JOIN dbo.bdms b ON b.id = q.prepared_for_id
    OUTER APPLY (
      SELECT SUM(CASE WHEN action = N'View' THEN 1 ELSE 0 END) AS views,
             SUM(CASE WHEN action = N'Preview' THEN 1 ELSE 0 END) AS previews,
             SUM(CASE WHEN action = N'Download' THEN 1 ELSE 0 END) AS downloads
        FROM dbo.access_logs WHERE quotation_id = q.id) l
    OUTER APPLY (
      SELECT TOP 1 user_name, at FROM dbo.access_logs
       WHERE quotation_id = q.id ORDER BY at DESC, id DESC) last`;

type DbRow = {
  id: string;
  number: string;
  company_id: string;
  company_name: string;
  client_id: string;
  client_name: string;
  project_id: string;
  project_name: string;
  poc_name: string;
  poc_phone: string;
  site_reference: string;
  prepared_for_id: string;
  prepared_for_name: string;
  prepared_by: string;
  note1: string;
  note2: string;
  status: Status;
  fail_reason: string;
  created_at: Date;
  files: number;
  views: number;
  previews: number;
  downloads: number;
  last_access_by: string | null;
  last_access_at: Date | null;
};

function toRow(r: DbRow): QuotationRow {
  return {
    id: r.id.toLowerCase(),
    number: r.number,
    companyId: r.company_id.toLowerCase(),
    companyName: r.company_name,
    clientId: r.client_id.toLowerCase(),
    clientName: r.client_name,
    projectId: r.project_id.toLowerCase(),
    projectName: r.project_name,
    pocName: r.poc_name,
    pocPhone: r.poc_phone,
    siteReference: r.site_reference,
    preparedForId: r.prepared_for_id.toLowerCase(),
    preparedForName: r.prepared_for_name,
    preparedBy: r.prepared_by,
    note1: r.note1,
    note2: r.note2,
    status: r.status,
    failReason: r.fail_reason,
    createdAt: r.created_at.toISOString(),
    files: r.files,
    views: r.views,
    previews: r.previews,
    downloads: r.downloads,
    lastAccessBy: r.last_access_by,
    lastAccessAt: r.last_access_at?.toISOString() ?? null,
  };
}

export const listQuotations = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async (): Promise<QuotationRow[]> => {
    const { request } = await import("@/server/db.server");
    const req = await request();
    const { recordset } = await req.query<DbRow>(`${SELECT_ROWS} ORDER BY q.created_at DESC`);
    return recordset.map(toRow);
  });

const idOnly = z.object({ id: z.string().uuid() });

export const getQuotation = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .validator((d: unknown) => parse(idOnly, d))
  .handler(async ({ data }): Promise<QuotationDetail | null> => {
    const { request, sql } = await import("@/server/db.server");
    const req = await request();
    const { recordsets } = await req.input("id", sql.UniqueIdentifier, data.id).query(
      `${SELECT_ROWS} WHERE q.id = @id;
       SELECT id, file_name, category, size_bytes, uploaded_at, uploaded_by
         FROM dbo.attachments WHERE quotation_id = @id ORDER BY uploaded_at;
       SELECT TOP 30 id, user_name, action, at
         FROM dbo.access_logs WHERE quotation_id = @id ORDER BY at DESC, id DESC;`,
    );
    const [rows, files, logs] = recordsets as unknown as [
      DbRow[],
      {
        id: string;
        file_name: string;
        category: string;
        size_bytes: number;
        uploaded_at: Date;
        uploaded_by: string;
      }[],
      { id: string; user_name: string; action: AccessAction; at: Date }[],
    ];
    const row = rows[0];
    if (!row) return null;
    return {
      ...toRow(row),
      attachments: files.map((f) => ({
        id: f.id.toLowerCase(),
        name: f.file_name,
        category: f.category,
        size: f.size_bytes,
        uploadedAt: f.uploaded_at.toISOString(),
        uploadedBy: f.uploaded_by,
      })),
      logs: logs.map((l) => ({
        id: String(l.id),
        user: l.user_name,
        action: l.action,
        at: l.at.toISOString(),
      })),
    };
  });

const createSchema = z
  .object({
    number: z.string().transform(manualQuotationNumber),
    companyId: z.string(),
    clientId: z.string(),
    projectId: z.string(),
    siteReference: z.string().trim(),
    preparedForId: z.string(),
    preparedBy: z.string().trim(),
    note1: z.string(),
    note2: z.string().trim(),
    status: z.enum(["Pending", "Successful", "Failed"]),
    failReason: z.string().trim(),
  })
  .superRefine((v, ctx) => {
    const ids = [v.companyId, v.clientId, v.projectId, v.preparedForId];
    if (
      !v.number ||
      !v.siteReference ||
      !v.preparedBy ||
      ids.some((id) => !z.string().uuid().safeParse(id).success)
    )
      ctx.addIssue({ code: "custom", message: "Please fill all required fields." });
    else if (v.note1.length < 15 || v.note1.length > 60)
      ctx.addIssue({ code: "custom", message: "Note-1 must be 15–60 characters." });
  });

/** Reads `file` entries (with a parallel `category` entry each) from an upload form. */
function readUploads(form: FormData) {
  const files = form.getAll("file");
  const categories = form.getAll("category");
  return files.map((f, i) => {
    if (!(f instanceof File)) throw new Error("Invalid file upload.");
    const category = String(categories[i] ?? "");
    if (!CATEGORIES.includes(category)) throw new Error("Select a document category.");
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf"))
      throw new Error(`${f.name} is not a PDF.`);
    if (f.size > MAX_FILE) throw new Error(`${f.name} is larger than 5 MB.`);
    return { file: f, category };
  });
}

async function insertAttachments(
  newRequest: () => import("mssql").Request,
  quotationId: string,
  uploads: ReturnType<typeof readUploads>,
  uploadedBy: string,
) {
  const { sql } = await import("@/server/db.server");
  for (const { file, category } of uploads) {
    await newRequest()
      .input("quotation_id", sql.UniqueIdentifier, quotationId)
      .input("file_name", sql.NVarChar(260), file.name.slice(0, 260))
      .input("category", sql.NVarChar(100), category)
      .input("content_type", sql.NVarChar(200), "application/pdf")
      .input("size_bytes", sql.Int, file.size)
      .input("data", sql.VarBinary(sql.MAX), Buffer.from(await file.arrayBuffer()))
      .input("uploaded_by", sql.NVarChar(200), uploadedBy)
      .query(
        `INSERT INTO dbo.attachments (quotation_id, file_name, category, content_type, size_bytes, data, uploaded_by)
         VALUES (@quotation_id, @file_name, @category, @content_type, @size_bytes, @data, @uploaded_by)`,
      );
  }
}

const formData = (d: unknown) => {
  if (!(d instanceof FormData)) throw new Error("Expected form data.");
  return d;
};

/** Creates a quotation and its PDFs in one transaction. Takes FormData: the fields plus files. */
export const createQuotation = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator(formData)
  .handler(async ({ data: form, context }) => {
    const field = (k: string) => {
      const v = form.get(k);
      return typeof v === "string" ? v : "";
    };
    const parsed = createSchema.safeParse(
      Object.fromEntries(Object.keys(createSchema.innerType().shape).map((k) => [k, field(k)])),
    );
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid input.");
    const v = parsed.data;
    const uploads = readUploads(form);

    const { getPool, sql, isDuplicateKeyError } = await import("@/server/db.server");
    const tx = new sql.Transaction(await getPool());
    await tx.begin();
    try {
      const { recordset } = await new sql.Request(tx)
        .input("number", sql.NVarChar(100), v.number)
        .input("company_id", sql.UniqueIdentifier, v.companyId)
        .input("client_id", sql.UniqueIdentifier, v.clientId)
        .input("project_id", sql.UniqueIdentifier, v.projectId)
        .input("site_reference", sql.NVarChar(300), v.siteReference)
        .input("prepared_for_id", sql.UniqueIdentifier, v.preparedForId)
        .input("prepared_by", sql.NVarChar(200), v.preparedBy)
        .input("note1", sql.NVarChar(60), v.note1)
        .input("note2", sql.NVarChar(sql.MAX), v.note2)
        .input("status", sql.NVarChar(20), v.status)
        .input("fail_reason", sql.NVarChar(500), v.status === "Failed" ? v.failReason : "")
        .query<{ id: string }>(
          `IF NOT EXISTS (SELECT 1 FROM dbo.projects WHERE id = @project_id AND client_id = @client_id)
             THROW 50001, N'The project does not belong to the selected client.', 1;
           INSERT INTO dbo.quotations (number, company_id, client_id, project_id, site_reference,
                  prepared_for_id, prepared_by, note1, note2, status, fail_reason)
           OUTPUT INSERTED.id
           VALUES (@number, @company_id, @client_id, @project_id, @site_reference,
                  @prepared_for_id, @prepared_by, @note1, @note2, @status, @fail_reason)`,
        );
      const id = recordset[0]!.id.toLowerCase();
      await insertAttachments(() => new sql.Request(tx), id, uploads, context.user.name);
      await tx.commit();
      return { id };
    } catch (error) {
      await tx.rollback().catch(() => {});
      if (isDuplicateKeyError(error))
        throw new Error("This quotation number already exists for the selected company.");
      if ((error as { number?: number }).number === 50001)
        throw new Error((error as Error).message);
      throw error;
    }
  });

export const updateQuotationStatus = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: unknown) =>
    parse(
      z.object({
        id: z.string().uuid(),
        status: z.enum(["Pending", "Successful", "Failed"]),
        failReason: z.string().trim().max(500),
      }),
      d,
    ),
  )
  .handler(async ({ data }) => {
    const { request, sql } = await import("@/server/db.server");
    const req = await request();
    await req
      .input("id", sql.UniqueIdentifier, data.id)
      .input("status", sql.NVarChar(20), data.status)
      .input("fail_reason", sql.NVarChar(500), data.failReason)
      .query(
        `UPDATE dbo.quotations SET status = @status, fail_reason = @fail_reason WHERE id = @id`,
      );
  });

/** Deletes the quotation with its documents and access history. */
export const deleteQuotation = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: unknown) => parse(idOnly, d))
  .handler(async ({ data }) => {
    const { request, sql } = await import("@/server/db.server");
    const req = await request();
    await req
      .input("id", sql.UniqueIdentifier, data.id)
      .query(`DELETE FROM dbo.quotations WHERE id = @id`);
  });

/** Adds PDFs to an existing quotation. Takes FormData: `id` plus files. */
export const addAttachments = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator(formData)
  .handler(async ({ data: form, context }) => {
    const id = z.string().uuid().parse(form.get("id"));
    const uploads = readUploads(form);
    const { getPool, sql } = await import("@/server/db.server");
    const pool = await getPool();
    await insertAttachments(() => new sql.Request(pool), id, uploads, context.user.name);
  });

export const deleteAttachment = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: unknown) => parse(idOnly, d))
  .handler(async ({ data }) => {
    const { request, sql } = await import("@/server/db.server");
    const req = await request();
    await req
      .input("id", sql.UniqueIdentifier, data.id)
      .query(`DELETE FROM dbo.attachments WHERE id = @id`);
  });

/** Records that the signed-in user viewed, previewed or downloaded a quotation. */
export const logAccess = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((d: unknown) =>
    parse(
      z.object({ quotationId: z.string().uuid(), action: z.enum(["View", "Preview", "Download"]) }),
      d,
    ),
  )
  .handler(async ({ data, context }) => {
    const { request, sql } = await import("@/server/db.server");
    const req = await request();
    await req
      .input("quotation_id", sql.UniqueIdentifier, data.quotationId)
      .input("user_id", sql.UniqueIdentifier, context.user.id)
      .input("user_name", sql.NVarChar(200), context.user.name)
      .input("action", sql.NVarChar(10), data.action)
      .query(
        `INSERT INTO dbo.access_logs (quotation_id, user_id, user_name, action)
         VALUES (@quotation_id, @user_id, @user_name, @action)`,
      );
  });
