---
name: Contrast audit baseline
description: Border color upgrade decisions for the global contrast audit (Part 2)
---

## Upgrades applied (global replace_all)
- `border-[#1e1e1e]` → `border-[#2e2e2e]` (interactive cards/inputs/buttons)
- `border-[#222]` → `border-[#2e2e2e]` (same)
- `border-[#141414]` → `border-[#1e1e1e]` (slightly less dark, but still muted)

## Intentionally kept dark (decorative separators)
- `border-[#1a1a1a]` — thin section dividers; upgrading these would make structure too visible
- `border-[#252525]` — used in new EntryFormContent as section separators
- `bg-[#...]` colors — not touched; only `border-[...]` classes were upgraded

## Color palette rules (enforced)
- Gold `#facc15` = brand / selected state / positive value indicators
- Green `#4ade80` = GPS / pickup / income
- Blue `#60a5fa` = ACCESS-A-RIDE / dropoff
- Red = alert / negative only
- Numbers/values = always white or gold, never gray

**Why:** Minimum contrast for interactive element borders was too low (#1e1e1e on #080808 background = nearly invisible). Target minimum is #2e2e2e.
