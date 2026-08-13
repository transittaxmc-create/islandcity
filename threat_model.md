# Threat Model

## Project Overview

IslandCity Driver Accounting is a Node.js/Express 5 API backend with a React (Vite) frontend for a single NYC rideshare driver. The application tracks trips, expenses, hours, and financial data. It integrates with Google Gemini AI for receipt scanning, bank statement parsing, voice-command parsing, and job-offer evaluation.

Tech stack: pnpm workspaces, TypeScript 5.9, Express 5, PostgreSQL, Drizzle ORM, Zod, React 18 / Wouter, Google Cloud Storage, Google Gemini AI.

Deployment: Autoscale on Replit, currently `private` visibility (platform-level access control blocks public internet).

## Assets

- **Driver financial data** — trip logs (fare, tips, tolls, platform, mileage), expense records, hours log, and settings — stored in PostgreSQL via the backup endpoints and Drizzle ORM.
- **Scanned documents** — receipt images and bank statement PDFs uploaded to Google Cloud Storage and indexed in the database.
- **Application secrets** — `DATABASE_URL`, `GITHUB_PAT`, `DEFAULT_OBJECT_STORAGE_BUCKET_ID`, and Gemini AI API key (injected via `@workspace/integrations-gemini-ai`).
- **GitHub repository** — the project's source code and history, writable via the `GITHUB_PAT` stored as a server-side secret.

## Trust Boundaries

- **Browser to API** — all client requests cross this boundary. Currently no server-side auth enforces the caller's identity; the private Replit deployment is the only access gate.
- **API to PostgreSQL** — Drizzle ORM with parameterized queries; no raw string concatenation into SQL is present.
- **API to Google Cloud Storage** — server-side only; presigned URLs are not used; files are written and served server-to-bucket.
- **API to Google Gemini** — server relays caller-supplied base64 image/audio/text to Gemini; no sanitization of caller intent is possible, only MIME-type allowlisting.
- **API to GitHub** — `POST /api/git-push` executes `git push` with the `GITHUB_PAT` embedded in the remote URL; this is a server-side shell execution boundary.

## Scan Anchors

- Production entry points: `artifacts/api-server/src/routes/index.ts` (route registration), `artifacts/api-server/src/app.ts` (middleware stack)
- Highest-risk routes: `POST /api/git-push` (shell execution + GITHUB_PAT), `GET /api/backup/latest` (full driver data dump), `DELETE /api/documents/:id` (destructive, unauthenticated)
- AI inference routes (all unauthenticated, quota-exhaustion risk): `/api/receipt-scan`, `/api/statement-scan`, `/api/voice-parse`, `/api/broadcast-eval`, `/api/gemini-chat`, `/api/limosys-eval`
- Public surface: `GET /api/healthz` (intentionally open)
- Authenticated surface: **none** — no auth middleware is present on any route
- Dev-only: `artifacts/mockup-sandbox/` (Replit design sandbox, not production-reachable)

## Threat Categories

### Spoofing / Authentication

No authentication is implemented on any API endpoint. The `private` Replit deployment visibility is the sole access gate. Once any auth mechanism (e.g., Replit Auth, session cookies) is added, every route that handles driver data or infrastructure operations must require a validated session server-side before the platform-level gate can safely change to `public`.

**Required guarantee:** All endpoints except `GET /api/healthz` MUST require a valid authenticated session before deployment visibility is changed to public or before additional users are added.

### Information Disclosure

- Raw `String(err)` error objects are returned in 500 responses from `backup.ts` and `documents.ts`, potentially leaking database hostnames, table names, and GCS bucket paths.
- `CORS({ origin: process.env["FRONTEND_ORIGIN"] })` defaults to allow-all origins when the env var is unset; safe for now but will become a real risk if session cookies are introduced.
- `GET /api/git-push/status` discloses whether `GITHUB_PAT` is configured.

### Elevation of Privilege

- `POST /api/git-push` executes `git add -A && git commit && git push` with the server's `GITHUB_PAT` without authentication. Any caller within the private deployment can trigger this.
- No role or permission model exists. When implemented, all authorization must be server-side.
- The `objectAcl.ts` ACL framework is implemented but never invoked from the documents routes; the infrastructure is present but not wired up.

### Denial of Service / Cost Exhaustion

- Six AI inference endpoints accept up to 20 MB payloads each with no rate limiting. Rapid repeated calls exhaust the Gemini API quota and may incur billing charges.
- No rate limiting on backup write (`POST /api/backup`) — an attacker could fill the database with large JSON blobs.
- The `POST /api/git-push` rate limit (one push per 10 minutes) is a global in-memory singleton that resets on server restart.

### Tampering

- `POST /api/backup` accepts arbitrary JSON arrays for `trips`, `expenses`, `hoursLog`, and `settings` with no schema validation on the content beyond TypeScript casting. Malicious data can be persisted and later restored, corrupting the driver's records.
- All database queries use Drizzle ORM parameterized statements; no SQL injection risk is present in the current code.
