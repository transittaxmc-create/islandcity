---
name: Financial data ownership
description: Security rules for authenticated ownership and handling legacy unowned financial records.
---

All shared financial records must derive their owner exclusively from a server-validated Clerk session. Never accept an owner identifier from a request body or query parameter.

**Why:** Historical shared rows predated authentication and could otherwise be exposed or assigned to the wrong driver.

**How to apply:** Scope every read, write, update, and delete by the authenticated Clerk user ID. Leave legacy rows with no owner quarantined and invisible until an explicit, verified recovery process assigns them.

Client-visible trip IDs are not globally unique. Storage keys must include the authenticated user identity so two drivers can safely use the same local trip ID.

**Why:** A global primary key lets one user's client-generated ID collide with another user's trip.

**How to apply:** Keep the local ID inside the trip payload for compatibility, but namespace the database key by the server-derived user ID.