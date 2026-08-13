---
name: Auto-mileage tracking per trip
description: Per-trip GPS mileage via watchPosition — separate from the shift odometer
---

## Architecture — two independent watchPosition instances

The app runs TWO separate GPS watches simultaneously during an active trip:
1. **Shift odometer** (`watchIdRef` + `prevGpsRef`) — runs from START to END SHIFT, accumulates into `shiftMiles` → saved in `HoursEntry.miles` → used for IRS Statement mileage deduction
2. **Trip tracker** (`tripWatchIdRef` + `tripPrevGpsRef` + `tripMilesRef`) — starts when driver taps ▶ START TRACKING, stops on ⏹ STOP & SAVE or handleSave — saves into `Trip.miles`

They do NOT share state or interfere.

## Key state/refs added
- `tripWatchIdRef: useRef<number|null>(null)` — watchPosition ID
- `tripPrevGpsRef: useRef<{lat,lng}|null>(null)` — previous GPS point
- `tripMilesRef: useRef<number>(0)` — mutable accumulator (avoids stale closures in callbacks)
- `[tripTracking, setTripTracking]` — boolean state for UI
- `[tripMilesDisplay, setTripMilesDisplay]` — display state (updated on each GPS tick)
- `TripForm.tripMiles: string` — editable field populated by tracker or manual entry
- `Trip.miles?: number` — persisted per-trip mileage

## GPS noise filter (mirrors shift GPS)
- Accept only positions with accuracy < 80m
- Min movement: 0.01km (10m) — ignores GPS drift while stationary
- Max movement: 1.5km per update — teleport/signal-loss filter
- Uses same `haversineKm()` function as shift odometer and toll detection

## UI in Daily Entry form
- Section: "TRIP MILEAGE" — between LOCATION CATEGORY grid and ADDITIONAL INCOME
- ▶ START TRACKING button → ⏹ STOP & SAVE button with pulsing green dot
- Live miles display (gold when > 0, green when tracking)
- ✏️ manual override button uses `window.prompt()` — no extra input state needed
- Hint text changes based on tracking state

## Data flow
- `startTripTracking()` resets accumulators, starts watch → updates `tripMilesDisplay` on each tick
- `stopTripTracking(saveToForm=true)` clears watch, populates `tripForm.tripMiles`
- `handleSave`: reads `parseFloat(tripForm.tripMiles)||0`, saves as `Trip.miles`; also force-stops any active watch before calling `resetForm()`
- `resetForm()`: explicitly clears tripWatchIdRef, tripPrevGpsRef, tripMilesRef, resets state — prevents stale watch running after form reset
- `handleEditToEntry`: populates `tripMiles: trip.miles ? String(trip.miles) : ""`

## Display
- Register card: `🛣 X.XX mi` in gold in the details row when `t.miles > 0`
- Ledger card: same display
- Toast on save: `Trip saved ✓ $X.XX · Y.YY mi` when miles > 0

## IRS Statement — no double-counting
- IRS Statement continues to use `hoursLog` shift-level miles (more comprehensive — includes driving between trips)
- Per-trip miles on `Trip.miles` are additive information, not summed in the IRS deduction
- Future: could offer a "use trip miles" toggle in settings if shift GPS is not used

**Why:** Per-trip miles give drivers route-level granularity for auditing. Shift miles remain the IRS deduction source because they capture ALL driving while on the clock (including pickup drive, repositioning).
