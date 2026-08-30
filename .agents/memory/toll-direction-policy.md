---
name: Toll direction policy
description: Direction and review rules that must remain consistent when toll detection changes.
---

Port Authority crossings are one-way toll facilities: charge travel entering New York and do not charge travel entering New Jersey. MTA crossings in the current toll set are treated as bidirectional.

Automatic toll geofencing runs only during an active shift and only from device GPS fixes reporting ±100 meters or better. TomTom and any future reverse-geocoding fallback are not inputs to toll detection.

**Why:** Direction-blind or low-accuracy geofencing can falsely charge a driver. Address-provider outages must not disable raw-coordinate toll detection, and address-provider results must never create tolls.

**How to apply:** Preserve the active-shift and accuracy gates, direction-aware filtering, manual toll-edit protection, and explicit rate-verification date. The Settings reminder prompts a manual rate review after 30 days.

Every automatic crossing and manual correction must appear as an individual breakdown line, and the line-item sum must always equal the displayed toll total. A later automatic crossing adds to a prior correction instead of replacing it.

**Why:** Drivers may cross several facilities during one trip, and a manual correction must not cause the next GPS detection to erase prior work.

**How to apply:** Deduplicate only while the vehicle remains inside the same geofence; allow the same plaza again after departure. Keep additions, edits, removals, Notes, and the aggregate total synchronized. Preserve personal text both before and after the managed breakdown.