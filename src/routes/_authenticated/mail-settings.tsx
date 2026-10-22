import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { MasterTable } from "@/components/MasterTable";
import { deleteMailSetting, saveMailSetting, type MailSetting } from "@/lib/masters.functions";
import { useAction, useMailSettings, useSession } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/mail-settings")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Mail Settings · Leads QRS" },
      { name: "description", content: "Alert emails for quotation access." },
      { property: "og:title", content: "Mail Settings · Leads QRS" },
      { property: "og:description", content: "Alert emails for quotation access." },
    ],
  }),
  component: Page,
});

function Page() {
  const { isAdmin } = useSession();
  return (
    <AppShell title="Mail Settings">
      {isAdmin && (
        <>
          <div className="mb-5 space-y-2">
            <p className="text-sm font-medium">
              Daily access threshold: 5 distinct quotations per person · Singapore time
            </p>
            <p className="text-sm text-muted-foreground">
              Email alerts are not active. Set up an email domain to enable sending.
            </p>
          </div>
          <MailTable />
        </>
      )}
    </AppShell>
  );
}

function MailTable() {
  const mail = useMailSettings();
  const run = useAction();
  return (
    <MasterTable<MailSetting>
      title="Notification Mail"
      rows={mail}
      cols={[
        { key: "from", label: "From Mail", required: true },
        { key: "to", label: "Recipient Email", type: "email", required: true },
        { key: "subject", label: "Subject", required: true },
      ]}
      onSave={async (r) => (await run(() => saveMailSetting({ data: r }), "mail")).ok}
      onDelete={(id) => void run(() => deleteMailSetting({ data: { id } }), "mail")}
    />
  );
}
