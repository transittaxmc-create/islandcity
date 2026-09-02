// ── IslandCity Tip Tracker · mileage & GPS logic (IRS) ────────────────
// Spec DOC: LOGICA COMPLETA MILLAS LIGADAS A GPS + BREAK/LUNCH

export interface GPSPoint {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: string;
  address?: string;
  businessName?: string;
  placeType?: 'residence' | 'business' | 'airport' | 'hospital' | 'commercial';
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

// Reverse geocode mock (replace with actual service in production)
export function reverseGeocode(lat: number, lng: number): Promise<{
  businessName: string;
  address: string;
  placeType: 'residence' | 'business' | 'airport' | 'hospital' | 'commercial';
}> {
  // In production, use reverse geocoding service like Mapbox or Google
  return Promise.resolve({
    businessName: "Detected Location",
    address: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
    placeType: 'business'
  });
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