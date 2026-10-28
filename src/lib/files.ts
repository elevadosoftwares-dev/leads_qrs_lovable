import { uid, type Attachment } from "./store";

export const MAX_FILE = 5 * 1024 * 1024;

export function readFiles(
  files: FileList | null,
  category: string,
  by: string,
): Promise<Attachment[]> {
  if (!files) return Promise.resolve([]);
  return Promise.all(
    Array.from(files)
      .filter((f) => f.size <= MAX_FILE)
      .map(
        (f) =>
          new Promise<Attachment>((res) => {
            const r = new FileReader();
            r.onload = () =>
              res({
                id: uid(),
                name: f.name,
                category,
                dataUrl: String(r.result),
                size: f.size,
                uploadedAt: new Date().toISOString(),
                uploadedBy: by,
              });
            r.readAsDataURL(f);
          }),
      ),
  );
}

export const CATEGORIES = [
  "Quotation PDF",
  "Revised Quotation",
  "Acknowledged PDF",
  "Purchase Order",
  "Supporting Document",
];
