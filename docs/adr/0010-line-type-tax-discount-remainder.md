# line_type flags resolve the receipt remainder (tax/discount/deposit)

When a receipt is itemized, the sum of the entered lines usually does not equal the receipt total — because of tax, deposits/fees, discounts, or skipped lines. We must decide what becomes of that gap.

We resolve the remainder into explicit **Transaction Lines** carrying a `line_type` flag, values: `item | tax | discount | deposit`. The UI shows "items sum $X, receipt $Y, unallocated $Z" and offers one-tap "Add as Tax" (or Discount/Deposit), creating a final line that absorbs the gap so the header total always reconciles to the sum of its lines. `line_type` is **orthogonal to `category`**: a tax line still has a category (a dedicated "Tax" category, or a "... → Tax" subcategory), so reporting attributes tax correctly rather than dumping it into the last item's category. Discounts are negative lines.

Rejected: leaving the remainder as a visible-but-unresolved value — it would make category reports not sum to the receipt total, undermining the reporting the app exists to provide. The `line_type` enum (not free-form) keeps the remainder machine-meaningful for rollups.
