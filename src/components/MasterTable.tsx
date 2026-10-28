import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Card, btnPrimary, btnGhost, inputCls } from "./AppShell";
import { uid } from "@/lib/store";

export interface Col<T> {
  key: keyof T & string;
  label: string;
  required?: boolean;
  type?: string;
  options?: { value: string; label: string }[];
}

export function MasterTable<T extends { id: string }>({
  title,
  cols,
  rows,
  onSave,
  onDelete,
  display,
}: {
  title: string;
  cols: Col<T>[];
  rows: T[];
  onSave: (row: T) => void;
  onDelete: (id: string) => void;
  display?: Partial<Record<keyof T, (row: T) => string>>;
}) {
  const [edit, setEdit] = useState<Record<string, string> | null>(null);
  const start = (r?: T) =>
    setEdit(r ? Object.fromEntries(Object.entries(r).map(([k, v]) => [k, String(v)])) : { id: "" });
  const save = () => {
    if (!edit) return;
    if (cols.some((c) => c.required && !edit[c.key]?.trim()))
      return alert("Please fill required fields");
    onSave({ ...edit, id: edit["id"] || uid() } as unknown as T);
    setEdit(null);
  };
  return (
    <Card
      title={title}
      right={
        <button className={btnPrimary} onClick={() => start()}>
          <Plus className="h-4 w-4" />
          Add
        </button>
      }
    >
      {edit && (
        <div className="mb-5 grid gap-3 rounded-lg bg-info-soft p-4 sm:grid-cols-2 lg:grid-cols-3">
          {cols.map((c) =>
            c.options ? (
              <select
                key={c.key}
                className={inputCls}
                value={edit[c.key] ?? ""}
                onChange={(e) => setEdit({ ...edit, [c.key]: e.target.value })}
              >
                <option value="">
                  {c.label}
                  {c.required ? " *" : ""}
                </option>
                {c.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                key={c.key}
                type={c.type ?? "text"}
                className={inputCls}
                placeholder={c.label + (c.required ? " *" : "")}
                value={edit[c.key] ?? ""}
                onChange={(e) => setEdit({ ...edit, [c.key]: e.target.value })}
              />
            ),
          )}
          <div className="flex gap-2 sm:col-span-2 lg:col-span-3">
            <button className={btnPrimary} onClick={save}>
              Save
            </button>
            <button className={btnGhost} onClick={() => setEdit(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}
      <div className="-mx-5 -mb-5 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">#</th>
              {cols
                .filter((c) => c.type !== "password")
                .map((c) => (
                  <th key={c.key} className="px-4 py-3">
                    {c.label}
                  </th>
                ))}
              <th />
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((r, i) => (
              <tr key={r.id}>
                <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                {cols
                  .filter((c) => c.type !== "password")
                  .map((c) => (
                    <td key={c.key} className="px-4 py-3">
                      {display?.[c.key]?.(r) ?? String(r[c.key] ?? "")}
                    </td>
                  ))}
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <button
                      className="rounded-md p-2 text-primary hover:bg-info-soft"
                      onClick={() => start(r)}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      className="rounded-md p-2 text-destructive hover:bg-danger-soft"
                      onClick={() => confirm("Delete?") && onDelete(r.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
