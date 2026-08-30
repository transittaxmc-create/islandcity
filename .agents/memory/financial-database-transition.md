---
name: Financial database transition
description: Safety rules for moving expenses, hours, and goals from local browser storage to authenticated PostgreSQL.
---

PostgreSQL is authoritative for financial records that already have matching remote IDs, while localStorage remains an offline cache. Never bulk-upload legacy local-only history or infer a server deletion from cache retention, array trimming, or hydration.

**Why:** Historical local data migration was intentionally deferred to a separate, explicit phase. Automatic reconciliation could upload unreviewed history or permanently delete remote shift records when the local UI trims its list.

**How to apply:** New user mutations may write through to PostgreSQL. Only an explicit user delete may delete a remote expense or hours record. Treat legacy local-only entries as preserved cache data until a dedicated historical migration is approved.