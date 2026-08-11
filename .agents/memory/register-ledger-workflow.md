---
name: Register-Ledger workflow
description: How the pending→posted audit flow works, key fields, UI conventions.
---

## Data model
- `Trip.status: "pending" | "posted"` — all new trips start as `"pending"`.
- `Trip.reviewed: boolean` — set to `true` when posted.
- `Trip.postedAt?: string` — ISO timestamp set when posted.
- Migration in `useState` initializer spreads `{ status: "pending", reviewed: false, ...t }` so old localStorage entries get defaults.

## Key state
- `selectedForPost: Set<string>` — IDs checked for posting. Cleared after posting.

## Handlers
- `handlePostToLedger()` — maps selected trip IDs to `status: "posted"`, sets `postedAt`, clears selection, navigates to LEDGER tab.

## Register UI (pending trips)
- Trips grouped by `date` (newest first), day-level master checkbox + per-trip checkbox.
- Sticky totals bar at `top-[112px]` (below 68px header + ~44px tab bar): PENDING count · TODAY · TOTAL.
- Live total preview in inline edit form: `liveFare + tips + extra + toll − fee = $X.XX`.
- Floating "POST N TO LEDGER $X.XX →" button appears when `selectedForPost.size > 0`.

## Ledger UI (posted trips, read-only)
- Same day-grouping, green color scheme, `✓ POSTED` badge on each card.
- Sticky totals bar: POSTED TRIPS · LEDGER TOTAL.
- No edit/delete buttons — locked.

## Reports
- `grossAll` uses only `postedTrips` — pending excluded.
- Source note shown: "X posted (Ledger) · Y pending (Register, excluded)".

## Tab bar badges
- REGISTER shows pending count in gold; LEDGER shows posted count in green.

**Why:** User audits platform invoices against Register entries day by day; only verified/audited entries get posted to Ledger and reflected in Financial Statement. Prevents unverified data from appearing in tax-ready reports.
