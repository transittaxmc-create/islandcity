# Threat Model

## Project Overview

IslandCity Driver Accounting is a Node.js/Express 5 API backend with a React (Vite) frontend. The project is currently a scaffold — it has one health-check endpoint (`GET /api/healthz`), an empty database schema (PostgreSQL + Drizzle ORM), and a placeholder frontend. The application is not yet deployed.

Tech stack: pnpm workspaces, TypeScript 5.9, Express 5, PostgreSQL, Drizzle ORM, Zod, React 18 / Wouter.

## Assets

- **Trip and financial data** — will include driver trip logs, earnings, deductions, and IRS-reportable income (not yet implemented).
- **Driver identity** — driver names, IDs, and home region (not yet implemented).
- **Application secrets** — `DATABASE_URL` environment variable (currently the only required secret).

## Trust Boundaries

- **Browser to API** — all client requests cross this boundary. The API must authenticate and authorize every request once real endpoints are added; the client is untrusted.
- **API to PostgreSQL** — the application uses Drizzle ORM with parameterized queries; direct string concatenation into SQL must not be introduced.
- **Authenticated to Unauthenticated** — no auth is implemented yet. When auth is added (e.g., Replit Auth), every route that handles personal or financial data must require a valid session server-side.

## Scan Anchors

- Production entry points: `artifacts/api-server/src/routes/index.ts` (route registration), `artifacts/api-server/src/app.ts` (middleware stack)
- Highest-risk areas when built out: route handlers accessing driver/financial records, any export or report-generation endpoint
- Public surface: `GET /api/healthz` (intentionally open)
- Authenticated surface: none yet — must be added before any personal/financial data is exposed
- Dev-only: `artifacts/mockup-sandbox/` (Replit design sandbox, not production-reachable)

## Threat Categories

### Spoofing

No authentication is implemented. Once driver data is added, every API endpoint that returns or mutates driver records must require a validated session. The current scaffold presents no spoofing risk because no user-specific data exists.

### Information Disclosure

The CORS middleware is configured with `cors()` and no options, which emits `Access-Control-Allow-Origin: *`. Any origin can make cross-origin requests to the API. This is harmless for the current health-check-only API, but will become a real risk once authenticated or user-scoped endpoints are added. CORS should be restricted to the known frontend origin before any sensitive routes are deployed.

### Elevation of Privilege

No role or permission model exists yet. When implemented, all authorization checks must be enforced server-side. The frontend is never a trust boundary.

### Denial of Service

No rate limiting is configured. The Express `json()` body parser uses its default 100 kB limit, which is acceptable for current use. As the API grows, resource-intensive endpoints (e.g., report generation, bulk exports) must add rate limiting and request-size caps.
