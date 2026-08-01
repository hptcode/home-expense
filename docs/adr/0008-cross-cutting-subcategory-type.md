# Cross-cutting subcategory type as a second reporting axis

A Subcategory is a structural placement ("where does this spend belong?"), but real reporting also needs to group by *theme* that spans Categories — e.g. "Insurance" appears under Housing, Car, AND Travel, and the user wants total Insurance across all of them. The pure hierarchy cannot answer that, because each "Insurance" is a separate subcategory row under a different parent.

We add a **`type`** to each Subcategory, taken from a controlled vocabulary (Insurance, Subscription, Tax, Business, Recurring, One-off, …), set **once** at subcategory creation. Reporting can then group by subcategory `type` across all Categories. The type is inherited automatically by every Transaction under the subcategory, so no per-transaction tagging is needed and there is no fragmentation risk.

Rejected: (B) free transaction tags — would require manually tagging every insurance transaction and risks "Insurance"/"insurance" splits; (C) both axes — more build than v1 needs. The controlled vocabulary is the key: it prevents the cross-cutting report from fragmenting on spelling/naming variants.
