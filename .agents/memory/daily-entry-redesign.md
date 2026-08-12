---
name: Daily Entry form redesign
description: Architecture decisions for the EntryFormContent redesign (DAILY ENTRY screen)
---

## Layout order (top → bottom)
1. HEADER: "DAILY ENTRY" title left + live `grandTotalLive` in gold 26px right (no box, textShadow glow)
2. DATE / TIME: compact row (flex-1 date + 108px time)
3. FARE TYPE: 3 quick-select chips using `topPlatforms` useMemo (top 3 from trip history, defaults Uber/Lyft/Gallant)
4. REVENUE SOURCE: 58px collapsed trigger → expands list grouped as RIDESHARE / VOUCHER / ACCESS-A-RIDE / OTHER; `showPlatformDropdown` boolean state
5. GROSS FARE: hero 72px field, $30px + number 42px, gold border when filled
6. ORIGIN: 54px field with green GPS button, border #444
7. DESTINATION: 54px field with blue GPS button, border #444
8. LOCATION CATEGORY: 5-col grid, selected gets `borderColor: "#facc15"` + faint gold bg
9. ADDITIONAL INCOME & DEDUCTIONS: 2×2 grid (Tips / Other Cash Income / Toll Reimb. / Platform Comm.)
10. REF + NOTE: compact rows, border #2e2e2e
11. POST TRANSACTION: 60px, gold when grandTotalLive > 0

## Type changes
- `Trip.otherCash: number` — backward compat: use `trip.otherCash ?? 0` everywhere
- `TripForm.otherCashIncome: string` — included in grandTotalLive and handleSave
- `"Throo"` added to platformMeta: `{ initial: "T", bg: "bg-[#e11d48]", tags: [] }`

## State additions
- `showPlatformDropdown: boolean` — controls expanded REVENUE SOURCE list
- `topPlatforms: string[]` — useMemo over trips[], top 3 platform names

## Grand total formula
`e + t + ex + oci + tl - f` (earnings + tips + extraCash + otherCashIncome + toll − platformFee)

**Why:** otherCashIncome was added as a new income category (cash jobs, bonus payments, etc.) that wasn't tracked before.

**How to apply:** Any display of trip total must include `trip.otherCash ?? 0` for backward compat with trips saved before this field existed.
