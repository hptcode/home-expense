# Site admin is env-based (SITE_ADMIN_SECRET + signed cookie), not a DB column

The original schema included a `site_admin` boolean column on the `users` table (migration 0001). This was never run on the live database because the migration was accidentally omitted from the journal.

Rather than retrofitting a migration, we switched to a stateless approach: a dedicated `/admin/login` page accepts a `SITE_ADMIN_SECRET` env var. On success, a signed HMAC-SHA256 cookie (`token.hmac`) is set with a 24-hour expiry. Every request verifies the cookie against the env secret — no DB reads, no schema changes.

The `site_admin` column was removed from the schema entirely. The old `auth/site-admin.ts` (which queried `WHERE users.site_admin = true`) was deleted.

Consequences:
- No migration needed to enable site admin.
- The admin panel (`/admin`) shows cross-tenant household/user listings, deactivate/activate/delete actions, user role management, and audit log viewer.
- The nav bar shows only the brand on admin pages (no household-scoped links).
