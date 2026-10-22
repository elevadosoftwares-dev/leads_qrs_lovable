import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { MasterTable } from "@/components/MasterTable";
import { deleteBdm, saveBdm, type Bdm } from "@/lib/masters.functions";
import { useAction, useMasters, useSession } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/masters/bdms")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Leads BDM · Leads QRS" },
      {
        name: "description",
        content: "Business development managers quotations are prepared for.",
      },
      { property: "og:title", content: "Leads BDM · Leads QRS" },
      {
        property: "og:description",
        content: "Business development managers quotations are prepared for.",
      },
    ],
  }),
  component: Page,
});

function Page() {
  const { isAdmin } = useSession();
  const { bdms } = useMasters();
  const run = useAction();
  return (
    <AppShell title="Leads BDM" subtitle="Used for the “Prepared For” field on quotations">
      {isAdmin && (
        <MasterTable<Bdm>
          title="BDMs"
          rows={bdms}
          cols={[
            { key: "name", label: "BDM Name", required: true },
            { key: "email", label: "Email" },
          ]}
          onSave={async (r) => (await run(() => saveBdm({ data: r }), "masters")).ok}
          onDelete={(id) => void run(() => deleteBdm({ data: { id } }), "masters")}
        />
      )}
    </AppShell>
  );
}
