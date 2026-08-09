# HomeXpensify — self-hosted household expense tracker

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
| `/transactions` | Add Entries | Authenticated landing page. Two mode buttons: **Add Transaction** (multi-line-item entry with merchant autocomplete, ad-hoc + for category/subcategory) and **Add Recurring** (recurring rule form with category, subcategory, + buttons, frequency, amount, merchant, description, start/end dates, edit/delete existing rules). |
| `/dashboard` | Dashboard | Today's date in household timezone. Budget Status (monthly limits, yearly limits with YTD pace indicator, savings goals). Year Trend (expense vs income side-by-side). Category breakdowns as pie + bar charts. Subcategory and merchant bar charts. CSV export with signed amounts (expenses negative, income positive). |
| `/all-expenses` | All Entries | Line-level view with category + subcategory filters; defaults to current month. Each row has Edit + Delete. Totals are net (refunds subtract). |
| `/budgets` | Budgets | Per-category limits (monthly/yearly) and savings goals. Month selector, progress bars, View Budgets modal with print. |
| `/manage` | Manage | Owner-only: categories + subcategories + member invites + household members + change password + household timezone. Recurring transactions moved to Add Entries page. |
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
- `GET/POST/PUT/DELETE /api/recurring-rules`
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
- Username and household name appear beside the **HomeXpensify** brand (🏠 icon). Brand links to `/transactions`.

## Dashboard (reports) behavior
- **Stats row**: {Month} Savings (income − expenses), Transactions count, Categories Used count.
- **Budget Status widget**: shows all budgets in order: monthly limits, yearly limits, savings goals.
  - Yearly budgets show YTD spend vs yearly limit with a **pace marker** (vertical line at the pro-rated
    percentage) and a status line: "YTD through {month} · {n}/12 months · pace {x}% · on track ✓ / above pace ⚠".
  - Bar colors: green (on track), amber (above pace / >80%), red (over limit / behind goal).
  - Links to `/budgets`.
- Chart order: Budget Status → Year Trend → Monthly Category → Monthly Subcategory → Yearly Category →
  Yearly Subcategory → Monthly Merchant → Yearly Merchant.
- All charts derive each line's +/− from the **subcategory direction** (falling back to category, then transaction).
- **Expense charts only**: monthly/yearly category, subcategory, and merchant charts exclude income categories.
  Income amounts are not included in expense chart totals.
- **Category charts** (monthly + yearly): shown as **pie + bar** side by side. Pie shows category proportion;
  bar shows amounts with distinct colors. Legend shows category, amount, and percentage.
- **Subcategory + Merchant charts**: bar-only with distinct colors. Only positive (expense) amounts shown.
- **{Year} Trend**: side-by-side expense (green) and income (blue) bars per month for comparison.
- **Hover tooltip** on every bar shows `Label: $amount`.
- **CSV Export**: signed amounts (expenses negative, income positive). Sections: month/year totals,
  month category, month subcategory, year category, year subcategory.
- **Year/Month selectors auto-apply** — no "Apply" button. All auto-refetch.

## Add Entries behavior
Two mode buttons at the top: **Add Transaction** and **Add Recurring**.

### Add Transaction
- Title: "Add New Expense/Income".
- Header fields: Type (expense/income), **Merchant** (autocomplete from past merchants via `<datalist>`),
  Date (defaults to today in household timezone), Description.
- **Multiple line items**: each line has Category + optional Subcategory + Amount.
  "+ Add another line" / per-line Remove.
- **Ad-hoc + buttons** beside Category and Subcategory dropdowns to create new ones inline.
- **Refund subcategories** (income-direction under an expense category) show as credits in the expense section.
- On save: form resets, an **Entry added** panel appears listing every line item entered;
  auto-clears after 10 seconds. Click **Edit** there or on any All Entries row to open this page pre-filled.

### Add Recurring
- Title: "Add Recurring" / "Edit Recurring".
- Fields: Category (with +), Subcategory (with +), Frequency (daily/weekly/bi-weekly/monthly/yearly),
  Amount, Merchant, Description, Start date, End date.
- **Current recurring expenses** list: shows merchant, amount, frequency, end date, description,
  with Edit and Delete buttons. Two-line layout per rule.
- **Add** button (not "Add Rule").
- First transaction is materialized immediately on creation when start date is today or earlier.
  Backfill creates all missed occurrences from the start date through today.
- Monthly/yearly rules advance by calendar units, not fixed day counts.
- Editing an existing rule: loads all fields into the form. Deleting the rule being edited clears the form.

## All Entries behavior
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
- Every add/rename/delete flashes a **change line** briefly.
- API: `PUT /api/categories` + `PUT /api/subcategories` for rename; deletes are soft.

## Budgets behavior
- Owner-only: create budgets with `period` (monthly/yearly) and `kind` (limit/goal).
- **Limit**: category spend cap. Yearly limits show YTD spend with pace indicator.
- **Goal**: no category — measures net household cash flow against a savings target.
  Progress bar fills green when on track.
- **Month selector** compares spend vs budget for any past or future month.
- **View Budgets modal**: all budgets in a compact list, printable.
- Goals sorted after limits.
- Dashboard Budget Status shows: monthly limits → yearly limits (with YTD pace) → savings goals.

## Recurring transactions
- Managed from the **Add Entries → Add Recurring** tab (not Manage page).
- CRUD API (`/api/recurring-rules`) with GET (list), POST (create), PUT (edit), DELETE (soft-delete).
- Frequency options: daily, weekly, bi-weekly, monthly, yearly.
- **Description** field (stored as `note` column; auto-created via `ALTER TABLE IF NOT EXISTS` on first API call).
- **Immediate first materialization**: when a rule is created and the start date is today or earlier,
  a transaction is created right away. Backfill creates all missed occurrences from start date through today.
- **Cron endpoint**: `GET /api/cron/materialize-recurring?secret=CRON_SECRET` checks for due rules,
  creates transactions, and advances anchor dates. Set up as a daily cron job in Coolify.
- Monthly/yearly rules advance by calendar units (not fixed 30/365 day counts).

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
- **Password reset**: available from Login → Forgot Password; reset emails use Resend when `EMAIL_API_KEY` is configured, with single-use one-hour tokens.
- **`subcategory_type` + `line_type` columns**: dropped via migration `0002` (idempotent).

## Run locally
```
cp .env.example .env.local   # set DATABASE_URL
npm install
npm run db:migrate
npm run dev                   # or: npm run build && npm start
npm run typecheck
```