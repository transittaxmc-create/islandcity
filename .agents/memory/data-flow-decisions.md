---
name: NYC vendors and data flow decisions
description: Key architectural decisions for the expense system and Finance data flow
---

**NYC_DEFAULT_VENDORS constant:** Defined at module level (outside App component) — a curated list of ~40 common NYC rideshare driver vendors. `allVendors = [...NYC_DEFAULT_VENDORS, ...customVendors.filter(v=>!NYC_DEFAULT_VENDORS.includes(v))]` — custom vendors deduplicated against defaults.

**Odometer (shiftMiles):** Accumulated from GPS watchPosition deltas. Uses `prevGpsRef` (useRef) to track last coordinate — avoids stale closure issue. Noise filters: accuracy < 80m AND 10m < jump < 1.5km. Persisted to `ic-shift-miles` in localStorage alongside other `ic-shift-*` keys. Reset to 0 on clock-in. IRS rate constant `IRS_RATE_PER_MILE = 0.70` (2025). Display card in Dashboard shows mi + IRS deduction. The module-level `haversineKm` at line ~248 is used; the local duplicate inside DashboardContent was removed.

**goal ($/hr slider):** Now persisted to `ic-hourly-goal` via lazy useState initializer + useEffect. Default 60.

**Finance vs Reports data source discrepancy (intentional):**
- Finance page uses `trips` (all — pending + posted) for weekly bar chart, platform breakdown, and projections
- Reports/Ledger uses `postedTrips` only for the financial summary and IRS statement
- This is BY DESIGN: Finance = operational planning (real-time), Reports = audited financials (finalized only)
- Added "pending + posted trips" label to the Finance Week chart footer to communicate this distinction

**expPeriodFiltered useMemo:** Computed BEFORE ExpensesContent (the JSX const) so the period-aware header can use it. The filter logic runs in a useMemo with [expenses, expPeriod, currentTime] deps. The IIFE inside ExpensesContent uses expPeriodFiltered directly instead of recomputing.

**Cash Flow only shows monthly+dueDate expenses as "upcoming payments":** Weekly/daily recurring expenses are shown as a "RECURRING DRAIN" summary card ($/day and $/month equivalent). The distinction is intentional: fixed payment alerts need a due date; ongoing drains are shown as a rate.

**Finance Page 3 (Financial Health):** Shows recurring expense breakdown only when `expenses.some(e => e.frequency && e.frequency !== 'none')`. Bank adjustment history (`bankAdjHistory[]`) is displayed here — it was stored but never shown before.
