import { X, Download } from "lucide-react";
import type { Attachment } from "@/lib/quotations.functions";

export const attachmentUrl = (a: Attachment) => `/api/attachments/${a.id}`;

export function downloadAttachment(a: Attachment) {
  const link = document.createElement("a");
  link.href = `${attachmentUrl(a)}?download=1`;
  link.download = a.name;
  link.click();
}

export function PdfPreview({
  file,
  onClose,
  onDownload,
}: {
  file: Attachment | null;
  onClose: () => void;
  onDownload: () => void;
}) {
  if (!file) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4"
      onClick={onClose}
    >
      <div
        className="flex h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-card shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="truncate font-semibold">{file.name}</div>
          <div className="flex gap-2">
            <button
              onClick={onDownload}
              className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground"
            >
              <Download className="h-4 w-4" />
              Download
            </button>
            <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <iframe src={attachmentUrl(file)} title={file.name} className="flex-1" />
      </div>
    </div>
  );
}
