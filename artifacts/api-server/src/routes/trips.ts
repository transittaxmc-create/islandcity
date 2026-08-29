import { Router } from "express";
import { db, driverTripsTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";

const tripsRouter = Router();

type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord | null =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as UnknownRecord
    : null;

const numberOrZero = (value: unknown): number => {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : 0;
};

const stringOrEmpty = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

/**
 * Accept both the compact Android entry and the full web Trip shape.
 * Android intentionally sends fare/tip; the server expands that into the
 * fields the Register and Ledger screens already understand.
 */
function normalizeTrip(input: unknown): UnknownRecord | null {
  const source = asRecord(input);
  if (!source) return null;

  const id = stringOrEmpty(source.id);
  const date = stringOrEmpty(source.date);
  if (!id || !date) return null;

  const isWebTrip = source.grandTotal !== undefined || source.earnings !== undefined;
  if (isWebTrip) {
    const earnings = numberOrZero(source.earnings);
    const tips = numberOrZero(source.tips);
    const extra = numberOrZero(source.extra);
    const otherCash = numberOrZero(source.otherCash);
    const toll = numberOrZero(source.toll);
    const fee = numberOrZero(source.fee);
    return {
      ...source,
      id,
      date,
      earnings,
      tips,
      extra,
      otherCash,
      toll,
      fee,
      grandTotal: Math.round((earnings + tips + extra + otherCash + toll - fee) * 100) / 100,
      status: source.status === "posted" ? "posted" : "pending",
      reviewed: source.reviewed === true,
      source: stringOrEmpty(source.source) || "web",
    };
  }

  const fare = numberOrZero(source.fare);
  const tip = numberOrZero(source.tip);
  const total = Math.round((fare + tip) * 100) / 100;
  const time = stringOrEmpty(source.time) || "12:00 AM";
  const timestamp = stringOrEmpty(source.timestamp) || `${date}T00:00:00.000Z`;

  return {
    id,
    reference: `ANDROID-${id}`,
    earnings: fare,
    tips: tip,
    extra: 0,
    otherCash: 0,
    toll: 0,
    fee: 0,
    platform: "Android",
    pickup: "",
    dropoff: "",
    notes: "Logged from IslandCity Android",
    grandTotal: total,
    time,
    date,
    timestamp,
    status: "pending",
    reviewed: false,
    source: "android",
  };
}

// GET /api/trips — return the canonical trip list for web/mobile clients.
tripsRouter.get("/trips", async (_req, res) => {
  try {
    const rows = await db
      .select({ trip: driverTripsTable.trip })
      .from(driverTripsTable)
      .orderBy(desc(driverTripsTable.createdAt));

    res.json({ ok: true, trips: rows.map(row => row.trip) });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// POST /api/trips — create or update one trip, keyed by the client trip id.
tripsRouter.post("/trips", async (req, res) => {
  const body = asRecord(req.body);
  const normalized = normalizeTrip(body?.trip ?? req.body);
  if (!normalized) {
    res.status(400).json({
      ok: false,
      error: "A trip with a non-empty id and date is required",
    });
    return;
  }

  const id = normalized.id as string;
  const source = stringOrEmpty(normalized.source) || "web";

  try {
    const [saved] = await db
      .insert(driverTripsTable)
      .values({ id, trip: normalized, source, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: driverTripsTable.id,
        set: { trip: normalized, source, updatedAt: new Date() },
      })
      .returning({
        id: driverTripsTable.id,
        updatedAt: driverTripsTable.updatedAt,
      });

    res.json({ ok: true, trip: normalized, id: saved.id, updatedAt: saved.updatedAt });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// DELETE /api/trips/:id — reserved for future cross-device deletion support.
// It is intentionally not used by the current clients, which never delete
// remote data implicitly.
tripsRouter.delete("/trips/:id", async (req, res) => {
  try {
    await db.delete(driverTripsTable).where(eq(driverTripsTable.id, req.params.id));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

export default tripsRouter;