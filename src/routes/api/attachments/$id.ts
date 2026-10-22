import { createFileRoute } from "@tanstack/react-router";

// Streams a quotation PDF to a signed-in user: inline for preview, or `?download=1` to save it.
export const Route = createFileRoute("/api/attachments/$id")({
  server: {
    handlers: {
      GET: async ({ params, request: httpRequest }) => {
        const { getSessionUser } = await import("@/server/auth.server");
        if (!(await getSessionUser())) return new Response("Unauthorized", { status: 401 });

        if (!/^[0-9a-f-]{36}$/i.test(params.id)) return new Response("Not found", { status: 404 });

        const { request, sql } = await import("@/server/db.server");
        const req = await request();
        const { recordset } = await req.input("id", sql.UniqueIdentifier, params.id).query<{
          file_name: string;
          content_type: string;
          data: Buffer;
        }>(`SELECT file_name, content_type, data FROM dbo.attachments WHERE id = @id`);
        const file = recordset[0];
        if (!file) return new Response("Not found", { status: 404 });

        // Only PDFs open in the browser; anything else is sent as a plain download.
        const inline =
          file.content_type === "application/pdf" &&
          new URL(httpRequest.url).searchParams.get("download") !== "1";
        return new Response(new Uint8Array(file.data), {
          headers: {
            "content-type": inline ? file.content_type : "application/octet-stream",
            "content-length": String(file.data.length),
            "content-disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(file.file_name)}`,
            "x-content-type-options": "nosniff",
            "cache-control": "private, no-store",
          },
        });
      },
    },
  },
});
