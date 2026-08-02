# Home Expense — self-hosted household expense tracker

A multi-tenant (household-scoped), self-hosted web app for tracking household
income/expenses, managing categories + subcategories, inviting members, and
reporting on cash flow. Built on Next.js (App Router) + Drizzle + Postgres 17,
deployed on Coolify.

> Design glossary (domain terms) lives in `CONTEXT.md`. Architecture decisions
> live in `docs/adr/` (ADR-0001 through ADR-0010). This file is the **current build
> & product/UX source of truth** — keep it in sync with what the app actually does.

## Structure
- `CONTEXT.md` — glossary (source of truth for domain terms)
- `docs/adr/` — 10 architecture decisions (ADR-0001 through ADR-0010)
- `db/` — Drizzle schema (`schema.ts`) plus `drizzle/` SQL migrations (`0000_init.sql`, `0001_site_admin.sql`)
- `src/` — the full Next.js (App Router) app:
  - `src/db/` — Drizzle client + schema barrel
  - `src/lib/` — ids (token/sha256), password (argon2id), session (DB sessions), email (stub), transaction-lines validator, invites, seed
  - `src/auth/current-user.ts` — tenant-scoped auth context resolver
  - `src/auth/site-admin.ts` — `SITE_ADMIN_SECRET`-gated operator context
  - `src/components/` — `SiteHeader` (pathname-aware), `AuthGate`, `LogoutButton`
  - `src/app/` — pages + route handlers (see below)
- `Dockerfile` — Debian-slim, standalone build (skips next type-check/lint — see Build notes)
- `.env.example` — env template

## Pages (UI)
| Route | Name | Notes |
|-------|------|-------|
| `/login`, `/signup`, `/invite` | Auth | Minimal header (no nav). Login shows **only** the login button. |
| `/` | Home | Redirects to `/dashboard` when logged in; otherwise shows login links. |
| `/transactions` | Add New Expense | Multi-line-item entry form; shows only the just-entered transaction for 20s (no full list). |
| `/dashboard` | Dashboard | Renamed from "Reports". Default landing page after login. |
| `/all-expenses` | All Expenses | Line-level view; defaults to the **current month** (PDT). Year/month auto-apply (no Apply button). |
| `/manage` | Manage | Owner-only: categories + subcategories + member invites. |
| `/admin` | Admin | Site-admin only (gated by `SITE_ADMIN_SECRET`). |

## API (route handlers)
- `GET/POST /api/auth/me`, `POST /api/auth/{signup,login,logout}`
- `GET/POST/DELETE /api/categories` — GET returns categories **with nested subcategories**
- `POST/DELETE /api/subcategories`
- `GET/POST /api/transactions`, `GET/PATCH/DELETE /api/transactions/[id]`
- `GET /api/expenses` — line-level rows (`?year=&month=`)
- `GET /api/reports` — dashboard aggregates (`?from=&to=`)
- `GET/POST /api/invites`, `POST /api/invites/accept`
- `GET /api/admin/households`, `GET /api/admin/users`
- `GET /api/health`

## Dashboard (reports) behavior
- **Monthly Total** stat + **Transactions** + **Categories Used** counts for the selected month.
- **Monthly Breakdown by Category** — colored bars; bar length = relative amount.
- **Yearly Trend** — 12 distinct-colored bars (one per month); bar length = relative amount
  vs the max month; **honors the selected Year** dropdown.
- **Yearly Spending by Category** — distinct color per category; length = relative amount.
- **Spending by Expense Type** — a table that groups subcategories **by name across categories**
  (e.g. every "Insurance" subcategory, under any parent category, rolls up into one "Insurance" row),
  sorted by amount. This is the cross-cutting rollup the `subcategory.type` field used to provide.
- **Hover tooltip** on every bar shows `Label: $amount`.
- **Year/Month selectors auto-apply** — changing either immediately refetches. There is no
  "Apply" button. (All Expenses month/year selectors auto-apply too.)

## Add New Expense behavior
- Header-level fields: Type (expense/income), Merchant, Date (defaults to today in
  `America/Los_Angeles` / PDT-PST), Description.
- **Multiple line items**: each line has its own Category + Subcategory + Amount. "+ Add another
  line" / per-line Remove. The **Line Type** field is gone — the Category + Subcategory identity
  is sufficient (e.g. a "Tax" subcategory, not a Tax line type).
- On save: the form resets and **only the just-entered transaction is shown for 20 seconds**,
  then it clears. (Browse/edit older entries via **All Expenses**.) Edit/Delete work on the
  just-added row within that 20s window.

## Manage behavior
- Owner adds **Categories** (appear instantly) and **Subcategories** (pick a category, then
  add). Categories carry nested subcategories in the `GET /api/categories` payload.
- Owner sends member **Invites** by email (link shown; email is stubbed until `EMAIL_API_KEY`).

## Auth & multi-tenancy
- Self-hosted: email + **argon2id** (native `@node-argon2`), DB-backed HTTP-only Secure
  cookie sessions (`he_session`). No Clerk/Auth0.
- Tenant boundary = **Household**; every household-scoped query is scoped by `household_id`.
- **Core auth is decoupled from the optional `site_admin` column** so the `site_admin`
  migration can never block login. `site_admin` is read best-effort.
- Login/signup are hardened: explicit column selects + real error surfaced (no silent 500).
- Unauthenticated visits to content pages redirect to `/login` (`AuthGate`).
- The header is pathname-aware: auth pages (`/login`, `/signup`, `/invite`) show only the
  brand; content pages show the nav + Logout (never a "Log in" button).

## Build & deployment (Coolify)
1. GitHub repo `hptcode/home-expense` to Coolify app (Nixpacks, port 3000, internal port 3000).
2. Dedicated **Postgres 17** Coolify resource on the same project/network; copy its Internal
   Connection URL to `DATABASE_URL`.
3. Set env vars (below). Deploy.
4. **Post-deploy (required once):** open the Coolify terminal and run `npm run db:migrate`
   (applies `0001_site_admin.sql` — idempotent, safe to re-run).
5. Set `SITE_ADMIN_SECRET` + `APP_BASE_URL`; restart.

### Env vars
```
DATABASE_URL=postgres://user:pass@host:5432/db   # from Coolify Postgres
APP_BASE_URL=https://expense.patrickho.ca
SITE_ADMIN_SECRET=<random-secret>                 # gates /admin
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0
EMAIL_API_KEY=                                    # optional; invites email when set (stub logs link otherwise)
SMTP_HOST= SMTP_PORT= SMTP_USER= SMTP_PASS=       # optional, for invite emails
```
The session cookie is `secure: true` — **serve over HTTPS** or the cookie is rejected and login bounces.

### Build notes (learned the hard way)
- The Docker build sets `NEXT_PRIVATE_SKIP_TYPE_CHECK=1` + `NEXT_PRIVATE_SKIP_LINT=1`
  because a full `tsc` worker OOMs on Oracle ARM during `next build`. The **local**
  `next build` remains the quality gate (run it before pushing).
- `next.config.mjs` uses `output: 'standalone'`, but the Dockerfile **copies the full
  `node_modules`** because standalone tracing omits argon2's native `.node` binary.
- The repo must contain a `public/` directory or the standalone COPY fails.

## Verified
- `db/schema.ts` generates valid Postgres DDL via `drizzle-kit generate` (exit 0).
- `src/lib/password.ts` argon2id hash/verify executed with native argon2 (m=19456, t=2, p=1).
- `src/lib/ids.ts` Web Crypto token + SHA-256 executed (stable, input-sensitive).
- Full `next build` passes (21 routes, exit 0) as the local gate.

## Known gaps (not yet built)
- **Budgets UI**: the Dashboard budget-vs-actual logic exists, but there is **no UI to set a
  budget per category** — so budget bars are empty until that screen is added.
- **Recurring transactions**: schema + internal cron contract exist; not yet materialized.
- **Email invites**: stubbed (logs the accept link) until `EMAIL_API_KEY`/SMTP is configured.
- **`subcategory.type` column**: intentionally retired. Expense-type rollups now group by
  subcategory **name** (set consistently, e.g. "Insurance"), which is more intuitive than a
  separate enum. The DB column remains but is no longer used by the UI.
- **Password reset**: not yet implemented (recreate account only if the email is unused).

## Run locally
```
cp .env.example .env.local   # set DATABASE_URL (+ others)
npm install
npm run db:migrate
npm run dev                   # or: npm run build && npm start
npm run typecheck
```
