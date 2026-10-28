import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { MasterTable } from "@/components/MasterTable";
import { useStore, type AppUser } from "@/lib/store";

export const Route = createFileRoute("/masters/users")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Manage Users · Leads QRS" },
      { name: "description", content: "Admin and view-only user accounts." },
      { property: "og:title", content: "Manage Users · Leads QRS" },
      { property: "og:description", content: "Admin and view-only user accounts." },
    ],
  }),
  component: Page,
});

function Page() {
  const { data, update, isAdmin } = useStore();
  return (
    <AppShell title="Manage Users" subtitle="Admins can add, edit and delete. Users can view only.">
      {isAdmin && (
        <MasterTable<AppUser>
          title="Users"
          rows={data.users}
          cols={[
            { key: "name", label: "Full Name", required: true },
            { key: "username", label: "User Name", required: true },
            { key: "password", label: "Password (leave blank to keep)", type: "password" },
            {
              key: "role",
              label: "Role",
              required: true,
              options: [
                { value: "Admin", label: "Admin" },
                { value: "User", label: "User (view only)" },
              ],
            },
          ]}
          onSave={(r) =>
            update((d) => ({
              ...d,
              users: d.users.some((x) => x.id === r.id)
                ? d.users.map((x) => (x.id === r.id ? r : x))
                : [...d.users, r],
            }))
          }
          onDelete={(id) => {
            if (
              data.users.filter((u) => u.role === "Admin").length === 1 &&
              data.users.find((u) => u.id === id)?.role === "Admin"
            )
              return alert("At least one admin is required.");
            update((d) => ({ ...d, users: d.users.filter((x) => x.id !== id) }));
          }}
        />
      )}
    </AppShell>
  );
}
