import { Router } from "express";
import { db, driverBackupsTable } from "@workspace/db";
import { desc, sql } from "drizzle-orm";

const backupRouter = Router();

// POST /api/backup — save a full data snapshot
backupRouter.post("/backup", async (req, res) => {
  const { trips = [], expenses = [], hoursLog = [], settings = {} } = req.body as {
    trips?: unknown[];
    expenses?: unknown[];
    hoursLog?: unknown[];
    settings?: Record<string, unknown>;
  };

  try {
    const [saved] = await db
      .insert(driverBackupsTable)
      .values({
        trips,
        expenses,
        hoursLog,
        settings,
        tripCount:    Array.isArray(trips)    ? trips.length    : 0,
        expenseCount: Array.isArray(expenses) ? expenses.length : 0,
      })
      .returning({
        id:      driverBackupsTable.id,
        savedAt: driverBackupsTable.savedAt,
        tripCount:    driverBackupsTable.tripCount,
        expenseCount: driverBackupsTable.expenseCount,
      });

    // Keep only the 48 most recent backups (rolling window)
    await db.execute(
      sql`DELETE FROM driver_backups WHERE id NOT IN (
        SELECT id FROM driver_backups ORDER BY saved_at DESC LIMIT 48
      )`
    );

    res.json({ ok: true, id: saved.id, savedAt: saved.savedAt, tripCount: saved.tripCount, expenseCount: saved.expenseCount });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// GET /api/backup/latest — retrieve the most recent backup
backupRouter.get("/backup/latest", async (_req, res) => {
  try {
    const [latest] = await db
      .select()
      .from(driverBackupsTable)
      .orderBy(desc(driverBackupsTable.savedAt))
      .limit(1);

    res.json({ ok: true, backup: latest ?? null });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// GET /api/backup/list — last 10 backup timestamps (for settings panel display)
backupRouter.get("/backup/list", async (_req, res) => {
  try {
    const rows = await db
      .select({
        id:           driverBackupsTable.id,
        savedAt:      driverBackupsTable.savedAt,
        tripCount:    driverBackupsTable.tripCount,
        expenseCount: driverBackupsTable.expenseCount,
      })
      .from(driverBackupsTable)
      .orderBy(desc(driverBackupsTable.savedAt))
      .limit(10);

    res.json({ ok: true, backups: rows });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

export default backupRouter;
