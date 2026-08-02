-- v0001: add site_admin flag to users (cross-tenant operator).
ALTER TABLE "users" ADD COLUMN "site_admin" boolean DEFAULT false NOT NULL;
