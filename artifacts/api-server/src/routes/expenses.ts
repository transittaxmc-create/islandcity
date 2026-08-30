import { Router } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db, driverExpensesTable } from "@workspace/db";
import { authenticatedUserId, requireAuth } from "../middlewares/requireAuth";

const expensesRouter = Router();
expensesRouter.use("/expenses", requireAuth);

type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord | null =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as UnknownRecord
    : null;

const stringOrEmpty = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

const optionalString = (value: unknown): string | undefined => {
  const result = stringOrEmpty(value);
  return result || undefined;
};

const numberOrZero = (value: unknown): number => {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) && number >= 0
    ? Math.round(number * 100) / 100
    : 0;
};

const validFrequency = (value: unknown): string | undefined =>
  value === "none" || value === "daily" || value === "weekly" || value === "monthly"
    ? value
    : undefined;

const validPurpose = (value: unknown): string | undefined =>
  value === "business" || value === "personal" ? value : undefined;

function normalizeExpense(input: unknown): UnknownRecord | null {
  const source = asRecord(input);
  if (!source) return null;
  const id = stringOrEmpty(source.id);
  const date = stringOrEmpty(source.date);
  if (!id || !date) return null;

  return {
    id,
    date,
    category: stringOrEmpty(source.category),
    vendor: stringOrEmpty(source.vendor),
    amount: numberOrZero(source.amount),
    note: stringOrEmpty(source.note),
    type: optionalString(source.type),
    verified: source.verified === true,
    frequency: validFrequency(source.frequency),
    dueDate: optionalString(source.dueDate),
    endDate: optionalString(source.endDate),
    receiptDocId: typeof source.receiptDocId === "number" && Number.isInteger(source.receiptDocId)
      ? source.receiptDocId
      : undefined,
    purpose: validPurpose(source.purpose),
  };
}

const serializeExpense = (row: typeof driverExpensesTable.$inferSelect) => ({
  id: row.id.includes(":") ? row.id.slice(row.id.indexOf(":") + 1) : row.id,
  date: row.date,
  category: row.category,
  vendor: row.vendor,
  amount: row.amount,
  note: row.note,
  ...(row.type ? { type: row.type } : {}),
  verified: row.verified,
  ...(row.frequency ? { frequency: row.frequency } : {}),
  ...(row.dueDate ? { dueDate: row.dueDate } : {}),
  ...(row.endDate ? { endDate: row.endDate } : {}),
  ...(row.receiptDocId !== null ? { receiptDocId: row.receiptDocId } : {}),
  ...(row.purpose ? { purpose: row.purpose } : {}),
});

const saveExpense = async (userId: string, input: unknown) => {
  const normalized = normalizeExpense(input);
  if (!normalized) return null;
  const clientId = normalized.id as string;
  const id = `${userId}:${clientId}`;
  const [saved] = await db
    .insert(driverExpensesTable)
    .values({
      id,
      userId,
      date: normalized.date as string,
      category: normalized.category as string,
      vendor: normalized.vendor as string,
      amount: normalized.amount as number,
      note: normalized.note as string,
      type: normalized.type as string | undefined,
      verified: normalized.verified as boolean,
      frequency: normalized.frequency as string | undefined,
      dueDate: normalized.dueDate as string | undefined,
      endDate: normalized.endDate as string | undefined,
      receiptDocId: normalized.receiptDocId as number | undefined,
      purpose: normalized.purpose as string | undefined,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: driverExpensesTable.id,
      set: {
        date: normalized.date as string,
        category: normalized.category as string,
        vendor: normalized.vendor as string,
        amount: normalized.amount as number,
        note: normalized.note as string,
        type: normalized.type as string | undefined,
        verified: normalized.verified as boolean,
        frequency: normalized.frequency as string | undefined,
        dueDate: normalized.dueDate as string | undefined,
        endDate: normalized.endDate as string | undefined,
        receiptDocId: normalized.receiptDocId as number | undefined,
        purpose: normalized.purpose as string | undefined,
        updatedAt: new Date(),
      },
    })
    .returning();
  return saved ? { clientId, row: saved } : null;
};

expensesRouter.get("/expenses", async (req, res) => {
  const userId = authenticatedUserId(req);
  try {
    const rows = await db
      .select()
      .from(driverExpensesTable)
      .where(eq(driverExpensesTable.userId, userId))
      .orderBy(desc(driverExpensesTable.updatedAt));
    res.json({ ok: true, expenses: rows.map(serializeExpense) });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

expensesRouter.post("/expenses", async (req, res) => {
  const userId = authenticatedUserId(req);
  const body = asRecord(req.body);
  const savedInput = body?.expense ?? req.body;
  try {
    const saved = await saveExpense(userId, savedInput);
    if (!saved) {
      res.status(400).json({ ok: false, error: "An expense with a non-empty id and date is required" });
      return;
    }
    res.json({ ok: true, expense: serializeExpense(saved.row), id: saved.clientId, updatedAt: saved.row.updatedAt });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

expensesRouter.put("/expenses/:id", async (req, res) => {
  const userId = authenticatedUserId(req);
  const body = asRecord(req.body);
  const input = { ...(asRecord(body?.expense ?? req.body) ?? {}), id: req.params.id };
  try {
    const saved = await saveExpense(userId, input);
    if (!saved) {
      res.status(400).json({ ok: false, error: "An expense with a non-empty id and date is required" });
      return;
    }
    res.json({ ok: true, expense: serializeExpense(saved.row), id: saved.clientId, updatedAt: saved.row.updatedAt });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

async function deleteExpense(userId: string, clientId: string) {
  return db.delete(driverExpensesTable)
    .where(and(
      eq(driverExpensesTable.id, `${userId}:${clientId}`),
      eq(driverExpensesTable.userId, userId),
    ))
    .returning({ id: driverExpensesTable.id });
}

expensesRouter.delete("/expenses", async (req, res) => {
  const userId = authenticatedUserId(req);
  const body = asRecord(req.body);
  const clientId = stringOrEmpty(body?.id);
  if (!clientId) {
    res.status(400).json({ ok: false, error: "Expense id is required" });
    return;
  }
  try {
    const deleted = await deleteExpense(userId, clientId);
    if (!deleted.length) {
      res.status(404).json({ ok: false, error: "Expense not found" });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

expensesRouter.delete("/expenses/:id", async (req, res) => {
  const userId = authenticatedUserId(req);
  try {
    const deleted = await deleteExpense(userId, stringOrEmpty(req.params.id));
    if (!deleted.length) {
      res.status(404).json({ ok: false, error: "Expense not found" });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

export default expensesRouter;