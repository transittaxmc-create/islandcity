// IslandCity . toll detections storage (localStorage, client-side).
// Anti-duplicate: UNIQUE(tripId, sourceEventId) enforced on read.
// NO production. FASE 1/2 lite.

import type { TollCandidate } from "./tollDetection";

const KEY = "islandcity:tollDetections:v1";

export interface StoredTollDetection extends TollCandidate {
  id: string;                       // uuid
  trip_id: string;
  status: "suggested" | "confirmed" | "rejected";
  amount_cents_override: number | null;  // user can override before save
  created_at: number;
  confirmed_at: number | null;
  rejection_reason: string | null;
  is_deleted: boolean;
}

function uuid(): string {
  if (typeof crypto !== "undefined" && (crypto as any).randomUUID) return (crypto as any).randomUUID();
  return "td-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
}

function readAll(): StoredTollDetection[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter(d => !d.is_deleted) : [];
  } catch { return []; }
}

function writeAll(items: StoredTollDetection[]): void {
  try { localStorage.setItem(KEY, JSON.stringify(items)); } catch {}
}

// Idempotent add: same tripId + sourceEventId returns existing record.
export function upsertDetection(c: TollCandidate, tripId: string, status: "suggested" | "confirmed" = "suggested"): { record: StoredTollDetection; created: boolean } {
  const all = readAll();
  const existing = all.find(d => d.trip_id === tripId && d.source_event_id === c.source_event_id);
  if (existing) return { record: existing, created: false };
  const rec: StoredTollDetection = {
    ...c,
    id: uuid(),
    trip_id: tripId,
    status,
    amount_cents_override: null,
    created_at: Date.now(),
    confirmed_at: status === "confirmed" ? Date.now() : null,
    rejection_reason: null,
    is_deleted: false,
  };
  all.push(rec);
  writeAll(all);
  return { record: rec, created: true };
}

export function confirmDetection(id: string, amountCentsOverride?: number): StoredTollDetection | null {
  const all = readAll();
  const rec = all.find(d => d.id === id);
  if (!rec) return null;
  rec.status = "confirmed";
  rec.confirmed_at = Date.now();
  if (typeof amountCentsOverride === "number") rec.amount_cents_override = amountCentsOverride;
  writeAll(all);
  return rec;
}

export function rejectDetection(id: string, reason: string): StoredTollDetection | null {
  const all = readAll();
  const rec = all.find(d => d.id === id);
  if (!rec) return null;
  rec.status = "rejected";
  rec.rejection_reason = reason;
  writeAll(all);
  return rec;
}

export function softDelete(id: string): boolean {
  const all = readAll();
  const rec = all.find(d => d.id === id);
  if (!rec) return false;
  rec.is_deleted = true;
  writeAll(all);
  return true;
}

export function getDetectionsForTrip(tripId: string): StoredTollDetection[] {
  return readAll().filter(d => d.trip_id === tripId);
}

export function getConfirmedForTrip(tripId: string): StoredTollDetection[] {
  return getDetectionsForTrip(tripId).filter(d => d.status === "confirmed");
}

export function totalConfirmedCentsForTrip(tripId: string): number {
  return getConfirmedForTrip(tripId).reduce((sum, d) =>
    sum + (d.amount_cents_override ?? d.default_tariff_usd_cents ?? 0), 0);
}

export function buildTollBreakdownForTrip(tripId: string): { lines: string[]; totalCents: number } {
  const confirmed = getConfirmedForTrip(tripId);
  const lines = confirmed.map(d => {
    const cents = d.amount_cents_override ?? d.default_tariff_usd_cents;
    const dollars = (cents == null) ? "TBD" : `$${(cents/100).toFixed(2)}`;
    return `- ${d.name} — ${dollars}`;
  });
  const totalCents = confirmed.reduce((s, d) => s + (d.amount_cents_override ?? d.default_tariff_usd_cents ?? 0), 0);
  return { lines, totalCents };
}

export function getLastDetectionTimeFor(tripId: string, tollId: string): number | null {
  const all = readAll().filter(d => d.trip_id === tripId && d.toll_id === tollId);
  if (all.length === 0) return null;
  return Math.max(...all.map(d => d.detected_at));
}
