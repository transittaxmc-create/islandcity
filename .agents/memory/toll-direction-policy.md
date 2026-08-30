---
name: Toll direction policy
description: Direction and review rules that must remain consistent when toll detection changes.
---

Port Authority crossings are one-way toll facilities: charge travel entering New York and do not charge travel entering New Jersey. MTA crossings in the current toll set are treated as bidirectional.

**Why:** Direction-blind geofencing can falsely charge a driver leaving New York. When available evidence cannot establish direction confidently, preserving the charge is safer than silently omitting a real toll.

**How to apply:** Any future toll-detection change must preserve direction-aware filtering, keep an explicit last-verification date, and avoid automatic web searches; the Settings reminder prompts a manual rate review after 30 days.