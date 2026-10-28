import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useStore, type Role } from "@/lib/store";
import { createFirstAdmin, isSetupRequired } from "@/lib/qrs.functions";
import { btnPrimary, inputCls, Field } from "@/components/AppShell";

export const Route = createFileRoute("/")({
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
  const { login, session, ready } = useStore();
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>("Admin");
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();
  const { data: setup } = useQuery({
    queryKey: ["setup-required"],
    queryFn: () => isSetupRequired(),
  });
  const firstRun = setup?.setupRequired === true;
  useEffect(() => {
    if (ready && session) navigate({ to: "/dashboard" });
  }, [ready, session, navigate]);

  async function submit() {
    setErr("");
    setBusy(true);
    try {
      if (firstRun) {
        await createFirstAdmin({ data: { username: u.trim(), name: name.trim(), password: p } });
        await qc.invalidateQueries({ queryKey: ["setup-required"] });
      }
      const r = await login(u.trim(), p, firstRun ? "Admin" : role);
      if (r) setErr(r);
      else navigate({ to: "/dashboard" });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not sign in");
    } finally {
      setBusy(false);
    }
  }

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
          <div>
            <h1 className="text-2xl font-bold">
              {firstRun ? "Create the administrator" : "Welcome back"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {firstRun
                ? "No accounts exist yet. This first account will be an Admin."
                : "Sign in to access the system"}
            </p>
          </div>
          {firstRun && (
            <Field label="Full name">
              <input
                className={inputCls}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
              />
            </Field>
          )}
          {!firstRun && (
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
          )}
          <Field label="User name">
            <input
              className={inputCls}
              value={u}
              onChange={(e) => setU(e.target.value)}
              placeholder="Enter your user name"
            />
          </Field>
          <Field label="Password">
            <input
              type="password"
              className={inputCls}
              value={p}
              onChange={(e) => setP(e.target.value)}
              placeholder="Enter your password"
            />
          </Field>
          {err && <p className="text-sm text-destructive">{err}</p>}
          <button className={`${btnPrimary} w-full justify-center`} disabled={busy}>
            {firstRun ? "Create Administrator" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
