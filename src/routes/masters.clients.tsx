import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { MasterTable } from "@/components/MasterTable";
import { useStore, type Client, type Project } from "@/lib/store";

export const Route = createFileRoute("/masters/clients")({
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
  const { data, update, isAdmin } = useStore();
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
          rows={data.clients}
          cols={[{ key: "name", label: "Client Name", required: true }]}
          onSave={(r) =>
            update((d) => ({
              ...d,
              clients: d.clients.some((x) => x.id === r.id)
                ? d.clients.map((x) => (x.id === r.id ? r : x))
                : [...d.clients, r],
            }))
          }
          onDelete={(id) => {
            if (data.quotations.some((q) => q.clientId === id))
              return alert("Client has quotations and cannot be deleted.");
            update((d) => ({
              ...d,
              clients: d.clients.filter((x) => x.id !== id),
              projects: d.projects.filter((p) => p.clientId !== id),
            }));
          }}
        />
        <MasterTable<Project>
          title="Projects"
          rows={data.projects}
          cols={[
            {
              key: "clientId",
              label: "Client",
              required: true,
              options: data.clients.map((c) => ({ value: c.id, label: c.name })),
            },
            { key: "name", label: "Project Name", required: true },
            { key: "pocName", label: "POC Name" },
            { key: "pocPhone", label: "POC Phone" },
          ]}
          display={{ clientId: (r) => data.clients.find((c) => c.id === r.clientId)?.name ?? "—" }}
          onSave={(r) =>
            update((d) => ({
              ...d,
              projects: d.projects.some((x) => x.id === r.id)
                ? d.projects.map((x) => (x.id === r.id ? r : x))
                : [...d.projects, r],
            }))
          }
          onDelete={(id) => {
            if (data.quotations.some((q) => q.projectId === id))
              return alert("Project has quotations and cannot be deleted.");
            update((d) => ({ ...d, projects: d.projects.filter((x) => x.id !== id) }));
          }}
        />
      </div>
    </AppShell>
  );
}
