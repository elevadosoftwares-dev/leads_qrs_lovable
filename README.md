# Leads QRS — Quotation Retrieval System

Store, preview and track quotations across the Leads group companies, with clients, projects,
BDMs, staff and PDF documents kept together, and a record of who viewed, previewed or downloaded
each quotation.

## Stack

| Layer     | Technology                                                                    |
| --------- | ----------------------------------------------------------------------------- |
| Framework | TanStack Start — React 19 with server-side rendering and **server functions** |
| UI        | TypeScript, Tailwind CSS v4, lucide icons                                     |
| Data (UI) | TanStack Query (caching), TanStack Router (file-based routes)                 |
| Database  | Microsoft SQL Server via the `mssql` driver                                   |
| Auth      | Own login: scrypt-hashed passwords + HTTP-only session cookie                 |
| Build     | Vite 8; Nitro packages the production build as a standalone Node.js server    |

## How it works

Frontend and backend live in **one project and run as one Node.js process**:

```
Browser (React pages)                         Node.js server
─────────────────────                         ──────────────────────────────────────────
src/routes/*.tsx  ── calls ──►  src/lib/*.functions.ts  ──►  src/server/*.server.ts ──► SQL Server
src/components/*                (server functions: run on      (DB pool, password hashing,
                                 the server; the browser gets   sessions — never sent
                                 only a tiny fetch stub)        to the browser)
```

- **Login:** choose Admin or User, then user name and password. `signIn` checks the password
  hash, stores a random token's SHA-256 in `dbo.sessions`, and sets it in an HTTP-only cookie
  (`qrs_session`, 30 days, renewed on use).
- **Access rules:** Admins can add, edit and delete everything and manage the master lists;
  Users are view only. Enforced on the server by `requireAuth` / `requireAdmin`
  (`src/lib/auth-middleware.ts`). At least one Admin always remains.
- **Documents** (PDF, max 5 MB each) are stored in SQL Server and served by
  `GET /api/attachments/:id` to signed-in users only (`?download=1` to save the file).
- **Access history:** opening a quotation, previewing a PDF and downloading a PDF are each logged
  in `dbo.access_logs`; the dashboard and Quotation Summary show the counts.
- **Database setup is automatic:** on the first request the server connects to `DATABASE_URL`,
  creates the database if it does not exist, and applies `database/schema.sql` (idempotent).
  The sign-in page then asks you to create the first Admin account.

## Files

| File                                | Purpose                                                           |
| ----------------------------------- | ----------------------------------------------------------------- |
| `database/schema.sql`               | SQL Server tables; applied automatically at startup               |
| `src/server/db.server.ts`           | Parses `DATABASE_URL`, connection pool, creates DB + schema       |
| `src/server/crypto.server.ts`       | Password hashing (scrypt), session tokens                         |
| `src/server/auth.server.ts`         | Create / read / destroy login sessions                            |
| `src/server/crud.server.ts`         | Save / delete helpers for the master tables                       |
| `src/lib/auth-middleware.ts`        | `requireAuth` / `requireAdmin` guards for server functions        |
| `src/lib/auth.functions.ts`         | Sign in/out, current session, first-Admin setup                   |
| `src/lib/users.functions.ts`        | Manage Users                                                      |
| `src/lib/masters.functions.ts`      | Companies, clients, projects, BDMs, staff, mail settings          |
| `src/lib/quotations.functions.ts`   | Quotations, PDF uploads, status, access logging                   |
| `src/lib/quotation-rules.ts`        | Shared rules: client search, quotation number, daily access count |
| `src/routes/api/attachments/$id.ts` | Preview / download a PDF                                          |
| `src/lib/queries.ts`                | React Query hooks used by the pages                               |
| `src/routes/`                       | Pages; everything under `_authenticated/` requires sign-in        |

## Configuration (`.env`)

| Variable                | Purpose                                                                                                           |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`          | `sqlserver://HOST[\INSTANCE][:PORT];database=NAME;user=...;password=...;encrypt=true;trustServerCertificate=true` |
| `SESSION_COOKIE_SECURE` | `true` when the site is served over HTTPS                                                                         |
| `PORT` (optional)       | Port to listen on (default 3000)                                                                                  |

Copy `.env.example` to `.env` and fill it in. The SQL login needs `CREATE DATABASE`
permission the first time if the database does not exist yet (`sa` has it).

## Run locally

Requires Node.js 20.12 or newer.

```sh
npm install        # once, or after package.json changes
npm run dev        # http://localhost:3000, reloads on code changes
```

## Build and host

```sh
npm run build      # creates .output/ (the complete server)
npm start          # runs .output/server/index.mjs with .env, on PORT (default 3000)
```

To deploy, copy **`.output/`, `.env` and `package.json`** to the server (it needs Node.js but
not `node_modules` or the source) and run `npm start` there. Keep it running with pm2 or as a
Windows service (e.g. NSSM), and put IIS (URL Rewrite + ARR) or nginx in front for HTTPS;
then set `SESSION_COOKIE_SECURE=true`.

## Other scripts

| Command          | What it does                       |
| ---------------- | ---------------------------------- |
| `npm test`       | Run the unit tests (Vitest)        |
| `npm run lint`   | Check code with ESLint             |
| `npm run format` | Auto-format all code with Prettier |
