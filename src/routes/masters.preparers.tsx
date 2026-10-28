import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { MasterTable } from "@/components/MasterTable";
import { useStore, type Preparer } from "@/lib/store";

export const Route = createFileRoute("/masters/preparers")({
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
  const { data, update, isAdmin } = useStore();
  return (
    <AppShell title="Prepared By / Added By">
      {isAdmin && (
        <MasterTable<Preparer>
          title="Staff Master List"
          rows={data.preparers}
          cols={[{ key: "name", label: "Staff Name", required: true }]}
          onSave={(r) =>
            update((d) => ({
              ...d,
              preparers: d.preparers.some((x) => x.id === r.id)
                ? d.preparers.map((x) => (x.id === r.id ? r : x))
                : [...d.preparers, r],
            }))
          }
          onDelete={(id) => {
            const person = data.preparers.find((p) => p.id === id);
            if (person && data.quotations.some((q) => q.preparedBy === person.name))
              return alert("Staff member has quotations and cannot be deleted.");
            update((d) => ({ ...d, preparers: d.preparers.filter((x) => x.id !== id) }));
          }}
        />
      )}
    </AppShell>
  );
}
