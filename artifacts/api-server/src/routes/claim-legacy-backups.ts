import { Router } from "express";
import { db, driverBackupsTable } from "@workspace/db";
import { isNull } from "drizzle-orm";
import { authenticatedUserId, requireAuth } from "../middlewares/requireAuth";

const claimLegacyBackupsRouter = Router();

claimLegacyBackupsRouter.use("/claim-legacy-backups", requireAuth);

// POST /api/claim-legacy-backups — assign only previously unowned backups
claimLegacyBackupsRouter.post("/claim-legacy-backups", async (req, res) => {
  const userId = authenticatedUserId(req);

  try {
    const claimed = await db
      .update(driverBackupsTable)
      .set({ userId })
      .where(isNull(driverBackupsTable.userId))
      .returning({ id: driverBackupsTable.id });

    const claimedCount = claimed.length;
    res.json({
      ok: true,
      claimedCount,
      message: claimedCount > 0
        ? `${claimedCount} backup${claimedCount === 1 ? "" : "s"} reclaimed successfully`
        : "No hay datos pendientes de reclamar",
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

export default claimLegacyBackupsRouter;