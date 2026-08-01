# Dedicated Postgres 17, isolated from Coolify-system and Honcho

The app needs its own database, separate from any existing database on the host.

We provision a **dedicated Postgres 17** as its own Coolify database resource, in the same Project/Environment as the app, on the shared `coolify` network. It is explicitly NOT the Coolify system database and NOT Honcho's pgvector Postgres.

Rationale: blast-radius isolation (a bug or breach in this app must never reach Honcho's agent memory/state), independent backup/PITR cadence owned by this product, no extension/schema coupling with pgvector, and Coolify makes a same-network dedicated DB nearly free. Plain Postgres 17 (not 16/18, not pgvector, not Supabase) was chosen as the boring-and-supported sweet spot for a new long-lived product.
