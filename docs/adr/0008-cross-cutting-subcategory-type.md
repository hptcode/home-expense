# Cross-cutting subcategory type (IMPLEMENTED THEN REMOVED)

This ADR originally described adding a controlled-vocabulary `type` field to Subcategories (Insurance, Subscription, Tax, Business, Recurring, One-off) for cross-category reporting rollups. The `type` column was created in migration 0000 and dropped in migration 0002 (see `0002_drop_type_columns.sql`).

The `subcategory_type` enum and `subcategories.type` column are no longer present in the schema. Reporting now groups subcategories by their `name` (string match) rather than by a `type` enum. The `direction` column (income/expense) on both Categories and Subcategories is the only "type" concept used.

The `line_type` column on `transaction_lines` (item/tax/discount/deposit) was also dropped in the same migration. Transaction lines are plain categorized amounts without a line-type flag.

**Status:** Historical record — the feature was built, deployed, then removed as unnecessary complexity.
