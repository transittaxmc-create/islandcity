// ── IslandCity Tip Tracker · mileage & GPS logic (IRS) ────────────────
// Spec DOC: LOGICA COMPLETA MILLAS LIGADAS A GPS + BREAK/LUNCH

export interface GPSPoint {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: string;
  address?: string;
  businessName?: string;
  placeType?: 'residence' | 'business' | 'airport' | 'hospital' | 'commercial' | 'other';
}

export interface BreakRecord {
  id: string;
  type: 'BREAK' | 'LUNCH';
  start: string;
  end?: string;
  duration?: number; // minutes
  startPoint: GPSPoint;
  endPoint?: GPSPoint;
  address: string;
  latLng: string;
}

export interface TripMileageIRS {
  tripId: string;
  date: string;
  pickup: GPSPoint & { address: string; businessName: string; type: string };
  dropoff: GPSPoint & { address: string; businessName: string; type: string };
  miles: number;
  routePolyline: GPSPoint[];
  tolls: {name: string; price: number; lat: number; lng: number; timestamp: string}[];
  breaksInBetween: BreakRecord[];
  purpose: string;
  isTaxDeductible: boolean;
}

// Haversine distance in miles
export function calculateHaversineMiles(
  p1: {lat:number,lng:number}, 
  p2: {lat:number,lng:number}
): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = (p2.lat - p1.lat) * Math.PI / 180;
  const dLon = (p2.lng - p1.lng) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(p1.lat * Math.PI/180) * Math.cos(p2.lat * Math.PI/180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Calculate total miles from polyline points
export function calculatePolylineMiles(polyline: GPSPoint[]): number {
  if (polyline.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < polyline.length; i++) {
    total += calculateHaversineMiles(polyline[i-1], polyline[i]);
  }
  return total;
}

// ── Reverse geocoding: TomTom (primary) → Nominatim (fallback) ────────
// TomTom Search API · 2,500 free requests/day with API key.
// Set VITE_TOMTOM_KEY in .env (already configured).
// Falls back to OpenStreetMap Nominatim if TomTom fails (no key, rate limit, offline).

const TT_KEY = (import.meta.env.VITE_TOMTOM_KEY as string | undefined) ?? "";

export type PlaceType = 'residence' | 'business' | 'airport' | 'hospital' | 'commercial' | 'other';

export interface GeocodeResult {
  businessName: string;   // empty for residence (we never show address-as-title)
  address: string;        // full street, city, state, zip
  placeType: PlaceType;
  city?: string;          // city/town for the GPS header bar
  lat: number;
  lng: number;
}

function classifyFromTomTom(addr: any): PlaceType {
  const poi = addr?.poi ?? {};
  const category: string = (poi.category ?? "").toString().toLowerCase();
  const group: string = (poi.categorySet?.[0]?.id ?? "").toString().toLowerCase();
  const entity: string = (addr?.entityType ?? "").toString().toLowerCase();
  if (category.includes("airport") || group === "airport" || entity === "aerodrome") return "airport";
  if (category.includes("hospital") || category.includes("medical") || group === "hospital" ||
      group === "health") return "hospital";
  if (category.includes("commercial") || category.includes("shop") || category.includes("restaurant") ||
      category.includes("cafe") || category.includes("amenity") || group === "commercial" ||
      group === "business" || group === "shop") return "business";
  if (entity === "house" || group === "residential" || group === "address" ||
      addr?.address?.streetName && !poi?.name) return "residence";
  return "other";
}

function classifyFromNominatim(data: any): PlaceType {
  const t: string = (data?.type ?? "").toLowerCase();
  const cls: string = (data?.class ?? "").toLowerCase();
  const cat: string = (data?.category ?? "").toLowerCase();
  if (cls === "aeroway" || t.includes("aerodrome") || t.includes("terminal")) return "airport";
  if (cls === "amenity" && (cat.includes("hospital") || cat.includes("clinic"))) return "hospital";
  if (cls === "shop" || cls === "amenity" || cls === "tourism" || cls === "leisure" ||
      cls === "office" || cls === "building" && cat !== "residential") return "business";
  if (cls === "building" && cat === "residential") return "residence";
  if (cls === "place" && (t === "house" || t === "residential")) return "residence";
  if (cls === "highway" || cls === "address") return "residence";
  return "other";
}

async function tomTomGeocode(lat: number, lng: number): Promise<GeocodeResult | null> {
  if (!TT_KEY) return null;
  const url = `https://api.tomtom.com/search/2/reverseGeocode/${lat},${lng}.json?key=${TT_KEY}&radius=150&limit=1&language=en-US`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 7000);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.addresses?.length) return null;
    const a = data.addresses[0];
    const poi = a.poi ?? {};
    const placeType = classifyFromTomTom(a);
    return {
      businessName: placeType === "residence" ? "" : (poi.name ?? a.address?.streetName ?? ""),
      address: a.address?.freeformAddress ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
      placeType,
      city: a.address?.municipality ?? a.address?.countrySubdivision ?? "",
      lat, lng,
    };
  } catch {
    clearTimeout(t);
    return null;
  }
}

async function nominatimGeocode(lat: number, lng: number): Promise<GeocodeResult | null> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 7000);
  try {
    const res = await fetch(url, {
      headers: { "Accept-Language": "en" },
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data) return null;
    const placeType = classifyFromNominatim(data);
    const a = data.address ?? {};
    return {
      businessName: placeType === "residence" ? "" : (a.attraction ?? a.amenity ?? a.shop ?? a.tourism ?? a.building ?? a.display_name?.split(",")[0] ?? ""),
      address: data.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
      placeType,
      city: a.city ?? a.town ?? a.village ?? a.county ?? "",
      lat, lng,
    };
  } catch {
    clearTimeout(t);
    return null;
  }
}

export async function reverseGeocode(lat: number, lng: number): Promise<GeocodeResult> {
  const tt = await tomTomGeocode(lat, lng);
  if (tt) return tt;
  const nom = await nominatimGeocode(lat, lng);
  if (nom) return nom;
  return {
    businessName: "",
    address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
    placeType: "other",
    city: "",
    lat, lng,
  };
}

// Get place type and icon based on coordinates
export function getPlaceIcon(placeType: string): string {
  switch(placeType) {
    case 'residence': return '🏠';
    case 'airport': return '✈️';
    case 'hospital': return '🏥';
    case 'commercial': return '🏢';
    default: return '📍';
  }
}

// Format break/lunch duration
export function formatBreakDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes/60)}h ${minutes%60}m`;
}