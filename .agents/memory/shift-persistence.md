---
name: Shift state persistence
description: How shift clock state is persisted across iOS Safari reloads
---

Shift state variables (shiftActive, clockInTime, totalBreakMs, isOnBreak, breakStart) are all initialized from localStorage with lazy useState initializers.

**Keys used:** `ic-shift-date`, `ic-shift-active`, `ic-shift-clock-in`, `ic-shift-break-ms`, `ic-shift-on-break`, `ic-shift-break-start`

**Why:** iOS Safari kills JS state on tab switch / screen lock / incoming calls. Without persistence, activeHoursDecimal goes to 0 → perHourGross = 0 → gauge shows "—" with invisible needle.

**How to apply:** 
- All 5 state variables have lazy initializers reading from localStorage
- A single useEffect with all 5 as dependencies writes all keys on every change
- Date guard: if `ic-shift-date` ≠ today's YYYY-MM-DD, all shift state returns to defaults (stale shift from previous day is discarded)
- perHourGross has fallback: if no shift hours, estimates from first→last trip timestamp of today; single trip gets 15-min estimate

**CLEAN_SLATE_VERSION = "2026-08-11-v6"** — do NOT bump; triggers destructive wipe.
