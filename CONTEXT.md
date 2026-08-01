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

**Transaction**:
The unit of entry scoped to a Household. It is a **header** (merchant, date, `direction` = income | expense, optional `receipt_total` in integer minor units, `deleted_at` for soft delete) plus one or more **Transaction Lines** that carry the categorized amounts. A plain single-category expense is simply a Transaction with one line. The header `receipt_total` may exceed the sum of its lines; the gap is resolved into Tax/Discount/Deposit lines (see Transaction Line), so the categorized lines always reconcile to the receipt.
_Avoid_: entry, record, line item.

**Transaction Line**:
A single amount within a Transaction, scoped to a Household via the parent header. Carries an amount in integer minor units, a `category_id`, an optional `subcategory_id` (required-when-exist, inherited `subcategory type`), and a `line_type` flag (`item | tax | discount | deposit`). `line_type` is orthogonal to `category` — a tax line still has a category (e.g. a "Tax" category or a "... → Tax" subcategory). Reporting rolls up at the **line** level by category/subcategory/type. A Transaction must have at least one line; the sum of its lines equals the header total once the unallocated remainder is captured as Tax/Discount/Deposit lines.
_Avoid_: split (that term is reserved for deferred member-allocation), subtotal.

**Category**:
The primary per-Household reporting axis. A label that groups Transactions (e.g. Housing, Car, Travel). Seeded with defaults on Household creation; Owner-managed (add/rename/archive). Budgets are set at this level.
_Avoid_: tag, type (those belong to Subcategory).

**Subcategory**:
An optional second-level child of a Category, owned by the same Household (fixed depth: Category → Subcategory → none deeper). When a Category has subcategories, every Transaction under it MUST select one; a user-created "General" subcategory is the standard escape hatch for entries that don't warrant a finer split. Reports roll up by Category and drill down to Subcategory.
_Avoid_: tag, third-level nesting.

**Subcategory Type**:
A controlled-vocabulary value (Insurance, Subscription, Tax, Business, Recurring, One-off, …) optionally set once when a Subcategory is created. An orthogonal reporting axis: reporting can group all subcategories of the same type across different Categories (e.g. total Insurance across Housing/Car/Travel). Set on the Subcategory, so it is inherited automatically by every Transaction under it — no per-transaction tagging.
_Avoid_: free-text tag, per-transaction type.

**Recurring Rule**:
A schedule (frequency + anchor date) that auto-materializes Transactions on a cadence (e.g. monthly rent, weekly salary). Materialized by an internal cron endpoint.
_Avoid_: subscription, bill.

**Budget**:
An Owner-set monthly spend `limit` per Category, used for budget-vs-actual reporting. Opt-in per category; unbounded until set.
_Avoid_: limit, cap.

**Session**:
A server-side auth record (random ID, hashed, stored in `sessions`) linking a logged-in User to an HTTP-only Secure cookie. Revocation = row delete.
_Avoid_: token, JWT.

**Invite**:
An email-based request, sent by an Owner to a specific address, to join the Household. Only the invited account may accept.
_Avoid_: code, join link.
