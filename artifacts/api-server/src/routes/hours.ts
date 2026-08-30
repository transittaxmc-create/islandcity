import { Router } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db, driverHoursTable } from "@workspace/db";
import { authenticatedUserId, requireAuth } from "../middlewares/requireAuth";

const hoursRouter = Router();
hoursRouter.use("/hours", requireAuth);

type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord | null =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as UnknownRecord
    : null;

const stringOrEmpty = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

const nonnegativeNumber = (value: unknown, decimals: number): number => {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) && number >= 0
    ? Number(number.toFixed(decimals))
    : 0;
};

function normalizeHour(input: unknown): UnknownRecord | null {
  const source = asRecord(input);
  if (!source) return null;
  const date = stringOrEmpty(source.date);
  if (!date) return null;
  const id = stringOrEmpty(source.id) ||
    `hour-${date}-${stringOrEmpty(source.clockIn)}-${stringOrEmpty(source.clockOut)}-${nonnegativeNumber(source.hours, 4)}`;
  return {
    id,
    date,
    hours: nonnegativeNumber(source.hours, 4),
    clockIn: stringOrEmpty(source.clockIn),
    clockOut: stringOrEmpty(source.clockOut),
    breakMs: Math.round(nonnegativeNumber(source.breakMs, 0)),
    miles: source.miles === undefined || source.miles === null
      ? undefined
      : nonnegativeNumber(source.miles, 4),
  };
}

const serializeHour = (row: typeof driverHoursTable.$inferSelect) => ({
  id: row.id.includes(":") ? row.id.slice(row.id.indexOf(":") + 1) : row.id,
  date: row.date,
  hours: row.hours,
  clockIn: row.clockIn,
  clockOut: row.clockOut,
  breakMs: row.breakMs,
  ...(row.miles !== null ? { miles: row.miles } : {}),
});

const saveHour = async (userId: string, input: unknown) => {
  const normalized = normalizeHour(input);
  if (!normalized) return null;
  const clientId = normalized.id as string;
  const [saved] = await db
    .insert(driverHoursTable)
    .values({
      id: `${userId}:${clientId}`,
      userId,
      date: normalized.date as string,
      hours: normalized.hours as number,
      clockIn: normalized.clockIn as string,
      clockOut: normalized.clockOut as string,
      breakMs: normalized.breakMs as number,
      miles: normalized.miles as number | undefined,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: driverHoursTable.id,
      set: {
        date: normalized.date as string,
        hours: normalized.hours as number,
        clockIn: normalized.clockIn as string,
        clockOut: normalized.clockOut as string,
        breakMs: normalized.breakMs as number,
        miles: normalized.miles as number | undefined,
        updatedAt: new Date(),
      },
    })
    .returning();
  return saved ? { clientId, row: saved } : null;
};

hoursRouter.get("/hours", async (req, res) => {
  const userId = authenticatedUserId(req);
  try {
    const rows = await db
      .select()
      .from(driverHoursTable)
      .where(eq(driverHoursTable.userId, userId))
      .orderBy(desc(driverHoursTable.updatedAt));
    res.json({ ok: true, hours: rows.map(serializeHour) });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

hoursRouter.post("/hours", async (req, res) => {
  const userId = authenticatedUserId(req);
  const body = asRecord(req.body);
  const savedInput = body?.hour ?? body?.hoursEntry ?? req.body;
  try {
    const saved = await saveHour(userId, savedInput);
    if (!saved) {
      res.status(400).json({ ok: false, error: "A hours entry with a non-empty date is required" });
      return;
    }
    res.json({ ok: true, hour: serializeHour(saved.row), id: saved.clientId, updatedAt: saved.row.updatedAt });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

hoursRouter.put("/hours/:id", async (req, res) => {
  const userId = authenticatedUserId(req);
  const body = asRecord(req.body);
  const input = { ...(asRecord(body?.hour ?? body?.hoursEntry ?? req.body) ?? {}), id: req.params.id };
  try {
    const saved = await saveHour(userId, input);
    if (!saved) {
      res.status(400).json({ ok: false, error: "A hours entry with a non-empty date is required" });
      return;
    }
    res.json({ ok: true, hour: serializeHour(saved.row), id: saved.clientId, updatedAt: saved.row.updatedAt });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

async function deleteHour(userId: string, clientId: string) {
  return db.delete(driverHoursTable)
    .where(and(
      eq(driverHoursTable.id, `${userId}:${clientId}`),
      eq(driverHoursTable.userId, userId),
    ))
    .returning({ id: driverHoursTable.id });
}

hoursRouter.delete("/hours", async (req, res) => {
  const userId = authenticatedUserId(req);
  const body = asRecord(req.body);
  const clientId = stringOrEmpty(body?.id);
  if (!clientId) {
    res.status(400).json({ ok: false, error: "Hours entry id is required" });
    return;
  }
  try {
    const deleted = await deleteHour(userId, clientId);
    if (!deleted.length) {
      res.status(404).json({ ok: false, error: "Hours entry not found" });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

hoursRouter.delete("/hours/:id", async (req, res) => {
  const userId = authenticatedUserId(req);
  try {
    const deleted = await deleteHour(userId, stringOrEmpty(req.params.id));
    if (!deleted.length) {
      res.status(404).json({ ok: false, error: "Hours entry not found" });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

export default hoursRouter;