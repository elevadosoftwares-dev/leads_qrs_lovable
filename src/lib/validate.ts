import type { z } from "zod";

/** Like schema.parse, but throws a plain Error with the first readable message for the UI. */
export function parse<T extends z.ZodTypeAny>(schema: T, data: unknown): z.output<T> {
  const result = schema.safeParse(data);
  if (!result.success) throw new Error(result.error.issues[0]?.message ?? "Invalid input.");
  return result.data;
}
