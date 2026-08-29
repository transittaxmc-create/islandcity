---
name: Clerk production proxy
description: Required production proxy wiring for Replit-managed Clerk web clients.
---

The web Clerk provider must receive the proxy URL injected by Replit in production, unconditionally; development intentionally supplies an empty value.

**Why:** Without the proxy, the published client can try to load Clerk from a certificate-invalid custom subdomain. The SDK never finishes mounting, leaving only the app’s black body background and an empty React root.

**How to apply:** When touching Clerk startup code, preserve the canonical Replit-managed wiring for both the host-derived publishable key and the injected proxy URL. Never replace this with production gates or hardcoded Clerk hosts.