import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { MasterTable } from "@/components/MasterTable";
import {
  deleteClient,
  deleteProject,
  saveClient,
  saveProject,
  type Client,
  type Project,
} from "@/lib/masters.functions";
import { useAction, useMasters, useSession } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/masters/clients")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Clients & Projects · Leads QRS" },
      { name: "description", content: "Clients and their projects with points of contact." },
      { property: "og:title", content: "Clients & Projects · Leads QRS" },
      { property: "og:description", content: "Clients and their projects with points of contact." },
    ],
  }),
  component: Page,
});

function Page() {
  const { isAdmin } = useSession();
  const { clients, projects } = useMasters();
  const run = useAction();
  if (!isAdmin)
    return (
      <AppShell title="Clients & Projects">
        <p />
      </AppShell>
    );
  return (
    <AppShell
      title="Clients & Projects"
      subtitle="One client can have many projects, each with its own point of contact"
    >
      <div className="space-y-6">
        <MasterTable<Client>
          title="Clients"
          rows={clients}
          cols={[{ key: "name", label: "Client Name", required: true }]}
          onSave={async (r) =>
            (await run(() => saveClient({ data: r }), "masters", "quotations")).ok
          }
          onDelete={(id) => void run(() => deleteClient({ data: { id } }), "masters")}
        />
        <MasterTable<Project>
          title="Projects"
          rows={projects}
          cols={[
            {
              key: "clientId",
              label: "Client",
              required: true,
              options: clients.map((c) => ({ value: c.id, label: c.name })),
            },
            { key: "name", label: "Project Name", required: true },
            { key: "pocName", label: "POC Name" },
            { key: "pocPhone", label: "POC Phone" },
          ]}
          display={{ clientId: (r) => clients.find((c) => c.id === r.clientId)?.name ?? "—" }}
          onSave={async (r) =>
            (await run(() => saveProject({ data: r }), "masters", "quotations")).ok
          }
          onDelete={(id) => void run(() => deleteProject({ data: { id } }), "masters")}
        />
      </div>
    </AppShell>
  );
}
