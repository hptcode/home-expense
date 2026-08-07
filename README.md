# Home Expense — self-hosted household expense tracker

A multi-tenant (household-scoped), self-hosted web app for tracking household
income/expenses, managing categories + subcategories, inviting members, setting
budgets, and reporting on cash flow. Built on Next.js (App Router) + Drizzle +
Postgres 17, deployed on Coolify.

> Design glossary (domain terms) lives in `CONTEXT.md`. Architecture decisions
> live in `docs/adr/` (ADR-0001 through ADR-0014). This file is the **current
> product/UX source of truth** — keep it in sync with what the app actually does.

## Structure
- `CONTEXT.md` — glossary (source of truth for domain terms)
- `docs/adr/` — architecture decisions (ADR-0001 through ADR-0014)
- `db/` — Drizzle schema (`schema.ts`) plus `drizzle/` SQL migrations
- `src/` — the full Next.js (App Router) app:
  - `src/db/` — Drizzle client + schema barrel
  - `src/lib/` — ids (token/sha256), password (argon2id), session (DB sessions),
    email (Resend API), transaction-lines validator, invites, seed, admin-auth
  - `src/auth/current-user.ts` — tenant-scoped auth context resolver
  - `src/components/` — `SiteHeader` (pathname-aware), `AuthGate`
  - `src/app/` — pages + route handlers (see below)
- `Dockerfile` — Debian-slim, standalone build (skips next type-check/lint — see Build notes)
- `.env.example` — env template

## Pages (UI)
| Route | Name | Notes |
|-------|------|-------|
| `/login`, `/signup`, `/invite` | Auth | Minimal header (no nav). Login shows **only** the login button. |
| `/` | Home | Redirects to `/transactions` when logged in; otherwise shows login links. |
| `/transactions` | Add New Expense | Authenticated landing page; multi-line-item entry form; merchant autocomplete from past merchants; ad-hoc + buttons beside Category and Subcategory; shows only the just-entered transaction for 20s. | Multi-line-item entry form; merchant autocomplete from past merchants; shows only the just-entered transaction for 20s. |
| `/dashboard` | Dashboard | Default landing page after login. Budget status widget, monthly/yearly breakdowns by category, subcategory, and merchant; income sections; CSV export. |
| `/all-expenses` | All Expenses | Line-level view with category + subcategory filters; defaults to current month. Each row has Edit + Delete. Totals are net (refunds subtract). |
| `/budgets` | Budgets | Per-category limits (monthly/yearly) and savings goals. Month selector, progress bars, View Budgets modal with print. |
| `/manage` | Manage | Owner-only: categories + subcategories + member invites + household members + change password + recurring transactions. |
| `/admin` | Admin | Site-admin only (gated by `SITE_ADMIN_SECRET`). Household/user management, audit log. |

## API (route handlers)
- `GET/POST /api/auth/me`, `POST /api/auth/{signup,login,logout}`, `POST /api/auth/{forgot-password,reset-password}`, `POST /api/auth/change-password`
- `GET /api/auth/admin-login`, `POST /api/auth/admin-logout`
- `GET/POST/DELETE /api/categories` — GET returns categories with nested subcategories
- `PUT /api/categories` — rename category
- `POST/DELETE /api/subcategories`, `PUT /api/subcategories` — rename
- `GET/POST /api/transactions`, `GET/PATCH/DELETE /api/transactions/[id]`
- `GET /api/expenses` — line-level rows (`?year=&month=`)
- `GET /api/reports` — dashboard aggregates (`?from=&to=`)
- `GET/POST /api/invites`, `POST /api/invites/accept`
- `GET/POST/DELETE /api/recurring-rules`
- `GET /api/cron/materialize-recurring?secret=CRON_SECRET`
- `GET /api/merchants` — distinct merchant names for autocomplete
- `GET/POST/DELETE /api/budgets`
- `GET /api/manage/members`, `DELETE /api/manage/members/[id]`
- `GET /api/admin/households`, `GET /api/admin/users`
- `POST /api/admin/households/[id]/{deactivate,activate,delete}`
- `PATCH /api/household-settings` — owner-only Household Timezone
- `GET /api/health`

## Navigation and landing behavior
- The authenticated home page is `/transactions` (Add Expense). Successful login also redirects to `/transactions`.
- Navigation uses compact text-only buttons with equal widths. The current page is highlighted, including relevant subroutes.
- Username and household name appear beside the Home Expense brand.

## Dashboard (reports) behavior
- **Stats row**: Net Monthly Total, Transactions count, Categories Used count for the selected month/year.
- **Budget Status widget**: shows all budgets (limits sorted first, goals sorted last) with progress bars
  and over/behind warnings. Links to `/budgets`.
- All charts derive each line's +/− from the **subcategory direction** (falling back to its category,
  then the transaction header). A Refund subcategory is always a deduction no matter which
  transaction it was entered in, so numbers are fully consistent.
- Every bar chart label carries a **direction sign**: ▼ = net spend, ▲ = net income/credit.
- **{Month} Breakdown by Category** — net per category (expenses minus refunds/credits).
- **{Month} Breakdown by Subcategory** — colored bars grouping subcategories by name across categories
  (same 12-color palette + hover tooltips).
- **{Month} Breakdown by Merchant** — net per merchant; unknown merchants grouped as `-`.
- **{Year} Breakdown by Category** — distinct color per category; length = relative amount.
- **{Year} Breakdown by Subcategory** — same name-grouping across all 12 months.
- **{Year} Breakdown by Merchant** — merchant groupings across the whole year.
- **{Month} Income by Category** + **{Year} Income by Category** — income-only charts.
- **{Year} Trend** — 12 bars (one per month), honors the selected year dropdown.
- **Hover tooltip** on every bar shows `Label: $amount`.
- **CSV Export**: month/year totals (first 4 lines), then sections for month category, month subcategory,
  year category, year subcategory, month income, year income — each with a heading line followed by
  line items.
- **Year/Month selectors auto-apply** — no "Apply" button. All auto-refetch.

## Add New Expense behavior
- Header fields: Type (expense/income), **Merchant** (autocomplete from past merchants via `<datalist>`),
  Date (defaults to today in PDT), Description.
- **Multiple line items**: each line has Category + optional Subcategory + Amount.
  "+ Add another line" / per-line Remove.
- **Refund subcategories** (income-direction under an expense category) show as credits in the expense section.
- On save: form resets, an **Entry added** panel appears listing every line item entered;
  auto-clears after 10 seconds. Click **Edit** there or on any All Expenses row to
  open this page pre-filled.

## All Expenses behavior
- Defaults to current month (PDT). Year/month selectors auto-apply.
- **Category filter** + **Subcategory filter** dropdowns — selecting a category resets the subcategory filter;
  subcategories shown are scoped to the selected category.
- **Expenses section** groups by **category direction** (not effective line direction). Refund/discount
  subcategories under expense categories appear in the expense section as credits (`+$`).
- **Income section** shows income-category items.
- **Net totals**: Total Expenses sums expense-category items where refunds/credits subtract,
  Total Income sums income-category items.
- Each row has **Edit** (opens Add Expense pre-filled) + **Delete**.

## Manage behavior
- Owner-only page (members see a read-only note). Shows email local part + household name in nav.
- **Categories** dropdown defaults to "Select a category". Subcategories hidden until a category is chosen.
- **Inline category rename**: when a category is selected, its name appears in an editable text field.
  Changes save on blur or Enter. The input updates when a new category is selected.
- **Category direction** (expense/income): shown next to each category as ▲ income / ▼ expense.
- **Subcategory inline rename**: editable name field, saves on blur or Enter. Same direction tags.
- **Subcategory name appears before direction tag** in the list.
- **Delete category**: soft delete (transactions stay, category hidden). Re-adding the same name
  un-deletes the original rather than creating a duplicate.
- **New Category** field always visible at bottom.
- **New Subcategory** field + direction selector visible when a category is selected.
- **View All Categories modal**: shows full hierarchy tree with Print support.
- **Household Members** section: lists all users in the household (email + role).
  Owner can **Remove** any member (except themselves) — hard-deletes the user so the email can be reused.
- **Send Invite**: enter email → generates a link. When `EMAIL_API_KEY` is set, sends via Resend;
  otherwise shows the link.
- **Pending Invites** list: shows sent invites with expiry dates.
- **Change Password** section: current + new password fields with eye toggles to verify typing.
  `autoComplete="new-password"` prevents browser autofill.
- **Household Timezone** selector: owner chooses an IANA timezone; used for new transaction dates, reporting defaults, and recurring calculations. Defaults to `America/Los_Angeles`.
- **Recurring Transactions** section: add rules with category, subcategory, frequency, amount,
  merchant, start date (year/month/day selects), optional end date. First transaction is
  materialized immediately on creation. Monthly/yearly rules advance by calendar units. Rules listed with Delete button.
- Every add/rename/delete flashes a **change line** briefly.
- API: `PUT /api/categories` + `PUT /api/subcategories` for rename; deletes are soft.

## Budgets behavior
- Owner-only: create budgets with `period` (monthly/yearly) and `kind` (limit/goal).
- **Limit**: category spend cap. Yearly limits show YTD spend with a "≈ $X/mo" accrual hint.
- **Goal**: no category — measures net household cash flow against a savings target.
  Progress bar fills green when on track.
- **Month selector** compares spend vs budget for any past or future month.
- **View Budgets modal**: all budgets in a compact list, printable.
- Goals sorted after limits in the API response.
- Budget Status widget on Dashboard shows the riskiest budgets.

## Recurring transactions
- Schema + CRUD API (`/api/recurring-rules`) for creating rules with category, subcategory,
  frequency, amount, merchant, start/end dates.
- **Immediate first materialization**: when a rule is created and the start date is today or earlier,
  a transaction is created right away.
- **Cron endpoint**: `GET /api/cron/materialize-recurring?secret=CRON_SECRET` checks for due rules,
  creates transactions, and advances anchor dates. Set up as a daily cron job in Coolify.
- The Manage page has an Add Rule form and a list of existing rules with Delete.

## Auth & multi-tenancy
- Self-hosted: email + **argon2id** (native `@node-argon2`), DB-backed HTTP-only Secure cookie sessions.
- Session cookie: `he_session`. Admin cookie: `he_admin` (env-based `SITE_ADMIN_SECRET`, 24h expiry).
- `getAuthContext` checks session cookie first, falls back to admin cookie — so household users always
  get their real role even if they also have an admin cookie.
- Tenant boundary = **Household**; every query scoped by `household_id`.
- **Invite-based signup**: signing up via invite creates the user directly in the inviter's household
  (no throwaway household) and redirects to `/dashboard`. Existing users accepting an invite are
  moved to the inviter's household (old household becomes ownerless).

## Build & deployment (Coolify)
1. GitHub repo `hptcode/home-expense` to Coolify app (Nixpacks, port 3000, internal port 3000).
2. Dedicated **Postgres 17** Coolify resource on the same project/network; copy its Internal
   Connection URL to `DATABASE_URL`.
3. Set env vars (below). Deploy.
4. **Post-deploy (required once):** run migrations — see **[Post-deploy: run migrations](#post-deploy-run-migrations)** below.
5. Set `SITE_ADMIN_SECRET` + `APP_BASE_URL` + `EMAIL_API_KEY`; restart.

### Env vars
```
DATABASE_URL=postgres://user:***@host:5432/db   # from Coolify Postgres
APP_BASE_URL=https://expense.patrickho.ca
SITE_ADMIN_SECRET=<random-secret>                 # gates /admin
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0
EMAIL_API_KEY=re_*****                            # Resend API key for invite emails (stub logs link when unset)
CRON_SECRET=<random-secret>                       # secures the recurring-materialize cron endpoint
```
The session cookie is `secure: true` — **serve over HTTPS** or the cookie is rejected and login bounces.

### Post-deploy: run migrations
Migrations live in `drizzle/` and are applied with `drizzle-kit migrate` (`npm run db:migrate`).
They are **idempotent** — safe to re-run.

**Which terminal:** the **app** container (the `home-expense` Node.js service, port 3000), **not** the
Postgres database container. The app container is on the same private `coolify` Docker network as
Postgres, so it can reach the `DATABASE_URL` Internal Connection URL.

> The Docker image copies `drizzle.config.ts` + `drizzle/` into `/app`, so the container terminal
> has everything `db:migrate` needs.

**Steps:**
1. In Coolify, open the **app resource** terminal (starts in `/app`).
2. Run:
   ```bash
   npm run db:migrate
   ```
3. Expect drizzle-kit to print the applied migration tags. Re-running is a no-op.

**Fallback** if `npm run db:migrate` skips: run SQL directly via the bundled `pg` client:
```bash
node -e "const {Client}=require('pg');const fs=require('fs');const sql=fs.readFileSync('/app/drizzle/0002_drop_type_columns.sql','utf8');(async()=>{const c=new Client({connectionString:process.env.DATABASE_URL});await c.connect();await c.query(sql);console.log('DONE');await c.end()})().catch(e=>{console.error(e.message);process.exit(1)})"
```

### Build notes
- Docker skips `NEXT_PRIVATE_SKIP_TYPE_CHECK=1` + lint to avoid OOM on Oracle ARM. **Local**
  `next build` remains the quality gate (run before every push).
- `next.config.mjs` uses `output: 'standalone'`; the Dockerfile copies the full `node_modules`
  because standalone tracing omits argon2's native `.node` binary.
- The repo must contain `public/` or the standalone COPY fails.

## Verified
- Full `next build` passes (exit 0) as the local gate.
- argon2id hash/verify with native argon2.
- Web Crypto token + SHA-256 executed.

## Known gaps (not yet built)
- **Email delivery pending**: Resend API is wired, but domain `expense.patrickho.ca` needs
  TXT verification in Resend before emails actually send.
- **Password reset**: available from Login; reset emails use Resend when `EMAIL_API_KEY` is configured, with single-use one-hour tokens.
- **`subcategory_type` + `line_type` columns**: dropped via migration `0002` (idempotent).

## Run locally
```
cp .env.example .env.local   # set DATABASE_URL
npm install
npm run db:migrate
npm run dev                   # or: npm run build && npm start
npm run typecheck
```