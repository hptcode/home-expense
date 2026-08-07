# Home Expense App

A multi-tenant web app where households track income and expenses, invite members, and report on their cash flow. This document is the project glossary only — implementation details belong in code, not here.

## Language

**Household**:
The tenant boundary. A group of one or more Users who share a single set of transactions and a single base currency. All data access is scoped by `household_id`.
_Avoid_: family, account, workspace, team.

**User**:
A login identity (email + password) that belongs to exactly one Household. Before joining, a User may own their own single-member Household.
_Avoid_: account.

**Member**:
A User once they belong to a Household. The in-app term for a participant in a shared ledger.
_Avoid_: user (use Member inside household context).

**Owner**:
The Member who created the Household. Controls membership, categories, and budgets. The only role with admin powers.
_Avoid_: admin, superuser.

**Site Admin**:
A cross-tenant operator identified by presenting the correct `SITE_ADMIN_SECRET` env var. Logs in via a dedicated `/admin/login` page; gets a signed HMAC cookie (24h expiry). No DB column or special user record. Can view/delete any household or user, change roles, and browse audit logs.
_Avoid_: superadmin, platform admin.

**Transaction**:
The unit of entry scoped to a Household. It is a **header** (merchant, date, `direction` = income | expense, optional `receipt_total` in integer minor units, `deleted_at` for soft delete) plus one or more **Transaction Lines** that carry the categorized amounts. A plain single-category expense is simply a Transaction with one line. The header `receipt_total` may exceed the sum of its lines; the gap is resolved into Tax/Discount/Deposit lines (see Transaction Line), so the categorized lines always reconcile to the receipt.
_Avoid_: entry, record, line item.

**Transaction Line**:
A single amount within a Transaction, scoped to a Household via the parent header. Carries an amount in integer minor units, a `category_id`, and an optional `subcategory_id` (required-when-exist). The line's effective direction is determined by a priority chain: **subcategory direction → category direction → transaction direction**, so a "Refund" subcategory under "Shopping" is always a credit regardless of the transaction's header direction. Reporting rolls up at the **line** level by category/subcategory/merchant.
_Avoid_: split, subtotal.

**Category**:
The primary per-Household reporting axis. A label that groups Transactions (e.g. Dining, Groceries, Transport). Seeded with defaults on Household creation; Owner-managed (add/rename/archive/soft-delete). Budgets are set at this level. Re-adding a soft-deleted category un-deletes it rather than creating a duplicate. Each category has a `direction` (expense or income).
_Avoid_: tag.

**Subcategory**:
An optional second-level child of a Category. When a Category has subcategories, every Transaction under it MUST select one; a user-created "General" subcategory is the standard escape hatch. Each subcategory has a `direction` (expense or income) that determines the line's effective direction (takes priority over the category's direction). Reports roll up by Category and drill down to Subcategory.
_Avoid_: tag, third-level nesting.

**Recurring Rule**:
A schedule (frequency + start date, optional end date, category/subcategory, amount, and merchant) that auto-materializes Transactions on a cadence (e.g. monthly rent, weekly salary). The first occurrence is created immediately when the start date is today or earlier; later occurrences are materialized by an internal cron endpoint. Monthly and yearly schedules advance by calendar units, not fixed day counts.

**Budget**:
An Owner-set `limit` or `goal` per Category (or category-less for savings goals). Has a `period` of `monthly` or `yearly`. Monthly budgets compare spend in the selected month against the amount. Yearly budgets compare YTD spend through the selected month against the amount, showing a derived "≈ $/mo" accrual hint. Savings goals (`kind: goal`) compare net cash flow (income − expense) against a target, with inverted color logic (under = bad).

**Savings Goal**:
A Budget with `kind: 'goal'` and no `categoryId`. Measured against net household cash flow (income − expense) for the period. The progress bar fills green when on track, amber/red when behind.
_Avoid_: savings budget.

**Session**:
A server-side auth record (random ID, hashed, stored in `sessions`) linking a logged-in User to an HTTP-only Secure cookie. Revocation = row delete.
_Avoid_: token, JWT.

**Invite**:
An email-based request, sent by an Owner to a specific address, to join the Household. The invite link includes a random token. Signing up via invite creates the user directly in the inviter's Household (no throwaway household). Existing users accepting an invite are moved to the inviter's Household (their old Household becomes ownerless). The email is sent via Resend API when `EMAIL_API_KEY` is set.

**Household Timezone**:
The Owner-selected IANA timezone for the Household (for example, `America/Los_Angeles` or `Asia/Shanghai`). It determines new transaction-date defaults, report calendar boundaries, and recurring-rule calendar calculations. Existing stored transaction dates do not change when the setting changes.

**Merchant**:
The merchant name from a Transaction header. Reported in monthly and yearly "Breakdown by Merchant" charts. Unknown merchants are grouped as `-`. The Add Expense page suggests previously-used merchants via a HTML `<datalist>` fetched from `GET /api/merchants`.


---


## Where product/UX decisions live
Domain terms above are the glossary. **Current product behavior and UX decisions** (Add Expense as the authenticated landing page, compact active-highlighted text nav, Dashboard layout, household timezone setting, Budgets page with month selector and savings goals, Manage page with inline rename/member management/recurring rules, All Expenses with category/subcategory filters, admin panel, password reset, API-based email, etc.) are in the codebase and README.md. The ADR directory (`docs/adr/`) records architectural decisions.