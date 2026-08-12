---
name: IRS Statement implementation
description: handlePrintIRSStatement structure, mileage deduction, and key implementation notes
---

## handlePrintIRSStatement uses string concatenation
NOT template literals — avoids TSX parser confusion with HTML angle brackets.
Opens a new window, writes the HTML, then calls print() after 400ms delay.

## Section structure (in order)
1. Gross Income table: gEarn + gTips + gExt + gOther (conditional) + gToll → gTotal
2. Business Expenses (Schedule C Part II): bizExpenses by category
3. IRS Standard Mileage Deduction (Schedule C Part II Line 9): milesTotal × IRS_RATE_PER_MILE
   - milesTotal = hoursLog.reduce((a,h) => a + (h.miles||0), 0) — miles stored per shift since this build
   - mileageSection shown conditionally (when milesTotal > 0); otherwise shows "no GPS miles recorded yet" note
4. Net Taxable Income: gTotal - expensesAll - mileageDeduction
5. Hours & Activity Log: hrsTotal, milesTotal, shifts, trips, avg $/hr

## IRS rate
`IRS_RATE_PER_MILE = 0.70` — 2025 official rate. Statement includes advisory: "verify at irs.gov for current year".

## Miles tracking (HoursEntry)
`HoursEntry.miles?: number` added — populated from `shiftMiles` at END SHIFT (handleClockOut).
Historical shifts before this build will have `miles: undefined` → treated as 0 via `||0`.

## Key formulas
- `gTotal = gEarn + gTips + gExt + gOther + gToll` (gross before fee; note: grandTotal subtracts fee, gTotal does not)
- `netAfterExp = gTotal - expensesAll`
- `netAfterMileage = netAfterExp - mileageDeduction` → shown as "NET PROFIT / LOSS"

## Important warning shown in statement
"Use standard mileage rate OR actual vehicle expenses — not both."

**Why:** Previous version showed gross/expenses/net but omitted the mileage deduction — the primary reason drivers need this report for Schedule C.
