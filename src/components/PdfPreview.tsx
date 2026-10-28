import { useEffect, useState } from "react";
import { X, Download } from "lucide-react";
import type { Attachment } from "@/lib/store";

/** Turns a data: URL into a blob: URL; stored files already have a URL and are returned as is. */
export function dataUrlToBlobUrl(dataUrl: string) {
  if (!dataUrl.startsWith("data:")) return dataUrl;
  const [meta = "", b64 = ""] = dataUrl.split(",");
  const mime = meta.match(/:(.*?);/)?.[1] ?? "application/pdf";
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return URL.createObjectURL(new Blob([arr], { type: mime }));
}

export function downloadAttachment(a: Attachment) {
  const url = dataUrlToBlobUrl(a.dataUrl);
  const link = document.createElement("a");
  link.href = url;
  link.download = a.name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
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
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file) return;
    const u = dataUrlToBlobUrl(file.dataUrl);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
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
        {url && <iframe src={url} title={file.name} className="flex-1" />}
      </div>
    </div>
  );
}
