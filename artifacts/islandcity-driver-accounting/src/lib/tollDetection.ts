// IslandCity . toll detection engine (client-side, dev only)
// Status: FASE 1/2 lite. No backend. localStorage dedup. No production.

import GEOFENCES from "../data/tollGeofences.json";

export interface GPSPoint { lat: number; lng: number; accuracy: number; timestamp: number; speedMps?: number; }
export interface TollCandidate {
  toll_id: string; name: string; authority: string; crossing_type: string;
  road?: string; default_tariff_usd_cents: number | null;
  source_url: string; unverified: boolean;
  confidence: number; detected_at: number;
  detection_lat: number; detection_lng: number;
  detection_accuracy_m: number; bearing_deg: number; speed_mph: number;
  source_event_id: string; payload_hash: string;
}

const R_EARTH_M = 6371000;
const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

export function haversineMeters(a: {lat:number,lng:number}, b: {lat:number,lng:number}): number {
  const dLat = (b.lat - a.lat) * RAD;
  const dLng = (b.lng - a.lng) * RAD;
  const s = Math.sin(dLat/2)**2 + Math.cos(a.lat*RAD) * Math.cos(b.lat*RAD) * Math.sin(dLng/2)**2;
  return R_EARTH_M * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1-s));
}

export function bearingDeg(a: {lat:number,lng:number}, b: {lat:number,lng:number}): number {
  const dLng = (b.lng - a.lng) * RAD;
  const y = Math.sin(dLng) * Math.cos(b.lat*RAD);
  const x = Math.cos(a.lat*RAD) * Math.sin(b.lat*RAD) - Math.sin(a.lat*RAD) * Math.cos(b.lat*RAD) * Math.cos(dLng);
  return (Math.atan2(y, x) * DEG + 360) % 360;
}

export function bearingCompatible(actual: number, allowed: number[], tolerance = 35): boolean {
  return allowed.some(a => {
    const diff = Math.abs(((actual - a) + 540) % 360) - 180;
    return Math.abs(diff) <= tolerance;
  });
}

function sha256Hex(s: string): string {
  let h1 = 0xdeadbeef ^ s.length, h2 = 0x41c6ce57 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    const ch = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0).toString(16).padStart(8, "0") + (h1 >>> 0).toString(16).padStart(8, "0");
}

export function makeSourceEventId(tripId: string, tollId: string, detectedAtMs: number): string {
  return `evt-${tripId}-${tollId}-${Math.floor(detectedAtMs/1000)}`;
}

export function makePayloadHash(p: {lat:number;lng:number;accuracy:number;bearing:number;speed:number;detected_at:number}): string {
  return sha256Hex(`${p.lat.toFixed(6)}|${p.lng.toFixed(6)}|${p.accuracy.toFixed(1)}|${p.bearing.toFixed(1)}|${p.speed.toFixed(1)}|${p.detected_at}`);
}

// Main detection: pass a buffer of recent GPS points.
// Returns null if no crossing detected. Returns TollCandidate if confidence >= threshold.
export function detectTollCrossing(buffer: GPSPoint[], tripId: string, confidenceThreshold = 80): TollCandidate | null {
  if (buffer.length < 3) return null;
  const latest = buffer[buffer.length - 1];
  if (!latest || latest.accuracy > 50) return null;
  const speedMps = latest.speedMps ?? 0;
  const speedMph = speedMps * 2.23694;
  if (speedMph < 5 || speedMph > 85) return null;

  for (const g of GEOFENCES as any[]) {
    const dist = haversineMeters(latest, { lat: g.lat, lng: g.lng });
    if (dist > g.geofence_radius_m * 1.5) continue;

    let insideCount = 0;
    let sawOutsideBefore = false;
    for (let i = 0; i < buffer.length; i++) {
      const d = haversineMeters(buffer[i], { lat: g.lat, lng: g.lng });
      if (d <= g.geofence_radius_m) insideCount++;
      else if (i < buffer.length - 3) sawOutsideBefore = true;
    }
    if (insideCount < 2) continue;
    if (!sawOutsideBefore) continue;

    let outsidePoint: GPSPoint | null = null;
    for (let i = buffer.length - 2; i >= 0; i--) {
      if (haversineMeters(buffer[i], { lat: g.lat, lng: g.lng }) > g.geofence_radius_m) {
        outsidePoint = buffer[i];
        break;
      }
    }
    if (!outsidePoint) continue;
    const bear = bearingDeg(outsidePoint, latest);
    if (g.allowed_bearings && g.allowed_bearings.length && !bearingCompatible(bear, g.allowed_bearings)) continue;

    const accScore = latest.accuracy < 15 ? 100 : latest.accuracy < 25 ? 70 : latest.accuracy < 40 ? 40 : 10;
    const speedScore = speedMph >= 15 && speedMph <= 75 ? 100 : 50;
    const bearScore = bearingCompatible(bear, g.allowed_bearings) ? 100 : 50;
    const trajectoryScore = insideCount >= 3 ? 100 : 60;
    const conf = Math.round((accScore + speedScore + bearScore + trajectoryScore) / 4);
    if (conf < confidenceThreshold) continue;

    const detectedAt = latest.timestamp;
    return {
      toll_id: g.toll_id,
      name: g.name,
      authority: g.authority,
      crossing_type: g.crossing_type,
      road: g.road,
      default_tariff_usd_cents: g.default_tariff_usd_cents,
      source_url: g.source_url,
      unverified: !!g.unverified,
      confidence: conf,
      detected_at: detectedAt,
      detection_lat: latest.lat,
      detection_lng: latest.lng,
      detection_accuracy_m: latest.accuracy,
      bearing_deg: bear,
      speed_mph: speedMph,
      source_event_id: makeSourceEventId(tripId, g.toll_id, detectedAt),
      payload_hash: makePayloadHash({
        lat: latest.lat, lng: latest.lng, accuracy: latest.accuracy,
        bearing: bear, speed: speedMph, detected_at: detectedAt,
      }),
    };
  }
  return null;
}

// Cooldown helper (see tollStorage for persistence).
export const COOLDOWN_MS = 5 * 60 * 1000;
export function isDuplicate(lastDetectionAt: number | null, now: number = Date.now()): boolean {
  if (!lastDetectionAt) return false;
  return (now - lastDetectionAt) < COOLDOWN_MS;
}

