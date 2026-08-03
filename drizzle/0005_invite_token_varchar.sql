-- invites.token is an opaque random token (hex), not a UUID. Fix the column type.
ALTER TABLE public.invites ALTER COLUMN "token" TYPE varchar(64) USING "token"::varchar(64);
