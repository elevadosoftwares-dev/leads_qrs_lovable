import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { MasterTable } from "@/components/MasterTable";
import { DAILY_ACCESS_THRESHOLD } from "@/lib/quotation-rules";
import { useStore, type MailSetting } from "@/lib/store";

export const Route = createFileRoute("/mail-settings")({
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
  const { data, update, isAdmin } = useStore();
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
          <MasterTable<MailSetting>
            title="Notification Mail"
            rows={data.mail}
            cols={[
              { key: "from", label: "From Mail", required: true },
              { key: "to", label: "Recipient Email", type: "email", required: true },
              { key: "subject", label: "Subject", required: true },
            ]}
            onSave={(r) => {
              const row = { ...r, threshold: DAILY_ACCESS_THRESHOLD };
              update((d) => ({
                ...d,
                mail: d.mail.some((x) => x.id === r.id)
                  ? d.mail.map((x) => (x.id === r.id ? row : x))
                  : [...d.mail, row],
              }));
            }}
            onDelete={(id) => update((d) => ({ ...d, mail: d.mail.filter((x) => x.id !== id) }))}
          />
        </>
      )}
    </AppShell>
  );
}
