// ── Tolls · GPS auto-detection v8.0 (offline, no API) ───────────────
// Spec: haversine <300m bridge / <500m tunnel => crossed.
// Anti-repeat: 24h cooldown per toll (localStorage lastTollTimes).
// Peak/Off-peak: weekdays 6-10AM & 4-8PM, weekends 11AM-9PM.
// PANYNJ 2026: peak $16.79 / off-peak $14.79 (E-ZPass discounted —
// NEVER Pay-by-Mail $10.17/$22.38).

export type TollKind = "bridge" | "tunnel";

export interface TollPlaza {
  name: string;
  lat: number;
  lng: number;
  kind: TollKind;
  /** 'pany' = peak/off-peak 2026 table; number = flat E-ZPass rate */
  pricing: "pany" | number;
}

export const TOLLS: TollPlaza[] = [
  { name: "RFK Bridge (Triborough)", lat: 40.7812, lng: -73.9515, kind: "bridge", pricing: 6.55 },
  { name: "Verrazzano Bridge", lat: 40.6066, lng: -74.0444, kind: "bridge", pricing: 6.55 },
  { name: "Henry Hudson Bridge", lat: 40.8777, lng: -73.8866, kind: "bridge", pricing: 3.42 },
  { name: "Cross Bay Bridge", lat: 40.6058, lng: -73.822, kind: "bridge", pricing: 2.45 },
  { name: "Marine Parkway Bridge", lat: 40.582, lng: -73.902, kind: "bridge", pricing: 2.45 },
  { name: "Throgs Neck Bridge", lat: 40.805, lng: -73.789, kind: "bridge", pricing: 6.55 },
  { name: "Whitestone Bridge", lat: 40.8007, lng: -73.83, kind: "bridge", pricing: 6.55 },
  { name: "GWB - George Washington", lat: 40.8517, lng: -73.9527, kind: "bridge", pricing: "pany" },
  { name: "Bayonne Bridge", lat: 40.6408, lng: -74.1445, kind: "bridge", pricing: "pany" },
  { name: "Goethals Bridge", lat: 40.6292, lng: -74.1974, kind: "bridge", pricing: "pany" },
  { name: "Outerbridge Crossing", lat: 40.525, lng: -74.265, kind: "bridge", pricing: "pany" },
  { name: "Queens Midtown Tunnel", lat: 40.744, lng: -73.964, kind: "tunnel", pricing: 7.46 },
  { name: "Hugh L Carey Tunnel (Battery)", lat: 40.6895, lng: -74.0165, kind: "tunnel", pricing: 7.46 },
  { name: "Lincoln Tunnel", lat: 40.7604, lng: -74.005, kind: "tunnel", pricing: "pany" },
  { name: "Holland Tunnel", lat: 40.727, lng: -74.0313, kind: "tunnel", pricing: "pany" },
];

export const PANYNJ_PEAK_2026 = 16.79;
export const PANYNJ_OFFPEAK_2026 = 14.79;
export const TOLL_RADIUS_BRIDGE_M = 300;
export const TOLL_RADIUS_TUNNEL_M = 500;
export const TOLL_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24h per toll

/** Great-circle distance in miles (R = 3958.8 mi). */
export function haversineMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  return haversineMiles(lat1, lng1, lat2, lng2) * 1609.34;
}

/** Spec: weekdays 6-10AM & 4-8PM peak; weekends 11AM-9PM peak. */
export function isPeak(now = new Date()): boolean {
  const day = now.getDay(); // 0 Sun … 6 Sat
  const h = now.getHours();
  if (day === 0 || day === 6) return h >= 11 && h < 21;
  return (h >= 6 && h < 10) || (h >= 16 && h < 20);
}

export function tollAmount(toll: TollPlaza, now = new Date()): number {
  if (toll.pricing === "pany") return isPeak(now) ? PANYNJ_PEAK_2026 : PANYNJ_OFFPEAK_2026;
  return toll.pricing;
}

/**
 * Returns the plaza just crossed whose 24h cooldown has expired, or null.
 * Bridge radius 300m, tunnel radius 500m.
 */
export function detectToll(
  lat: number,
  lng: number,
  lastTollTimes: Record<string, number>,
  now = new Date(),
): TollPlaza | null {
  const ts = now.getTime();
  for (const toll of TOLLS) {
    const radius = toll.kind === "bridge" ? TOLL_RADIUS_BRIDGE_M : TOLL_RADIUS_TUNNEL_M;
    const dist = haversineMeters(lat, lng, toll.lat, toll.lng);
    if (dist <= radius) {
      const last = lastTollTimes[toll.name] || 0;
      if (ts - last > TOLL_COOLDOWN_MS) return toll;
    }
  }
  return null;
}

// ── E-ZPass reconciliation ───────────────────────────────────────────
export type EzpStatus = "pending" | "reconciled" | "discrepancy";

/**
 * One GPS-detected toll crossing, kept pending until the driver matches
 * it against the E-ZPass monthly statement amount.
 */
export interface EzpTransaction {
  id: string;
  tollName: string;
  /** ISO timestamp of the crossing */
  timestamp: string;
  /** amount auto-detected via GPS (E-ZPass rate, never Pay-by-Mail) */
  detectedAmount: number;
  status: EzpStatus;
  /** amount copied from the E-ZPass statement, when reconciling */
  ezpassStatementAmount?: number;
}
