---
name: Toll direction policy
description: Direction and review rules that must remain consistent when toll detection changes.
---

Port Authority crossings are one-way toll facilities: charge travel entering New York and do not charge travel entering New Jersey. MTA crossings in the current toll set are treated as bidirectional.

Automatic toll geofencing runs only during an active shift and only from device GPS fixes reporting ±100 meters or better. TomTom and any future reverse-geocoding fallback are not inputs to toll detection.

**Why:** Direction-blind or low-accuracy geofencing can falsely charge a driver. Address-provider outages must not disable raw-coordinate toll detection, and address-provider results must never create tolls.

**How to apply:** Preserve the active-shift and accuracy gates, direction-aware filtering, manual toll-edit protection, and explicit rate-verification date. The Settings reminder prompts a manual rate review after 30 days.

Each valid crossing is an individual event, while `Trip.toll` remains the authoritative compatible total for Register, Ledger, reports, and financial summaries. A later automatic crossing adds its rate to a manually corrected total instead of replacing the correction.

**Why:** Drivers may cross several facilities during one trip, and a manual correction must not cause the next GPS detection to erase prior work.

**How to apply:** Deduplicate only while the vehicle remains inside the same geofence; allow the same plaza again after departure. Regenerate only the managed E-ZPass block in Notes and preserve personal text both before and after it.