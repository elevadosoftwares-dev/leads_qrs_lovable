import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { parse } from "@/lib/validate";
import { requireAdmin } from "@/lib/auth-middleware";
import type { Role } from "@/lib/permissions";

export interface AppUser {
  id: string;
  username: string;
  name: string;
  role: Role;
  /** Never sent by the server; filled in the edit form to set or change the password. */
  password: string;
}

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async (): Promise<AppUser[]> => {
    const { request } = await import("@/server/db.server");
    const req = await request();
    const { recordset } = await req.query<{
      id: string;
      username: string;
      full_name: string;
      role: Role;
    }>(`SELECT id, username, full_name, role FROM dbo.users ORDER BY full_name`);
    return recordset.map((u) => ({
      id: u.id.toLowerCase(),
      username: u.username,
      name: u.full_name,
      role: u.role,
      password: "",
    }));
  });

const saveSchema = z.object({
  id: z
    .string()
    .transform((v) => v || null)
    .pipe(z.string().uuid().nullable()),
  name: z.string().trim().min(1, "Enter the full name.").max(200),
  username: z.string().trim().min(1, "Enter the user name.").max(100),
  role: z.enum(["Admin", "User"], { message: "Select a role." }),
  password: z.string().default(""),
});

/** Creates or updates a user. On update a blank password keeps the current one. */
export const saveUser = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: unknown) => parse(saveSchema, d))
  .handler(async ({ data }) => {
    if ((!data.id || data.password) && data.password.length < 8)
      throw new Error("Password must be at least 8 characters.");

    const { request, sql, isDuplicateKeyError } = await import("@/server/db.server");
    const { hashPassword } = await import("@/server/crypto.server");
    const req = await request();
    req
      .input("username", sql.NVarChar(100), data.username)
      .input("full_name", sql.NVarChar(200), data.name)
      .input("role", sql.NVarChar(10), data.role)
      .input(
        "password_hash",
        sql.NVarChar(256),
        data.password ? await hashPassword(data.password) : null,
      );
    try {
      if (!data.id) {
        await req.query(
          `INSERT INTO dbo.users (username, full_name, role, password_hash)
           VALUES (@username, @full_name, @role, @password_hash)`,
        );
        return;
      }
      // Demoting the last Admin is refused in the same statement.
      const { rowsAffected } = await req.input("id", sql.UniqueIdentifier, data.id).query(
        `UPDATE dbo.users
            SET username = @username, full_name = @full_name, role = @role,
                password_hash = COALESCE(@password_hash, password_hash)
          WHERE id = @id
            AND (@role = N'Admin'
                 OR EXISTS (SELECT 1 FROM dbo.users WHERE role = N'Admin' AND id <> @id))`,
      );
      if (!rowsAffected[0]) throw new Error("At least one admin is required.");
    } catch (error) {
      if (isDuplicateKeyError(error)) throw new Error("This user name is already taken.");
      throw error;
    }
  });

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: unknown) => parse(z.object({ id: z.string().uuid() }), d))
  .handler(async ({ data }) => {
    const { request, sql } = await import("@/server/db.server");
    const req = await request();
    const { rowsAffected } = await req.input("id", sql.UniqueIdentifier, data.id).query(
      `DELETE FROM dbo.users
        WHERE id = @id
          AND (role <> N'Admin'
               OR EXISTS (SELECT 1 FROM dbo.users WHERE role = N'Admin' AND id <> @id))`,
    );
    if (!rowsAffected[0]) throw new Error("At least one admin is required.");
  });
