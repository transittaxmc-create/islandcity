---
name: Dashboard features and decisions
description: Key decisions for the dashboard layout, gauge logic, and todayTrips filter
---

## Dashboard layout order (final)
1. Greeting header
2. Main shift card (START / BREAK / END SHIFT)
3. $/HR NOW gauge + goal ring + slider + mini stats + odometer + smart suggestion + location zones + E-ZPass
4. Financial Intelligence (monthly summary)
5. SHIFT BREAKDOWN (today's fare/tips/tolls breakdown + expenses + net)

## todayTrips filter — critical fix
**Rule:** Always filter by today's calendar date only. Never filter by shift start timestamp.

**Why:** The original filter excluded trips entered BEFORE pressing START (timestamp < clockInTime). This caused the gauge to show $0 and `—` even when trips were saved, because the driver entered a trip then pressed START, making clockInTime newer than the trip's timestamp.

**How to apply:** `todayTrips` useMemo depends only on `[trips, currentTime]`. The $/hr gauge uses `activeHoursDecimal` (clock-in → now minus breaks) as the denominator — this correctly represents productive time without needing to filter which trips count.

## Gauge (perHourGross) logic
- Primary: `grossToday / activeHoursDecimal` (shift timer from START minus breaks)
- Fallback 1: If shift not active but hours logged today → use `cumulative.hoy`
- Fallback 2: If no shift timer at all but trips exist → use time from first trip to NOW as denominator (live, updates every second via `currentTime`)
- Shows `—` only when grossToday === 0 (no trips entered today)
- The gauge correctly shows `—` when no trips are logged — it cannot compute $/hr with $0 earnings

## Key thresholds
- < $60/hr → RED zone, REPOSITION alarm
- $60-70/hr → ORANGE zone, acceptable
- $70-80/hr → YELLOW zone, good
- $80-90/hr → GREEN zone, excellent
- $90+/hr → BLUE zone, exceptional
- Goal marker (gold tick) on gauge arc = user's slider setting

## Odometer
- `shiftMiles` state tracks GPS distance during active shift
- Resets to 0 on clock-in
- Uses haversineKm at module level (canonical copy)
- IRS_RATE_PER_MILE = 0.70 (2025 rate)
