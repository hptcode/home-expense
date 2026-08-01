# Cash-flow transaction model, single currency per household, integer minor units

Reporting is a core requirement, and household reporting is near-useless without income.

Every money event is a **Transaction** with a `direction` (income | expense), enabling net-position and surplus/deficit reporting — not just spend breakdowns. Each Household declares **one base currency**; amounts are stored as **integer minor units** (cents) to avoid float rounding bugs and make aggregation trivial. Multi-currency and FX conversion were explicitly rejected for v1 (YAGNI; the `currency` dimension can be added later without disturbing existing rows).

This rejects expenses-only (no net position) and a multi-currency-without-conversion approach (hard parts without the payoff).
