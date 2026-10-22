import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { bootstrapFirstAdmin, getSession, isSetupRequired, signIn } from "@/lib/auth.functions";
import type { Role } from "@/lib/permissions";
import { sessionQueryKey } from "@/lib/queries";
import { btnPrimary, inputCls, Field } from "@/components/AppShell";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: async ({ context }) => {
    const session = await context.queryClient.fetchQuery({
      queryKey: sessionQueryKey,
      queryFn: () => getSession(),
      staleTime: 30_000,
    });
    if (session) throw redirect({ to: "/dashboard" });
  },
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Sign in · Leads QRS" },
      { name: "description", content: "Sign in to the Leads Quotation Retrieval System." },
      { property: "og:title", content: "Sign in · Leads QRS" },
      { property: "og:description", content: "Sign in to the Leads Quotation Retrieval System." },
    ],
  }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: setup } = useQuery({
    queryKey: ["setup-required"],
    queryFn: () => isSetupRequired(),
  });
  const firstRun = setup?.setupRequired === true;
  const [role, setRole] = useState<Role>("Admin");
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setErr("");
    setBusy(true);
    try {
      if (firstRun) await bootstrapFirstAdmin({ data: { username: u.trim(), name, password: p } });
      await signIn({ data: { username: u.trim(), password: p, role: firstRun ? "Admin" : role } });
      await queryClient.invalidateQueries();
      navigate({ to: "/dashboard" });
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen bg-login lg:grid-cols-2">
      <div className="hidden flex-col justify-between p-12 text-primary-foreground lg:flex">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-card text-xl font-extrabold text-primary">
            L
          </div>
          <div className="text-xl font-bold">Leads QRS</div>
        </div>
        <div>
          <h2 className="text-4xl font-extrabold leading-tight">
            Every quotation,
            <br />
            one place.
          </h2>
          <p className="mt-4 max-w-md opacity-80">
            Track quotations across Leads, Deep Science and every group company — with clients,
            projects, BDMs and documents together.
          </p>
        </div>
        <div className="text-sm opacity-60">Quotation Retrieval System · Version 2</div>
      </div>
      <div className="flex items-center justify-center p-6">
        <form
          className="w-full max-w-md space-y-5 rounded-2xl bg-card p-8 shadow-card"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          {firstRun ? (
            <div>
              <h1 className="text-2xl font-bold">Set up Leads QRS</h1>
              <p className="text-sm text-muted-foreground">
                Create the first Admin account to get started
              </p>
            </div>
          ) : (
            <>
              <div>
                <h1 className="text-2xl font-bold">Welcome back</h1>
                <p className="text-sm text-muted-foreground">Sign in to access the system</p>
              </div>
              <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
                {(["Admin", "User"] as Role[]).map((r) => (
                  <button
                    type="button"
                    key={r}
                    onClick={() => setRole(r)}
                    className={`rounded-md py-2 text-sm font-semibold ${role === r ? "bg-card text-primary shadow-card" : "text-muted-foreground"}`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </>
          )}
          {firstRun && (
            <Field label="Full name">
              <input
                className={inputCls}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
              />
            </Field>
          )}
          <Field label="User name">
            <input
              className={inputCls}
              value={u}
              onChange={(e) => setU(e.target.value)}
              placeholder="Enter your user name"
            />
          </Field>
          <Field label="Password" {...(firstRun ? { hint: "(at least 8 characters)" } : {})}>
            <input
              type="password"
              className={inputCls}
              value={p}
              onChange={(e) => setP(e.target.value)}
              placeholder="Enter your password"
            />
          </Field>
          {err && <p className="text-sm text-destructive">{err}</p>}
          <button disabled={busy} className={`${btnPrimary} w-full justify-center`}>
            {busy ? "Please wait…" : firstRun ? "Create Admin and sign in" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
