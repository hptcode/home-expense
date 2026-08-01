# Self-hosted auth with DB-backed server sessions

Authentication must be self-hosted (consistent with the Coolify deployment ethos) and must not hand-roll cryptography.

We use a self-hosted auth library (Lucia-class) with **email + argon2id** passwords, email-verify on signup, and email reset. Sessions are **database-backed**: a random session ID is stored hashed in a `sessions` table and set as an HTTP-only, Secure, SameSite cookie. Revocation is a row delete.

This rejects stateless JWT (no easy revocation, harder tenant-scoping guarantees, signing-key leak is game-over) and hand-rolled crypto (catastrophic bug surface). DB-backed sessions let us scope every request through `user_id` → `household_id` structurally, and give an audit trail of active sessions.
