# Leads QRS — Quotation Retrieval System

Keeps every quotation sent to clients across the group companies, with clients, projects, BDMs,
staff and the quotation PDFs, and logs who viewed, previewed or downloaded each quotation.

## Stack

| Layer     | Technology                                                                    |
| --------- | ----------------------------------------------------------------------------- |
| Framework | TanStack Start — React 19 with server-side rendering and **server functions** |
| UI        | TypeScript, Tailwind CSS v4, shadcn/ui (Radix), lucide icons                  |
| Data (UI) | TanStack Query (caching), TanStack Router (file-based routes)                 |
| Database  | Microsoft SQL Server via the `mssql` driver                                   |
| Auth      | Own login: scrypt-hashed passwords + HTTP-only session cookie                 |
| Build     | Vite 8; Nitro packages the production build as a standalone Node.js server    |

## How it works

Frontend and backend live in **one project and run as one Node.js process** — there is no
separate API server:

```
Browser (React pages)                         Node.js server
─────────────────────                         ──────────────────────────────────────────
src/routes/*.tsx  ── calls ──►  src/lib/*.functions.ts  ──►  src/server/*.server.ts ──► SQL Server
src/components/*                (server functions: run on      (DB pool, passwords,
                                 the server; the browser gets   sessions, files — never
                                 only a tiny fetch stub)        sent to the browser)
```

- **Accounts:** on an empty database the sign-in page asks for the first account, which becomes
  an **Admin**. Admins add more accounts in **Manage Users** (role Admin or User). Passwords are
  stored hashed and are never sent to the browser; leave the password blank when editing a user
  to keep the current one.
- **Access rules:** Users are view only. All changes go through `saveChanges`, which requires an
  Admin and applies them in one transaction; every view/preview/download is written to
  `dbo.access_logs`.
- **How saving works:** the pages keep using `useStore()` (`src/lib/store.tsx`). Its `update()`
  compares the data before and after a change and sends only the added, changed and removed rows
  to the server, then reloads the data.
- **Quotation PDFs** are stored in `dbo.files` and served to signed-in users by `/api/files/...`.
- **E-mail alerts** for the daily access threshold are still not sent (no mail server configured).
- **Database setup is automatic:** on the first request the server connects to `DATABASE_URL`,
  creates the database if it does not exist and applies `database/schema.sql` (idempotent, safe
  on every start). An empty database is filled with the companies, clients, projects, BDMs, staff list, sample quotations and mail setting from the original system (no user accounts).

## Files

| File                          | Purpose                                                                                                                                                                          |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `database/schema.sql`         | SQL Server tables (users, sessions, files, companies, clients, projects, bdms, preparers, quotations, attachments, access_logs, mail_settings); applied automatically at startup |
| `src/server/db.server.ts`     | Parses `DATABASE_URL`, connection pool, creates the database and applies the schema                                                                                              |
| `src/server/auth.server.ts`   | Create / read / destroy login sessions (cookie + `dbo.sessions`)                                                                                                                 |
| `src/server/crypto.server.ts` | Password hashing (scrypt) and session tokens                                                                                                                                     |
| `src/server/rows.server.ts`   | Query helpers (JSON results, insert/update/delete rows)                                                                                                                          |
| `src/lib/auth-middleware.ts`  | `requireAuth` / `requireAdmin` guards for server functions                                                                                                                       |
| `src/lib/qrs.functions.ts`    | Sign-in, first-admin setup, loading data, saving changes, access log                                                                                                             |
| `src/lib/store.tsx`           | useStore(): the data, update(), login/logout used by every page                                                                                                                  |
| `src/server/files.server.ts`  | Store / read uploaded files (dbo.files)                                                                                                                                          |
| `src/routes/api/files/$.ts`   | `/api/files/...` — streams an uploaded file to a signed-in user                                                                                                                  |
| `src/routes/*`                | Pages (file-based routes); `src/routeTree.gen.ts` is generated — do not edit                                                                                                     |
| `src/start.ts, src/server.ts` | Request middleware (errors, CSRF protection) and server entry                                                                                                                    |

## Configuration (`.env`)

Copy `.env.example` to `.env` and fill it in.

| Variable                | Purpose                                                                                                                    |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`          | `sqlserver://HOST[\INSTANCE][:PORT];database=new_leads_qrs;user=...;password=...;encrypt=true;trustServerCertificate=true` |
| `SESSION_COOKIE_SECURE` | `true` when the site is served over HTTPS                                                                                  |
| `PORT` (optional)       | Port to listen on (default 3000)                                                                                           |

The SQL login needs `CREATE DATABASE` permission the first time (`sa` has it) unless you create
the database yourself.

## Run locally

Requires Node.js 22 or newer and a reachable SQL Server.

```sh
npm install        # once, or after package.json changes
npm run dev        # http://localhost:3000, reloads on code changes
```

## Build and host

```sh
npm run build      # creates .output/ (the complete server)
npm start          # runs .output/server/index.mjs with .env, on PORT (default 3000)
```

To deploy, copy **`.output/`, `.env` and `package.json`** to the server (it needs Node.js but not
`node_modules` or the source) and run `npm start`. Keep it running with pm2
(`pm2 start npm --name leads-qrs -- start`) or as a Windows service (e.g. NSSM), and put IIS
(URL Rewrite + ARR) or nginx in front for HTTPS; then set `SESSION_COOKIE_SECURE=true`.

## Other scripts

| Command          | What it does                       |
| ---------------- | ---------------------------------- |
| `npm test`       | Unit tests (Vitest)                |
| `npm run lint`   | Check code with ESLint             |
| `npm run format` | Auto-format all code with Prettier |
