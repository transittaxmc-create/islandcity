---
name: Toll direction policy
description: Direction and review rules that must remain consistent when toll detection changes.
---

Port Authority crossings are one-way toll facilities: charge travel entering New York and do not charge travel entering New Jersey. MTA crossings in the current toll set are treated as bidirectional.

Automatic toll geofencing runs only during an active shift and only from device GPS fixes reporting ±100 meters or better. TomTom and any future reverse-geocoding fallback are not inputs to toll detection.

**Why:** Direction-blind or low-accuracy geofencing can falsely charge a driver. Address-provider outages must not disable raw-coordinate toll detection, and address-provider results must never create tolls.

**How to apply:** Preserve the active-shift and accuracy gates, direction-aware filtering, manual toll-edit protection, and explicit rate-verification date. The Settings reminder prompts a manual rate review after 30 days.