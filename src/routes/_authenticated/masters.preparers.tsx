import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { MasterTable } from "@/components/MasterTable";
import { deletePreparer, savePreparer, type Preparer } from "@/lib/masters.functions";
import { useAction, useMasters, useSession } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/masters/preparers")({
  head: () => ({
    meta: [
      { title: "Prepared By / Added By · Leads QRS" },
      { name: "description", content: "Manage staff who prepare or add quotations." },
      { property: "og:title", content: "Prepared By / Added By · Leads QRS" },
      { property: "og:description", content: "Manage staff who prepare or add quotations." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  const { isAdmin } = useSession();
  const { preparers } = useMasters();
  const run = useAction();
  return (
    <AppShell title="Prepared By / Added By">
      {isAdmin && (
        <MasterTable<Preparer>
          title="Staff Master List"
          rows={preparers}
          cols={[{ key: "name", label: "Staff Name", required: true }]}
          onSave={async (r) => (await run(() => savePreparer({ data: r }), "masters")).ok}
          onDelete={(id) => void run(() => deletePreparer({ data: { id } }), "masters")}
        />
      )}
    </AppShell>
  );
}
