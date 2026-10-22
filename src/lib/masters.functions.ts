import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { parse } from "@/lib/validate";
import { requireAdmin, requireAuth } from "@/lib/auth-middleware";
import { DAILY_ACCESS_THRESHOLD } from "@/lib/quotation-rules";

export interface Company {
  id: string;
  name: string;
  code: string;
}
export interface Client {
  id: string;
  name: string;
}
export interface Project {
  id: string;
  clientId: string;
  name: string;
  pocName: string;
  pocPhone: string;
}
export interface Bdm {
  id: string;
  name: string;
  email: string;
}
export interface Preparer {
  id: string;
  name: string;
}
export interface MailSetting {
  id: string;
  from: string;
  to: string;
  subject: string;
  threshold: number;
}

export interface Masters {
  companies: Company[];
  clients: Client[];
  projects: Project[];
  bdms: Bdm[];
  preparers: Preparer[];
}

const lower = (rows: { id: string }[]) => rows.forEach((r) => (r.id = r.id.toLowerCase()));

/** All master lists used by the quotation forms and filters. */
export const getMasters = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async (): Promise<Masters> => {
    const { request } = await import("@/server/db.server");
    const req = await request();
    const { recordsets } = await req.query(
      `SELECT id, name, code FROM dbo.companies ORDER BY name;
       SELECT id, name FROM dbo.clients ORDER BY name;
       SELECT id, LOWER(CONVERT(CHAR(36), client_id)) AS clientId, name,
              poc_name AS pocName, poc_phone AS pocPhone
         FROM dbo.projects ORDER BY name;
       SELECT id, name, email FROM dbo.bdms ORDER BY name;
       SELECT id, name FROM dbo.preparers ORDER BY name;`,
    );
    const [companies, clients, projects, bdms, preparers] = recordsets as unknown as [
      Company[],
      Client[],
      Project[],
      Bdm[],
      Preparer[],
    ];
    [companies, clients, projects, bdms, preparers].forEach(lower);
    return { companies, clients, projects, bdms, preparers };
  });

/** "" means a new row. */
const rowId = z
  .string()
  .transform((v) => v || null)
  .pipe(z.string().uuid().nullable());
const text = (label: string, max: number) =>
  z.string().trim().min(1, `Enter the ${label}.`).max(max);
const optional = (max: number) => z.string().trim().max(max).default("");
const idOnly = z.object({ id: z.string().uuid() });

export const saveCompany = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: unknown) =>
    parse(
      z.object({ id: rowId, name: text("company name", 200), code: text("company code", 20) }),
      d,
    ),
  )
  .handler(async ({ data }) => {
    const { sql } = await import("@/server/db.server");
    const { upsert } = await import("@/server/crud.server");
    return upsert("companies", data.id, {
      name: [sql.NVarChar(200), data.name],
      code: [sql.NVarChar(20), data.code.toUpperCase()],
    });
  });

export const deleteCompany = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: unknown) => parse(idOnly, d))
  .handler(async ({ data }) => {
    const { remove } = await import("@/server/crud.server");
    await remove("companies", data.id, "Company has quotations and cannot be deleted.");
  });

export const saveClient = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: unknown) => parse(z.object({ id: rowId, name: text("client name", 300) }), d))
  .handler(async ({ data }) => {
    const { sql } = await import("@/server/db.server");
    const { upsert } = await import("@/server/crud.server");
    return upsert("clients", data.id, { name: [sql.NVarChar(300), data.name] });
  });

/** Also deletes the client's projects, unless any of them has quotations. */
export const deleteClient = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: unknown) => parse(idOnly, d))
  .handler(async ({ data }) => {
    const { remove } = await import("@/server/crud.server");
    await remove("clients", data.id, "Client has quotations and cannot be deleted.");
  });

export const saveProject = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: unknown) =>
    parse(
      z.object({
        id: rowId,
        clientId: z.string().uuid("Select a client."),
        name: text("project name", 300),
        pocName: optional(200),
        pocPhone: optional(50),
      }),
      d,
    ),
  )
  .handler(async ({ data }) => {
    const { sql } = await import("@/server/db.server");
    const { upsert } = await import("@/server/crud.server");
    return upsert("projects", data.id, {
      client_id: [sql.UniqueIdentifier, data.clientId],
      name: [sql.NVarChar(300), data.name],
      poc_name: [sql.NVarChar(200), data.pocName],
      poc_phone: [sql.NVarChar(50), data.pocPhone],
    });
  });

export const deleteProject = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: unknown) => parse(idOnly, d))
  .handler(async ({ data }) => {
    const { remove } = await import("@/server/crud.server");
    await remove("projects", data.id, "Project has quotations and cannot be deleted.");
  });

export const saveBdm = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: unknown) =>
    parse(z.object({ id: rowId, name: text("BDM name", 200), email: optional(320) }), d),
  )
  .handler(async ({ data }) => {
    const { sql } = await import("@/server/db.server");
    const { upsert } = await import("@/server/crud.server");
    return upsert("bdms", data.id, {
      name: [sql.NVarChar(200), data.name],
      email: [sql.NVarChar(320), data.email],
    });
  });

export const deleteBdm = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: unknown) => parse(idOnly, d))
  .handler(async ({ data }) => {
    const { remove } = await import("@/server/crud.server");
    await remove("bdms", data.id, "BDM has quotations and cannot be deleted.");
  });

export const savePreparer = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: unknown) => parse(z.object({ id: rowId, name: text("staff name", 200) }), d))
  .handler(async ({ data }) => {
    const { sql } = await import("@/server/db.server");
    const { upsert } = await import("@/server/crud.server");
    return upsert("preparers", data.id, { name: [sql.NVarChar(200), data.name] });
  });

/** Quotations store the staff name as text, so the check is by name rather than a foreign key. */
export const deletePreparer = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: unknown) => parse(idOnly, d))
  .handler(async ({ data }) => {
    const { request, sql } = await import("@/server/db.server");
    const req = await request();
    const { rowsAffected } = await req.input("id", sql.UniqueIdentifier, data.id).query(
      `DELETE p FROM dbo.preparers p
        WHERE p.id = @id
          AND NOT EXISTS (SELECT 1 FROM dbo.quotations q WHERE q.prepared_by = p.name)`,
    );
    if (!rowsAffected[0]) throw new Error("Staff member has quotations and cannot be deleted.");
  });

export const listMailSettings = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async (): Promise<MailSetting[]> => {
    const { request } = await import("@/server/db.server");
    const req = await request();
    const { recordset } = await req.query<MailSetting>(
      `SELECT id, from_email AS [from], to_email AS [to], subject, threshold
         FROM dbo.mail_settings ORDER BY created_at`,
    );
    lower(recordset);
    return recordset;
  });

export const saveMailSetting = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: unknown) =>
    parse(
      z.object({
        id: rowId,
        from: text("from mail", 320),
        to: z.string().trim().email("Enter a valid recipient email."),
        subject: text("subject", 300),
      }),
      d,
    ),
  )
  .handler(async ({ data }) => {
    const { sql } = await import("@/server/db.server");
    const { upsert } = await import("@/server/crud.server");
    return upsert("mail_settings", data.id, {
      from_email: [sql.NVarChar(320), data.from],
      to_email: [sql.NVarChar(320), data.to],
      subject: [sql.NVarChar(300), data.subject],
      threshold: [sql.Int, DAILY_ACCESS_THRESHOLD],
    });
  });

export const deleteMailSetting = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: unknown) => parse(idOnly, d))
  .handler(async ({ data }) => {
    const { remove } = await import("@/server/crud.server");
    await remove("mail_settings", data.id, "This mail setting cannot be deleted.");
  });
