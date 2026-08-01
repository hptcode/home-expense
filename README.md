# Home Expense - app spec & buildable slice

Living spec for a self-hosted, multi-tenant (household-scoped) home-expense web app.

## Structure
- CONTEXT.md - glossary (source of truth for terms)
- docs/adr/ - 10 architecture decisions (ADR-0001 through ADR-0010)
- db/ - validated Drizzle schema (schema.ts) plus build instructions (README.md)
- src/ - a real, type-checking Next.js (App Router) slice:
  - src/db/ - Drizzle client plus schema barrel
  - src/lib/ - ids (token/sha256), password (argon2id), session (DB sessions), email (stub)
  - src/auth/current-user.ts - tenant-scoped auth context resolver
  - src/app/api/auth/{signup,login,logout} and api/health - route handlers

## Verified
- db/schema.ts generates valid Postgres DDL via drizzle-kit generate (exit 0)
- src/lib/password.ts argon2id hash/verify executed with native argon2 (m=19456,t=2,p=1)
- src/lib/ids.ts Web Crypto token plus SHA-256 executed (stable, input-sensitive)

## Run
cp .env.example .env.local
# then set DATABASE_URL
npm install
npm run db:generate
npm run db:migrate
npm run typecheck
npm run dev
