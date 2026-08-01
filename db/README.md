# Drizzle schema (buildable)

Maps the `Home Expense` spec (../CONTEXT.md + ../docs/adr) to Postgres tables.
Schema of record: `../src/db/schema.ts` (this file documents how to build it).

## Layout
- `schema.ts` — all tables, enums, indexes, FKs. Tenant isolation is structural:
  every household-scoped table carries `householdId` (denormalized onto children
  like `subcategories` / `transaction_lines`), so a missing WHERE can never leak
  across households.

## Make it runnable
1. Add deps to the Next.js app: `drizzle-orm`, `drizzle-kit`, `pg`.
2. Create `drizzle.config.ts`:
   ```ts
   import { defineConfig } from 'drizzle-kit';
   export default defineConfig({
     schema: '../src/db/schema.ts',
     out: './db/migrations',
     dialect: 'postgresql',
     dbCredentials: { url: process.env.DATABASE_URL! },
   });
   ```
3. Generate + apply migration:
   ```sh
   npx drizzle-kit generate   # emits SQL into db/migrations
   npx drizzle-kit migrate    # applies to the dedicated Postgres 17
   ```
4. Wire a client (app/db.ts):
   ```ts
   import { drizzle } from 'drizzle-orm/node-postgres';
   import { Pool } from 'pg';
   export const db = drizzle(new Pool({ connectionString: process.env.DATABASE_URL }));
   ```

## Notes / invariants the app must enforce
- **Every query** filters by `householdId`. Never omit it.
- **argon2id** for `users.passwordHash`. Store the session id *hashed* in
  `sessions.id`; send only the plaintext in an HTTP-only Secure cookie.
- **subcategoryId required-when-exist**: if the chosen category has
  subcategories, the line must set one. App-layer rule (FK guarantees it belongs
  to that category). A "General" subcategory is the escape hatch.
- **Receipt remainder**: sum(transactionLines.amount) should equal
  `transactions.receiptTotal`; the gap is closed with `lineType` =
  tax | discount | deposit lines.
- **Soft delete**: ignore rows where `deletedAt IS NOT NULL`.
