# Itemized transaction lines (receipts spanning multiple categories) — core V1 model

A receipt often contains items belonging to different categories (groceries + a lamp + a prescription). If a Transaction were limited to a single category with a single amount, the user would have to divide the receipt total by hand into separate transactions — error-prone and high-friction.

Therefore the Transaction is, from the start, a **header + lines** structure. A Transaction header holds merchant/date/`direction`/optional `receipt_total`/soft-delete; it owns one or more **Transaction Lines**, each with its own amount, `category_id`, and optional `subcategory_id`. The user transcribes item prices straight off the receipt and assigns each a category — **no division required**. Reporting rolls up at the line level. A plain single-category expense is simply a Transaction with one line, so the single-category case is fully supported as a degenerate form.

Considered: (B) bucket allocation with auto-fill — rejected because it forces the total to be partitioned and loses item-level detail/auditability; (C) OCR-first — deferred as a layer on top (we already run NIM/Honcho on Coolify). This ADR is the data model; OCR is an optional future extraction path onto these same lines.

Notably this is orthogonal to the Q14-deferred member-split feature (who-owes-whom). Different problem; that deferral stands.
