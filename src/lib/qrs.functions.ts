import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin, requireAuth } from "@/lib/auth-middleware";
import type { AccessLog, AppUser, Data } from "@/lib/store";

// ------------------------------------------------------------------ sign-in

/** The signed-in user (password always empty), or null. */
export const getSession = createServerFn({ method: "GET" }).handler(
  async (): Promise<AppUser | null> => {
    const { getSessionUser } = await import("@/server/auth.server");
    const user = await getSessionUser();
    return user ? { ...user, password: "" } : null;
  },
);

/** True until the first administrator has been created. */
export const isSetupRequired = createServerFn({ method: "GET" }).handler(async () => {
  const { request } = await import("@/server/db.server");
  const req = await request();
  const { recordset } = await req.query<{ n: number }>(`SELECT COUNT(*) AS n FROM dbo.users`);
  return { setupRequired: (recordset[0]?.n ?? 0) === 0 };
});

const newId = () => Math.random().toString(36).slice(2, 10);

export const createFirstAdmin = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        username: z.string().trim().min(1, "Enter a user name").max(100),
        name: z.string().trim().min(1, "Enter your name").max(200),
        password: z.string().min(8, "Password must be at least 8 characters"),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { request, sql } = await import("@/server/db.server");
    const { hashPassword } = await import("@/server/crypto.server");
    const req = await request();
    // The lock hints make the "no users yet" check and the insert atomic.
    const { rowsAffected } = await req
      .input("id", sql.NVarChar(40), newId())
      .input("username", sql.NVarChar(100), data.username)
      .input("name", sql.NVarChar(200), data.name)
      .input("password_hash", sql.NVarChar(256), await hashPassword(data.password))
      .query(
        `INSERT INTO dbo.users (id, username, name, password_hash, role)
         SELECT @id, @username, @name, @password_hash, N'Admin'
          WHERE NOT EXISTS (SELECT 1 FROM dbo.users WITH (UPDLOCK, HOLDLOCK))`,
      );
    if (!rowsAffected[0]) throw new Error("An administrator already exists. Please sign in.");
    return { ok: true };
  });

export const signIn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        username: z.string().trim(),
        password: z.string(),
        role: z.enum(["Admin", "User"]),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { request, sql } = await import("@/server/db.server");
    const { verifyPassword, getDummyHash } = await import("@/server/crypto.server");
    const { createSession } = await import("@/server/auth.server");
    const req = await request();
    const { recordset } = await req
      .input("username", sql.NVarChar(100), data.username)
      .query<{ id: string; password_hash: string; role: string }>(
        `SELECT id, password_hash, role FROM dbo.users WHERE username = @username`,
      );
    const user = recordset[0];
    const ok = await verifyPassword(data.password, user?.password_hash ?? (await getDummyHash()));
    if (!user || !ok) throw new Error("Invalid user name or password");
    if (user.role !== data.role) throw new Error(`This account is not a ${data.role}`);
    await createSession(user.id);
    return { ok: true };
  });

export const signOut = createServerFn({ method: "POST" }).handler(async () => {
  const { destroySession } = await import("@/server/auth.server");
  await destroySession();
  return { ok: true };
});

// ------------------------------------------------------------------ reading

/** Everything the app shows, in the shape of the Data type. Passwords are never sent. */
export const loadData = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async (): Promise<Data> => {
    const { selectJson } = await import("@/server/rows.server");
    const [companies, clients, projects, bdms, users, quotations, logs, mail, preparers] =
      await Promise.all([
        selectJson<Data["companies"][number]>(
          `SELECT id, name, code, color FROM dbo.companies ORDER BY name`,
        ),
        selectJson<Data["clients"][number]>(
          `SELECT id, name, email, mobile FROM dbo.clients ORDER BY name`,
        ),
        selectJson<Data["projects"][number]>(
          `SELECT id, client_id AS clientId, name, poc_name AS pocName, poc_email AS pocEmail,
                  poc_phone AS pocPhone
             FROM dbo.projects ORDER BY name`,
        ),
        selectJson<Data["bdms"][number]>(`SELECT id, name, email FROM dbo.bdms ORDER BY name`),
        selectJson<Data["users"][number]>(
          `SELECT id, username, N'' AS password, name, role FROM dbo.users ORDER BY created_at, name`,
        ),
        selectJson<Data["quotations"][number]>(
          `SELECT q.id, q.number, q.company_id AS companyId, q.client_id AS clientId,
                  q.project_id AS projectId, q.site_reference AS siteReference,
                  q.prepared_for_id AS preparedForId, q.prepared_by AS preparedBy, q.note1, q.note2,
                  q.status, q.fail_reason AS failReason, q.amount, q.created_at AS createdAt,
                  JSON_QUERY(COALESCE((
                    SELECT a.id, a.name, a.category, N'/api/files/' + a.path AS dataUrl, a.size,
                           a.uploaded_at AS uploadedAt, a.uploaded_by AS uploadedBy
                      FROM dbo.attachments a WHERE a.quotation_id = q.id
                     ORDER BY a.uploaded_at FOR JSON PATH), N'[]')) AS attachments
             FROM dbo.quotations q ORDER BY q.created_at`,
        ),
        selectJson<AccessLog>(
          `SELECT id, quotation_id AS quotationId, user_name AS [user], user_id AS userId, action, at
             FROM dbo.access_logs ORDER BY at DESC`,
        ),
        selectJson<Data["mail"][number]>(
          `SELECT id, from_address AS [from], to_address AS [to], subject, threshold
             FROM dbo.mail_settings ORDER BY id`,
        ),
        selectJson<Data["preparers"][number]>(`SELECT id, name FROM dbo.preparers ORDER BY name`),
      ]);
    return {
      companies,
      clients,
      projects,
      bdms,
      users,
      quotations: quotations.map((q) => ({ ...q, amount: Number(q.amount) })),
      logs: logs.map(({ userId, ...l }) => (userId ? { ...l, userId } : l)),
      mail,
      preparers,
    };
  });

// ------------------------------------------------------------------ saving (Admins only)

const id = z.string().trim().min(1).max(40);
const s = (max: number) => z.string().max(max);
const attachmentSchema = z.object({
  id,
  name: s(260),
  category: s(100),
  /** A data: URL for a new upload, or the /api/files/... address of a stored one. */
  dataUrl: z.string(),
  size: z.number().int().nonnegative(),
  uploadedAt: z.string(),
  uploadedBy: s(200),
});

/** Per collection: the row schema, the table and its columns (app field -> SQL column). */
const collections = {
  companies: {
    schema: z.object({ id, name: s(200).min(1), code: s(20).min(1), color: s(40) }),
    table: "companies",
    columns: { name: "name", code: "code", color: "color" },
  },
  clients: {
    schema: z.object({ id, name: s(300).min(1), email: s(320), mobile: s(100) }),
    table: "clients",
    columns: { name: "name", email: "email", mobile: "mobile" },
  },
  projects: {
    schema: z.object({
      id,
      clientId: id,
      name: s(300).min(1),
      pocName: s(200),
      pocEmail: s(320),
      pocPhone: s(100),
    }),
    table: "projects",
    columns: {
      clientId: "client_id",
      name: "name",
      pocName: "poc_name",
      pocEmail: "poc_email",
      pocPhone: "poc_phone",
    },
  },
  bdms: {
    schema: z.object({ id, name: s(200).min(1), email: s(320) }),
    table: "bdms",
    columns: { name: "name", email: "email" },
  },
  preparers: {
    schema: z.object({ id, name: s(200).min(1) }),
    table: "preparers",
    columns: { name: "name" },
  },
  mail: {
    schema: z.object({
      id,
      from: s(320),
      to: s(320),
      subject: s(300),
      threshold: z.coerce.number().int(),
    }),
    table: "mail_settings",
    columns: { from: "from_address", to: "to_address", subject: "subject", threshold: "threshold" },
  },
  users: {
    schema: z.object({
      id,
      username: s(100).trim().min(1),
      name: s(200).trim().min(1),
      /** Empty keeps the current password. */
      password: z.string(),
      role: z.enum(["Admin", "User"]),
    }),
    table: "users",
    columns: { username: "username", name: "name", role: "role" },
  },
  quotations: {
    schema: z.object({
      id,
      number: s(100).trim().min(1),
      companyId: id,
      clientId: id,
      projectId: id,
      siteReference: s(300),
      preparedForId: s(40),
      preparedBy: s(200),
      note1: z.string(),
      note2: z.string(),
      status: z.enum(["Pending", "Successful", "Failed"]),
      failReason: z.string(),
      amount: z.coerce.number(),
      attachments: z.array(attachmentSchema),
      createdAt: z.string(),
    }),
    table: "quotations",
    columns: {
      number: "number",
      companyId: "company_id",
      clientId: "client_id",
      projectId: "project_id",
      siteReference: "site_reference",
      preparedForId: "prepared_for_id",
      preparedBy: "prepared_by",
      note1: "note1",
      note2: "note2",
      status: "status",
      failReason: "fail_reason",
      amount: "amount",
    },
  },
} as const;
type CollectionName = keyof typeof collections;

/** Parents before children for inserts; the reverse for deletes (foreign keys). */
const SAVE_ORDER: CollectionName[] = [
  "companies",
  "clients",
  "projects",
  "bdms",
  "preparers",
  "mail",
  "users",
  "quotations",
];

const changeSchema = z.object(
  Object.fromEntries(
    SAVE_ORDER.map((name) => [
      name,
      z.object({ upsert: z.array(collections[name].schema), remove: z.array(id) }).optional(),
    ]),
  ) as {
    [K in CollectionName]: z.ZodOptional<
      z.ZodObject<{
        upsert: z.ZodArray<(typeof collections)[K]["schema"]>;
        remove: z.ZodArray<typeof id>;
      }>
    >;
  },
);
export type Changes = z.input<typeof changeSchema>;

/** SQL Server errors 2627/2601 (duplicate key) and 547 (row still referenced). */
function friendlyError(error: unknown) {
  const number = (error as { number?: number } | null)?.number;
  if (number === 2627 || number === 2601) return new Error("That user name is already taken.");
  if (number === 547)
    return new Error("This record is still used by a quotation and cannot be deleted.");
  return error;
}

/** Applies inserts/updates/deletes computed by the store (see diff() in src/lib/store.tsx). */
export const saveChanges = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => changeSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { getPool, sql } = await import("@/server/db.server");
    const { hashPassword } = await import("@/server/crypto.server");
    const { saveFile } = await import("@/server/files.server");

    // Store new uploads first (outside the transaction); rows then refer to their paths.
    const newFiles = new Map<string, string>();
    for (const q of data.quotations?.upsert ?? []) {
      for (const a of q.attachments) {
        const match = /^data:([^;,]*)(;base64)?,(.*)$/s.exec(a.dataUrl);
        if (!match) continue;
        const bytes = match[2]
          ? Buffer.from(match[3] ?? "", "base64")
          : Buffer.from(decodeURIComponent(match[3] ?? ""));
        const file = new File([bytes], a.name, { type: match[1] || "application/pdf" });
        newFiles.set(a.id, await saveFile(file, "quotations"));
      }
    }

    const pool = await getPool();
    const tx = new sql.Transaction(pool);
    await tx.begin();
    const run = (query: string, params: Record<string, unknown>) => {
      const req = new sql.Request(tx);
      for (const [name, value] of Object.entries(params)) req.input(name, value ?? null);
      return req.query(query);
    };
    try {
      for (const name of [...SAVE_ORDER].reverse()) {
        for (const rowId of data[name]?.remove ?? []) {
          if (name === "users" && rowId === context.user.id)
            throw new Error("You cannot delete your own account.");
          await run(`DELETE FROM dbo.${collections[name].table} WHERE id = @id`, { id: rowId });
        }
      }
      for (const name of SAVE_ORDER) {
        const { table, columns } = collections[name];
        for (const parsed of data[name]?.upsert ?? []) {
          const row = parsed as Record<string, unknown> & { id: string };
          const values: Record<string, unknown> = { id: row.id };
          for (const [field, column] of Object.entries(columns)) values[column] = row[field];
          const cols: string[] = Object.values(columns);
          let setPassword = "";
          if (name === "users") {
            const password = String(row["password"] ?? "");
            if (password) {
              if (password.length < 8) throw new Error("Passwords must be at least 8 characters.");
              values["password_hash"] = await hashPassword(password);
              cols.push("password_hash");
              setPassword = ", password_hash = @password_hash";
            }
          }
          if (name === "quotations") values["created_at"] = new Date(String(row["createdAt"]));
          const insertCols = name === "quotations" ? [...cols, "created_at"] : cols;
          const sets = cols
            .filter((c) => c !== "password_hash")
            .map((c) => `${c} = @${c}`)
            .join(", ");
          const { recordset } = await run(
            `IF EXISTS (SELECT 1 FROM dbo.${table} WHERE id = @id)
               BEGIN UPDATE dbo.${table} SET ${sets}${setPassword} WHERE id = @id; SELECT 0 AS inserted; END
             ELSE
               BEGIN
                 INSERT INTO dbo.${table} (id, ${insertCols.join(", ")}) VALUES (@id, ${insertCols.map((c) => `@${c}`).join(", ")});
                 SELECT 1 AS inserted;
               END`,
            values,
          );
          if (name === "users" && recordset[0]?.inserted === 1 && !values["password_hash"])
            throw new Error("Enter a password for the new user.");

          if (name === "quotations") {
            const q = row as unknown as {
              id: string;
              attachments: z.infer<typeof attachmentSchema>[];
            };
            const keep = q.attachments.map((a) => a.id);
            await run(
              `DELETE FROM dbo.attachments WHERE quotation_id = @id
                 AND id NOT IN (SELECT value FROM OPENJSON(@keep))`,
              { id: q.id, keep: JSON.stringify(keep) },
            );
            for (const a of q.attachments) {
              const path = newFiles.get(a.id);
              if (!path) continue;
              await run(
                `INSERT INTO dbo.attachments (id, quotation_id, name, category, path, size, uploaded_at, uploaded_by)
                 VALUES (@id, @quotation_id, @name, @category, @path, @size, @uploaded_at, @uploaded_by)`,
                {
                  id: a.id,
                  quotation_id: q.id,
                  name: a.name,
                  category: a.category,
                  path,
                  size: a.size,
                  uploaded_at: new Date(a.uploadedAt),
                  uploaded_by: a.uploadedBy,
                },
              );
            }
          }
        }
      }
      const { recordset } = await run(
        `SELECT COUNT(*) AS n FROM dbo.users WHERE role = N'Admin'`,
        {},
      );
      if (!recordset[0]?.n) throw new Error("At least one admin is required.");
      await tx.commit();
    } catch (error) {
      await tx.rollback().catch(() => {});
      throw friendlyError(error);
    }
    return { ok: true };
  });

// ------------------------------------------------------------------ access log (everyone)

export const logAccess = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z.object({ quotationId: id, action: z.enum(["View", "Preview", "Download"]) }).parse(d),
  )
  .handler(async ({ data, context }): Promise<AccessLog> => {
    const { execute } = await import("@/server/rows.server");
    const log: AccessLog = {
      id: newId(),
      quotationId: data.quotationId,
      user: context.user.name,
      userId: context.user.id,
      action: data.action,
      at: new Date().toISOString(),
    };
    await execute(
      `INSERT INTO dbo.access_logs (id, quotation_id, user_name, user_id, action, at)
       VALUES (@id, @quotationId, @user, @userId, @action, @at)`,
      { ...log, at: new Date(log.at) },
    );
    return log;
  });
