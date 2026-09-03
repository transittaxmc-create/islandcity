// ── Persistence · state store + migrations + audit JSON ─────────────
// Spec AC10: all data saved to disk for audit. Primary store is
// localStorage (ei_program_state kept for Netlify-v2 users migrating),
// plus per-trip JSON files for the paper audit trail.

import { emptyState, todayStr, uid, type AppState, type EntryRecord } from "./domain";

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
      state.entries = (old.trips ?? []).map((t, i) => legacyEntry(t, i, state));
      saveState(state);
      return;
    }
    const rawV1 = localStorage.getItem("island-city-trips");
    if (rawV1) {
      const old = JSON.parse(rawV1) as Array<Record<string, unknown>>;
      state.refCounter = Math.max(state.refCounter, 8821 + old.length);
      state.entries = old.map((t, i) => legacyEntry(t, i, state));
      saveState(state);
    }
  } catch {
    // migration is best-effort only
  }
}

function legacyEntry(t: Record<string, unknown>, i: number, state: AppState): EntryRecord {
  const earnings = Number(t.gross ?? t.earnings) || 0;
  const extraCash = Number(t.extra ?? t.cashRec) || 0;
  const tips = Number(t.tips) || 0;
  const toll = Number(t.toll ?? t.toll_amount) || 0;
  const platformFee = Number(t.fee ?? t.comm) || 0;
  const grossIncome = earnings + extraCash + tips + toll; // spec formula
  const datetime =
    typeof t.timestamp === "number" && t.timestamp > 0
      ? new Date(t.timestamp).toISOString()
      : `${String(t.date ?? todayStr())}T12:00:00.000Z`;
  return {
    id: String(t.id ?? uid()),
    datetime,
    platform: String(t.platform ?? "Other"),
    platformType: "RIDESHARE",
    earnings,
    extraCash,
    tips,
    toll,
    tollDetails: toll ? [{ name: "Legacy toll", price: toll }] : [],
    platformFee,
    grossIncome,
    netPayout: grossIncome - platformFee,
    pickup: { address: String(t.pickup ?? ""), businessName: "", lat: 0, lng: 0, type: "", icon: "", timestamp: "" },
    dropoff: { address: String(t.dropoff ?? ""), businessName: "", lat: 0, lng: 0, type: "", icon: "", timestamp: "" },
    notes: String(t.comments ?? ""),
    status: t.reconStatus === "closed" || t.status === "posted" ? "posted" : "open",
  };
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("Save failed", e);
  }
}

/** Spec H): trip_YYYY-MM-DD.json — full audit payload. */
export function downloadTripAuditJson(entry: EntryRecord): void {
  const payload = {
    app: "IslandCity Tip Tracker",
    exportedAt: new Date().toISOString(),
    trip: entry,
    audit: {
      formula: "GROSS = EARNINGS + EXTRACASH + TIPS + TOLL · NET = GROSS - PLATFORMFEE",
      original: entry,
    },
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `trip_${entry.datetime.slice(0, 10)}_${entry.id}.json`;
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
