-- site_admin column removed from schema; admin auth now uses HMAC-signed cookie (env-based).
-- Migration kept as a no-op so the journal stays contiguous for `db:migrate`.
SELECT 1 AS placeholder;
