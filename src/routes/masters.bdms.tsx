import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { MasterTable } from "@/components/MasterTable";
import { useStore, type Bdm } from "@/lib/store";

export const Route = createFileRoute("/masters/bdms")({
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
  const { data, update, isAdmin } = useStore();
  return (
    <AppShell title="Leads BDM" subtitle="Used for the “Prepared For” field on quotations">
      {isAdmin && (
        <MasterTable<Bdm>
          title="BDMs"
          rows={data.bdms}
          cols={[
            { key: "name", label: "BDM Name", required: true },
            { key: "email", label: "Email" },
          ]}
          onSave={(r) =>
            update((d) => ({
              ...d,
              bdms: d.bdms.some((x) => x.id === r.id)
                ? d.bdms.map((x) => (x.id === r.id ? r : x))
                : [...d.bdms, r],
            }))
          }
          onDelete={(id) => update((d) => ({ ...d, bdms: d.bdms.filter((x) => x.id !== id) }))}
        />
      )}
    </AppShell>
  );
}
