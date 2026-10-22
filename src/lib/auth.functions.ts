import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { parse } from "@/lib/validate";
import type { Role } from "@/lib/permissions";

export interface SessionInfo {
  id: string;
  username: string;
  name: string;
  role: Role;
}

/** The signed-in user, or null when nobody is signed in. */
export const getSession = createServerFn({ method: "GET" }).handler(
  async (): Promise<SessionInfo | null> => {
    const { getSessionUser } = await import("@/server/auth.server");
    return getSessionUser();
  },
);

const signInSchema = z.object({
  username: z.string().trim().min(1, "Enter your user name."),
  password: z.string().min(1, "Enter your password."),
  role: z.enum(["Admin", "User"]),
});

export const signIn = createServerFn({ method: "POST" })
  .validator((d: unknown) => parse(signInSchema, d))
  .handler(async ({ data }) => {
    const { request, sql } = await import("@/server/db.server");
    const { verifyPassword, getDummyHash } = await import("@/server/crypto.server");
    const { createSession } = await import("@/server/auth.server");

    const req = await request();
    const { recordset } = await req
      .input("username", sql.NVarChar(100), data.username)
      .query<{ id: string; password_hash: string; role: Role }>(
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

/** True when the app has no users yet, so the first Admin account can be created. */
export const isSetupRequired = createServerFn({ method: "GET" }).handler(async () => {
  const { request } = await import("@/server/db.server");
  const req = await request();
  const { recordset } = await req.query<{ n: number }>(`SELECT COUNT(*) AS n FROM dbo.users`);
  return { setupRequired: (recordset[0]?.n ?? 0) === 0 };
});

const bootstrapSchema = z.object({
  username: z.string().trim().min(1, "Enter a user name.").max(100),
  name: z.string().trim().min(1, "Enter your full name.").max(200),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

/** Creates the very first account as an Admin. Refuses once any user exists. */
export const bootstrapFirstAdmin = createServerFn({ method: "POST" })
  .validator((d: unknown) => parse(bootstrapSchema, d))
  .handler(async ({ data }) => {
    const { request, sql } = await import("@/server/db.server");
    const { hashPassword } = await import("@/server/crypto.server");

    const req = await request();
    // The lock hints make the "no users yet" check and the insert atomic.
    const { rowsAffected } = await req
      .input("username", sql.NVarChar(100), data.username)
      .input("full_name", sql.NVarChar(200), data.name)
      .input("password_hash", sql.NVarChar(256), await hashPassword(data.password))
      .query(
        `INSERT INTO dbo.users (username, full_name, password_hash, role)
         SELECT @username, @full_name, @password_hash, N'Admin'
          WHERE NOT EXISTS (SELECT 1 FROM dbo.users WITH (UPDLOCK, HOLDLOCK))`,
      );
    if (!rowsAffected[0]) throw new Error("An account already exists. Please sign in instead.");
    return { ok: true };
  });
