---
name: Document archive system
description: How scanned receipts and bank statements are stored in GCS and displayed in the app
---

# Document Archive System

## Rule
Every receipt scan automatically saves the original image to GCS and metadata to `scanned_documents` DB table. The frontend shows a collapsible 📁 Saved Documents section at the bottom of the EXPENSES tab.

**Why:** User wants a permanent organized archive of all receipts/statements by date and category, not just the extracted data in the expense log.

## Architecture
- **Object Storage**: GCS bucket provisioned via `setupObjectStorage()`. File path pattern: `documents/{type}/{YYYY-MM}/{uuid}.ext`
- **DB table**: `scanned_documents` (id, type, object_path, file_date, category, vendor, amount, metadata JSONB, created_at)
- **Drizzle schema**: `lib/db/src/schema/scanned-documents.ts` → exported from `lib/db/src/schema/index.ts`
- **Server helper**: `artifacts/api-server/src/lib/documentStorage.ts` → `saveDocument()` writes directly to GCS from server (no presigned URL — file bytes already on server from scan)
- **Routes**: `artifacts/api-server/src/routes/documents.ts` → GET /api/documents, GET /api/documents/:id/file, DELETE /api/documents/:id

## How to apply
- `receipt-scan.ts` calls `saveDocument()` as fire-and-forget after successful Gemini scan (non-blocking)
- For bank statement scan (Task #34), call `saveDocument({ type: "statement", ... })` the same way
- The 📁 section is collapsible — only loads documents from API when user opens it (`showDocuments` state)
- Document viewer modal (`viewingDoc` state) shows full image for receipts, PDF link for statements
- No auth required — single-user app, server writes directly to GCS

## Key state vars in App.tsx
- `documents: DocEntry[]` — loaded list
- `docsLoading: boolean` — fetch in progress
- `showDocuments: boolean` — section expanded
- `viewingDoc: DocEntry | null` — modal open
- `loadDocuments()` — useCallback, fetches GET /api/documents
