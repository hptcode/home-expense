-- Add household-configured IANA timezone. Existing households remain PDT/PST-compatible.
ALTER TABLE households
  ADD COLUMN IF NOT EXISTS timezone varchar(64) NOT NULL DEFAULT 'America/Los_Angeles';
