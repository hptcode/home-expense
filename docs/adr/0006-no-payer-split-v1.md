# No payer/split tracking in v1 (household-level totals)

In a shared household, money has a payer and possibly a split — enabling "who owes whom" balances.

We explicitly **defer** payer/split tracking for v1 and ship **household-level totals only**. Rationale: it drastically simplifies the schema (no `paid_by`, no `transaction_splits`, no per-member balance rollup) and still delivers the core reporting value. The multi-user design is preserved; the social "settle up" feature is a known, additive enhancement (a `transaction_splits` table can be added later without disturbing existing rows).

This is a deliberate v1 scope cut, not an architectural dead-end — the decision is recorded so a future "add splits" request is an addition, not a rebuild.
