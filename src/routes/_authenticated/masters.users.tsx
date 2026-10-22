import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { MasterTable } from "@/components/MasterTable";
import { useAction, useSession, useUsers } from "@/lib/queries";
import { deleteUser, saveUser, type AppUser } from "@/lib/users.functions";

export const Route = createFileRoute("/_authenticated/masters/users")({
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
  const { isAdmin } = useSession();
  return (
    <AppShell title="Manage Users" subtitle="Admins can add, edit and delete. Users can view only.">
      {isAdmin && <Users />}
    </AppShell>
  );
}

function Users() {
  const users = useUsers();
  const run = useAction();
  return (
    <MasterTable<AppUser>
      title="Users"
      rows={users}
      cols={[
        { key: "name", label: "Full Name", required: true },
        { key: "username", label: "User Name", required: true },
        { key: "password", label: "Password", type: "password" },
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
      onSave={async (r) => (await run(() => saveUser({ data: r }), "users", "session")).ok}
      onDelete={(id) => void run(() => deleteUser({ data: { id } }), "users")}
    />
  );
}
