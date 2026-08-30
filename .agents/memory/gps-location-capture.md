---
name: GPS location capture
description: Rules for fresh, independent Origin and Destination GPS cards and trustworthy POI labeling.
---

Origin and Destination must each use the GPS fix obtained when that field’s button is pressed. A later request wins; an older geocode response must never overwrite it.

**Why:** Concurrent geocoding and a second global-address request allowed stale or repeated street information to appear in both fields. Nearby search can also return a plausible but incorrect business name.

**How to apply:** Keep per-target request sequencing, reuse the button-time geocode for the global address display, and only label a recognized venue from a POI within 42 meters. An unclassified nearby name falls back to Residence. Show category icon/name, exact physical address, coordinates and capture time; airports also show terminal when available.