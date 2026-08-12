---
name: NYC vendors and data flow decisions
description: Key architectural decisions for the expense system and Finance data flow
---

**NYC_DEFAULT_VENDORS constant:** Defined at module level (outside App component) — a curated list of ~40 common NYC rideshare driver vendors. `allVendors = [...NYC_DEFAULT_VENDORS, ...customVendors.filter(v=>!NYC_DEFAULT_VENDORS.includes(v))]` — custom vendors deduplicated against defaults.

**Finance vs Reports data source discrepancy (intentional):**
- Finance page uses `trips` (all — pending + posted) for weekly bar chart, platform breakdown, and projections
- Reports/Ledger uses `postedTrips` only for the financial summary and IRS statement
- This is BY DESIGN: Finance = operational planning (real-time), Reports = audited financials (finalized only)
- Added "pending + posted trips" label to the Finance Week chart footer to communicate this distinction

**expPeriodFiltered useMemo:** Computed BEFORE ExpensesContent (the JSX const) so the period-aware header can use it. The filter logic runs in a useMemo with [expenses, expPeriod, currentTime] deps. The IIFE inside ExpensesContent uses expPeriodFiltered directly instead of recomputing.

**Cash Flow only shows monthly+dueDate expenses as "upcoming payments":** Weekly/daily recurring expenses are shown as a "RECURRING DRAIN" summary card ($/day and $/month equivalent). The distinction is intentional: fixed payment alerts need a due date; ongoing drains are shown as a rate.

**Finance Page 3 (Financial Health):** Shows recurring expense breakdown only when `expenses.some(e => e.frequency && e.frequency !== 'none')`. Bank adjustment history (`bankAdjHistory[]`) is displayed here — it was stored but never shown before.
