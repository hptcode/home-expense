# Budgets support period (monthly/yearly) and kind (limit/goal)

The original budgets table had a single `monthly_limit` column per category. This was too rigid for real-world use:

1. **Yearly expenses** (car insurance, property tax, memberships) are paid as a lump sum once a year. A monthly budget falsely shows "over budget" in the payment month. A yearly budget absorbs the lump: it compares YTD spend against the yearly limit and shows a derived "≈ $X/mo" accrual hint.

2. **Savings goals** are measured against net cash flow (income − expense), not against a category's spend. They have no category and use inverted color logic (under = bad, met = green).

Changes to the `budgets` table (migration 0006):
- `period`: `'monthly' | 'yearly'`
- `kind`: `'limit' | 'goal'`
- `category_id` made nullable (goals have none)
- `amount` replaces `monthly_limit` (the limit/goal figure for the period)

The Budgets page offers month selector, View Budgets modal (with print), and sorts limits before goals.
