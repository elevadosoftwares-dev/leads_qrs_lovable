import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { MasterTable } from "@/components/MasterTable";
import { deleteCompany, saveCompany, type Company } from "@/lib/masters.functions";
import { useAction, useMasters, useSession } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/masters/companies")({
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
  const { isAdmin } = useSession();
  const { companies } = useMasters();
  const run = useAction();
  return (
    <AppShell title="Lead Group of Company">
      {isAdmin && (
        <MasterTable<Company>
          title="Lead Group of Company"
          rows={companies}
          cols={[
            { key: "name", label: "Group Company Name", required: true },
            { key: "code", label: "Company Code", required: true },
          ]}
          onSave={async (r) =>
            (await run(() => saveCompany({ data: r }), "masters", "quotations")).ok
          }
          onDelete={(id) => void run(() => deleteCompany({ data: { id } }), "masters")}
        />
      )}
    </AppShell>
  );
}
