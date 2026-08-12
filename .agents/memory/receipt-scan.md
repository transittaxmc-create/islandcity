---
name: Gemini receipt scan architecture
description: How the AI receipt scan feature is wired between the frontend PWA and the API server
---

## Route
`POST /api/receipt-scan` in `artifacts/api-server/src/routes/receipt-scan.ts`
- Input: `{ imageBase64: string, mimeType: string }` (mimeType validated against allowlist)
- Output: `{ vendor, amount, date, category, note }` — all fields always present, amount is a number

## Gemini setup
- Integration provisioned via `setupReplitAIIntegrations({ providerSlug: "gemini" })`
- Env vars: `AI_INTEGRATIONS_GEMINI_BASE_URL`, `AI_INTEGRATIONS_GEMINI_API_KEY`
- Model used: `gemini-2.5-flash` with inline image data (inlineData part)
- Template files copied to `lib/integrations-gemini-ai/`

## Critical: esbuild externals
`@google/genai` was originally excluded by the `"@google/*"` wildcard in `artifacts/api-server/build.mjs`.
**Fix:** Changed `"@google/*"` → `"@google-cloud/*"` (only cloud SDK loads .proto files via path traversal; genai is safe to bundle).

**Why:** esbuild externalizes the package but Node can't find it at dist/ runtime since pnpm hoists it to workspace root. Bundling it avoids the runtime resolution issue.

## Frontend flow
1. Hidden `<input type="file" accept="image/*" capture="environment">` triggered by "📷 Scan Receipt" button
2. Canvas resize: max 1024px, JPEG quality 0.85 → reduces payload from several MB to <300KB typically
3. `fetch("/api/receipt-scan", { method: "POST", body: JSON.stringify({ imageBase64, mimeType: "image/jpeg" }) })`
4. Response auto-fills: name (vendor), amount, date, category (mapped via CAT_MAP), description (note)

## State added to App.tsx
- `scanningReceipt: boolean` — disables button + shows spinner during API call
- `receiptScanError: string | null` — surface error in toast
- `receiptInputRef: useRef<HTMLInputElement>` — programmatic file input trigger
- Handler: `handleReceiptScan(e: React.ChangeEvent<HTMLInputElement>)`

## Category mapping
Gemini returns simplified categories (Gas/Fuel, Car Wash, Tolls, etc.) mapped via `CAT_MAP` to IRS Schedule C categories used by the expense system (Vehicle & Fuel, Tolls & Parking, etc.)
