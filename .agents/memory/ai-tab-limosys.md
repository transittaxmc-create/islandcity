---
name: AI Assistant tab and LimoSys Evaluator
description: New "AI" tab with analytics, simulation slider, LimoSys job evaluator, and draggable overlay
---

# AI Assistant Tab + LimoSys Evaluator

## What was built
- New `"AI"` value added to `Tab` type (line 6 of App.tsx)
- `Brain` icon from lucide-react added to nav
- 6th nav tab: key `"AI"`, color `#4ade80`
- `AIAssistantContent` JSX variable defined before the `// ─── Render` section

## State variables added (near broadcast state)
- `aiPeriod`: "day" | "week" | "month"
- `aiSimPercent`: 0–50 slider value
- `limoOverlayOn`: boolean ON/OFF for draggable overlay
- `limoMinHourly` / `limoMinPerMile`: persisted to `ic-limo-min-hr` / `ic-limo-min-mi` localStorage keys
- `limoCapturing`, `limoResult` (single `LimoOffer`), `limoError`
- `limoOverlayPos`: { x, y } for drag position
- `limoInputRef`, `limoDragRef` refs

## Computed metrics
- `aiMetrics` useMemo: filters trips/expenses/hoursLog by period; computes gross, costs, net, margin, hours, miles, earningsPerMile, costPerMile, earningsPerHour, costPerHour + simulated versions

## Backend
- `artifacts/api-server/src/routes/limosys-eval.ts` — POST /api/limosys-eval
- Takes: imageBase64, mimeType, minHourly, minPerMile
- Returns: `{ offers: LimoOffer[] }` — already handles multiple offers per screenshot
- Frontend only shows `offers[0]` — Task #53 tracks showing all offers with swipe

## Draggable overlay
- Fixed position, pointer-event dragging via `onLimoDragStart/Move/End`
- High contrast: black bg, FFFF00 text, 00FF00 / FF0000 borders + glow
- 2-line format: Row1 = decision | price | $/hr | pickup time; Row2 = origin ➔ destination
- Appears automatically after successful LimoSys eval

**Why:** Drivers need instant high-contrast decision in sunlight without reading full details
**How to apply:** Any change to LimoOffer shape must update both the backend route and the frontend LimoOffer interface near the broadcast state block
