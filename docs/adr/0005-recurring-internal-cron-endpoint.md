# Recurring transactions via internal CRON_SECRET endpoint + external scheduler

Households live on rhythms (rent, salary, subscriptions); manually re-entering them kills retention, and recurrence enables forecasting.

We model recurrence as a first-class **Recurring Rule** (frequency + anchor date) that auto-materializes Transactions. Materialization runs through an internal `POST /api/internal/recurring` endpoint guarded by a `CRON_SECRET`, triggered by an external scheduler (Coolify cron or host cron). The logic lives in the app codebase (shares ORM/transaction types); the schedule lives outside the process (survives app restarts); the secret keeps it unforgeable.

This rejects a separate worker container (extra deployable for v1's narrow need) and a host-level script (drift risk, outside Coolify lifecycle management).
