-- v0001: add site_admin flag to users (cross-tenant operator).
-- Idempotent: safe to run even if the column already exists.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'site_admin'
  ) THEN
    ALTER TABLE "users" ADD COLUMN "site_admin" boolean DEFAULT false NOT NULL;
  END IF;
END $$;
