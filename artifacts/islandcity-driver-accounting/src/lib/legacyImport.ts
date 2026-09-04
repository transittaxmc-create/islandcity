// ── Legacy import · EI Program backup → IslandCity Tip Tracker ──────
// Accepts the JSON produced by the original vanilla-JS app
// (exportFullBackup → {version, exportDate, app:'EI Program', state})
// or a raw ei_program_state object.
import { calcGross, platformDef, todayStr, type EntryRecord, type PlatformType } from "./domain";
import { detectCategoryFromVendor, EXPENSE_CATEGORIES, type ReceiptRecord } from "./receipts";
import { type EzpTransaction } from "./tolls";

interface LegacyTrip {
  id?: string; gross?: number; toll?: number; fee?: number; grand?: number;
  platform?: string; timestamp?: number; date?: string; displayTime?: string;
  gpsTag?: string; lat?: number | null; lng?: number | null;
  pickup?: string; dropoff?: string; comments?: string; reconStatus?: string; status?: string;
}
interface LegacyExpense {
  id?: string; category?: string; amount?: number; frequency?: string;
  notes?: string; type?: string; date?: string;
}
interface LegacyTollHit {
  id?: string; name?: string; amount?: number; timestamp?: number;
  date?: string; displayTime?: string; lat?: number; lng?: number;
}
interface LegacyState {
  trips?: LegacyTrip[]; tollHits?: LegacyTollHit[]; expenses?: LegacyExpense[];
  reconStatus?: Record<string, string>; goal?: number;
}

export interface LegacyImportResult {
  entries: EntryRecord[];
  receipts: ReceiptRecord[];
  transactions: EzpTransaction[];
  goal?: number;
  summary: { trips: number; expenses: number; tolls: number; exportDate: string };
}

/** Keep existing, prepend incoming that aren't already present (by id). */
export function mergeById<T extends { id: string }>(existing: T[], incoming: T[]): T[] {
  const ids = new Set(existing.map((x) => x.id));
  return [...incoming.filter((i) => !ids.has(i.id)), ...existing];
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function toIso(ts?: number, date?: string): string {
  if (ts && ts > 0) return new Date(ts).toISOString();
  return `${date || todayStr()}T12:00:00.000Z`;
}

function mapTrip(t: LegacyTrip, recon: Record<string, string>): EntryRecord {
  const earnings = num(t.gross);
  const toll = num(t.toll);
  const platformFee = num(t.fee);
  const grossIncome = calcGross(earnings, 0, 0, toll);
  const netPayout = num(t.grand) || grossIncome - platformFee;
  const id = String(t.id ?? Math.random().toString(36).slice(2));
  const platform = String(t.platform ?? "Other");
  return {
    id,
    datetime: toIso(t.timestamp, t.date),
    platform,
    platformType: (platformDef(platform)?.type ?? "RIDESHARE") as PlatformType,
    earnings,
    extraCash: 0,
    tips: 0,
    toll,
    tollDetails: toll ? [{ name: "Peaje importado", price: toll }] : [],
    platformFee,
    grossIncome,
    netPayout,
    pickup: { address: String(t.pickup ?? ""), businessName: "", lat: num(t.lat), lng: num(t.lng), type: "", icon: "", timestamp: String(t.displayTime ?? "") },
    dropoff: { address: String(t.dropoff ?? ""), businessName: "", lat: 0, lng: 0, type: "", icon: "", timestamp: "" },
    notes: String(t.comments ?? ""),
    status: (recon[id] ?? t.reconStatus) === "closed" ? "posted" : "open",
  };
}

function mapExpense(e: LegacyExpense): ReceiptRecord {
  const oldCat = String(e.category ?? "");
  const matched = EXPENSE_CATEGORIES.find((c) => c.toLowerCase() === oldCat.toLowerCase());
  const category = matched ?? detectCategoryFromVendor(String(e.notes ?? "")) ?? "Other";
  const freq = String(e.frequency ?? "one_time");
  const frequency = (["one-time", "daily", "weekly", "monthly"] as const).find((f) => f === (freq === "one_time" ? "one-time" : freq));
  return {
    id: `exp-${String(e.id ?? Math.random().toString(36).slice(2))}`,
    vendor: String(e.notes ?? "").trim() || category,
    amount: num(e.amount),
    category,
    dueDate: String(e.date ?? ""),
    businessCategory: category,
    type: "business",
    expenseType: "regular",
    frequency,
    createdAt: e.date,
  };
}

function mapToll(h: LegacyTollHit): EzpTransaction {
  return {
    id: `ezp-legacy-${String(h.id ?? Math.random().toString(36).slice(2))}`,
    tollName: String(h.name ?? "Toll"),
    timestamp: toIso(h.timestamp, h.date),
    detectedAmount: num(h.amount),
    status: "reconciled",
    ezpassStatementAmount: num(h.amount),
  };
}

/** Parse an EI Program backup file / pasted JSON. Throws with a user-facing message. */
export function parseLegacyBackup(text: string): LegacyImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("El archivo no es JSON válido");
  }
  const root = parsed as { state?: LegacyState; trips?: LegacyTrip[]; exportDate?: string };
  const st: LegacyState = (root.state ?? root) as LegacyState;
  const trips = Array.isArray(st.trips) ? st.trips : [];
  const expenses = Array.isArray(st.expenses) ? st.expenses : [];
  const tollHits = Array.isArray(st.tollHits) ? st.tollHits : [];
  const recon = (st.reconStatus ?? {}) as Record<string, string>;
  if (trips.length === 0 && expenses.length === 0 && tollHits.length === 0) {
    throw new Error("El archivo no contiene viajes/gastos/peajes del app original");
  }
  const entries = trips.map((t) => mapTrip(t, recon)).sort((a, b) => (a.datetime < b.datetime ? 1 : -1));
  const receipts = expenses.map(mapExpense);
  const transactions = tollHits.filter((h) => num(h.amount) > 0).map(mapToll);
  const goal = typeof st.goal === "number" && st.goal > 0 ? st.goal : undefined;
  return {
    entries,
    receipts,
    transactions,
    goal,
    summary: { trips: entries.length, expenses: receipts.length, tolls: transactions.length, exportDate: String(root.exportDate ?? "") },
  };
}