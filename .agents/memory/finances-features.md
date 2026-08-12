---
name: Finances tab features and architecture
description: Key decisions for the 4-page Finances section, weekly overrides, and Projections inline form
---

## Finances tab structure (4 horizontal-scroll pages)
0. **This Week** — bar chart + WEEKLY INCOME PLAN editor
1. **Projections** — 14-day cash flow (bank balance, projected expenses inline, recurring drain, upcoming payments, daily balance chart, timeline, annual outlook)
2. **Platforms** — per-platform earnings table
3. **Financial Health** — monthly summary, recurring expense breakdown, balance adj history

## Weekly Income Plan — Current Week vs Recurring Pattern

**Three-layer priority for projecting any given week:**
1. `weekOverrides[wStr]` — individual week exception (highest priority)
2. `recurringPlan` — if `enabled=true` AND `wStr > _finWeekStart` AND `wStr <= untilDate` → use plan's snapshot of workDays/dayTargets
3. `workDays` / `dayTargets` — current week's settings (fallback / default)

**`recurringPlan` state** (persisted to `ic-recurring-plan`):
- `{enabled, workDays, dayTargets, untilDate}` — a *snapshot* of the plan at the moment the user clicks "Save recurring pattern"
- Changing current workDays/dayTargets does NOT alter the snapshot (intentional — each arriving week the user edits the plan, affecting only that week)

**UI flow:**
- Checkbox "🔁 Repeat this weekly pattern until a date" at bottom of Finances → This Week page
- If unchecked: no plan, current week settings don't spread
- If checked: date picker appears, user picks end date, clicks "Save recurring pattern"
- Active plan shows green banner with Edit / Clear buttons
- UI state: `showRepeatIncomePicker` (boolean) + `repeatIncomeUntil` (string)

**Why:** User sets Lunes–Sábado once, picks "until Dec 31" → all future weeks auto-project correctly. Vacation week: user changes the plan that week (affects only that week), recurring plan stays untouched for subsequent weeks.

## Inline Projected Expense (Projections page)
- A "+ Add expense" card lives in Projections page 1, between Bank Balance and Recurring Drain
- Saves directly to the global `expenses` array via `syncSaveExpenses()` with chosen frequency (daily/weekly/monthly)
- Uses same `allVendors` and `allExpenseCategories` as the full Expenses tab
- Immediately feeds into `_recurWk` → cash flow computation (no page switch needed)
- State: `showProjExpForm` (boolean) + `projExpForm` ({name, amount, frequency, category, dueDate, repeatEnabled, repeatUntil})

## Expense endDate support
- `Expense.endDate?: string` — YYYY-MM-DD after which the expense is excluded from projections
- Set via the "🔁 Repeat until date" checkbox in the Projected Expense quick-add form
- `_recurWk` skips expenses where `endDate < _mwTodayStr`
- `_cfDays` uses `_recurPerDay(dateStr)` helper that filters by `endDate` per day (so an expense expiring mid-14-day window drops out correctly)
- `_cfPayments14` filters out payments whose `endDate < dueDate`

## Projections page colors (Part 4 changes)
- Bank Balance card: gold accent line at top (`border-[#d9b64f]/25`), label `text-[#f6dd8c]/60`
- Recurring Drain label: `text-orange-400/70` (matches the orange numbers below)
- Upcoming Payments label: `text-[#f6dd8c]/60`
- Daily Balance / Detailed Timeline / Annual Outlook labels: `text-[#f6dd8c]/60`
- Projected Expenses card: green accent line + `text-[#4ade80]/70` label

## Translation audit (completed Aug 2026)
All user-facing Spanish text translated to English:
- Expenses tab: header "Expenses", all form labels, all dropdowns, placeholder texts, toast
- Settings panel: "Settings", "Close", "Storage", "Trips saved", "Last saved", "Data Backup", "Download full backup", "Restore from .json file", "Danger Zone", "Reset all data"
- Remaining: internal JS variable names like `cumulative.hoy`/`.semana` are not user-visible
