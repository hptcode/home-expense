# Two-level categories with required-when-exist subcategories

Reporting needs a Category axis (Q12) plus optional finer grouping. We add a fixed-depth **Category → Subcategory** hierarchy (no third level), and adopt **required-when-exist** semantics: when a Category has subcategories, every Transaction under it must pick one.

The escape hatch for "I don't know the finer split" is a plain user-created **"General"** subcategory — a normal subcategory, not special schema. This keeps entry discipline consistent (no coarse rows under a split category) while costing nothing extra.

Rejected: optional-always (A) — it lets coarse entries hide under an already-split category, fragmenting reporting. Deferred: arbitrary-depth trees (YAGNI for v1).
