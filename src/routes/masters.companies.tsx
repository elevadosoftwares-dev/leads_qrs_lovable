import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { MasterTable } from "@/components/MasterTable";
import { useStore, type Company } from "@/lib/store";

export const Route = createFileRoute("/masters/companies")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Lead Group of Company · Leads QRS" },
      { name: "description", content: "Internal group companies list." },
      { property: "og:title", content: "Lead Group of Company · Leads QRS" },
      { property: "og:description", content: "Internal group companies list." },
    ],
  }),
  component: Page,
});

function Page() {
  const { data, update, isAdmin } = useStore();
  return (
    <AppShell title="Lead Group of Company">
      {isAdmin && (
        <MasterTable<Company>
          title="Lead Group of Company"
          rows={data.companies}
          cols={[
            { key: "name", label: "Group Company Name", required: true },
            { key: "code", label: "Company Code", required: true },
          ]}
          onSave={(r) =>
            update((d) => ({
              ...d,
              companies: d.companies.some((x) => x.id === r.id)
                ? d.companies.map((x) =>
                    x.id === r.id ? { ...x, ...r, code: r.code.toUpperCase() } : x,
                  )
                : [...d.companies, { ...r, code: r.code.toUpperCase(), color: "blue" }],
            }))
          }
          onDelete={(id) => {
            if (data.quotations.some((q) => q.companyId === id))
              return alert("Company has quotations and cannot be deleted.");
            update((d) => ({ ...d, companies: d.companies.filter((x) => x.id !== id) }));
          }}
        />
      )}
    </AppShell>
  );
}
