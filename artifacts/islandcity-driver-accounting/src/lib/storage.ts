// ── Persistence · state store + migrations + audit JSON ─────────────
// Spec AC10: all data saved to disk for audit. Primary store is
// localStorage (ei_program_state kept for Netlify-v2 users migrating),
// plus per-trip JSON files for the paper audit trail.

import { emptyState, todayStr, type AppState, type Trip } from "./domain";

const STORAGE_KEY = "ic_tip_tracker_state_v1";
const LEGACY_KEYS = ["ei_program_state", "ei_program_state_backup", "island-city-trips"];

export function loadState(): AppState {
  const state = emptyState();
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return state;
  }
  if (raw) {
    try {
      Object.assign(state, JSON.parse(raw) as Partial<AppState>);
      return state;
    } catch {
      // corrupted — fall through to legacy migration
    }
  }
  migrateLegacy(state);
  return state;
}

/** Best-effort migration from the old Netlify v2 / React v1 keys. */
function migrateLegacy(state: AppState): void {
  try {
    const raw = localStorage.getItem("ei_program_state");
    if (raw) {
      const old = JSON.parse(raw) as {
        trips?: Array<Record<string, unknown>>;
        tollHits?: Array<Record<string, unknown>>;
        goal?: number;
      };
      state.refCounter = Math.max(state.refCounter, 8821 + (old.trips?.length ?? 0));
      state.trips = (old.trips ?? []).map((t, i) => legacyTrip(t, i, state));
      saveState(state);
      return;
    }
    const rawV1 = localStorage.getItem("island-city-trips");
    if (rawV1) {
      const old = JSON.parse(rawV1) as Array<Record<string, unknown>>;
      state.refCounter = Math.max(state.refCounter, 8821 + old.length);
      state.trips = old.map((t, i) => legacyTrip(t, i, state));
      saveState(state);
    }
  } catch {
    // migration is best-effort only
  }
}

function legacyTrip(t: Record<string, unknown>, i: number, state: AppState): Trip {
  const gross = Number(t.gross ?? t.earnings) || 0;
  const tips = Number(t.tips) || 0;
  const extra = Number(t.extra ?? t.cashRec) || 0;
  const tollReimb = Number(t.toll ?? t.toll_amount) || 0;
  const comm = Number(t.fee ?? t.comm) || 0;
  return {
    id: String(t.id ?? Math.random().toString(36).slice(2)),
    ref: `IC-${(state.refCounter + i).toString().padStart(4, "0")}`,
    fareType: "UBER",
    platform: String(t.platform ?? "Other"),
    gross: gross + extra,
    tips,
    cashRec: 0,
    tollReimb,
    comm,
    net: gross + extra + tips + tollReimb - comm,
    date: String(t.date ?? todayStr()),
    displayTime: String(t.displayTime ?? t.time ?? ""),
    timestamp: Number(t.timestamp) || Date.now(),
    origin: { text: String(t.pickup ?? ""), lat: null, lng: null, acc: null },
    destination: { text: String(t.dropoff ?? ""), lat: null, lng: null, acc: null },
    tripMiles: 0,
    notes: String(t.comments ?? ""),
    receipts: [],
    status: t.reconStatus === "closed" || t.status === "posted" ? "posted" : "queued",
  };
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("Save failed", e);
  }
}

/** Spec H): trip_YYYY-MM-DD_IC-XXXX.json — full audit payload. */
export function downloadTripAuditJson(trip: Trip): void {
  const payload = {
    app: "IslandCity Tip Tracker",
    exportedAt: new Date().toISOString(),
    trip,
    audit: {
      formula: "NET = GROSS + TIPS + OTHER CASH + TOLL REIMB - PLATFORM COMM",
      original: trip,
    },
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `trip_${trip.date}_${trip.ref}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function wipeAll(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    LEGACY_KEYS.forEach((k) => localStorage.removeItem(k));
  } catch {
    // ignore
  }
}
