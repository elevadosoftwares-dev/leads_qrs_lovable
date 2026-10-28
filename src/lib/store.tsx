import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  getSession,
  loadData,
  logAccess as logAccessFn,
  saveChanges,
  signIn,
  signOut,
  type Changes,
} from "@/lib/qrs.functions";

export type Role = "Admin" | "User";
export type Status = "Pending" | "Successful" | "Failed";

export interface Company {
  id: string;
  name: string;
  code: string;
  color: string;
}
export interface Client {
  id: string;
  name: string;
  email: string;
  mobile: string;
}
export interface Project {
  id: string;
  clientId: string;
  name: string;
  pocName: string;
  pocEmail: string;
  pocPhone: string;
}
export interface Bdm {
  id: string;
  name: string;
  email: string;
}
export interface Preparer {
  id: string;
  name: string;
}
/** password is only ever sent to the server (new or changed password); it is empty otherwise. */
export interface AppUser {
  id: string;
  username: string;
  password: string;
  name: string;
  role: Role;
}
/** dataUrl: a data: URL for a file just chosen, or the /api/files/... address once stored. */
export interface Attachment {
  id: string;
  name: string;
  category: string;
  dataUrl: string;
  size: number;
  uploadedAt: string;
  uploadedBy: string;
}
export interface Quotation {
  id: string;
  number: string;
  companyId: string;
  clientId: string;
  projectId: string;
  siteReference: string;
  preparedForId: string;
  preparedBy: string;
  note1: string;
  note2: string;
  status: Status;
  failReason: string;
  amount: number;
  attachments: Attachment[];
  createdAt: string;
}
export interface AccessLog {
  id: string;
  quotationId: string;
  user: string;
  userId?: string;
  action: "View" | "Preview" | "Download";
  at: string;
}
export interface MailSetting {
  id: string;
  from: string;
  to: string;
  subject: string;
  threshold: number;
}

export interface Data {
  companies: Company[];
  clients: Client[];
  projects: Project[];
  bdms: Bdm[];
  users: AppUser[];
  quotations: Quotation[];
  logs: AccessLog[];
  mail: MailSetting[];
  preparers: Preparer[];
}

export const uid = () => Math.random().toString(36).slice(2, 10);

const empty: Data = {
  companies: [],
  clients: [],
  projects: [],
  bdms: [],
  users: [],
  quotations: [],
  logs: [],
  mail: [],
  preparers: [],
};

/** Collections saved to the server; logs are written by logAccess and removed with their quotation. */
const SAVED = [
  "companies",
  "clients",
  "projects",
  "bdms",
  "preparers",
  "mail",
  "users",
  "quotations",
] as const;

/** Rows added/changed and ids removed between two versions of the data. */
function diff(prev: Data, next: Data): Changes {
  const changes: Record<string, { upsert: unknown[]; remove: string[] }> = {};
  for (const key of SAVED) {
    const before = new Map<string, unknown>(prev[key].map((r) => [r.id, r]));
    const upsert = next[key].filter((r) => JSON.stringify(before.get(r.id)) !== JSON.stringify(r));
    const nextIds = new Set(next[key].map((r) => r.id));
    const remove = prev[key].filter((r) => !nextIds.has(r.id)).map((r) => r.id);
    if (upsert.length || remove.length) changes[key] = { upsert, remove };
  }
  return changes as Changes;
}

interface Ctx {
  data: Data;
  ready: boolean;
  session: AppUser | null;
  isAdmin: boolean;
  update: (fn: (d: Data) => Data) => void;
  login: (u: string, p: string, role: Role) => Promise<string | null>;
  logout: () => Promise<void>;
  logAccess: (qid: string, action: AccessLog["action"]) => void;
}
const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Data>(empty);
  const dataRef = useRef<Data>(empty);
  const [session, setSession] = useState<AppUser | null>(null);
  const [ready, setReady] = useState(false);
  // Saves run one after another; the data is reloaded from the server once all have finished.
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const pending = useRef(0);

  const show = useCallback((d: Data) => {
    dataRef.current = d;
    setData(d);
  }, []);
  const reload = useCallback(async () => show(await loadData()), [show]);

  useEffect(() => {
    getSession()
      .then(async (user) => {
        setSession(user);
        if (user) await reload();
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, [reload]);

  const update = (fn: (d: Data) => Data) => {
    const prev = dataRef.current;
    const next = fn(prev);
    show(next);
    const changes = diff(prev, next);
    if (!Object.keys(changes).length) return;
    pending.current++;
    queue.current = queue.current
      .then(() => saveChanges({ data: changes }))
      .catch((e: unknown) => alert(e instanceof Error ? e.message : "Could not save the changes."))
      .finally(() => {
        if (--pending.current === 0) reload().catch(() => {});
      });
  };

  const login = async (u: string, p: string, role: Role) => {
    try {
      await signIn({ data: { username: u, password: p, role } });
      const user = await getSession();
      setSession(user);
      await reload();
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : "Could not sign in";
    }
  };
  const logout = async () => {
    await signOut();
    setSession(null);
    show(empty);
  };
  const logAccess = (qid: string, action: AccessLog["action"]) => {
    logAccessFn({ data: { quotationId: qid, action } })
      .then((log) => show({ ...dataRef.current, logs: [log, ...dataRef.current.logs] }))
      .catch(() => {});
  };

  return (
    <StoreCtx.Provider
      value={{
        data,
        ready,
        session,
        isAdmin: session?.role === "Admin",
        update,
        login,
        logout,
        logAccess,
      }}
    >
      {children}
    </StoreCtx.Provider>
  );
}

export const useStore = () => {
  const c = useContext(StoreCtx);
  if (!c) throw new Error("StoreProvider missing");
  return c;
};

export function nextQuotationNumber(d: Data, companyId: string) {
  const c = d.companies.find((x) => x.id === companyId);
  if (!c) return "";
  const n = d.quotations.filter((q) => q.companyId === companyId).length + 1;
  return `${c.code}-${String(n).padStart(4, "0")}`;
}

export const canDelete = (role: Role | undefined) => role === "Admin";
export const canEdit = (role: Role | undefined) => role === "Admin";
