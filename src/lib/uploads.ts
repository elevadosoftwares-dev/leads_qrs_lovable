import { MAX_FILE } from "@/lib/quotations.functions";

export interface PendingFile {
  file: File;
  category: string;
}

/** PDFs within the size limit; tells the user about any that were skipped. */
export function acceptPdfs(files: File[]): File[] {
  const ok = files.filter(
    (f) =>
      f.size <= MAX_FILE && (f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")),
  );
  const skipped = files.filter((f) => !ok.includes(f));
  if (skipped.length)
    alert(`Skipped (PDF only, max 5 MB each): ${skipped.map((f) => f.name).join(", ")}`);
  return ok;
}

/** Builds the multipart form the upload server functions expect, or null when nothing is valid. */
export function uploadForm(pending: PendingFile[]): FormData | null {
  const valid = new Set(acceptPdfs(pending.map((p) => p.file)));
  const form = new FormData();
  for (const p of pending) {
    if (!valid.has(p.file)) continue;
    form.append("file", p.file);
    form.append("category", p.category);
  }
  return form.has("file") ? form : null;
}
