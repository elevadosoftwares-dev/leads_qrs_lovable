// Insert/update/delete helpers for the simple master tables. Table and column names come from
// code, never from user input; values are always bound as parameters.
import { request, sql } from "./db.server";

type Value = [type: sql.ISqlType | (() => sql.ISqlType), value: string | number];

/** Inserts a row when `id` is null, otherwise updates it. Returns the row id (lowercase). */
export async function upsert(
  table: string,
  id: string | null,
  values: Record<string, Value>,
): Promise<string> {
  const req = await request();
  const columns = Object.keys(values);
  for (const [column, [type, value]] of Object.entries(values)) req.input(column, type, value);

  if (!id) {
    const { recordset } = await req.query<{ id: string }>(
      `INSERT INTO dbo.${table} (${columns.join(", ")}) OUTPUT INSERTED.id
       VALUES (${columns.map((c) => `@${c}`).join(", ")})`,
    );
    return recordset[0]!.id.toLowerCase();
  }

  const { rowsAffected } = await req
    .input("id", sql.UniqueIdentifier, id)
    .query(
      `UPDATE dbo.${table} SET ${columns.map((c) => `${c} = @${c}`).join(", ")} WHERE id = @id`,
    );
  if (!rowsAffected[0]) throw new Error("This record no longer exists. Refresh the page.");
  return id;
}

/** Deletes a row; `inUseMessage` is shown when a foreign key still references it. */
export async function remove(table: string, id: string, inUseMessage: string): Promise<void> {
  const req = await request();
  try {
    await req
      .input("id", sql.UniqueIdentifier, id)
      .query(`DELETE FROM dbo.${table} WHERE id = @id`);
  } catch (error) {
    // 547: the DELETE conflicted with a REFERENCE constraint.
    if ((error as { number?: number } | null)?.number === 547) throw new Error(inUseMessage);
    throw error;
  }
}
