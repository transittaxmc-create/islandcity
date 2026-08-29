/**
 * documents.ts
 * List and serve scanned documents (receipts & statements).
 *
 * GET  /api/documents           — list documents (filters: type, month YYYY-MM)
 * GET  /api/documents/:id/file  — stream the file from GCS
 * DELETE /api/documents/:id     — remove a document
 */
import { Router } from "express";
import { db, scannedDocumentsTable } from "@workspace/db";
import { desc, eq, and, gte, lt, sql } from "drizzle-orm";
import { objectStorageClient } from "../lib/objectStorage";
import { authenticatedUserId, requireAuth } from "../middlewares/requireAuth";

const documentsRouter = Router();
documentsRouter.use("/documents", requireAuth);

const bucketId = () => process.env["DEFAULT_OBJECT_STORAGE_BUCKET_ID"] ?? "";

// ── List ─────────────────────────────────────────────────────────────────────
documentsRouter.get("/documents", async (req, res) => {
  const userId = authenticatedUserId(req);
  try {
    const { type, month } = req.query as { type?: string; month?: string };

    const conditions = [eq(scannedDocumentsTable.userId, userId)];
    if (type) conditions.push(eq(scannedDocumentsTable.type, type));
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const start = new Date(`${month}-01`);
      const end   = new Date(start);
      end.setMonth(end.getMonth() + 1);
      conditions.push(
        gte(scannedDocumentsTable.createdAt, start),
        lt(scannedDocumentsTable.createdAt, end),
      );
    }

    const rows = await db
      .select({
        id:         scannedDocumentsTable.id,
        type:       scannedDocumentsTable.type,
        fileDate:   scannedDocumentsTable.fileDate,
        category:   scannedDocumentsTable.category,
        vendor:     scannedDocumentsTable.vendor,
        amount:     scannedDocumentsTable.amount,
        createdAt:  scannedDocumentsTable.createdAt,
        objectPath: scannedDocumentsTable.objectPath,
      })
      .from(scannedDocumentsTable)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(scannedDocumentsTable.createdAt));

    res.json({ ok: true, documents: rows });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// ── Serve file ────────────────────────────────────────────────────────────────
documentsRouter.get("/documents/:id/file", async (req, res) => {
  const userId = authenticatedUserId(req);
  try {
    const id = Number(req.params["id"]);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    const [doc] = await db
      .select()
      .from(scannedDocumentsTable)
      .where(and(eq(scannedDocumentsTable.id, id), eq(scannedDocumentsTable.userId, userId)))
      .limit(1);

    if (!doc) { res.status(404).json({ error: "Document not found" }); return; }

    const bucket  = objectStorageClient.bucket(bucketId());
    const file    = bucket.file(doc.objectPath);
    const [exists] = await file.exists();
    if (!exists) { res.status(404).json({ error: "File not in storage" }); return; }

    const meta     = (doc.metadata as Record<string, string>) ?? {};
    const mimeType = meta["mimeType"] ?? "application/octet-stream";

    res.setHeader("Content-Type", mimeType);
    res.setHeader("Cache-Control", "private, max-age=3600");
    file.createReadStream().pipe(res);
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// ── Delete ────────────────────────────────────────────────────────────────────
documentsRouter.delete("/documents/:id", async (req, res) => {
  const userId = authenticatedUserId(req);
  try {
    const id = Number(req.params["id"]);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    const [doc] = await db
      .select({ id: scannedDocumentsTable.id, objectPath: scannedDocumentsTable.objectPath })
      .from(scannedDocumentsTable)
      .where(and(eq(scannedDocumentsTable.id, id), eq(scannedDocumentsTable.userId, userId)))
      .limit(1);

    if (!doc) { res.status(404).json({ error: "Not found" }); return; }

    // Delete from GCS
    try {
      const bucket = objectStorageClient.bucket(bucketId());
      await bucket.file(doc.objectPath).delete();
    } catch { /* file may already be gone */ }

    await db.delete(scannedDocumentsTable).where(and(eq(scannedDocumentsTable.id, id), eq(scannedDocumentsTable.userId, userId)));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

export default documentsRouter;
