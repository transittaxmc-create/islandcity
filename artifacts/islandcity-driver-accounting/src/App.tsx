import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Home, Banknote, ClipboardList, BarChart2, BookOpen, Receipt, FileText, Brain } from "lucide-react";
import { useUser } from "@clerk/react";
import MigrationInventory from "@/components/MigrationInventory";

type TurnStatus = "START" | "BREAK" | "END";
type Tab      = "DASHBOARD" | "TRIPS" | "EXPENSES" | "FINANCES" | "REPORTS" | "AI" | "INVENTORY";
type TripsTab = "ENTRY" | "REGISTER" | "LEDGER";

type TollEvent = {
  id: string;
  plaza: string;
  rate: number;
  at: string;
  timestamp: string;
  lat: number;
  lng: number;
  accuracy: number;
};

type Trip = {
  id: string;
  reference: string;
  earnings: number;
  tips: number;
  extra: number;
  otherCash: number;
  toll: number;
  fee: number;
  platform: string;
  pickup: string;
  dropoff: string;
  notes: string;
  grandTotal: number;
  time: string;
  date: string;
  timestamp: string;
  gps?: { lat: number; lng: number; acc?: number };
  miles?: number;    // GPS miles tracked during this trip via watchPosition polyline
  tollEvents?: TollEvent[];
  status: "pending" | "posted";
  reviewed: boolean;
  postedAt?: string;
};

type TripForm = {
  reference: string;
  earnings: string;
  tips: string;
  extraCash: string;
  otherCashIncome: string;
  toll: string;
  platformFee: string;
  platform: string;
  pickup: string;
  dropoff: string;
  pickupTimestamp: string;
  dropoffTimestamp: string;
  notes: string;
  tripDate: string; // YYYY-MM-DD — actual date the trip happened (editable for late entries)
  tripTime: string; // HH:MM     — actual time the trip happened (editable for late entries)
  tripMiles: string; // GPS miles accumulated by watchPosition during this trip
};

type GpsState = {
  lat: number | null;
  lng: number | null;
  acc: number | null;
  timestamp?: number;
  status: "inactive" | "searching" | "active" | "error";
};

type LocationCapture = {
  poiHeader: string;
  cityState: string;
  physicalAddress: string;
  coordinates: string;
  timestamp: string;
  category?: string;
  categoryIcon?: string;
  locationName?: string;
  terminal?: string;
  accuracyMeters?: number;
};

type HoursEntry = {
  date: string;
  hours: number;
  clockIn: string;
  clockOut: string;
  breakMs: number;
  miles?: number; // GPS-tracked shift miles (accumulated via haversine)
};

type Expense = {
  id: string;
  date: string;
  category: string;
  vendor: string;       // expense name (label kept for localStorage compat)
  amount: number;
  note: string;         // description (label kept for localStorage compat)
  type?: string;        // expense type (dropdown)
  verified?: boolean;   // audit flag
  frequency?: "none" | "daily" | "weekly" | "monthly"; // recurrence
  dueDate?: string;     // next due date for recurring expenses
  endDate?: string;     // stop projecting after this date (set by "Repeat until" feature)
  receiptDocId?: number; // cloud document ID — links to scanned receipt for audit trail
  purpose?: "business" | "personal"; // business expense (IRS deductible) or personal
};
type BankAdjEntry = { id: string; date: string; time: string; prevBalance: number; newBalance: number; note: string; };
type StatementTx = {
  date: string;
  description: string;
  vendor: string;
  amount: number;
  txType: "debit" | "credit";
  category: string;
  matchedExpenseId?: string;
};
type VoiceIntent = "trip" | "expense" | "clockIn" | "clockOut" | "break" | "cancel" | "unknown";
type VoiceResult = {
  transcript?: string;
  intent: VoiceIntent;
  confidence: "high" | "medium" | "low";
  fields: {
    platform?: string; pickup?: string; dropoff?: string;
    fare?: number; tips?: number; toll?: number; fee?: number; miles?: number; notes?: string;
    vendor?: string; amount?: number; category?: string; description?: string;
  };
};
type BroadcastEval = {
  id: string;
  timestamp: string;
  recommendation: "GO" | "SKIP" | "MAYBE";
  confidence: "high" | "medium" | "low";
  jobDetails: {
    pickup: string; dropoff: string; fare: string;
    distance: string; estimatedDuration: string; platform: string;
  };
  trafficNote: string;
  estimatedNetDollars: number;
  estimatedHourlyRate: number;
  factors: string[];
  tip: string;
  accepted?: boolean;
};
type DocEntry = {
  id: number; type: string;
  fileDate: string | null; category: string | null; vendor: string | null; amount: string | null;
  createdAt: string; objectPath: string;
};
// ── Toll plaza list — update rates each January ───────────────────────────
// Last updated: 2026 · E-ZPass · passenger car · per crossing
// Sources: MTA Bridges & Tunnels 2026; Port Authority 2026 schedule
// Port Authority peak = Mon–Fri 6–10 AM and 4–8 PM; weekends 11 AM–9 PM
const TOLL_YEAR = 2026;
const TOLL_RATES_LAST_VERIFIED = "2026-08-30";
const TOLL_RATE_REVIEW_INTERVAL_MS = 30 * 24 * 60 * 60 * 1000;
const TOLL_NOTES_HEADER = "E-ZPASS TOLLS:";
const TOLL_PLAZAS: {
  name: string; lat: number; lng: number;
  rate: number; offPeak?: number; type: string;
  directionality: "bidirectional" | "one-way";
  tollDirection: "both" | "eastbound-only";
}[] = [
  // ── MTA Bridges & Tunnels ─────────────────────────────────────────────
  { name: "Queens Midtown Tunnel",      lat: 40.7434, lng: -73.9637, rate: 7.46, type: "MTA", directionality: "bidirectional", tollDirection: "both" },
  { name: "Hugh L. Carey Tunnel",       lat: 40.6895, lng: -74.0149, rate: 7.46, type: "MTA", directionality: "bidirectional", tollDirection: "both" },
  { name: "RFK Bridge",                 lat: 40.7800, lng: -73.9500, rate: 7.46, type: "MTA", directionality: "bidirectional", tollDirection: "both" },
  { name: "Verrazzano-Narrows Bridge",  lat: 40.6066, lng: -74.0449, rate: 7.46, type: "MTA", directionality: "bidirectional", tollDirection: "both" },
  { name: "Whitestone Bridge",          lat: 40.7960, lng: -73.8305, rate: 7.46, type: "MTA", directionality: "bidirectional", tollDirection: "both" },
  { name: "Throgs Neck Bridge",         lat: 40.8010, lng: -73.7970, rate: 7.46, type: "MTA", directionality: "bidirectional", tollDirection: "both" },
  { name: "Henry Hudson Bridge",        lat: 40.8760, lng: -73.9300, rate: 3.42, type: "MTA", directionality: "bidirectional", tollDirection: "both" },
  { name: "Cross Bay Bridge",           lat: 40.5960, lng: -73.8400, rate: 2.80, type: "MTA", directionality: "bidirectional", tollDirection: "both" },
  { name: "Marine Parkway Bridge",      lat: 40.5800, lng: -73.8900, rate: 2.80, type: "MTA", directionality: "bidirectional", tollDirection: "both" },
  // ── Port Authority (peak / off-peak; collected entering New York only) ─
  { name: "Lincoln Tunnel",             lat: 40.7589, lng: -74.0060, rate: 16.79, offPeak: 14.79, type: "Port Authority", directionality: "one-way", tollDirection: "eastbound-only" },
  { name: "Holland Tunnel",             lat: 40.7260, lng: -74.0270, rate: 16.79, offPeak: 14.79, type: "Port Authority", directionality: "one-way", tollDirection: "eastbound-only" },
  { name: "George Washington Bridge",   lat: 40.8517, lng: -73.9527, rate: 16.79, offPeak: 14.79, type: "Port Authority", directionality: "one-way", tollDirection: "eastbound-only" },
  { name: "Goethals Bridge",            lat: 40.6400, lng: -74.1900, rate: 16.79, offPeak: 14.79, type: "Port Authority", directionality: "one-way", tollDirection: "eastbound-only" },
  { name: "Bayonne Bridge",             lat: 40.6400, lng: -74.1100, rate: 16.79, offPeak: 14.79, type: "Port Authority", directionality: "one-way", tollDirection: "eastbound-only" },
  { name: "Outerbridge Crossing",       lat: 40.5200, lng: -74.2500, rate: 16.79, offPeak: 14.79, type: "Port Authority", directionality: "one-way", tollDirection: "eastbound-only" },
];

function stripManagedTollNotes(notes: string): string {
  const lines = notes.split("\n");
  const headerIndex = lines.findIndex(line => line.trim() === TOLL_NOTES_HEADER);
  if (headerIndex < 0) return notes.trimEnd();

  const totalIndex = lines.findIndex(
    (line, index) => index > headerIndex && /^Total tolls:\s*\$\d+(?:\.\d{1,2})?\s*$/.test(line.trim())
  );
  let endIndex = totalIndex;
  if (endIndex < 0) {
    endIndex = headerIndex;
    while (endIndex + 1 < lines.length && lines[endIndex + 1].trim().startsWith("• ")) {
      endIndex += 1;
    }
  }

  return [...lines.slice(0, headerIndex), ...lines.slice(endIndex + 1)]
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function withTollBreakdown(notes: string, events: TollEvent[]): string {
  const personalNotes = stripManagedTollNotes(notes);
  if (events.length === 0) return personalNotes;
  const total = events.reduce((sum, event) => sum + event.rate, 0);
  const breakdown = [
    TOLL_NOTES_HEADER,
    ...events.map(event => `• ${event.at} — ${event.plaza} — $${event.rate.toFixed(2)}`),
    `Total tolls: $${total.toFixed(2)}`,
  ].join("\n");
  return personalNotes ? `${personalNotes}\n\n${breakdown}` : breakdown;
}

type TollDirectionPoint = { lat: number; lng: number };

function locationCapturePoint(capture: LocationCapture | null): TollDirectionPoint | null {
  const match = capture?.coordinates.match(/GPS\s+(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/i);
  if (!match) return null;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

function inferEastboundTravel(
  pickup: TollDirectionPoint | null,
  dropoff: TollDirectionPoint | null,
  previousGps: TollDirectionPoint | null,
  currentGps: TollDirectionPoint,
): boolean | null {
  const candidateSegments: Array<[TollDirectionPoint | null, TollDirectionPoint | null]> = [
    [pickup, dropoff],
    [pickup, currentGps],
    [previousGps, currentGps],
  ];

  for (const [from, to] of candidateSegments) {
    if (!from || !to || haversineKm(from.lat, from.lng, to.lat, to.lng) < 0.05) continue;
    const longitudeDelta = to.lng - from.lng;
    if (Math.abs(longitudeDelta) >= 0.0005) return longitudeDelta > 0;
  }
  return null;
}

const LOCATION_CATEGORIES = [
  "Hospital", "City", "Home", "Suburbs", "Office",
  "Airport", "Restaurant", "Train/Bus", "Hotel", "Tourist",
] as const;

const LOCATION_CATEGORY_ICONS: Record<string, string> = {
  Hospital: "🏥", City: "🏙", Home: "🏠", Suburbs: "🌳",
  Office: "🏢", Airport: "✈️", Restaurant: "🍽", "Train/Bus": "🚉",
  Hotel: "🏨", Tourist: "🌍",
};

const AIRPORTS = [
  { name: "JFK Airport", lat: 40.6413, lng: -73.7781 },
  { name: "LGA Airport", lat: 40.7769, lng: -73.874 },
  { name: "Newark Airport (EWR)", lat: 40.6895, lng: -74.1745 },
  { name: "ISP Airport", lat: 40.7952, lng: -73.1002 },
] as const;

const GPS_RELIABLE_ACCURACY_METERS = 100;

function requestFreshGpsPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 15000,
    });
  });
}

function extractTerminal(...values: string[]): string | undefined {
  const match = values.join(" ").match(/\b(?:terminal|term\.?)\s*#?\s*([A-Za-z0-9-]+)/i);
  return match ? `Terminal ${match[1]}` : undefined;
}

// IRS standard mileage rates by confirmed tax year — verify each year at irs.gov before filing.
// 2022 is intentionally excluded: IRS used two rates that year ($0.585 Jan–Jun, $0.625 Jul–Dec)
// and cannot be represented as a single per-mile constant without split-period mileage records.
const IRS_MILEAGE_RATES: Record<number, number> = {
  2023: 0.655,
  2024: 0.670,
  2025: 0.700,
};
// Sorted confirmed years (newest first) for the year selector — all rendered
const IRS_CONFIRMED_YEARS = Object.keys(IRS_MILEAGE_RATES).map(Number).sort((a, b) => b - a);

// IRS Schedule C–aligned categories for rideshare drivers
const EXPENSE_CATEGORIES = [
  "Vehicle & Fuel",
  "Maintenance & Repairs",
  "Technology & Equipment",
  "Tolls & Parking",
  "Insurance",
  "Phone & Data",
  "Supplies & Amenities",
  "Professional Services",
  "Other",
];

// Rideshare-specific expense types
const EXPENSE_TYPES = [
  "Gasoline / Fuel",
  "E-ZPass Replenishment",
  "Toll Payment",
  "Car Wash (single)",
  "Car Wash Membership",
  "Oil Change",
  "Tire Service",
  "Brake Service",
  "Vehicle Inspection",
  "Dashboard Camera",
  "Phone Mount / Holder",
  "Phone Charger / Cable",
  "Air Freshener",
  "Water & Snacks (passengers)",
  "Cleaning Supplies",
  "Parking Fee",
  "Vehicle Insurance",
  "Rideshare Insurance Rider",
  "Phone Plan (business %)",
  "Vehicle Registration",
  "Background Check Fee",
  "First Aid Kit",
  "Other",
];

// ── #11 — Pre-loaded NYC rideshare vendor list ───────────────────
const NYC_DEFAULT_VENDORS = [
  // Gas stations
  "BP","Shell","Sunoco","Exxon","Mobil","Gulf","Hess","Citgo","GetGo",
  // Car wash
  "Mister Car Wash","Mike's Car Wash","Delta Sonic","Super Suds",
  // Auto service
  "Jiffy Lube","Midas","Firestone","Pep Boys","AutoZone","O'Reilly Auto Parts","Mavis Tires",
  // Tolls & EZPass
  "E-ZPass NY","Port Authority Toll","MTA Bridges & Tunnels","NJ Turnpike","Garden State Pkwy",
  // Platform fees
  "Uber Service Fee","Lyft Service Fee","Via Fee","Juno Fee",
  // Insurance
  "Progressive","Geico","State Farm","Allstate","New York Black Car Fund (NYBCF)",
  // Phone & data
  "Verizon Wireless","AT&T","T-Mobile","Metro by T-Mobile",
  // Parking
  "NYC Parking Meter","LAZ Parking","SP+ Parking","QuikPark","Icon Parking",
  // Food & essentials
  "Dunkin","7-Eleven","Wawa","McDonald's","Starbucks","Costco","BJ's Wholesale",
  // Supplies
  "Amazon (vehicle supplies)","Walmart","Target","Dollar Tree",
];

const STATE_ABBR: Record<string, string> = {
  "New York": "NY", "New Jersey": "NJ", "Connecticut": "CT",
  "Pennsylvania": "PA", "Florida": "FL", "California": "CA",
  "Massachusetts": "MA", "Texas": "TX", "Illinois": "IL",
  "Georgia": "GA", "Maryland": "MD", "Virginia": "VA",
  "North Carolina": "NC", "Ohio": "OH", "Michigan": "MI",
};

async function reverseGeocodeRich(
  lat: number, lng: number, signal?: AbortSignal, capturedAt = new Date(), selectedCategory?: string,
  accuracyMeters?: number
): Promise<LocationCapture> {
  // 1. Airport proximity (within 5 km → likely at the airport)
  let nearAirport: { name: string; dist: number } | null = null;
  for (const ap of AIRPORTS) {
    const d = haversineKm(lat, lng, ap.lat, ap.lng);
    if (d < 5 && (!nearAirport || d < nearAirport.dist))
      nearAirport = { name: ap.name, dist: d };
  }

  // 2. TomTom runs server-side so its API key never reaches the browser.
  const params = new URLSearchParams({ lat: String(lat), lng: String(lng) });
  const res = await fetch(`/api/geocode?${params.toString()}`, { signal });
  if (!res.ok) throw new Error(`Geocode request failed: ${res.status}`);
  const data = await res.json() as {
    ok: boolean;
    address?: {
      freeformAddress?: string;
      streetNumber?: string;
      streetName?: string;
      municipalitySubdivision?: string;
      municipality?: string;
      countrySubdivision?: string;
      postalCode?: string;
      borough?: string;
    };
    poi?: {
      name: string;
      categories: string[];
      distanceMeters?: number;
    } | null;
  };
  if (!data.ok) throw new Error("Geocode response was not ok");

  const addr = data.address || {};
  const poi = data.poi;
  const categories = (poi?.categories || []).map(category => category.toLowerCase());
  const coordText = `GPS ${lat.toFixed(4)}, ${lng.toFixed(4)}`;

  // 3. Build the independent POI/category header.
  let poiHeader = "🏡 Residencial";
  if (poi && categories.some(category => category.includes("airport"))) {
    poiHeader = `✈️ ${poi.name}`;
  } else if (nearAirport && nearAirport.dist < 2) {
    // Within 2 km of known airport → airport name
    poiHeader = `✈️ ${nearAirport.name}`;
  } else if (poi && categories.some(category => category.includes("hospital"))) {
    poiHeader = `🏥 ${poi.name}`;
  } else if (poi && (poi.distanceMeters ?? Infinity) <= 80) {
    const icon =
      categories.some(category => category.includes("hotel")) ? "🏨" :
      categories.some(category => category.includes("restaurant") || category.includes("food")) ? "🍽" :
      categories.some(category => category.includes("gas") || category.includes("petrol")) ? "⛽" :
      categories.some(category => category.includes("parking")) ? "🅿" :
      "🏬";
    poiHeader = `${icon} ${poi.name}`;
  }

  // 4. Build the complete physical address independently of the header.
  const street = [addr.streetNumber, addr.streetName].filter(Boolean).join(" ");
  const locality = [addr.borough || addr.municipalitySubdivision, addr.municipality]
    .filter((part, index, all) => Boolean(part) && all.indexOf(part) === index);
  const state = addr.countrySubdivision
    ? (STATE_ABBR[addr.countrySubdivision] || addr.countrySubdivision)
    : "";
  const region = [state, addr.postalCode].filter(Boolean).join(" ");
  const cityState = [addr.municipality || addr.municipalitySubdivision, state]
    .filter((part, index, all) => Boolean(part) && all.indexOf(part) === index)
    .join(", ") || "City / state unavailable";
  const structuredAddress = [street, ...locality, region].filter(Boolean).join(", ");
  const physicalAddress = (
    street ? structuredAddress : (addr.freeformAddress || [...locality, region].filter(Boolean).join(", "))
  ) || "Dirección no disponible";

  const categoryIcon = selectedCategory ? (LOCATION_CATEGORY_ICONS[selectedCategory] || "📌") : poiHeader.split(" ")[0];
  const categoryTerms: Record<string, string[]> = {
    Hospital: ["hospital", "clinic", "medical"],
    Airport: ["airport"],
    Restaurant: ["restaurant", "food"],
    "Train/Bus": ["train", "railway", "bus", "transit", "transport"],
    Hotel: ["hotel", "motel", "hostel"],
    Tourist: ["tourist", "attraction", "landmark", "museum"],
    Office: ["office", "business"],
    Home: ["residential"],
  };
  const matchingPoi = selectedCategory && categoryTerms[selectedCategory]
    ? categories.some(category => categoryTerms[selectedCategory].some(term => category.includes(term)))
    : false;
  const locationName = selectedCategory
    ? (selectedCategory === "Airport"
      ? (poi && categories.some(category => category.includes("airport"))
        ? poi.name
        : (nearAirport && nearAirport.dist < 2 ? nearAirport.name : "Airport"))
      : (matchingPoi ? poi?.name : undefined) || selectedCategory)
    : poiHeader.replace(/^\S+\s*/, "");
  const terminal = selectedCategory === "Airport"
    ? (extractTerminal(poi?.name || "", physicalAddress) || "Terminal # unavailable")
    : undefined;

  return {
    poiHeader: `${categoryIcon} ${locationName}`,
    cityState,
    physicalAddress,
    coordinates: coordText,
    timestamp: formatLocationTimestamp(capturedAt),
    category: selectedCategory,
    categoryIcon,
    locationName,
    terminal,
    accuracyMeters,
  };
}

function formatLocationTimestamp(date: Date): string {
  const weekdays = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const hours = date.getHours();
  const hour12 = hours % 12 || 12;
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${weekdays[date.getDay()]} ${String(date.getDate()).padStart(2, "0")} ${months[date.getMonth()]} ${date.getFullYear()} · ${hour12}:${minute} ${hours >= 12 ? "PM" : "AM"}`;
}

function fallbackLocationCapture(
  lat: number | null, lng: number | null, capturedAt: Date, selectedCategory?: string,
  accuracyMeters?: number | null
): LocationCapture {
  const categoryIcon = selectedCategory ? (LOCATION_CATEGORY_ICONS[selectedCategory] || "📌") : "🏡";
  const locationName = selectedCategory || "Residencial";
  const hasCoordinates = lat !== null && lng !== null;
  return {
    poiHeader: `${categoryIcon} ${locationName}`,
    cityState: "City / state unavailable",
    physicalAddress: selectedCategory ? `${locationName} · enter address in Directions` : "Dirección no disponible",
    coordinates: hasCoordinates ? `GPS ${lat.toFixed(4)}, ${lng!.toFixed(4)}` : "GPS unavailable",
    timestamp: formatLocationTimestamp(capturedAt),
    category: selectedCategory,
    categoryIcon,
    locationName,
    terminal: selectedCategory === "Airport" ? "Terminal # unavailable" : undefined,
    accuracyMeters: accuracyMeters ?? undefined,
  };
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

type PlatformMeta = { initial: string; bg: string; tags: string[]; note?: string; logo?: string; logoBg?: string };

const TAG_STYLES: Record<string, string> = {
  "ACCESS-A-RIDE": "bg-[#dbeafe] text-[#1e40af] border-[#bfdbfe]",
  "VOUCHER":        "bg-[#f3f4f6] text-[#374151] border-[#e5e7eb]",
  "PRIVATE":        "bg-[#1f2937] text-[#d1d5db] border-[#374151]",
  "TAX":            "bg-[#fef3c7] text-[#92400e] border-[#fde68a]",
};

const platformMeta: Record<string, PlatformMeta> = {
  "EcoRide - 10% fee": { initial: "E", bg: "bg-[#22c55e]", tags: ["ACCESS-A-RIDE", "VOUCHER"] },
  "EcoRide":           { initial: "E", bg: "bg-[#22c55e]", logoBg: "bg-white", tags: ["ACCESS-A-RIDE", "VOUCHER"], logo: "/logos/ecoride.jpg" },
  "Uber":              { initial: "U", bg: "bg-white",     logoBg: "bg-white", tags: [], logo: "/logos/uber.jpg" },
  "Lyft":              { initial: "L", bg: "bg-[#ff00bf]", logoBg: "bg-[#ff00bf]", tags: [], logo: "/logos/lyft.jpg" },
  "Empower":           { initial: "E", bg: "bg-[#1a1a1a]", logoBg: "bg-[#1a1a1a]", tags: [], logo: "/logos/empower.jpg" },
  "Gallant":           { initial: "G", bg: "bg-[#f97316]", logoBg: "bg-white", tags: ["VOUCHER"], logo: "/logos/gallant.jpg" },
  "Aventus Ride":      { initial: "A", bg: "bg-[#1a3d25]", logoBg: "bg-[#1a3d25]", tags: ["VOUCHER"], logo: "/logos/aventus.jpg" },
  "Classic Ryde":      { initial: "CR", bg: "bg-[#14b8a6]", logoBg: "bg-white", tags: ["VOUCHER"], logo: "/logos/classicryde-new.svg" },
  "Aki Technology":    { initial: "AKI", bg: "bg-[#0ea5e9]", logoBg: "bg-[#0ea5e9]", tags: ["ACCESS-A-RIDE", "VOUCHER"], note: "Medical", logo: "/logos/aki.jpg" },
  "Street Hail":       { initial: "SH", bg: "bg-[#6b7280]", tags: [], logo: "/logos/streethail.png" },
  "Island City Transit": { initial: "ICT", bg: "bg-[#0d1b2e]", logoBg: "bg-black", tags: ["PRIVATE"], logo: "/logos/islandcity.jpg" },
  "Transit Tax":       { initial: "TT", bg: "bg-black",     logoBg: "bg-black", tags: ["TAX"], logo: "/logos/transittax.png" },
  "Throo":             { initial: "T",  bg: "bg-[#0e1e30]", logoBg: "bg-white", tags: [], logo: "/logos/throo.jpg" },
  "Brakha Group":      { initial: "BG", bg: "bg-[#1e2d6b]", logoBg: "bg-white", tags: ["TAX"], logo: "/logos/brakha.jpg" },
  "TBZI Luxury":       { initial: "TB", bg: "bg-[#0d1b2e]", logoBg: "bg-white", tags: [], logo: "/logos/tbzi.jpg" },
  "Other":             { initial: "O",   bg: "bg-[#9ca3af]", tags: [] },
};

const getPlatformMeta = (name: string): PlatformMeta =>
  platformMeta[name] || { initial: name[0]?.toUpperCase() || "O", bg: "bg-[#9ca3af]", tags: [] };

const getTagStyle = (tag: string) => TAG_STYLES[tag] || "bg-[#f3f4f6] text-[#374151] border-[#e5e7eb]";

// No seed/sample data — app always starts empty so real driver data is never
// mixed with test entries. Storage initializers fall back to [] when storage
// is missing or invalid.
const initialTrips: Trip[] = [];
const initialExpenses: Expense[] = [];

function formatHHMMSS(ms: number) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function toYYYYMMDD(d: Date) {
  return d.toISOString().slice(0, 10);
}

function LogoIcon({ className = "" }: { className?: string }) {
  // Bridge + skyline inspired by IslandCity Transport Services brand mark
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className}>
      {/* Water / road sweep */}
      <path d="M4 35 Q12 31 24 33 Q36 35 44 31" stroke="url(#lg)" strokeWidth="1.4" strokeLinecap="round" fill="none" opacity="0.7"/>
      <path d="M6 38 Q16 34 24 36 Q34 38 42 34" stroke="url(#lg)" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.4"/>

      {/* Bridge left tower */}
      <rect x="8" y="18" width="2" height="14" fill="url(#lg)" rx="0.5"/>
      {/* Bridge right tower */}
      <rect x="22" y="20" width="2" height="12" fill="url(#lg)" rx="0.5"/>
      {/* Bridge deck */}
      <path d="M4 30 H26" stroke="url(#lg)" strokeWidth="1.2" strokeLinecap="round"/>
      {/* Bridge cables left tower */}
      <path d="M9 18 L4 30" stroke="url(#lg)" strokeWidth="0.8" opacity="0.8"/>
      <path d="M9 18 L14 30" stroke="url(#lg)" strokeWidth="0.8" opacity="0.8"/>
      <path d="M9 18 L19 30" stroke="url(#lg)" strokeWidth="0.8" opacity="0.8"/>
      {/* Bridge cables right tower */}
      <path d="M23 20 L14 30" stroke="url(#lg)" strokeWidth="0.8" opacity="0.8"/>
      <path d="M23 20 L26 30" stroke="url(#lg)" strokeWidth="0.8" opacity="0.8"/>

      {/* City skyline (right side) */}
      <rect x="28" y="26" width="3" height="6" fill="url(#lg)" rx="0.3" opacity="0.9"/>
      <rect x="32" y="22" width="3" height="10" fill="url(#lg)" rx="0.3" opacity="0.9"/>
      {/* Empire State style spire */}
      <rect x="36" y="18" width="3" height="14" fill="url(#lg)" rx="0.3"/>
      <rect x="37" y="14" width="1.2" height="5" fill="url(#lg)" rx="0.3"/>
      <rect x="40" y="24" width="3" height="8" fill="url(#lg)" rx="0.3" opacity="0.9"/>
      <rect x="44" y="27" width="2" height="5" fill="url(#lg)" rx="0.3" opacity="0.8"/>

      <defs>
        <linearGradient id="lg" x1="4" y1="14" x2="44" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f6dd8c"/>
          <stop offset="100%" stopColor="#b8860b"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

function PlatformAvatar({
  meta,
  size = "sm",
}: {
  meta: PlatformMeta;
  size?: "sm" | "md" | "lg";
}) {
  const base = import.meta.env.BASE_URL ?? "/";
  const dim = size === "lg" ? "w-8 h-8" : size === "md" ? "w-6 h-6" : "w-5 h-5";
  const textSize = size === "lg" ? "text-[11px]" : "text-[9px]";

  if (meta.logo) {
    const src = base.replace(/\/$/, "") + meta.logo;
    return (
      <span
        className={`${dim} rounded-full ${meta.logoBg ?? "bg-white"} flex items-center justify-center shrink-0 overflow-hidden border border-white/10`}
      >
        <img src={src} alt="" className={`w-full h-full ${(meta.logoBg && meta.logoBg !== "bg-white") ? "object-cover" : "object-contain"}`} />
      </span>
    );
  }
  return (
    <span
      className={`${dim} rounded-full ${meta.bg} flex items-center justify-center text-white ${textSize} font-bold shrink-0`}
    >
      {meta.initial}
    </span>
  );
}

// ── One-time clean slate ──────────────────────────────────────────────────────
// Change this version string any time you need a forced wipe.
// The app checks on every load; if the stored version differs, it clears all
// data keys and sets the new version — then normal initialization runs fresh.
// One-time reset: bump version string below to wipe all data on the next load.
// After clearing it forces a real page reload so React can't write stale
// in-memory state back into the freshly-cleared localStorage.
const CLEAN_SLATE_VERSION = "2026-08-12-v7";
(function enforceCleanSlate() {
  try {
    if (localStorage.getItem("ic-app-version") !== CLEAN_SLATE_VERSION) {
      // Flag checked by the pagehide/visibilitychange flush listener so it does NOT
      // write stale React state back into the just-cleared storage during the reload.
      (window as any).__ic_wiping = true;
      // localStorage.clear() — nukes everything, no partial key list that can miss entries.
      // Set version immediately after so the next load sees a match and skips the wipe.
      localStorage.clear();
      localStorage.setItem("ic-app-version", CLEAN_SLATE_VERSION);
      window.location.reload();
    }
  } catch {}
})();

function createUserStorage(userId: string): Storage {
  const prefix = `ic-user:${userId}:`;
  const scopedKeys = () => Object.keys(window.localStorage).filter(key => key.startsWith(prefix));
  return {
    get length() { return scopedKeys().length; },
    clear() {
      for (const key of scopedKeys()) window.localStorage.removeItem(key);
    },
    getItem(key: string) {
      return window.localStorage.getItem(prefix + key);
    },
    key(index: number) {
      const fullKey = scopedKeys()[index];
      return fullKey ? fullKey.slice(prefix.length) : null;
    },
    removeItem(key: string) {
      window.localStorage.removeItem(prefix + key);
    },
    setItem(key: string, value: string) {
      window.localStorage.setItem(prefix + key, value);
    },
  };
}

export default function App() {
  const { user } = useUser();
  const userId = user!.id;
  const localStorage = useMemo(() => createUserStorage(userId), [userId]);
  const tripsStorageKey = "island-city-trips";
  const expensesStorageKey = "island-city-expenses";
  const hoursStorageKey = "island-city-hours";
  const lastSavedStorageKey = "island-city-last-saved";
  const tripsCountStorageKey = "island-city-trips-count";
  const [activeTab,  setActiveTab]  = useState<Tab>("DASHBOARD");
  const [tripsTab,   setTripsTab]   = useState<TripsTab>("ENTRY");
  const [goal, setGoal] = useState<number>(() => {
    try { return parseInt(localStorage.getItem("ic-hourly-goal") || "60") || 60; } catch { return 60; }
  });
  const [finPage, setFinPage] = useState(0);
  const finScrollRef = useRef<HTMLDivElement>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date());
  const tollRatesLastVerifiedDate = new Date(`${TOLL_RATES_LAST_VERIFIED}T12:00:00`);
  const tollRatesNeedReview =
    currentTime.getTime() - tollRatesLastVerifiedDate.getTime() > TOLL_RATE_REVIEW_INTERVAL_MS;

  const [trips, setTrips] = useState<Trip[]>(() => {
    try {
      const raw = localStorage.getItem(tripsStorageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0)
          return parsed.map((t: Trip) => ({
            ...t,
            status: t.status ?? ("pending" as const),
            reviewed: t.reviewed ?? false,
          }));
      }
    } catch {}
    return initialTrips;
  });

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    try {
      const raw = localStorage.getItem(expensesStorageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return initialExpenses;
  });

  const [hoursLog, setHoursLog] = useState<HoursEntry[]>(() => {
    try {
      const raw = localStorage.getItem(hoursStorageKey);
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  });

  // Settings / reset panel
  const [showSettings,     setShowSettings]     = useState(false);
  const [resetStep,        setResetStep]        = useState<0|1|2>(0); // 0=idle 1=confirm 2=done

  // Import-backup preview (parsed payload waits for user confirmation)
  type ImportPreview = {
    data: {
      trips: Trip[]; expenses: Expense[]; hoursLog: HoursEntry[];
      customExpenseTypes?: string[]; customExpenseCategories?: string[];
      customVendors?: string[];
      dailyGoal?: number; workDays?: number[];
      dayTargets?: Record<number,number>;
      bankBalance?: number; bankAdjHistory?: BankAdjEntry[];
    };
    tripCount: number; expenseCount: number; dayCount: number;
  };
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);

  // Shift clock — persisted to localStorage so iOS Safari reloads don't kill the active timer
  const [clockInTime, setClockInTime] = useState<Date | null>(() => {
    try {
      const today = new Date().toISOString().slice(0,10);
      if (localStorage.getItem("ic-shift-date") !== today) return null;
      const ci = localStorage.getItem("ic-shift-clock-in");
      return ci ? new Date(ci) : null;
    } catch { return null; }
  });
  const [totalBreakMs, setTotalBreakMs] = useState<number>(() => {
    try {
      const today = new Date().toISOString().slice(0,10);
      if (localStorage.getItem("ic-shift-date") !== today) return 0;
      return parseInt(localStorage.getItem("ic-shift-break-ms") || "0") || 0;
    } catch { return 0; }
  });
  const [isOnBreak, setIsOnBreak] = useState<boolean>(() => {
    try {
      const today = new Date().toISOString().slice(0,10);
      if (localStorage.getItem("ic-shift-date") !== today) return false;
      return localStorage.getItem("ic-shift-on-break") === "true";
    } catch { return false; }
  });
  const [breakStart, setBreakStart] = useState<Date | null>(() => {
    try {
      const today = new Date().toISOString().slice(0,10);
      if (localStorage.getItem("ic-shift-date") !== today) return null;
      const bs = localStorage.getItem("ic-shift-break-start");
      return bs ? new Date(bs) : null;
    } catch { return null; }
  });
  const [shiftActive, setShiftActive] = useState<boolean>(() => {
    try {
      const today = new Date().toISOString().slice(0,10);
      if (localStorage.getItem("ic-shift-date") !== today) return false;
      return localStorage.getItem("ic-shift-active") === "true";
    } catch { return false; }
  });
  const [lastShiftDate, setLastShiftDate] = useState<string>(() => {
    try { return localStorage.getItem("ic-last-shift-date") || ""; } catch { return ""; }
  });
  const watchIdRef  = useRef<number | null>(null);
  const prevGpsRef  = useRef<{ lat: number; lng: number } | null>(null);
  // ── Per-trip GPS mileage tracking ────────────────────────────────────────
  const tripWatchIdRef  = useRef<number | null>(null);
  const tripPrevGpsRef  = useRef<{ lat: number; lng: number } | null>(null);
  const tripMilesRef    = useRef<number>(0); // mutable accumulator — avoids stale closures
  const [tripTracking,      setTripTracking]      = useState(false);
  const [tripMilesDisplay,  setTripMilesDisplay]  = useState(0);
  // Miles accumulated from GPS during the active shift — date-guarded, persisted alongside other shift keys
  const [shiftMiles, setShiftMiles] = useState<number>(() => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      if (localStorage.getItem("ic-shift-date") !== today) return 0;
      return parseFloat(localStorage.getItem("ic-shift-miles") || "0") || 0;
    } catch { return 0; }
  });
  const [gps, setGps] = useState<GpsState>({ lat: null, lng: null, acc: null, status: "inactive" });
  const [gpsAddress, setGpsAddress] = useState("");
  const [gpsAirport, setGpsAirport] = useState("");

  const [showPickupMenu, setShowPickupMenu] = useState(false);
  const [showDropoffMenu, setShowDropoffMenu] = useState(false);
  const [pickupResolving, setPickupResolving] = useState(false);
  const [dropoffResolving, setDropoffResolving] = useState(false);
  const [pickupLocationCapture, setPickupLocationCapture] = useState<LocationCapture | null>(null);
  const [dropoffLocationCapture, setDropoffLocationCapture] = useState<LocationCapture | null>(null);
  const [selectedForPost, setSelectedForPost] = useState<Set<string>>(new Set());

  // Toll detection
  const [detectedToll, setDetectedToll] = useState<{ plaza: string; rate: number; at: string } | null>(null);
  const [tollManuallyEdited, setTollManuallyEdited] = useState(false);
  const [tripTollEvents, setTripTollEvents] = useState<TollEvent[]>([]);
  const tripTollEventsRef = useRef<TollEvent[]>([]);
  const lastDetectedPlazaRef = useRef<string | null>(null);
  const tollPreviousGpsRef = useRef<TollDirectionPoint | null>(null);

  const replaceTripTollEvents = (events: TollEvent[]) => {
    tripTollEventsRef.current = events;
    setTripTollEvents(events);
  };

  // Refs that always hold the latest state — used by the iOS pagehide/
  // visibilitychange listener so it never captures a stale closure.
  const tripsRef     = useRef<Trip[]>([]);
  const expensesRef  = useRef<Expense[]>([]);
  const hoursLogRef  = useRef<HoursEntry[]>([]);

  // Storage state
  const [lastSavedAt, setLastSavedAt] = useState<string>(() => {
    try { return localStorage.getItem(lastSavedStorageKey) || "—"; } catch { return "—"; }
  });
  const [storageVerified, setStorageVerified] = useState(false);
  const [storageBytes, setStorageBytes] = useState(0);


  const [tripForm, setTripForm] = useState<TripForm>(() => {
    return {
      reference: "", earnings: "", tips: "", extraCash: "", otherCashIncome: "", toll: "",
      platformFee: "", platform: "Uber", pickup: "", dropoff: "",
      pickupTimestamp: "", dropoffTimestamp: "", notes: "",
      tripDate: toYYYYMMDD(new Date()),
      tripTime: new Date().toTimeString().slice(0, 5),
      tripMiles: "",
    };
  });
  const entryDateManuallySetRef = useRef(false);
  const entryTimeManuallySetRef = useRef(false);
  const entryAutoDayRef = useRef(toYYYYMMDD(new Date()));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showPlatformDropdown, setShowPlatformDropdown] = useState(false);
  const [inlineEditId, setInlineEditId] = useState<string | null>(null);
  const [cloudBackupAt, setCloudBackupAt] = useState<Date | null>(() => {
    try { const r = localStorage.getItem("ic-last-cloud-backup"); return r ? new Date(r) : null; } catch { return null; }
  });
  const [githubPushAt, setGithubPushAt] = useState<Date | null>(() => {
    try { const r = localStorage.getItem("ic-last-github-push"); return r ? new Date(r) : null; } catch { return null; }
  });
  const [githubPushing, setGithubPushing] = useState(false);
  const [claimingLegacyBackups, setClaimingLegacyBackups] = useState(false);
  const [legacyClaimResolved, setLegacyClaimResolved] = useState(false);
  const [documents,    setDocuments]    = useState<DocEntry[]>([]);
  const [docsLoading,  setDocsLoading]  = useState(false);
  const [showDocuments, setShowDocuments] = useState(false);
  const [viewingDoc,   setViewingDoc]   = useState<DocEntry | null>(null);
  const [inlineForm, setInlineForm] = useState({
    pickup: "", dropoff: "", earnings: "", reference: "", toll: "", notes: "",
  });

  // Expense form
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expPeriod, setExpPeriod] = useState<'DAY'|'WEEK'|'MONTH'|'YEAR'|'ALL'>('MONTH');
  const [expBudgets, setExpBudgets] = useState<Record<string, number>>(() => {
    try { return JSON.parse(localStorage.getItem("ic-exp-budgets") || "{}"); } catch { return {}; }
  });
  const [showBudgetEditor, setShowBudgetEditor] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    name: "", type: "Gasoline / Fuel", category: "Vehicle & Fuel",
    description: "", amount: "", date: new Date().toISOString().slice(0, 10),
    frequency: "none" as "none" | "daily" | "weekly" | "monthly",
    dueDate: "",
    purpose: "business" as "business" | "personal",
  });
  const [editingExpenseId,   setEditingExpenseId]   = useState<string | null>(null);
  const [scanningReceipt,     setScanningReceipt]     = useState(false);
  const [receiptScanError,    setReceiptScanError]    = useState<string | null>(null);
  const [pendingReceiptDocId, setPendingReceiptDocId] = useState<number | null>(null);
  const receiptInputRef = useRef<HTMLInputElement>(null);
  const statementInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaChunksRef   = useRef<BlobPart[]>([]);
  const broadcastInputRef = useRef<HTMLInputElement>(null);
  const geminiEndRef      = useRef<HTMLDivElement>(null);
  const limoInputRef      = useRef<HTMLInputElement>(null);
  const limoDragRef       = useRef<{ startX: number; startY: number; px: number; py: number } | null>(null);

  // Custom expense types & categories (user-added items, persisted)
  const [customExpenseTypes, setCustomExpenseTypes] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("ic-custom-exp-types") || "[]"); } catch { return []; }
  });
  const [customExpenseCategories, setCustomExpenseCategories] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("ic-custom-exp-cats") || "[]"); } catch { return []; }
  });
  const [customVendors, setCustomVendors] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("ic-custom-vendors") || "[]"); } catch { return []; }
  });
  const [addingCustomType,   setAddingCustomType]   = useState(false);
  const [addingCustomCat,    setAddingCustomCat]    = useState(false);
  const [addingCustomVendor, setAddingCustomVendor] = useState(false);
  const [newCustomType,   setNewCustomType]   = useState("");
  const [newCustomCat,    setNewCustomCat]    = useState("");
  const [newCustomVendor, setNewCustomVendor] = useState("");

  // FINANCES — goal + working days + per-day targets (persisted)
  const [dailyGoal, setDailyGoal] = useState<number>(() => {
    try { return parseInt(localStorage.getItem("ic-daily-goal") || "400") || 400; } catch { return 400; }
  });
  const [workDays, setWorkDays] = useState<number[]>(() => {
    try { return JSON.parse(localStorage.getItem("ic-work-days") || "[1,2,3,4,5]"); } catch { return [1,2,3,4,5]; }
  });
  // Per-day income targets: key = ISO day (1=Mon…7=Sun), value = planned $ for that day
  const [dayTargets, setDayTargets] = useState<Record<number,number>>(() => {
    try { return JSON.parse(localStorage.getItem("ic-day-targets") || "{}"); } catch { return {}; }
  });

  // Bank balance + adjustment history
  const [bankBalance, setBankBalance] = useState<number>(() => {
    try { return parseFloat(localStorage.getItem("ic-bank-balance") || "0") || 0; } catch { return 0; }
  });
  const [bankAdjHistory, setBankAdjHistory] = useState<BankAdjEntry[]>(() => {
    try { return JSON.parse(localStorage.getItem("ic-bank-adj-history") || "[]"); } catch { return []; }
  });
  const [bankEditing, setBankEditing] = useState(false);
  const [bankEditVal, setBankEditVal] = useState("");
  const [bankEditNote, setBankEditNote] = useState("");

  // Recurring income plan: snapshot of workDays + dayTargets spread to future weeks until untilDate
  const [recurringPlan, setRecurringPlan] = useState<{enabled:boolean; workDays:number[]; dayTargets:Record<number,number>; untilDate:string}>(() => {
    try {
      const raw = localStorage.getItem("ic-recurring-plan");
      return raw ? JSON.parse(raw) : {enabled:false, workDays:[], dayTargets:{}, untilDate:""};
    } catch { return {enabled:false, workDays:[], dayTargets:{}, untilDate:""}; }
  });
  // UI: whether the date picker for the repeat checkbox is open
  const [showRepeatIncomePicker, setShowRepeatIncomePicker] = useState(false);
  const [repeatIncomeUntil, setRepeatIncomeUntil] = useState("");

  // Week-level income overrides for individual week exceptions (key = Monday YYYY-MM-DD)
  const [weekOverrides, setWeekOverrides] = useState<Record<string, {workDays: number[], dayTargets: Record<number, number>}>>(() => {
    try { return JSON.parse(localStorage.getItem("ic-week-overrides") || "{}"); } catch { return {}; }
  });

  // Projected expense quick-add form (Finances → Projections page)
  const [showProjExpForm, setShowProjExpForm] = useState(false);
  const [projExpForm, setProjExpForm] = useState({
    name: "", amount: "", frequency: "monthly" as "daily" | "weekly" | "monthly",
    category: "Vehicle & Fuel", dueDate: "", repeatEnabled: false, repeatUntil: "",
  });

  // ── IRS Statement print controls ────────────────────────────────────────────
  const [stmtYear,   setStmtYear]   = useState<number>(IRS_CONFIRMED_YEARS[0]);
  const [stmtMethod, setStmtMethod] = useState<"mileage" | "actual">("mileage");

  // ── Bank statement import ─────────────────────────────────────────────────
  const [showStatementImport, setShowStatementImport] = useState(false);
  const [statementScanning, setStatementScanning] = useState(false);
  const [statementScanError, setStatementScanError] = useState<string | null>(null);
  const [statementTransactions, setStatementTransactions] = useState<StatementTx[]>([]);
  const [statementDocId, setStatementDocId] = useState<number | null>(null);
  const [statementSelected, setStatementSelected] = useState<Record<number, boolean>>({});
  const [statementCategories, setStatementCategories] = useState<Record<number, string>>({});
  const [statementPurpose, setStatementPurpose] = useState<Record<number, "business" | "personal">>({});

  // ── Voice entry ───────────────────────────────────────────────────────────
  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [voiceParsing, setVoiceParsing] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [showVoicePanel, setShowVoicePanel] = useState(false);

  // ── Gemini Assistant Chat ─────────────────────────────────────────────────
  interface GeminiMessage { role: "user" | "assistant"; text: string; ts: number; }
  const [showGeminiChat,    setShowGeminiChat]    = useState(false);
  const [geminiMessages,    setGeminiMessages]    = useState<GeminiMessage[]>([]);
  const [geminiInput,       setGeminiInput]       = useState("");
  const [geminiLoading,     setGeminiLoading]     = useState(false);
  const [geminiChatRec,     setGeminiChatRec]     = useState(false); // recording mic for chat

  // ── Two-tap GPS trip flow ─────────────────────────────────────────────────
  type VoiceTripStep = "idle" | "started" | "listening" | "confirm";
  const [voiceTripStep, setVoiceTripStep] = useState<VoiceTripStep>("idle");
  const [vtPickup,  setVtPickup]  = useState<{ lat: number; lng: number; addr: string } | null>(null);
  const [vtDropoff, setVtDropoff] = useState<{ lat: number; lng: number; addr: string } | null>(null);
  const [vtStartTime, setVtStartTime] = useState<Date | null>(null);
  const [vtElapsed,   setVtElapsed]   = useState(0); // seconds while step==="started"
  const [vtFare, setVtFare] = useState<{ earnings: string; tips: string; toll: string; platformFee: string; platform: string } | null>(null);
  const [vtSaving, setVtSaving] = useState(false);

  // ── Broadcast eval ────────────────────────────────────────────────────────
  // ── AI Assistant tab ─────────────────────────────────────────────────────
  const [aiPeriod, setAiPeriod] = useState<"day" | "week" | "month">("week");
  const [aiSimTarget, setAiSimTarget] = useState(0); // $/hr goal, 0 = off
  const [limoOverlayOn, setLimoOverlayOn] = useState(false);
  const [limoMinHourly, setLimoMinHourly] = useState<number>(() => {
    try { return parseFloat(localStorage.getItem("ic-limo-min-hr") ?? "40") || 40; } catch { return 40; }
  });
  const [limoMinPerMile, setLimoMinPerMile] = useState<number>(() => {
    try { return parseFloat(localStorage.getItem("ic-limo-min-mi") ?? "2.5") || 2.5; } catch { return 2.5; }
  });
  interface LimoOffer {
    decision: string; company: string; price: number; pickupTime: string;
    origin: string; destination: string; hourlyRate: number; perMileRate: number;
    distance: number; estimatedMinutes: number; isBest?: boolean;
  }
  const [limoCapturing,  setLimoCapturing]  = useState(false);
  const [limoOffers,     setLimoOffers]     = useState<LimoOffer[]>([]);
  const [limoOfferIdx,   setLimoOfferIdx]   = useState(0);
  const [limoError,      setLimoError]      = useState<string | null>(null);
  const [limoOverlayPos, setLimoOverlayPos] = useState({ x: 0, y: 60 });

  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastCapturing, setBroadcastCapturing] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState<BroadcastEval | null>(null);
  const [broadcastError, setBroadcastError] = useState<string | null>(null);
  const [broadcastHistory, setBroadcastHistory] = useState<BroadcastEval[]>(() => {
    try { return JSON.parse(localStorage.getItem("ic-broadcast-history") || "[]"); } catch { return []; }
  });

  // Live clock
  useEffect(() => {
    const id = window.setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Keep the automatic date/time current for a new entry when the calendar
  // day changes, without overwriting an explicit driver selection.
  useEffect(() => {
    const today = toYYYYMMDD(currentTime);
    if (today === entryAutoDayRef.current) return;
    entryAutoDayRef.current = today;
    if (editingId) return;
    setTripForm(s => ({
      ...s,
      ...(entryDateManuallySetRef.current ? {} : { tripDate: today }),
      ...(entryTimeManuallySetRef.current ? {} : { tripTime: currentTime.toTimeString().slice(0, 5) }),
    }));
  }, [currentTime, editingId]);

  // Persist trips
  useEffect(() => {
    try {
      const payload = JSON.stringify(trips);
      localStorage.setItem(tripsStorageKey, payload);
      const nowISO = new Date().toISOString();
      localStorage.setItem(lastSavedStorageKey, nowISO);
      localStorage.setItem(tripsCountStorageKey, String(trips.length));
      setLastSavedAt(nowISO);
      setStorageBytes(new Blob([payload]).size);
      const check = localStorage.getItem(tripsStorageKey);
      setStorageVerified(!!check && check.length > 2);
    } catch { setStorageVerified(false); }
  }, [trips, tripsStorageKey, lastSavedStorageKey, tripsCountStorageKey]);

  // Persist expenses
  useEffect(() => {
    try { localStorage.setItem(expensesStorageKey, JSON.stringify(expenses)); } catch {}
  }, [expenses, expensesStorageKey]);
  useEffect(() => {
    try { localStorage.setItem("ic-custom-exp-types", JSON.stringify(customExpenseTypes)); } catch {}
  }, [customExpenseTypes]);
  useEffect(() => {
    try { localStorage.setItem("ic-custom-exp-cats", JSON.stringify(customExpenseCategories)); } catch {}
  }, [customExpenseCategories]);
  useEffect(() => {
    try { localStorage.setItem("ic-custom-vendors", JSON.stringify(customVendors)); } catch {}
  }, [customVendors]);
  useEffect(() => {
    try { localStorage.setItem("ic-last-shift-date", lastShiftDate); } catch {}
  }, [lastShiftDate]);

  // Persist shift state — every state change writes through so a reload restores instantly
  useEffect(() => {
    try {
      const today = new Date().toISOString().slice(0,10);
      localStorage.setItem("ic-shift-date",     today);
      localStorage.setItem("ic-shift-active",   String(shiftActive));
      localStorage.setItem("ic-shift-break-ms", String(totalBreakMs));
      localStorage.setItem("ic-shift-on-break", String(isOnBreak));
      localStorage.setItem("ic-shift-miles",    String(shiftMiles.toFixed(4)));
      if (clockInTime) localStorage.setItem("ic-shift-clock-in", clockInTime.toISOString());
      else             localStorage.removeItem("ic-shift-clock-in");
      if (breakStart)  localStorage.setItem("ic-shift-break-start", breakStart.toISOString());
      else             localStorage.removeItem("ic-shift-break-start");
    } catch {}
  }, [shiftActive, clockInTime, totalBreakMs, isOnBreak, breakStart, shiftMiles]);

  // Persist hours
  useEffect(() => {
    try { localStorage.setItem(hoursStorageKey, JSON.stringify(hoursLog)); } catch {}
  }, [hoursLog, hoursStorageKey]);

  // Persist FINANCES settings
  useEffect(() => { try { localStorage.setItem("ic-daily-goal", String(dailyGoal)); } catch {} }, [dailyGoal]);
  useEffect(() => { try { localStorage.setItem("ic-work-days", JSON.stringify(workDays)); } catch {} }, [workDays]);
  useEffect(() => { try { localStorage.setItem("ic-day-targets", JSON.stringify(dayTargets)); } catch {} }, [dayTargets]);
  useEffect(() => { try { localStorage.setItem("ic-bank-balance", String(bankBalance)); } catch {} }, [bankBalance]);
  useEffect(() => { try { localStorage.setItem("ic-bank-adj-history", JSON.stringify(bankAdjHistory)); } catch {} }, [bankAdjHistory]);
  useEffect(() => { try { localStorage.setItem("ic-hourly-goal", String(goal)); } catch {} }, [goal]);
  useEffect(() => { try { localStorage.setItem("ic-week-overrides", JSON.stringify(weekOverrides)); } catch {} }, [weekOverrides]);
  useEffect(() => { try { localStorage.setItem("ic-recurring-plan", JSON.stringify(recurringPlan)); } catch {} }, [recurringPlan]);
  useEffect(() => { try { localStorage.setItem("ic-exp-budgets", JSON.stringify(expBudgets)); } catch {} }, [expBudgets]);

  // Keep refs in sync so the pagehide listener always has the latest state
  useEffect(() => { tripsRef.current    = trips;    }, [trips]);
  useEffect(() => { expensesRef.current = expenses; }, [expenses]);
  useEffect(() => { hoursLogRef.current = hoursLog; }, [hoursLog]);

  // iOS PWA safety net: when the user swipes the app away or switches apps,
  // iOS kills JS before useEffect can run. This listener fires synchronously
  // on hide/close and writes the latest state directly to localStorage.
  useEffect(() => {
    const flush = () => {
      // Skip flush when a clean-slate wipe is in progress — otherwise the stale
      // React state gets written back into the freshly-cleared localStorage before
      // the page reloads, making the wipe appear to do nothing.
      if ((window as any).__ic_wiping) return;
      try {
        localStorage.setItem(tripsStorageKey, JSON.stringify(tripsRef.current));
        localStorage.setItem(expensesStorageKey, JSON.stringify(expensesRef.current));
      } catch {}
    };
    const onVisibility = () => { if (document.visibilityState === "hidden") flush(); };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flush);
    };
  }, [tripsStorageKey, expensesStorageKey]);

  // ── GPS one-shot on mount — show real location immediately, even before shift ─
  useEffect(() => {
    if (!navigator.geolocation) return;
    setGps(s => ({ ...s, status: "searching" }));
    navigator.geolocation.getCurrentPosition(
      pos => setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude, acc: pos.coords.accuracy ?? null, timestamp: pos.timestamp, status: "active" }),
      () => setGps(s => ({ ...s, status: "inactive" })),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 12000 }
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-restore from cloud if localStorage has no trips ─────────────────
  useEffect(() => {
    const tryRestore = async () => {
      try {
        const raw = localStorage.getItem(tripsStorageKey);
        const localTrips: Trip[] = raw ? JSON.parse(raw) : [];
        if (localTrips.length > 0) return; // local data exists — skip restore
        const res = await fetch("/api/backup/latest");
        if (!res.ok) return;
        const { backup } = await res.json() as { backup: null | {
          trips: Trip[]; expenses: Expense[]; hoursLog: HoursEntry[];
          settings: Record<string, string | null>;
          tripCount: number; expenseCount: number;
        }};
        if (!backup || !Array.isArray(backup.trips) || backup.trips.length === 0) return;
        // Restore data
        try { localStorage.setItem(tripsStorageKey, JSON.stringify(backup.trips)); } catch {}
        try { localStorage.setItem(expensesStorageKey, JSON.stringify(backup.expenses)); } catch {}
        try { localStorage.setItem(hoursStorageKey, JSON.stringify(backup.hoursLog)); } catch {}
        setTrips(backup.trips);
        setExpenses(backup.expenses ?? []);
        setHoursLog(backup.hoursLog ?? []);
        const s = backup.settings ?? {};
        if (s.goal)           try { localStorage.setItem("ic-hourly-goal",      s.goal!); } catch {}
        if (s.workDays)       try { localStorage.setItem("ic-work-days",        s.workDays!); } catch {}
        if (s.dayTargets)     try { localStorage.setItem("ic-day-targets",      s.dayTargets!); } catch {}
        if (s.bankBalance)    try { localStorage.setItem("ic-bank-balance",     s.bankBalance!); } catch {}
        if (s.bankAdjHistory) try { localStorage.setItem("ic-bank-adj-history", s.bankAdjHistory!); } catch {}
        if (s.recurringPlan)  try { localStorage.setItem("ic-recurring-plan",   s.recurringPlan!); } catch {}
        if (s.weekOverrides)  try { localStorage.setItem("ic-week-overrides",   s.weekOverrides!); } catch {}
        if (s.customVendors)  try { localStorage.setItem("ic-custom-vendors",   s.customVendors!); } catch {}
        showToast(`☁️ Restored ${backup.tripCount} trips from cloud`);
      } catch { /* silent — restore is best-effort */ }
    };
    tryRestore();
  }, [tripsStorageKey, expensesStorageKey, hoursStorageKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Cross-device trip sync ───────────────────────────────────────────────
  // The Android app posts compact entries to the shared API. Merge the
  // canonical remote list with local browser data by id so existing local
  // trips remain intact and Android trips appear in Register/Ledger/Reports.
  useEffect(() => {
    let cancelled = false;
    const syncRemoteTrips = async () => {
      try {
        const res = await fetch("/api/trips");
        if (!res.ok) return;
        const data = await res.json() as { trips?: unknown[] };
        const remoteTrips = Array.isArray(data.trips) ? data.trips as Trip[] : [];
        const raw = localStorage.getItem(tripsStorageKey);
        const localTrips: Trip[] = raw ? JSON.parse(raw) : [];
        const byId = new Map<string, Trip>();
        for (const trip of localTrips) if (trip?.id) byId.set(trip.id, trip);
        for (const trip of remoteTrips) if (trip?.id) byId.set(trip.id, trip);
        const merged = Array.from(byId.values()).sort(
          (a, b) => new Date(b.timestamp || b.date).getTime() - new Date(a.timestamp || a.date).getTime()
        );
        if (cancelled) return;
        if (merged.length !== localTrips.length || merged.some((trip, i) => trip.id !== localTrips[i]?.id)) {
          syncSaveTrips(merged);
        }
        // Upload browser-only records too, making the API the shared source.
        await Promise.all(localTrips.map(trip =>
          fetch("/api/trips", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ trip }),
          }).catch(() => undefined)
        ));
      } catch {
        // Local storage remains the offline source of truth if the API is unavailable.
      }
    };
    void syncRemoteTrips();
    return () => { cancelled = true; };
  }, [tripsStorageKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Initial storage check
  useEffect(() => {
    try {
      const raw = localStorage.getItem(tripsStorageKey);
      if (raw) { setStorageBytes(new Blob([raw]).size); setStorageVerified(true); }
    } catch { setStorageVerified(false); }
  }, [tripsStorageKey]);

  // ── Voice trip flow — elapsed timer ──────────────────────────────────────
  useEffect(() => {
    if (voiceTripStep !== "started") return;
    const id = setInterval(() => setVtElapsed(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [voiceTripStep]);

  // ── GPS toll geofencing ───────────────────────────────────────────────────
  useEffect(() => {
    // E-ZPass detection only runs during an active shift and with a
    // street-level GPS fix. A weak/stale position must never create a toll.
    if (!shiftActive || gps.lat === null || gps.lng === null) return;
    if (gps.acc === null || gps.acc > GPS_RELIABLE_ACCURACY_METERS) return;
    const currentGps = { lat: gps.lat, lng: gps.lng };
    const previousGps = tollPreviousGpsRef.current;
    tollPreviousGpsRef.current = currentGps;
    const GEOFENCE_KM = 0.35; // ~350 m radius around each plaza
    for (const plaza of TOLL_PLAZAS) {
      const d = haversineKm(gps.lat, gps.lng, plaza.lat, plaza.lng);
      if (d <= GEOFENCE_KM) {
        // Avoid re-firing for the same plaza
        if (lastDetectedPlazaRef.current === plaza.name) return;
        lastDetectedPlazaRef.current = plaza.name;

        if (plaza.directionality === "one-way" && plaza.tollDirection === "eastbound-only") {
          const isEastbound = inferEastboundTravel(
            locationCapturePoint(pickupLocationCapture),
            locationCapturePoint(dropoffLocationCapture),
            previousGps,
            currentGps,
          );
          if (isEastbound === false) return;
          // Heading is not persisted by the existing GPS state. If captured
          // endpoints and recent movement cannot prove direction, preserve the
          // previous charge behavior rather than risk omitting a real toll.
        }

        // Port Authority: choose peak vs off-peak by time of day
        let rate = plaza.rate;
        if (plaza.offPeak !== undefined) {
          const now = new Date();
          const h = now.getHours();
          const dow = now.getDay(); // 0=Sun 6=Sat
          const isWeekday = dow >= 1 && dow <= 5;
          const isWeekend = dow === 0 || dow === 6;
          const isPeak =
            (isWeekday && ((h >= 6 && h < 10) || (h >= 16 && h < 20))) ||
            (isWeekend && h >= 11 && h < 21);
          rate = isPeak ? plaza.rate : plaza.offPeak;
        }

        const detectedAt = new Date();
        const at = detectedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
        const event: TollEvent = {
          id: `${plaza.name}-${detectedAt.getTime()}`,
          plaza: plaza.name,
          rate,
          at,
          timestamp: detectedAt.toISOString(),
          lat: gps.lat,
          lng: gps.lng,
          accuracy: gps.acc,
        };
        const nextEvents = [...tripTollEventsRef.current, event];
        replaceTripTollEvents(nextEvents);
        setDetectedToll({ plaza: plaza.name, rate, at });
        setTripForm(s => {
          const detectedTotal = nextEvents.reduce((sum, tollEvent) => sum + tollEvent.rate, 0);
          const currentTotal = parseFloat(s.toll) || 0;
          const nextTotal = tollManuallyEdited ? currentTotal + rate : detectedTotal;
          return {
            ...s,
            toll: nextTotal.toFixed(2),
            notes: withTollBreakdown(s.notes, nextEvents),
          };
        });
        showToast(`⚡ Toll detected · ${plaza.name} · $${rate.toFixed(2)}`);
        return;
      }
    }
    // Driver moved away from all plazas — clear the "last detected" so re-entry fires again
    lastDetectedPlazaRef.current = null;
  }, [gps.lat, gps.lng, gps.acc, shiftActive, pickupLocationCapture, dropoffLocationCapture]); // eslint-disable-line react-hooks/exhaustive-deps

  // GPS airport + reverse geocode
  useEffect(() => {
    if (!gps.lat || !gps.lng) return;
    let nearest: { name: string; dist: number } | null = null;
    for (const ap of AIRPORTS) {
      const d = haversineKm(gps.lat, gps.lng, ap.lat, ap.lng);
      if (!nearest || d < nearest.dist) nearest = { name: ap.name, dist: d };
    }
    if (nearest && nearest.dist <= 15) {
      setGpsAirport(`${nearest.name} (${nearest.dist.toFixed(1)} km)`);
    } else {
      setGpsAirport("");
    }
    const controller = new AbortController();
    (async () => {
      try {
        const rich = await reverseGeocodeRich(gps.lat!, gps.lng!, controller.signal, new Date(), undefined, gps.acc ?? undefined);
        setGpsAddress(rich.physicalAddress);
      } catch {}
    })();
    return () => controller.abort();
  }, [gps.lat, gps.lng]);

  // Auto-scroll Gemini chat to latest message
  useEffect(() => {
    if (showGeminiChat && geminiEndRef.current) {
      geminiEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [geminiMessages, showGeminiChat]);

  const IRS_RATE_PER_MILE = 0.70; // 2025 IRS standard mileage rate — verify at irs.gov for the current tax year

  const startGPS = () => {
    if (!navigator.geolocation) { setGps(s => ({ ...s, status: "error" })); return; }
    setGps(s => ({ ...s, status: "searching" }));
    prevGpsRef.current = null; // reset accumulator anchor when GPS (re)starts
    if (watchIdRef.current !== null) {
      try { navigator.geolocation.clearWatch(watchIdRef.current); } catch {}
    }
    const id = navigator.geolocation.watchPosition(
      pos => {
        const newLat = pos.coords.latitude;
        const newLng = pos.coords.longitude;
        const newAcc = pos.coords.accuracy ?? 999;
        // Accumulate miles — only when accuracy is good (<80 m) and movement is plausible
        if (prevGpsRef.current && newAcc < 80) {
          const km = haversineKm(prevGpsRef.current.lat, prevGpsRef.current.lng, newLat, newLng);
          if (km >= 0.01 && km < 1.5) { // >10 m motion, <1.5 km single jump (noise/teleport filter)
            setShiftMiles(prev => {
              const next = +(prev + km * 0.621371).toFixed(4);
              try { localStorage.setItem("ic-shift-miles", String(next)); } catch {}
              return next;
            });
          }
        }
        prevGpsRef.current = { lat: newLat, lng: newLng };
        setGps({ lat: newLat, lng: newLng, acc: newAcc, timestamp: pos.timestamp, status: "active" });
      },
      () => setGps(s => ({ ...s, status: "error" })),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    );
    watchIdRef.current = id as unknown as number;
  };

  const stopGPS = () => {
    if (watchIdRef.current !== null) {
      try { navigator.geolocation.clearWatch(watchIdRef.current); } catch {}
      watchIdRef.current = null;
    }
    setGps(s => ({ ...s, status: "inactive" }));
  };

  // ── Per-trip GPS mileage tracking ─────────────────────────────────────────
  // Uses a SEPARATE watchPosition from the shift odometer so they don't
  // interfere. Battery-friendly: updates triggered by device movement,
  // not a polling timer. Watch is stopped immediately on trip save or cancel.
  const startTripTracking = () => {
    if (!navigator.geolocation) { showToast("GPS not available on this device"); return; }
    // Reset accumulators
    tripMilesRef.current   = 0;
    tripPrevGpsRef.current = null;
    setTripMilesDisplay(0);
    // Clear any stale watch
    if (tripWatchIdRef.current !== null) {
      try { navigator.geolocation.clearWatch(tripWatchIdRef.current); } catch {}
    }
    const id = navigator.geolocation.watchPosition(
      pos => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const acc = pos.coords.accuracy ?? 999;
        // Only accumulate when GPS signal is good (< 80 m) and movement is plausible
        if (tripPrevGpsRef.current && acc < 80) {
          const km = haversineKm(tripPrevGpsRef.current.lat, tripPrevGpsRef.current.lng, lat, lng);
          // >10 m movement, <1.5 km per update (noise/teleport filter — mirrors shift GPS)
          if (km >= 0.01 && km < 1.5) {
            tripMilesRef.current = +(tripMilesRef.current + km * 0.621371).toFixed(4);
            setTripMilesDisplay(tripMilesRef.current);
          }
        }
        tripPrevGpsRef.current = { lat, lng };
      },
      () => showToast("GPS signal lost — tracking paused"),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    );
    tripWatchIdRef.current = id as unknown as number;
    setTripTracking(true);
    showToast("▶ Trip mileage tracking started");
  };

  const stopTripTracking = (saveToForm = true) => {
    if (tripWatchIdRef.current !== null) {
      try { navigator.geolocation.clearWatch(tripWatchIdRef.current); } catch {}
      tripWatchIdRef.current = null;
    }
    setTripTracking(false);
    if (saveToForm && tripMilesRef.current > 0) {
      setTripForm(s => ({ ...s, tripMiles: tripMilesRef.current.toFixed(2) }));
      showToast(`⏹ Tracking stopped — ${tripMilesRef.current.toFixed(2)} mi recorded`);
    }
    tripPrevGpsRef.current = null;
  };

  const showToast = (msg: string, ms = 2500) => {
    setToast(msg);
    setTimeout(() => setToast(null), ms);
  };

  const STORAGE_KEYS = [
    "island-city-trips", "island-city-expenses", "island-city-hours",
    "island-city-last-saved", "island-city-trips-count",
    "ic-custom-exp-types", "ic-custom-exp-cats", "ic-custom-vendors",
    "ic-last-shift-date",
  ];

  const handleFactoryReset = () => {
    // Flag checked by the pagehide/visibilitychange flush listener so it does NOT
    // write stale React state back into the just-cleared storage during the reload.
    (window as any).__ic_wiping = true;
    // localStorage.clear() nukes EVERYTHING — no key list that can be incomplete.
    // Then we immediately re-set the version so the IIFE doesn't fire an extra
    // reload on the fresh page load.
    try {
      localStorage.clear();
      localStorage.setItem("ic-app-version", CLEAN_SLATE_VERSION);
    } catch {}
    window.location.reload();
  };

  const handleExportBackup = () => {
    const backup = {
      exportedAt: new Date().toISOString(),
      appVersion: "IslandCity Driver v1",
      trips,
      expenses,
      hoursLog,
      customExpenseTypes,
      customExpenseCategories,
      customVendors,
      // Finance settings
      dailyGoal,
      workDays,
      dayTargets,
      // Bank balance + history
      bankBalance,
      bankAdjHistory,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `islandcity-backup-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("Backup downloaded ✓");
  };

  const handleClaimLegacyBackups = async () => {
    if (claimingLegacyBackups || legacyClaimResolved) return;
    setClaimingLegacyBackups(true);
    try {
      const res = await fetch("/api/claim-legacy-backups", { method: "POST" });
      const data = await res.json() as {
        ok: boolean;
        claimedCount?: number;
        message?: string;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        showToast(data.error || "No se pudieron reclamar los respaldos");
        return;
      }
      const claimedCount = Number.isInteger(data.claimedCount) && data.claimedCount! > 0
        ? data.claimedCount!
        : 0;
      if (claimedCount > 0) {
        setLegacyClaimResolved(true);
        showToast(`🔓 ${claimedCount} respaldo${claimedCount === 1 ? "" : "s"} reclamado${claimedCount === 1 ? "" : "s"} ✓`);
      } else {
        showToast("No se reclamó ningún respaldo. El botón seguirá disponible para reintentar.");
      }
    } catch {
      showToast("No se pudieron reclamar los respaldos");
    } finally {
      setClaimingLegacyBackups(false);
    }
  };

  // ── #8 — Restore backup from file ───────────────────────────────
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (!data.trips || !Array.isArray(data.trips)) { showToast("Archivo de backup inválido ✗"); return; }
        const uniqueDays = new Set((data.hoursLog ?? []).map((h: HoursEntry) => h.date)).size;
        setImportPreview({
          data,
          tripCount: data.trips.length,
          expenseCount: Array.isArray(data.expenses) ? data.expenses.length : 0,
          dayCount: uniqueDays,
        });
      } catch { showToast("No se pudo leer el archivo ✗"); }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // Applies the confirmed import (merge = add unique IDs; replace = overwrite)
  const confirmImport = (mode: "merge" | "replace") => {
    if (!importPreview) return;
    const { data } = importPreview;

    if (mode === "replace") {
      syncSaveTrips(data.trips);
      syncSaveExpenses(Array.isArray(data.expenses) ? data.expenses : []);
      if (Array.isArray(data.hoursLog)) {
        try { localStorage.setItem("ic-hours-log", JSON.stringify(data.hoursLog)); } catch {}
        setHoursLog(data.hoursLog);
      }
    } else {
      // merge — keep existing, add backup entries whose IDs don't already exist
      const existingTripIds = new Set(trips.map(t => t.id));
      const newTrips = [...trips, ...data.trips.filter((t: Trip) => !existingTripIds.has(t.id))];
      syncSaveTrips(newTrips);

      const existingExpIds = new Set(expenses.map(ex => ex.id));
      const mergedExp = [...expenses, ...(data.expenses ?? []).filter((ex: Expense) => !existingExpIds.has(ex.id))];
      syncSaveExpenses(mergedExp);

      if (Array.isArray(data.hoursLog)) {
        const existingDates = new Set(hoursLog.map(h => h.date));
        const mergedHours = [...hoursLog, ...data.hoursLog.filter((h: HoursEntry) => !existingDates.has(h.date))];
        try { localStorage.setItem("ic-hours-log", JSON.stringify(mergedHours)); } catch {}
        setHoursLog(mergedHours);
      }
    }

    // Restore settings / finance data regardless of mode
    if (data.customExpenseTypes)      setCustomExpenseTypes(data.customExpenseTypes);
    if (data.customExpenseCategories) setCustomExpenseCategories(data.customExpenseCategories);
    if (data.customVendors)           setCustomVendors(data.customVendors);
    if (typeof data.dailyGoal === "number") setDailyGoal(data.dailyGoal);
    if (data.workDays)                setWorkDays(data.workDays);
    if (data.dayTargets)              setDayTargets(data.dayTargets);
    if (typeof data.bankBalance === "number") setBankBalance(data.bankBalance);
    if (data.bankAdjHistory)          setBankAdjHistory(data.bankAdjHistory);

    setImportPreview(null);
    setShowSettings(false);
    showToast("Datos restaurados ✓");
    // Short delay lets React flush state before reload
    setTimeout(() => window.location.reload(), 800);
  };

  const handleClockIn = () => {
    const now = new Date();
    const todayYMD = toYYYYMMDD(now);
    const isNewDay = lastShiftDate !== "" && lastShiftDate !== todayYMD;

    if (isNewDay) {
      // New day — reset entry form so the screen starts clean
      entryDateManuallySetRef.current = false;
      entryTimeManuallySetRef.current = false;
      entryAutoDayRef.current = todayYMD;
      setTripForm({
        reference: "", earnings: "", tips: "", extraCash: "", otherCashIncome: "", toll: "",
        platformFee: "", platform: "Uber", pickup: "", dropoff: "",
        pickupTimestamp: "", dropoffTimestamp: "", notes: "",
        tripDate: todayYMD, tripTime: now.toTimeString().slice(0, 5), tripMiles: "",
      });
      replaceTripTollEvents([]);
      setDetectedToll(null);
      setTollManuallyEdited(false);
      lastDetectedPlazaRef.current = null;
      setEditingId(null);
      showToast(`Nuevo día ${todayYMD} · pantallas limpias ✓`);
    }

    setLastShiftDate(todayYMD);
    setClockInTime(now);
    setTotalBreakMs(0);
    setIsOnBreak(false);
    setBreakStart(null);
    setShiftActive(true);
    setShiftMiles(0);
    prevGpsRef.current = null;
    try { localStorage.setItem("ic-shift-miles", "0"); } catch {}
    startGPS();
    if (!isNewDay) showToast(`Clock In ${now.toLocaleTimeString()} · GPS started`);
  };

  const handleBreakToggle = () => {
    if (!shiftActive || !clockInTime) return;
    const now = new Date();
    if (!isOnBreak) {
      setIsOnBreak(true);
      setBreakStart(now);
      showToast("Break started");
    } else {
      if (breakStart) setTotalBreakMs(p => p + (now.getTime() - breakStart!.getTime()));
      setIsOnBreak(false);
      setBreakStart(null);
      showToast("Back on route");
    }
  };

  const handleClockOut = () => {
    if (!shiftActive || !clockInTime) { stopGPS(); return; }
    const now = new Date();
    let breakMs = totalBreakMs;
    if (isOnBreak && breakStart) breakMs += now.getTime() - breakStart.getTime();
    const activeMs = now.getTime() - clockInTime.getTime() - breakMs;
    const hours = Math.max(0, activeMs / 3600000);
    setHoursLog(p => [
      { date: toYYYYMMDD(now), hours, clockIn: clockInTime.toISOString(), clockOut: now.toISOString(), breakMs, miles: shiftMiles },
      ...p,
    ].slice(0, 60));
    setShiftActive(false);
    setIsOnBreak(false);
    setBreakStart(null);
    setTotalBreakMs(0);
    setClockInTime(null);
    stopGPS();
    showToast(`Clock Out · ${hours.toFixed(2)}h saved`);
    // Backup after a short delay so the hoursLog state & ref have updated
    setTimeout(() => saveCloudBackup(), 800);
  };

  const handleTurnButton = (s: TurnStatus) => {
    if (s === "START") {
      if (!shiftActive) handleClockIn();
      else if (isOnBreak) handleBreakToggle();
    } else if (s === "BREAK") {
      if (shiftActive) handleBreakToggle();
    } else if (s === "END") {
      handleClockOut();
    }
  };

  const numericFilter = (val: string) => val === "" || /^\d*\.?\d*$/.test(val);

  const grandTotalLive = useMemo(() => {
    const e  = parseFloat(tripForm.earnings) || 0;
    const t  = parseFloat(tripForm.tips) || 0;
    const ex = parseFloat(tripForm.extraCash) || 0;
    const oci = parseFloat(tripForm.otherCashIncome) || 0;
    const tl = parseFloat(tripForm.toll) || 0;
    const f  = parseFloat(tripForm.platformFee) || 0;
    return e + t + ex + oci + tl - f;
  }, [tripForm.earnings, tripForm.tips, tripForm.extraCash, tripForm.otherCashIncome, tripForm.toll, tripForm.platformFee]);

  // Top 3 platforms by trip count — used for FARE TYPE quick chips
  const topPlatforms = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const tr of trips) counts[tr.platform] = (counts[tr.platform] || 0) + 1;
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([p]) => p);
    const defaults = ["Uber", "Lyft", "Gallant"];
    const result: string[] = [];
    for (const p of [...sorted, ...defaults]) {
      if (!result.includes(p)) result.push(p);
      if (result.length === 3) break;
    }
    return result;
  }, [trips]);

  const todayTrips = useMemo(() => {
    // Always use today's calendar date — include ALL trips from today regardless
    // of whether the shift was active when they were entered.
    // This fixes the bug where trips entered before pressing START were excluded.
    // The $/hr gauge uses activeHoursDecimal (clock-in → now minus breaks) as
    // the denominator, which correctly represents productive time on the clock.
    const todayStr = currentTime.toDateString();
    return trips.filter(t => {
      try { return new Date(t.timestamp || t.date).toDateString() === todayStr; } catch { return true; }
    });
  }, [trips, currentTime]);

  const todayEarnings = useMemo(() => todayTrips.reduce((a, b) => a + b.grandTotal, 0), [todayTrips]);
  const totalTollsToday = useMemo(() => todayTrips.reduce((a, b) => a + b.toll, 0), [todayTrips]);

  // GROSS = fare + tips + extra + otherCash + toll (everything received, before platform fee)
  const grossToday = useMemo(() =>
    todayTrips.reduce((a, b) => a + b.earnings + b.tips + b.extra + (b.otherCash ?? 0) + b.toll, 0),
    [todayTrips]
  );

  const activeMsLive = useMemo(() => {
    if (!shiftActive || !clockInTime) return 0;
    const nowMs = currentTime.getTime();
    let breakMs = totalBreakMs;
    if (isOnBreak && breakStart) breakMs += nowMs - breakStart.getTime();
    return nowMs - clockInTime.getTime() - breakMs;
  }, [shiftActive, clockInTime, currentTime, totalBreakMs, isOnBreak, breakStart]);

  const activeHoursFormatted = useMemo(() => formatHHMMSS(activeMsLive), [activeMsLive]);
  const activeHoursDecimal = activeMsLive / 3600000;

  const weeklyTrips = useMemo(() => {
    const weekAgo = new Date(currentTime);
    weekAgo.setDate(weekAgo.getDate() - 7);
    return trips.filter(t => {
      try { return new Date(t.timestamp || t.date) >= weekAgo; } catch { return true; }
    });
  }, [trips, currentTime]);

  const weeklyTotal = useMemo(() => weeklyTrips.reduce((a, b) => a + b.grandTotal, 0), [weeklyTrips]);

  // ── AI Assistant metrics for selected period ──────────────────────────────
  const aiMetrics = useMemo(() => {
    const todayYMD = toYYYYMMDD(currentTime);
    const cutoff = aiPeriod === "day" ? todayYMD : (() => {
      const d = new Date(currentTime);
      if (aiPeriod === "week") d.setDate(d.getDate() - 7);
      else d.setMonth(d.getMonth() - 1);
      return toYYYYMMDD(d);
    })();
    const periodTrips    = trips.filter(t => (t.date || (t.timestamp ?? "").slice(0,10) || "") >= cutoff || aiPeriod === "day" && (t.date || (t.timestamp ?? "").slice(0,10)) === todayYMD);
    const filteredTrips  = aiPeriod === "day" ? trips.filter(t => (t.date || (t.timestamp ?? "").slice(0,10)) === todayYMD) : trips.filter(t => (t.date || (t.timestamp ?? "").slice(0,10)) >= cutoff);
    const filteredExp    = aiPeriod === "day" ? expenses.filter(e => e.date === todayYMD) : expenses.filter(e => e.date >= cutoff);
    const filteredHours  = aiPeriod === "day" ? hoursLog.filter(h => h.date === todayYMD) : hoursLog.filter(h => h.date >= cutoff);
    void periodTrips;
    const gross  = filteredTrips.reduce((s, t) => s + t.earnings + t.tips + (t.extra ?? 0) + (t.otherCash ?? 0) + t.toll, 0);
    const costs  = filteredExp.reduce((s, e) => s + e.amount, 0);
    const net    = gross - costs;
    const margin = gross > 0 ? (net / gross * 100) : 0;
    const hours  = filteredHours.reduce((s, h) => s + h.hours, 0);
    const miles  = filteredHours.reduce((s, h) => s + (h.miles ?? 0), 0);
    // Simulated gross = target $/hr × hours worked in period
    const simGross = aiSimTarget > 0 && hours > 0 ? aiSimTarget * hours : gross;
    return {
      gross, costs, net, margin, hours, miles,
      tripCount: filteredTrips.length,
      earningsPerMile: miles > 0 ? gross / miles : 0,
      costPerMile:     miles > 0 ? costs / miles : 0,
      earningsPerHour: hours > 0 ? gross / hours : 0,
      costPerHour:     hours > 0 ? costs / hours : 0,
      simGross,
      simNet:   simGross - costs,
      simEarningsPerMile: miles > 0 ? simGross / miles : 0,
      simEarningsPerHour: aiSimTarget > 0 ? aiSimTarget : (hours > 0 ? simGross / hours : 0),
    };
  }, [trips, expenses, hoursLog, aiPeriod, currentTime, aiSimTarget]);

  const cumulative = useMemo(() => {
    const todayYMD = toYYYYMMDD(currentTime);
    const currentMonth = currentTime.getMonth();
    const currentYear = currentTime.getFullYear();
    const weekAgo = new Date(currentTime);
    weekAgo.setDate(weekAgo.getDate() - 7);
    let hoy = 0, semana = 0, mes = 0, año = 0;
    hoursLog.forEach(h => {
      try {
        const d = new Date(h.date);
        if (h.date === todayYMD) hoy += h.hours;
        if (d >= weekAgo) semana += h.hours;
        if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) mes += h.hours;
        if (d.getFullYear() === currentYear) año += h.hours;
      } catch {}
    });
    if (shiftActive) {
      const liveH = activeMsLive / 3600000;
      hoy += liveH; semana += liveH; mes += liveH; año += liveH;
    }
    return { hoy, semana, mes, año };
  }, [hoursLog, currentTime, shiftActive, activeMsLive]);

  // $/h uses GROSS only — not influenced by expenses
  // Starts as soon as there's any shift time (live) OR logged hours today
  const perHourGross = useMemo(() => {
    // 1. Use live shift timer (most accurate — requires START button)
    const h = activeHoursDecimal > 0 ? activeHoursDecimal : (cumulative.hoy ?? 0);
    if (h > 0.002 && grossToday > 0) return grossToday / h;

    // 2. No shift timer — use time from FIRST trip today until NOW as denominator.
    //    This makes the gauge live and reactive without requiring the START button.
    if (grossToday > 0 && todayTrips.length >= 1) {
      const ts = todayTrips
        .map(t => { try { return new Date(t.timestamp || t.date + 'T12:00:00').getTime(); } catch { return null; } })
        .filter((n): n is number => n !== null && !isNaN(n));
      if (ts.length >= 1) {
        const firstTripMs = Math.min(...ts);
        const nowMs = currentTime.getTime();
        const spanH = (nowMs - firstTripMs) / 3600000;
        // If at least 3 minutes have passed since first trip, use live elapsed time
        if (spanH >= 0.05) return grossToday / spanH;
        // Too recent — estimate based on 15 min (will become accurate as time passes)
        return grossToday / 0.25;
      }
    }
    return 0;
  }, [grossToday, activeHoursDecimal, cumulative.hoy, todayTrips, currentTime]);
  const perHourLive = perHourGross; // alias kept for compatibility

  // ── Expenses today (from Expenses section) ────────────────────
  const expensesToday = useMemo(() => {
    const todayYMD = toYYYYMMDD(currentTime);
    return expenses.filter(e => e.date === todayYMD).reduce((a, b) => a + b.amount, 0);
  }, [expenses, currentTime]);

  const netToday = useMemo(() => grossToday - expensesToday, [grossToday, expensesToday]);

  // ── Toll aggregates across periods ───────────────────────────
  const tollsWeek = useMemo(() => {
    const weekAgo = new Date(currentTime); weekAgo.setDate(weekAgo.getDate() - 7);
    return trips.filter(t => { try { return new Date(t.timestamp || t.date) >= weekAgo; } catch { return true; } })
      .reduce((a, b) => a + b.toll, 0);
  }, [trips, currentTime]);
  const tollsMonth = useMemo(() => {
    const m = currentTime.getMonth(), y = currentTime.getFullYear();
    return trips.filter(t => { try { const d = new Date(t.timestamp || t.date); return d.getMonth() === m && d.getFullYear() === y; } catch { return true; } })
      .reduce((a, b) => a + b.toll, 0);
  }, [trips, currentTime]);
  const tollsYear = useMemo(() =>
    trips.filter(t => { try { return new Date(t.timestamp || t.date).getFullYear() === currentTime.getFullYear(); } catch { return true; } })
      .reduce((a, b) => a + b.toll, 0),
    [trips, currentTime]
  );

  // ── Today's goal — uses per-day target if set, else default ──
  const _curISO      = currentTime.getDay() === 0 ? 7 : currentTime.getDay();
  const todayGoal    = dayTargets[_curISO] ?? dailyGoal;
  const goalPct        = Math.min((grossToday / todayGoal) * 100, 100);
  const remainingToGoal = Math.max(todayGoal - grossToday, 0);
  const projectedFinish = useMemo(() => {
    if (perHourGross <= 0 || grossToday >= todayGoal) return null;
    return new Date(Date.now() + (remainingToGoal / perHourGross) * 3600000);
  }, [perHourGross, remainingToGoal, grossToday, todayGoal]);

  // ── Smart suggestion (time-of-day + pace) ────────────────────
  const smartSuggestion = useMemo(() => {
    const h   = currentTime.getHours();
    const dow = currentTime.getDay();
    const wd  = dow >= 1 && dow <= 5;
    const we  = !wd;

    // ── Goal reached ─────────────────────────────────────────────────────────
    if (grossToday >= todayGoal)
      return { emoji: "🏆", text: `Goal $${todayGoal} reached. Exceptional shift!`, type: "gold" };

    // ── Rate-based checks fire FIRST when the driver has active earnings ──────
    // This overrides time-of-day messages so the driver always sees their real
    // performance status while earning, not just a generic time suggestion.
    if (perHourGross > 0) {
      // Thresholds live here as internal logic — never exposed as raw numbers in text
      if (perHourGross < 60)
        return {
          emoji: "🚨",
          text: `Your rate of $${perHourGross.toFixed(0)}/hr is below your healthy zone (minimum $60/hr). Consider repositioning — check the high-demand zones below.`,
          type: "warn",
        };
      if (perHourGross < 70)
        return {
          emoji: "📊",
          text: `Running $${perHourGross.toFixed(0)}/hr — acceptable pace, but room to improve. Stay in active zones and catch the peaks.`,
          type: "warm",
        };
      if (perHourGross < 90)
        return {
          emoji: "💪",
          text: `Strong pace — $${perHourGross.toFixed(0)}/hr. You're in the sweet spot. Keep it up and make every opportunity count.`,
          type: "good",
        };
      // ≥ $90 — exceptional
      return {
        emoji: "🚀",
        text: `Exceptional pace — $${perHourGross.toFixed(0)}/hr. Top-tier shift. Don't stop.`,
        type: "gold",
      };
    }

    // ── No active rate yet — fall back to time-of-day context ────────────────
    if (wd && h >= 7 && h < 9)
      return { emoji: "🔥", text: "Morning rush — Midtown, Queens→Manhattan, Penn Station. Get moving.", type: "hot" };
    if (h >= 12 && h < 14)
      return { emoji: "🍽", text: "Lunch surge — Midtown, Financial District (FiDi), Brooklyn Heights. Quick short trips.", type: "warm" };
    if (wd && h >= 17 && h < 20)
      return { emoji: "⚡", text: "Afternoon peak — best hour of the day. JFK/LGA also active. Push hard.", type: "hot" };
    if (we && (h >= 22 || h < 2))
      return { emoji: "🌙", text: "Weekend night — LES, Williamsburg, Midtown. High surge potential.", type: "purple" };
    if (h >= 2 && h < 6)
      return { emoji: "😴", text: "Dead zone 2–6 AM — very low demand. Rest or reposition.", type: "cold" };
    if (wd && h >= 9 && h < 11)
      return { emoji: "📉", text: "Post-rush lull. Good time for a break or queuing at JFK/LGA.", type: "warn" };
    return { emoji: "📍", text: "Start your shift to begin tracking your performance.", type: "neutral" };
  }, [currentTime, grossToday, todayGoal, perHourGross]);

  const resetForm = () => {
    const _nr = new Date();
    // Stop any active trip tracking without saving miles (trip was cancelled/reset)
    if (tripWatchIdRef.current !== null) {
      try { navigator.geolocation.clearWatch(tripWatchIdRef.current); } catch {}
      tripWatchIdRef.current = null;
    }
    tripPrevGpsRef.current = null;
    tripMilesRef.current   = 0;
    setTripTracking(false);
    setTripMilesDisplay(0);
    entryDateManuallySetRef.current = false;
    entryTimeManuallySetRef.current = false;
    entryAutoDayRef.current = toYYYYMMDD(_nr);
    setTripForm({ reference: "", earnings: "", tips: "", extraCash: "", otherCashIncome: "", toll: "", platformFee: "", platform: "Uber", pickup: "", dropoff: "",
      pickupTimestamp: "", dropoffTimestamp: "", notes: "",
      tripDate: toYYYYMMDD(_nr), tripTime: _nr.toTimeString().slice(0, 5), tripMiles: "" });
    setPickupLocationCapture(null);
    setDropoffLocationCapture(null);
    setEditingId(null);
    setDetectedToll(null);
    setTollManuallyEdited(false);
    replaceTripTollEvents([]);
    lastDetectedPlazaRef.current = null;
  };

  const handleSave = () => {
    if (!tripForm.earnings && !tripForm.pickup) { showToast("Enter at least earnings or pickup location"); return; }
    const now = new Date();
    const savedTripDate = tripForm.tripDate || toYYYYMMDD(now);
    const savedTripTime = tripForm.tripTime || now.toTimeString().slice(0, 5);
    const e   = parseFloat(tripForm.earnings) || 0;
    const t   = parseFloat(tripForm.tips) || 0;
    const ex  = parseFloat(tripForm.extraCash) || 0;
    const oci = parseFloat(tripForm.otherCashIncome) || 0;
    const tl  = parseFloat(tripForm.toll) || 0;
    const f   = parseFloat(tripForm.platformFee) || 0;
    const tripMi = parseFloat(tripForm.tripMiles) || 0;
    const newTrip: Trip = {
      id: editingId || Date.now().toString(),
      reference: tripForm.reference.trim(),
      earnings: e, tips: t, extra: ex, otherCash: oci, toll: tl, fee: f,
      platform: tripForm.platform,
      pickup: tripForm.pickup.trim(),
      dropoff: tripForm.dropoff.trim(),
      notes: tripForm.notes,
      grandTotal: e + t + ex + oci + tl - f,
      time: (() => { try { return new Date(`${savedTripDate}T${savedTripTime}:00`).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }); } catch { return now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }); } })(),
      date: savedTripDate,
      timestamp: (() => { try { return new Date(`${savedTripDate}T${savedTripTime}:00`).toISOString(); } catch { return now.toISOString(); } })(),
      gps: gps.lat && gps.lng ? { lat: gps.lat, lng: gps.lng, acc: gps.acc ?? undefined } : undefined,
      miles: tripMi > 0 ? tripMi : undefined,
      tollEvents: tripTollEventsRef.current.length > 0 ? [...tripTollEventsRef.current] : undefined,
      status: "pending" as const,
      reviewed: false,
    };
    // Stop trip-level GPS tracking (if active) before clearing the form
    if (tripWatchIdRef.current !== null) {
      try { navigator.geolocation.clearWatch(tripWatchIdRef.current); } catch {}
      tripWatchIdRef.current = null;
    }
    tripPrevGpsRef.current = null;
    tripMilesRef.current   = 0;
    setTripTracking(false);
    setTripMilesDisplay(0);
    const updated = editingId ? trips.map(p => p.id === editingId ? newTrip : p) : [newTrip, ...trips];
    syncSaveTrips(updated);
    resetForm();
    showToast(editingId ? `Trip updated ✓` : `Trip saved ✓ $${newTrip.grandTotal.toFixed(2)}${tripMi > 0 ? ` · ${tripMi.toFixed(2)} mi` : ""}`);
    setActiveTab("TRIPS"); setTripsTab("REGISTER");
    // ── Immediate cloud backup on every Register save ──────────────────────
    setTimeout(() => saveCloudBackup(), 0);
  };

  const handleEditToEntry = (trip: Trip) => {
    const restoredTollEvents = Array.isArray(trip.tollEvents) ? trip.tollEvents : [];
    const detectedTollTotal = restoredTollEvents.reduce((sum, event) => sum + event.rate, 0);
    replaceTripTollEvents(restoredTollEvents);
    const latestToll = restoredTollEvents.at(-1);
    setDetectedToll(latestToll ? { plaza: latestToll.plaza, rate: latestToll.rate, at: latestToll.at } : null);
    setTollManuallyEdited(
      restoredTollEvents.length === 0
        ? trip.toll > 0
        : Math.abs(detectedTollTotal - trip.toll) >= 0.01
    );
    setEditingId(trip.id);
    entryDateManuallySetRef.current = true;
    entryTimeManuallySetRef.current = true;
    const _tsDt = (() => { try { return new Date(trip.timestamp || (trip.date + 'T12:00:00')); } catch { return new Date(); } })();
    setTripForm({
      reference: trip.reference, earnings: String(trip.earnings), tips: String(trip.tips),
      extraCash: String(trip.extra), otherCashIncome: String(trip.otherCash ?? 0), toll: String(trip.toll), platformFee: String(trip.fee),
      platform: trip.platform, pickup: trip.pickup, dropoff: trip.dropoff, notes: trip.notes,
      pickupTimestamp: "", dropoffTimestamp: "",
      tripDate: trip.date,
      tripTime: _tsDt.toTimeString().slice(0, 5),
      tripMiles: trip.miles ? String(trip.miles) : "",
    });
    setActiveTab("TRIPS"); setTripsTab("ENTRY");
  };

  // Sync-save helpers — write to localStorage BEFORE calling the React setter.
  // iOS can kill the JS process within ~100ms of a user action (swipe-up to
  // close, home button, phone call), before the async useEffect ever runs.
  // Writing synchronously here guarantees the data survives any timing window.
  const syncSaveTrips = (newTrips: Trip[]) => {
    try { localStorage.setItem(tripsStorageKey, JSON.stringify(newTrips)); } catch {}
    setTrips(newTrips);
    // Keep the shared PostgreSQL collection current after every web save/edit.
    // Each upsert is idempotent by trip id, and localStorage remains available
    // when the driver is temporarily offline.
    for (const trip of newTrips) {
      fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trip }),
      }).catch(() => undefined);
    }
  };
  const syncSaveExpenses = (newExpenses: Expense[]) => {
    try { localStorage.setItem(expensesStorageKey, JSON.stringify(newExpenses)); } catch {}
    setExpenses(newExpenses);
  };

  // ── Bank statement scan ───────────────────────────────────────────────────
  const handleStatementScan = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setStatementScanning(true);
    setStatementScanError(null);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(",")[1];
      try {
        const res = await fetch("/api/statement-scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileBase64: base64, mimeType: file.type }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Scan failed");
        const txs: StatementTx[] = (data.transactions || []).map(
          (tx: Omit<StatementTx, "matchedExpenseId">) => ({
            ...tx,
            matchedExpenseId: expensesRef.current.find(
              e =>
                Math.abs(e.amount - tx.amount) < 0.02 &&
                Math.abs(new Date(e.date).getTime() - new Date(tx.date).getTime()) < 4 * 86400000
            )?.id,
          })
        );
        setStatementTransactions(txs);
        setStatementDocId(data.docId ?? null);
        const sel: Record<number, boolean> = {};
        const cats: Record<number, string> = {};
        txs.forEach((tx, i) => {
          sel[i] = tx.txType === "debit" && !tx.matchedExpenseId;
          cats[i] = tx.category;
        });
        const purps: Record<number, "business" | "personal"> = {};
        txs.forEach((_, i) => { purps[i] = "business"; });
        setStatementSelected(sel);
        setStatementCategories(cats);
        setStatementPurpose(purps);
      } catch (err: unknown) {
        setStatementScanError(err instanceof Error ? err.message : "Scan failed. Please try again.");
      } finally {
        setStatementScanning(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleStatementImport = () => {
    const toImport: Expense[] = [];
    statementTransactions.forEach((tx, i) => {
      if (!statementSelected[i]) return;
      toImport.push({
        id: "stmt-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7),
        date: tx.date,
        category: statementCategories[i] || tx.category,
        vendor: tx.vendor || tx.description.slice(0, 50),
        amount: tx.amount,
        note: tx.description,
        type: "Statement Import",
        purpose: statementPurpose[i] ?? "business",
        ...(statementDocId !== null ? { receiptDocId: statementDocId } : {}),
      });
    });
    const newExpenses = [...expenses, ...toImport];
    syncSaveExpenses(newExpenses);
    setShowStatementImport(false);
    setStatementTransactions([]);
    setStatementSelected({});
    showToast("✓ " + toImport.length + " transaction" + (toImport.length === 1 ? "" : "s") + " imported");
  };

  // ── Voice data entry ──────────────────────────────────────────────────────
  const applyVoiceResult = (result: VoiceResult) => {
    const f = result.fields;
    setVoiceTranscript("");
    setVoiceParsing(false);

    // ── Two-tap trip flow: capture fare and go to confirm ─────────────────
    if (voiceTripStep === "listening") {
      setVtFare({
        earnings:    f.fare  !== undefined && f.fare  > 0 ? String(f.fare.toFixed(2))  : "0",
        tips:        f.tips  !== undefined && f.tips  > 0 ? String(f.tips.toFixed(2))  : "0",
        toll:        f.toll  !== undefined && f.toll  > 0 ? String(f.toll.toFixed(2))  : "0",
        platformFee: f.fee   !== undefined && f.fee   > 0 ? String(f.fee.toFixed(2))   : "0",
        platform:    f.platform || "Uber",
      });
      setVoiceTripStep("confirm");
      return;
    }

    setShowVoicePanel(false);

    if (result.intent === "trip") {
      const today = new Date().toISOString().slice(0, 10);
      const now   = new Date().toTimeString().slice(0, 5);
      setActiveTab("TRIPS");
      setTripsTab("ENTRY");
      setTripForm(prev => ({
        ...prev,
        tripDate: today, tripTime: now,
        ...(f.platform ? { platform: f.platform } : {}),
        ...(f.pickup   ? { pickup:   f.pickup   } : {}),
        ...(f.dropoff  ? { dropoff:  f.dropoff  } : {}),
        ...(f.fare   !== undefined && f.fare   > 0 ? { earnings:    String(f.fare.toFixed(2))   } : {}),
        ...(f.tips   !== undefined && f.tips   > 0 ? { tips:        String(f.tips.toFixed(2))   } : {}),
        ...(f.toll   !== undefined && f.toll   > 0 ? { toll:        String(f.toll.toFixed(2))   } : {}),
        ...(f.fee    !== undefined && f.fee    > 0 ? { platformFee: String(f.fee.toFixed(2))    } : {}),
        ...(f.miles  !== undefined && f.miles  > 0 ? { tripMiles:   String(f.miles.toFixed(2))  } : {}),
        ...(f.notes  ? { notes: f.notes } : {}),
      }));
      showToast("🎤 Trip filled — review & save");
    } else if (result.intent === "expense") {
      setActiveTab("EXPENSES");
      setShowExpenseForm(true);
      setEditingExpenseId(null);
      setExpenseForm(prev => ({
        ...prev,
        date: new Date().toISOString().slice(0, 10),
        ...(f.vendor      ? { name:        f.vendor        } : {}),
        ...(f.amount !== undefined && f.amount > 0 ? { amount: String(f.amount.toFixed(2)) } : {}),
        ...(f.category    ? { category:    f.category      } : {}),
        ...(f.description ? { description: f.description   } : {}),
      }));
      showToast("🎤 Expense filled — review & save");
    } else if (result.intent === "clockIn")  {
      handleClockIn();
    } else if (result.intent === "clockOut") {
      handleClockOut();
    } else if (result.intent === "break")    {
      handleBreakToggle();
    } else if (result.intent === "cancel") {
      resetVoiceTripFlow();
      setShowVoicePanel(false);
      showToast("Cancelado");
    } else {
      setVoiceError("No entendí — di un viaje, gasto, o \"cancelar\"");
      setShowVoicePanel(true);
    }
  };

  const handleVoiceInput = async (transcript: string) => {
    if (!transcript.trim()) return;
    setVoiceParsing(true);
    setVoiceError(null);
    try {
      const res = await fetch("/api/voice-parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: transcript.trim() }),
      });
      const data = await res.json() as VoiceResult & { error?: string };
      if (!res.ok) throw new Error(data.error || "Parse failed");
      applyVoiceResult(data);
    } catch (err: unknown) {
      setVoiceError(err instanceof Error ? err.message : "Voice parse failed");
      setVoiceParsing(false);
    }
  };

  const handleVoiceAudio = async (audioBase64: string, mimeType: string) => {
    setVoiceParsing(true);
    setVoiceError(null);
    setVoiceTranscript("⏳ Gemini está escuchando...");
    try {
      const res = await fetch("/api/voice-parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audioBase64, mimeType }),
      });
      const data = await res.json() as VoiceResult & { error?: string };
      if (!res.ok) throw new Error(data.error || "Parse failed");
      if (data.transcript) setVoiceTranscript(data.transcript);
      applyVoiceResult(data);
    } catch (err: unknown) {
      setVoiceError(err instanceof Error ? err.message : "Error procesando — intenta de nuevo");
      setVoiceParsing(false);
      setVoiceTranscript("");
    }
  };

  const startMediaRecording = (onAudio: (base64: string, mimeType: string) => void) => {
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setVoiceError("Grabación de audio no soportada — ve a Ajustes > Safari y activa el micrófono");
      setShowVoicePanel(true);
      return;
    }

    // Detect best supported format — iOS Safari only supports audio/mp4
    const preferredTypes = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
    const supportedType = preferredTypes.find(t => {
      try { return MediaRecorder.isTypeSupported(t); } catch { return false; }
    }) ?? "";
    // Normalize to base MIME (strip codec suffix for blob/Gemini)
    const mimeType = supportedType.split(";")[0] || "audio/mp4";

    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      .then(stream => {
        mediaChunksRef.current = [];

        // iOS Safari: constructor throws if mimeType unsupported — fall back to default
        let recorder: MediaRecorder;
        try {
          recorder = supportedType
            ? new MediaRecorder(stream, { mimeType: supportedType })
            : new MediaRecorder(stream);
        } catch {
          recorder = new MediaRecorder(stream);
        }

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) mediaChunksRef.current.push(e.data);
        };

        recorder.onstop = () => {
          stream.getTracks().forEach(t => t.stop());
          setVoiceListening(false);
          const chunks = mediaChunksRef.current;
          if (chunks.length === 0) {
            setVoiceError("No capturé audio — habla más cerca del micrófono e intenta de nuevo");
            setVoiceParsing(false);
            return;
          }
          // Use the actual blob type if recorder assigned one, else our mimeType
          const blob = new Blob(chunks, { type: mimeType });
          const actualMime = blob.type || mimeType;
          const reader = new FileReader();
          reader.onload = () => {
            const base64 = (reader.result as string).split(",")[1];
            onAudio(base64, actualMime);
          };
          reader.onerror = () => {
            setVoiceError("Error leyendo el audio — intenta de nuevo");
            setVoiceParsing(false);
          };
          reader.readAsDataURL(blob);
        };

        // NO timeslice — iOS Safari only delivers audio on stop(), not during recording
        recorder.start();
        mediaRecorderRef.current = recorder;
        setVoiceListening(true);

        // Auto-stop after 30 seconds
        setTimeout(() => {
          if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
        }, 30000);
      })
      .catch((err) => {
        setVoiceListening(false);
        const msg = err?.name === "NotAllowedError"
          ? "Permiso de micrófono denegado — ve a Configuración > Safari > Micrófono y actívalo"
          : "No se pudo acceder al micrófono — intenta de nuevo";
        setVoiceError(msg);
        setShowVoicePanel(true);
      });
  };

  const startVoice = () => {
    setVoiceTranscript("🎙️ Grabando... toca el micrófono para parar");
    setVoiceError(null);
    setVoiceParsing(false);
    setShowVoicePanel(true);
    startMediaRecording(handleVoiceAudio);
  };

  const stopVoice = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setVoiceListening(false);
  };

  // ── Two-tap GPS trip flow ─────────────────────────────────────────────────
  const snapGPS = (): Promise<{ lat: number; lng: number; addr: string }> =>
    new Promise(resolve => {
      const doGeocode = async (lat: number, lng: number) => {
        try {
          const rich = await reverseGeocodeRich(lat, lng);
          resolve({ lat, lng, addr: rich.physicalAddress || `${lat.toFixed(4)},${lng.toFixed(4)}` });
        } catch {
          resolve({ lat, lng, addr: `${lat.toFixed(4)},${lng.toFixed(4)}` });
        }
      };
      // Always get fresh GPS — never use potentially stale cached state
      navigator.geolocation.getCurrentPosition(
        pos => doGeocode(pos.coords.latitude, pos.coords.longitude),
        () => {
          // Fallback to cached state only if fresh fails
          if (gps.lat && gps.lng) doGeocode(gps.lat, gps.lng);
          else resolve({ lat: 0, lng: 0, addr: "GPS unavailable" });
        },
        { timeout: 8000, enableHighAccuracy: true, maximumAge: 0 }
      );
    });

  // ── Gemini Chat functions ─────────────────────────────────────────────────
  const sendGeminiMessage = async (text: string) => {
    if (!text.trim() || geminiLoading) return;
    const userMsg: GeminiMessage = { role: "user", text: text.trim(), ts: Date.now() };
    const nextHistory = [...geminiMessages, userMsg];
    setGeminiMessages(nextHistory);
    setGeminiInput("");
    setGeminiLoading(true);
    const todayYMD = toYYYYMMDD(new Date());
    const expensesToday = expenses
      .filter(e => e.date === todayYMD)
      .reduce((s, e) => s + e.amount, 0);
    try {
      const res = await fetch("/api/gemini-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text.trim(),
          context: {
            date: new Date().toLocaleString("en-US", { weekday:"short", month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" }),
            shiftActive,
            grossToday,
            tripCount: todayTrips.length,
            dailyGoal,
            hourlyGoal: goal,
            shiftMiles,
            shiftHours: activeHoursDecimal,
            expensesToday,
            netToday: grossToday - expensesToday,
            location: gpsAddress || undefined,
          },
          history: geminiMessages.slice(-10).map(m => ({ role: m.role, text: m.text })),
        }),
      });
      const data = await res.json() as { reply?: string; error?: string };
      setGeminiMessages(prev => [...prev, {
        role: "assistant",
        text: data.reply ?? (data.error ?? "Error — intenta de nuevo."),
        ts: Date.now(),
      }]);
    } catch {
      setGeminiMessages(prev => [...prev, { role: "assistant", text: "Sin conexión — intenta de nuevo.", ts: Date.now() }]);
    } finally {
      setGeminiLoading(false);
    }
  };

  const handleGeminiVoice = () => {
    if (geminiChatRec) {
      // Tap again → stop recording
      if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
      setGeminiChatRec(false);
      return;
    }
    setGeminiChatRec(true);
    startMediaRecording(async (base64, mimeType) => {
      setGeminiChatRec(false);
      setGeminiLoading(true);
      try {
        const vr = await fetch("/api/voice-parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ audioBase64: base64, mimeType }),
        });
        const vd = await vr.json() as { transcript?: string };
        const transcript = vd.transcript?.trim();
        if (transcript) {
          await sendGeminiMessage(transcript);
        } else {
          setGeminiLoading(false);
        }
      } catch {
        setGeminiLoading(false);
      }
    });
  };

  // ── LimoSys capture + drag handlers ─────────────────────────────────────
  const handleLimoCapture = async (file: File) => {
    setLimoCapturing(true); setLimoError(null);
    try {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement("canvas");
      const max = 1024;
      const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const base64 = canvas.toDataURL("image/jpeg", 0.85).split(",")[1];
      const res = await fetch("/api/limosys-eval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mimeType: "image/jpeg", minHourly: limoMinHourly, minPerMile: limoMinPerMile }),
      });
      const data = await res.json() as { offers?: LimoOffer[]; warning?: string; error?: string };
      if (data.error) throw new Error(data.error);
      const offers = data.offers ?? [];
      if (offers.length === 0) throw new Error("No offers detected");
      setLimoOffers(offers);
      setLimoOfferIdx(0);
      setLimoOverlayOn(true);
    } catch (err: unknown) {
      setLimoError(err instanceof Error ? err.message : "Error evaluando oferta");
    } finally {
      setLimoCapturing(false);
    }
  };

  const onLimoDragStart = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    limoDragRef.current = { startX: e.clientX, startY: e.clientY, px: limoOverlayPos.x, py: limoOverlayPos.y };
  };
  const onLimoDragMove = (e: React.PointerEvent) => {
    if (!limoDragRef.current) return;
    setLimoOverlayPos({
      x: limoDragRef.current.px + e.clientX - limoDragRef.current.startX,
      y: Math.max(10, limoDragRef.current.py + e.clientY - limoDragRef.current.startY),
    });
  };
  const onLimoDragEnd = () => { limoDragRef.current = null; };

  const resetVoiceTripFlow = () => {
    if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
    mediaRecorderRef.current = null;
    mediaChunksRef.current = [];
    setVoiceTripStep("idle");
    setVtPickup(null);
    setVtDropoff(null);
    setVtStartTime(null);
    setVtElapsed(0);
    setVtFare(null);
    setVtSaving(false);
    setShowVoicePanel(false);
    setVoiceListening(false);
    setVoiceTranscript("");
    setVoiceError(null);
  };

  const startVoiceTripFlow = async () => {
    setVoiceTripStep("started");
    setVtStartTime(new Date());
    setVtElapsed(0);
    setVtPickup(null);
    setVtDropoff(null);
    setVtFare(null);
    setShowVoicePanel(true);
    const loc = await snapGPS();
    setVtPickup(loc);
  };

  const startVoiceForFare = () => {
    setVoiceTranscript("🎙️ Di el monto del viaje... toca para parar");
    setVoiceError(null);
    startMediaRecording(handleVoiceAudio);
  };

  const endVoiceTripFlow = async () => {
    setVoiceTripStep("listening");
    setVoiceParsing(false);
    const loc = await snapGPS();
    setVtDropoff(loc);
    startVoiceForFare();
  };

  const confirmAndSaveVoiceTrip = () => {
    if (!vtFare) return;
    setVtSaving(true);
    const now = new Date();
    const today = toYYYYMMDD(now);
    const timeStr = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    const e  = parseFloat(vtFare.earnings)    || 0;
    const t  = parseFloat(vtFare.tips)        || 0;
    const tl = parseFloat(vtFare.toll)        || 0;
    const f  = parseFloat(vtFare.platformFee) || 0;
    const durationMin = vtStartTime
      ? Math.round((now.getTime() - vtStartTime.getTime()) / 60000)
      : 0;
    const newTrip: Trip = {
      id: Date.now().toString(),
      reference: "",
      earnings: e, tips: t, extra: 0, otherCash: 0, toll: tl, fee: f,
      platform: vtFare.platform || "Uber",
      pickup:  vtPickup?.addr  || "",
      dropoff: vtDropoff?.addr || "",
      notes: durationMin > 0 ? `${durationMin} min trip · voice entry` : "Voice entry",
      grandTotal: e + t + tl - f,
      time: timeStr,
      date: today,
      timestamp: now.toISOString(),
      gps: vtPickup?.lat ? { lat: vtPickup.lat, lng: vtPickup.lng } : undefined,
      miles: undefined,
      status: "pending" as const,
      reviewed: false,
    };
    syncSaveTrips([newTrip, ...trips]);
    showToast(`✓ Trip saved · $${newTrip.grandTotal.toFixed(2)}${durationMin ? ` · ${durationMin} min` : ""}`);
    resetVoiceTripFlow();
  };


  // ── Broadcast eval handlers ────────────────────────────────────────────────
  const handleBroadcastCapture = async (file: File) => {
    setBroadcastCapturing(true);
    setBroadcastError(null);
    setBroadcastResult(null);
    try {
      // Compress to JPEG 1024px max before sending
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
            const MAX = 1024;
            const scale = Math.min(1, MAX / Math.max(img.width, img.height));
            canvas.width = Math.round(img.width * scale);
            canvas.height = Math.round(img.height * scale);
            const ctx = canvas.getContext("2d")!;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL("image/jpeg", 0.85));
          };
          img.onerror = reject;
          img.src = e.target!.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const base64 = dataUrl.split(",")[1];
      const res = await fetch("/api/broadcast-eval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: base64,
          mimeType: "image/jpeg",
          currentTime: new Date().toISOString(),
          driverLocation: gps.lat != null ? { lat: gps.lat, lng: gps.lng } : undefined,
        }),
      });
      const data = await res.json() as Omit<BroadcastEval, "id" | "timestamp"> & { error?: string };
      if (!res.ok) throw new Error(data.error || "Evaluation failed");

      const evalResult: BroadcastEval = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        recommendation: data.recommendation,
        confidence: data.confidence,
        jobDetails: data.jobDetails,
        trafficNote: data.trafficNote,
        estimatedNetDollars: data.estimatedNetDollars,
        estimatedHourlyRate: data.estimatedHourlyRate,
        factors: data.factors,
        tip: data.tip,
      };

      setBroadcastResult(evalResult);
      setBroadcastHistory(prev => {
        const updated = [evalResult, ...prev].slice(0, 20);
        try { localStorage.setItem("ic-broadcast-history", JSON.stringify(updated)); } catch {}
        return updated;
      });
    } catch (err: unknown) {
      setBroadcastError(err instanceof Error ? err.message : "Evaluation failed. Please try again.");
    } finally {
      setBroadcastCapturing(false);
    }
  };

  const markBroadcastAccepted = (id: string, accepted: boolean) => {
    setBroadcastHistory(prev => {
      const updated = prev.map(e => e.id === id ? { ...e, accepted } : e);
      try { localStorage.setItem("ic-broadcast-history", JSON.stringify(updated)); } catch {}
      return updated;
    });
    setBroadcastResult(prev => prev && prev.id === id ? { ...prev, accepted } : prev);
  };

  // ── Cloud backup — sends full snapshot to the API server → PostgreSQL ─────
  const saveCloudBackup = useCallback(async () => {
    try {
      const payload = {
        trips:    tripsRef.current,
        expenses: expensesRef.current,
        hoursLog: hoursLogRef.current,
        settings: {
          goal:               localStorage.getItem("ic-hourly-goal"),
          workDays:           localStorage.getItem("ic-work-days"),
          dayTargets:         localStorage.getItem("ic-day-targets"),
          bankBalance:        localStorage.getItem("ic-bank-balance"),
          bankAdjHistory:     localStorage.getItem("ic-bank-adj-history"),
          recurringPlan:      localStorage.getItem("ic-recurring-plan"),
          weekOverrides:      localStorage.getItem("ic-week-overrides"),
          customVendors:      localStorage.getItem("ic-custom-vendors"),
          customExpenseTypes: localStorage.getItem("ic-custom-exp-types"),
          customExpenseCats:  localStorage.getItem("ic-custom-exp-cats"),
        },
      };
      const res = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const now = new Date();
        setCloudBackupAt(now);
        try { localStorage.setItem("ic-last-cloud-backup", now.toISOString()); } catch {}
      }
    } catch { /* silent — cloud backup is best-effort */ }
  }, []);

  // Push latest code to GitHub (called at most once per day)
  const saveGithubPush = useCallback(async () => {
    try {
      const res = await fetch("/api/git-push", { method: "POST" });
      if (res.ok) {
        const data = await res.json() as { ok: boolean; skipped?: boolean; pushedAt?: string };
        if (data.ok && !data.skipped && data.pushedAt) {
          const now = new Date(data.pushedAt);
          setGithubPushAt(now);
          try { localStorage.setItem("ic-last-github-push", now.toISOString()); } catch {}
        }
      }
    } catch { /* silent — GitHub push is best-effort */ }
  }, []);

  // Auto-backup: every 60 min + whenever the app goes to background
  // Also triggers a GitHub push once per day (if 24h have elapsed)
  useEffect(() => {
    const DAY_MS = 24 * 60 * 60 * 1000;
    const maybePushGithub = () => {
      const last = githubPushAt ? githubPushAt.getTime() : 0;
      if (Date.now() - last > DAY_MS) saveGithubPush();
    };
    const interval = setInterval(() => { saveCloudBackup(); maybePushGithub(); }, 60 * 60 * 1000);
    const onHide = () => { if (document.visibilityState === "hidden") { saveCloudBackup(); maybePushGithub(); } };
    document.addEventListener("visibilitychange", onHide);
    // Also push once on load if it's been more than a day
    maybePushGithub();
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [saveCloudBackup, saveGithubPush, githubPushAt]);

  // Auto-backup: also 5 s after any trip or expense change (debounced)
  // Skips the initial mount so the restore-from-cloud on load doesn't trigger a redundant write.
  const backupDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dataBackupMountedRef = useRef(false);
  useEffect(() => {
    if (!dataBackupMountedRef.current) { dataBackupMountedRef.current = true; return; }
    if (backupDebounceRef.current) clearTimeout(backupDebounceRef.current);
    backupDebounceRef.current = setTimeout(() => saveCloudBackup(), 5000);
  }, [trips, expenses, saveCloudBackup]);

  // ── Load scanned documents from cloud ────────────────────────────────────
  const loadDocuments = useCallback(async () => {
    setDocsLoading(true);
    try {
      const res = await fetch("/api/documents");
      if (res.ok) {
        const { documents: docs } = await res.json() as { documents: DocEntry[] };
        setDocuments(docs ?? []);
      }
    } catch { /* silent */ }
    setDocsLoading(false);
  }, []);

  // Keep the old name as an alias so no other call sites break
  const deleteAndSave = syncSaveTrips;

  const handleDelete = (id: string) => {
    if (!window.confirm("Delete this trip? This cannot be undone.")) return;
    deleteAndSave(trips.filter(t => t.id !== id));
    showToast("Trip deleted");
  };

  const handleUnpostTrip = (id: string) => {
    deleteAndSave(trips.map(t => t.id !== id ? t : { ...t, status: "pending" as const, reviewed: false, postedAt: undefined }));
    showToast("Trip moved back to Register");
  };

  const handleDeletePostedTrip = (id: string) => {
    if (!window.confirm("Delete this posted trip permanently? This cannot be undone.")) return;
    deleteAndSave(trips.filter(t => t.id !== id));
    showToast("Posted trip deleted");
  };

  const handleInlineEditStart = (trip: Trip) => {
    setInlineEditId(trip.id);
    setInlineForm({
      pickup: trip.pickup,
      dropoff: trip.dropoff,
      earnings: String(trip.earnings),
      reference: trip.reference,
      toll: String(trip.toll),
      notes: trip.notes,
    });
  };

  const handleInlineSave = (id: string) => {
    const newEarnings = parseFloat(inlineForm.earnings) || 0;
    const newToll = parseFloat(inlineForm.toll) || 0;
    syncSaveTrips(trips.map(t => {
      if (t.id !== id) return t;
      return {
        ...t,
        pickup: inlineForm.pickup,
        dropoff: inlineForm.dropoff,
        earnings: newEarnings,
        reference: inlineForm.reference,
        toll: newToll,
        notes: inlineForm.notes,
        grandTotal: newEarnings + t.tips + t.extra + (t.otherCash || 0) + newToll - t.fee,
      };
    }));
    setInlineEditId(null);
    showToast("Trip updated ✓");
  };

  const handlePostToLedger = () => {
    if (selectedForPost.size === 0) return;
    const now = new Date().toISOString();
    const count = selectedForPost.size;
    const updated = trips.map(t =>
      selectedForPost.has(t.id)
        ? { ...t, status: "posted" as const, reviewed: true, postedAt: now }
        : t
    );
    syncSaveTrips(updated);
    setSelectedForPost(new Set());
    showToast(`${count} trip${count !== 1 ? "s" : ""} posted to Ledger ✓`);
    setActiveTab("TRIPS"); setTripsTab("LEDGER");
  };

  const resetExpenseForm = () => {
    setExpenseForm({
      name: "", type: "Gasoline / Fuel", category: "Vehicle & Fuel",
      description: "", amount: "", date: new Date().toISOString().slice(0, 10),
      frequency: "none", dueDate: "",
      purpose: "business",
    });
    setPendingReceiptDocId(null);
  };

  const handleSaveExpense = () => {
    if (!expenseForm.name.trim() || !expenseForm.amount) {
      showToast("Enter a name and amount"); return;
    }
    const newExpense: Expense = {
      id: editingExpenseId || Date.now().toString(),
      date: expenseForm.date || toYYYYMMDD(new Date()),
      category: expenseForm.category,
      vendor: expenseForm.name.trim(),
      amount: parseFloat(expenseForm.amount) || 0,
      note: expenseForm.description.trim(),
      type: expenseForm.type,
      verified: editingExpenseId
        ? (expenses.find(e => e.id === editingExpenseId)?.verified ?? false)
        : false,
      frequency: expenseForm.frequency !== "none" ? expenseForm.frequency : undefined,
      dueDate: expenseForm.dueDate || undefined,
      receiptDocId: pendingReceiptDocId ?? undefined,
      purpose: expenseForm.purpose,
    };
    if (editingExpenseId) {
      syncSaveExpenses(expenses.map(e => e.id === editingExpenseId ? newExpense : e));
    } else {
      syncSaveExpenses([newExpense, ...expenses]);
    }
    resetExpenseForm();
    setEditingExpenseId(null);
    setShowExpenseForm(false);
    showToast(`Expense saved ✓ $${newExpense.amount.toFixed(2)}`);
  };

  // Receipt scan via Gemini Vision — sends image to API server, auto-fills expense form
  const handleReceiptScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setReceiptScanError(null);
    setScanningReceipt(true);
    try {
      // Compress to max 1 MB before sending (canvas resize)
      const imageBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = ev => {
          const dataUrl = ev.target?.result as string;
          const img = new Image();
          img.onload = () => {
            const MAX_PX = 1024;
            const scale = Math.min(1, MAX_PX / Math.max(img.width, img.height));
            const canvas = document.createElement("canvas");
            canvas.width  = Math.round(img.width  * scale);
            canvas.height = Math.round(img.height * scale);
            const ctx = canvas.getContext("2d");
            if (!ctx) { reject(new Error("canvas")); return; }
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            // Strip the data:image/...;base64, prefix
            const b64 = canvas.toDataURL("image/jpeg", 0.85).split(",")[1];
            resolve(b64);
          };
          img.onerror = reject;
          img.src = dataUrl;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await fetch("/api/receipt-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64, mimeType: "image/jpeg" }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Server error" }));
        throw new Error((err as {error:string}).error || "Server error");
      }

      const data = await res.json() as {
        vendor: string; amount: number; date: string; category: string; note: string;
        docId?: number;
      };
      if (data.docId) setPendingReceiptDocId(data.docId);

      // Map Gemini's category to our IRS categories
      const CAT_MAP: Record<string, string> = {
        "Gas/Fuel":             "Vehicle & Fuel",
        "Car Wash":             "Vehicle & Fuel",
        "Tolls":                "Tolls & Parking",
        "Food & Drink":         "Meals & Entertainment",
        "Vehicle Maintenance":  "Vehicle & Fuel",
        "Insurance":            "Insurance",
        "Phone":                "Phone & Communications",
        "Parking":              "Tolls & Parking",
        "Supplies":             "Supplies & Equipment",
        "Other":                "Other",
      };

      setExpenseForm(s => ({
        ...s,
        name:        data.vendor  || s.name,
        amount:      data.amount  > 0 ? String(data.amount.toFixed(2)) : s.amount,
        date:        data.date    || s.date,
        category:    CAT_MAP[data.category] ?? s.category,
        description: data.note    || s.description,
      }));

      const filled = [
        data.vendor  && "vendor",
        data.amount > 0 && "amount",
        data.date    && "date",
      ].filter(Boolean).join(", ");
      showToast(`✅ Receipt scanned · filled: ${filled || "no data found"}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Scan failed";
      setReceiptScanError(msg);
      showToast(`❌ ${msg}`, 3500);
    } finally {
      setScanningReceipt(false);
    }
  };

  const handleDeleteExpense = (id: string) => {
    if (!window.confirm("¿Eliminar este gasto?")) return;
    syncSaveExpenses(expenses.filter(e => e.id !== id));
    showToast("Expense deleted");
  };

  const handleToggleExpenseVerified = (id: string) => {
    syncSaveExpenses(expenses.map(e => e.id === id ? { ...e, verified: !e.verified } : e));
  };

  const goldGradientStyle = {
    background: "linear-gradient(90deg, #f6dd8c, #d9b64f)",
    WebkitBackgroundClip: "text" as const,
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
  };

  const shiftStatusLabel = shiftActive ? (isOnBreak ? "ON BREAK" : "ON DUTY") : "OFF DUTY";
  const gpsStatusLabel   = gps.status === "active" ? "active" : gps.status === "searching" ? "searching" : "inactive";
  const greeting         = currentTime.getHours() < 6 ? "Good evening" : currentTime.getHours() < 12 ? "Good morning" : currentTime.getHours() < 19 ? "Good afternoon" : "Good evening";

  // ─── NYC demand zones — baked from TLC trip record data ──────────────────
  // Source: NYC TLC Yellow Cab + FHV trip records 2023-2025, aggregate pickup
  // counts by hour-of-day and day-type. No API key required.
  type ZoneHeat = "hot" | "warm" | "cold";
  const NYC_DEMAND_ZONES_DEF = [
    { id: "jfk",     name: "JFK Airport",               lat: 40.6413, lng: -73.7781 },
    { id: "lga",     name: "LaGuardia Airport",          lat: 40.7769, lng: -73.8740 },
    { id: "ewr",     name: "Newark Airport (EWR)",       lat: 40.6895, lng: -74.1745 },
    { id: "penn",    name: "Penn Station / MSG",          lat: 40.7506, lng: -73.9935 },
    { id: "timesq",  name: "Times Square",               lat: 40.7580, lng: -73.9855 },
    { id: "gct",     name: "Grand Central",              lat: 40.7527, lng: -73.9772 },
    { id: "midtown", name: "Midtown Manhattan",           lat: 40.7549, lng: -73.9840 },
    { id: "fidi",    name: "Financial District",          lat: 40.7074, lng: -74.0113 },
    { id: "ues",     name: "Upper East Side",             lat: 40.7739, lng: -73.9575 },
    { id: "wburg",   name: "Williamsburg",                lat: 40.7081, lng: -73.9571 },
    { id: "astoria", name: "Astoria / Queens",            lat: 40.7721, lng: -73.9302 },
    { id: "bklyn",   name: "Brooklyn Downtown",           lat: 40.6928, lng: -73.9903 },
    { id: "meatpk",  name: "Meatpacking / Chelsea",      lat: 40.7416, lng: -74.0057 },
    { id: "les",     name: "East Village / LES",          lat: 40.7264, lng: -73.9818 },
    { id: "harlem",  name: "Harlem",                      lat: 40.8116, lng: -73.9465 },
  ] as const;
  type ZoneId = typeof NYC_DEMAND_ZONES_DEF[number]["id"];
  // Demand table indexed by [dayType][hour 0-23] → [zoneId, heat][]
  // "wkd" = Mon–Fri, "wke" = Sat–Sun
  const NYC_HOURLY_DEMAND: Record<"wkd" | "wke", [ZoneId, ZoneHeat][][]> = {
    wkd: [
      /* 0 */ [["timesq","hot"],["les","hot"],["wburg","warm"],["meatpk","warm"],["jfk","cold"]],
      /* 1 */ [["timesq","hot"],["les","hot"],["wburg","warm"],["meatpk","warm"],["jfk","cold"]],
      /* 2 */ [["timesq","hot"],["les","warm"],["wburg","warm"],["meatpk","cold"]],
      /* 3 */ [["jfk","warm"],["lga","warm"],["timesq","cold"],["midtown","cold"]],
      /* 4 */ [["jfk","hot"],["lga","warm"],["ewr","warm"],["timesq","cold"]],
      /* 5 */ [["jfk","hot"],["lga","hot"],["ewr","warm"],["midtown","cold"]],
      /* 6 */ [["lga","hot"],["jfk","warm"],["midtown","warm"],["gct","warm"],["penn","cold"]],
      /* 7 */ [["midtown","hot"],["gct","hot"],["penn","warm"],["fidi","warm"],["lga","warm"]],
      /* 8 */ [["midtown","hot"],["gct","hot"],["penn","hot"],["fidi","warm"],["ues","warm"]],
      /* 9 */ [["midtown","hot"],["gct","warm"],["penn","warm"],["fidi","warm"],["ues","cold"]],
      /* 10 */ [["midtown","hot"],["timesq","warm"],["ues","warm"],["fidi","cold"],["jfk","cold"]],
      /* 11 */ [["midtown","hot"],["timesq","warm"],["ues","warm"],["bklyn","cold"]],
      /* 12 */ [["midtown","hot"],["timesq","warm"],["ues","warm"],["penn","cold"],["bklyn","cold"]],
      /* 13 */ [["midtown","hot"],["timesq","warm"],["ues","warm"],["penn","cold"]],
      /* 14 */ [["midtown","hot"],["timesq","warm"],["penn","warm"],["ues","cold"]],
      /* 15 */ [["penn","hot"],["midtown","hot"],["gct","warm"],["timesq","warm"]],
      /* 16 */ [["penn","hot"],["gct","hot"],["midtown","hot"],["timesq","warm"],["ues","cold"]],
      /* 17 */ [["penn","hot"],["gct","hot"],["midtown","hot"],["timesq","warm"],["fidi","warm"]],
      /* 18 */ [["penn","hot"],["timesq","hot"],["gct","warm"],["midtown","warm"],["jfk","cold"]],
      /* 19 */ [["timesq","hot"],["penn","warm"],["ues","warm"],["wburg","cold"],["jfk","cold"]],
      /* 20 */ [["timesq","hot"],["ues","warm"],["wburg","warm"],["meatpk","cold"]],
      /* 21 */ [["timesq","hot"],["wburg","warm"],["ues","warm"],["meatpk","warm"],["les","cold"]],
      /* 22 */ [["timesq","hot"],["wburg","warm"],["meatpk","warm"],["les","warm"],["ues","cold"]],
      /* 23 */ [["timesq","hot"],["les","warm"],["wburg","warm"],["meatpk","warm"],["jfk","cold"]],
    ],
    wke: [
      /* 0 */ [["timesq","hot"],["wburg","hot"],["les","hot"],["meatpk","warm"],["astoria","cold"]],
      /* 1 */ [["timesq","hot"],["wburg","hot"],["les","hot"],["meatpk","warm"]],
      /* 2 */ [["timesq","hot"],["wburg","hot"],["les","warm"],["meatpk","warm"]],
      /* 3 */ [["timesq","warm"],["jfk","warm"],["wburg","cold"],["les","cold"]],
      /* 4 */ [["jfk","hot"],["lga","warm"],["ewr","warm"],["timesq","cold"]],
      /* 5 */ [["jfk","hot"],["lga","hot"],["ewr","warm"],["timesq","cold"]],
      /* 6 */ [["jfk","warm"],["lga","warm"],["timesq","cold"],["midtown","cold"]],
      /* 7 */ [["jfk","warm"],["lga","warm"],["midtown","cold"],["timesq","cold"]],
      /* 8 */ [["jfk","warm"],["lga","warm"],["midtown","cold"],["bklyn","cold"]],
      /* 9 */ [["jfk","warm"],["midtown","warm"],["timesq","warm"],["bklyn","cold"]],
      /* 10 */ [["timesq","hot"],["midtown","warm"],["bklyn","warm"],["ues","cold"]],
      /* 11 */ [["timesq","hot"],["midtown","warm"],["bklyn","warm"],["ues","cold"]],
      /* 12 */ [["timesq","hot"],["midtown","warm"],["bklyn","warm"],["ues","warm"],["wburg","cold"]],
      /* 13 */ [["timesq","hot"],["midtown","warm"],["ues","warm"],["bklyn","warm"],["wburg","cold"]],
      /* 14 */ [["timesq","hot"],["midtown","warm"],["ues","warm"],["wburg","cold"],["bklyn","cold"]],
      /* 15 */ [["timesq","hot"],["midtown","warm"],["ues","warm"],["wburg","warm"],["jfk","cold"]],
      /* 16 */ [["timesq","hot"],["wburg","warm"],["midtown","warm"],["ues","warm"],["bklyn","cold"]],
      /* 17 */ [["timesq","hot"],["wburg","warm"],["midtown","warm"],["les","cold"],["jfk","cold"]],
      /* 18 */ [["timesq","hot"],["wburg","hot"],["midtown","warm"],["les","warm"],["meatpk","cold"]],
      /* 19 */ [["timesq","hot"],["wburg","hot"],["les","warm"],["meatpk","warm"],["midtown","cold"]],
      /* 20 */ [["timesq","hot"],["wburg","hot"],["les","warm"],["meatpk","warm"],["astoria","cold"]],
      /* 21 */ [["timesq","hot"],["wburg","hot"],["les","warm"],["meatpk","warm"],["astoria","cold"]],
      /* 22 */ [["timesq","hot"],["wburg","hot"],["les","warm"],["meatpk","warm"]],
      /* 23 */ [["timesq","hot"],["wburg","hot"],["les","hot"],["meatpk","warm"],["astoria","cold"]],
    ],
  };

  // Compute recommended zones for current hour × day, sorted hot→warm→cold then by GPS distance
  const demandZones = useMemo(() => {
    const h    = currentTime.getHours();
    const dow  = currentTime.getDay(); // 0=Sun, 6=Sat
    const dtype: "wkd" | "wke" = (dow === 0 || dow === 6) ? "wke" : "wkd";
    const list = NYC_HOURLY_DEMAND[dtype][h] ?? [];
    const heatOrder: Record<ZoneHeat, number> = { hot: 0, warm: 1, cold: 2 };
    return list
      .map(([id, heat]) => {
        const zone = NYC_DEMAND_ZONES_DEF.find(z => z.id === id)!;
        const km   = (gps.lat && gps.lng)
          ? haversineKm(gps.lat, gps.lng, zone.lat, zone.lng)
          : null;
        return { ...zone, heat, km };
      })
      .sort((a, b) => {
        const hd = heatOrder[a.heat] - heatOrder[b.heat];
        if (hd !== 0) return hd;
        if (a.km !== null && b.km !== null) return a.km - b.km;
        return 0;
      })
      .slice(0, 5);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTime.getHours(), currentTime.getDay(), gps.lat, gps.lng]);

  // ─── Dashboard monthly summary (used in FI card) ─────────────
  const _dbMonthStr   = `${currentTime.getFullYear()}-${String(currentTime.getMonth()+1).padStart(2,'0')}`;
  const _dbEarnMonth  = trips.filter(t=>t.date.startsWith(_dbMonthStr))
    .reduce((a,t)=>a+(t.earnings||0)+(t.tips||0)+(t.extra||0)+(t.otherCash||0)+(t.toll||0),0);
  const _dbExpMonth   = expenses.filter(e=>e.date?.startsWith(_dbMonthStr)&&e.frequency!=='monthly'&&e.frequency!=='weekly')
    .reduce((a,e)=>a+e.amount,0);
  const _dbNetMonth   = _dbEarnMonth - _dbExpMonth;
  const _dbMonthGoal  = workDays.reduce((s,iso)=>s+(dayTargets[iso]??dailyGoal),0)*4.33;
  const _dbMonthPct   = _dbMonthGoal>0 ? Math.min(_dbEarnMonth/_dbMonthGoal*100,100) : 0;
  const _dbDayOfMonth = currentTime.getDate();
  const _dbDaysInMonth = new Date(currentTime.getFullYear(),currentTime.getMonth()+1,0).getDate();
  const _dbPaceTarget = _dbMonthGoal * (_dbDayOfMonth/_dbDaysInMonth);
  const _dbOnTrack    = _dbEarnMonth >= _dbPaceTarget * 0.85;

  // ─── Dashboard ───────────────────────────────────────────────
  const DashboardContent = (
    <div className="space-y-5">
      <div>
        <h2 className="text-[24px] font-bold leading-tight">{greeting}, Miguel.</h2>
        <p className="font-mono-jet text-[11px] tracking-[0.18em] mt-1.5 uppercase" style={goldGradientStyle}>
          {currentTime.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).toUpperCase()}
        </p>
        <p className="font-mono-jet text-[10px] text-neutral-400 mt-1">
          {currentTime.toLocaleTimeString()}
          {gpsAddress
            ? ` · ${gpsAddress}`
            : gps.status === "searching"
              ? " · Locating…"
              : gps.status === "active" && gps.lat && gps.lng
                ? ` · ${gps.lat.toFixed(4)}, ${gps.lng.toFixed(4)}`
                : ""}
        </p>
      </div>

      {/* Main status card */}
      <div className="rounded-[20px] px-4 pt-3.5 pb-3 overflow-hidden relative"
        style={{ background: "#0d0d0d", border: "1px solid #1e1e1e", boxShadow: "0 0 0 1px #1a1200 inset" }}>
        {/* Gold top accent line */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2,
          background: "linear-gradient(90deg, #d97706, #f6dd8c44, transparent)" }} />

        <div className="flex items-center justify-between">
          <p className="font-mono-jet text-[10px] text-neutral-400">
            {currentTime.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} ·{" "}
            {currentTime.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
          </p>
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[9px] tracking-[0.12em] font-bold"
            style={
              shiftActive && !isOnBreak
                ? { background: "#052e16", borderColor: "#4ade8066", color: "#4ade80" }
                : shiftActive && isOnBreak
                ? { background: "#1c0d00", borderColor: "#f9731666", color: "#f97316" }
                : { background: "#111", borderColor: "#2a2a2a", color: "#737373" }
            }
          >
            <span className={`w-1.5 h-1.5 rounded-full ${
              shiftActive && !isOnBreak ? "bg-[#4ade80] animate-pulse"
              : shiftActive && isOnBreak  ? "bg-[#f97316] animate-pulse"
              : "bg-neutral-600"
            }`} />
            {shiftStatusLabel}
          </span>
        </div>
        <div className="mt-2">
          <p className="font-mono-jet text-[11px] text-neutral-400">
            {gps.lat && gps.lng ? `${gps.lat.toFixed(4)}, ${gps.lng.toFixed(4)}` : "GPS inactive"}{gps.acc ? ` · ±${Math.round(gps.acc)}m` : ""}
          </p>
          {gpsAddress && <p className="text-[11px] text-neutral-300 mt-0.5 truncate">{gpsAddress}</p>}
          {gpsAirport && <p className="font-mono-jet text-[10px] text-[#f6dd8c] mt-0.5">✈ {gpsAirport}</p>}
        </div>
        <p className="font-mono-jet text-[32px] font-black mt-2 tracking-tight" style={goldGradientStyle}>${grossToday.toFixed(2)}</p>
        <p className="font-mono-jet text-[10px] text-neutral-400 mt-0.5">{todayTrips.length} {todayTrips.length === 1 ? "trip" : "trips"} · fare + tips + tolls</p>
        <div className="mt-3 h-px" style={{ background: "linear-gradient(90deg, #1e1400, #1e1e1e)" }} />
        <div className="mt-2.5 flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${
            shiftActive && !isOnBreak ? "bg-[#4ade80]"
            : shiftActive && isOnBreak  ? "bg-[#f97316]"
            : "bg-neutral-700"
          }`} />
          <span className={`text-[10px] font-mono-jet ${
            shiftActive && !isOnBreak ? "text-[#4ade80]"
            : shiftActive && isOnBreak  ? "text-[#f97316]"
            : "text-neutral-400"
          }`}>
            {shiftActive ? (isOnBreak ? "On break" : "On duty") : "Shift ended"}
          </span>
          <button
            onClick={() => {
              if (!navigator.geolocation) return;
              setGps(s => ({ ...s, status: "searching" }));
              navigator.geolocation.getCurrentPosition(
                pos => setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude, acc: pos.coords.accuracy ?? null, timestamp: pos.timestamp, status: "active" }),
                () => setGps(s => ({ ...s, status: "error" })),
                { enableHighAccuracy: true, maximumAge: 0, timeout: 12000 }
              );
            }}
            className="ml-auto text-[9px] text-neutral-400 font-mono-jet flex items-center gap-1 active:opacity-60"
            title="Tap to refresh GPS"
          >
            <span className={`w-1 h-1 rounded-full ${gps.status === "active" ? "bg-[#4ade80]" : gps.status === "searching" ? "bg-yellow-400 animate-pulse" : gps.status === "error" ? "bg-red-500" : "bg-neutral-600"}`} />
            GPS {gpsStatusLabel} {gps.status !== "searching" ? "↺" : ""}
          </button>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {(["START", "BREAK", "END"] as TurnStatus[]).map(s => {
            const isActive = (s === "START" && shiftActive && !isOnBreak) || (s === "BREAK" && isOnBreak) || (s === "END" && !shiftActive);
            const disabled = s === "BREAK" && !shiftActive;
            return (
              <button key={s} onClick={() => handleTurnButton(s)} disabled={disabled}
                className={`h-[38px] rounded-full border text-[11px] tracking-[0.12em] font-bold transition-all ${
                  disabled ? "cursor-not-allowed"
                  : ""
                }`}
                style={
                  disabled ? { background: "#0a0a0a", border: "1px solid #1a1a1a", color: "#444" }
                  : isActive ? { background: "linear-gradient(90deg, #f6dd8c, #d9b64f)", border: "1px solid #d9b64f", color: "#000" }
                  : { background: "transparent", border: "1px solid #d9b64f99", color: "#f6dd8c" }
                }>
                {s === "START" ? "START" : s === "BREAK" ? (isOnBreak ? "RESUME" : "BREAK") : "END SHIFT"}
              </button>
            );
          })}
        </div>
      </div>

      {/* Goal tracker */}
      <div className="rounded-[20px] p-4 space-y-4" style={{ background: "#0d0d0d", border: "1px solid #1e1e1e" }}>
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] tracking-[0.18em] font-bold" style={goldGradientStyle}>$/HR NOW</h3>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[9px] font-bold tracking-[0.12em]"
            style={shiftActive&&!isOnBreak
              ?{background:"#052e16",borderColor:"#4ade8066",color:"#4ade80"}
              :shiftActive&&isOnBreak
              ?{background:"#1c0d00",borderColor:"#f9731666",color:"#f97316"}
              :{background:"#111",borderColor:"#2a2a2a",color:"#737373"}}>
            <span className={`w-1.5 h-1.5 rounded-full ${shiftActive&&!isOnBreak?"bg-[#4ade80] animate-pulse":shiftActive&&isOnBreak?"bg-[#f97316] animate-pulse":"bg-neutral-600"}`}/>
            {shiftStatusLabel}
          </span>
        </div>

        {/* $/hr arc gauge — 5 color zones */}
        {(() => {
          const GCX=150,GCY=128,GR=104,GSW=18;
          const gA=(v:number)=>180+Math.min(v/100,1)*180;
          const gP=(r:number,deg:number)=>({x:GCX+r*Math.cos(deg*Math.PI/180),y:GCY+r*Math.sin(deg*Math.PI/180)});
          const gPath=(r:number,a1:number,a2:number)=>{const s=gP(r,a1),e=gP(r,a2);return `M${s.x.toFixed(1)} ${s.y.toFixed(1)} A${r} ${r} 0 ${a2-a1>=180?1:0} 1 ${e.x.toFixed(1)} ${e.y.toFixed(1)}`;};
          const zones=[{min:0,max:60,color:"#ef4444"},{min:60,max:70,color:"#f97316"},{min:70,max:80,color:"#fbbf24"},{min:80,max:90,color:"#4ade80"},{min:90,max:100,color:"#3b82f6"}];
          const activeZ=zones.find(z=>perHourGross>=z.min&&(z.max>=100||perHourGross<z.max))??zones[0];
          const zColor=perHourGross>0?activeZ.color:"#374151";
          const needleA=gA(perHourGross>0?Math.min(perHourGross,100):0);
          const tip=gP(GR-14,needleA),b1=gP(9,needleA+90),b2=gP(9,needleA-90);
          const goalA=gA(Math.min(goal,100));const gm1=gP(GR-GSW/2+1,goalA),gm2=gP(GR+GSW/2-3,goalA);
          return (
            <svg width="100%" height="136" viewBox="0 0 300 136" style={{overflow:'visible'}}>
              <path d={gPath(GR,180,360)} fill="none" stroke="#1c1c1c" strokeWidth={GSW}/>
              {zones.map(z=>(
                <path key={z.min} d={gPath(GR,gA(z.min),gA(Math.min(z.max,100)))}
                  fill="none" stroke={z.color} strokeWidth={GSW} strokeLinecap="butt" opacity={0.9}/>
              ))}
              {/* Goal marker */}
              <line x1={gm1.x} y1={gm1.y} x2={gm2.x} y2={gm2.y} stroke="#f6dd8c" strokeWidth="3" opacity="0.9"/>
              {/* Zone separators */}
              {[60,70,80,90].map(v=>{const a=gA(v);const i=gP(GR-GSW/2+1,a),o=gP(GR+GSW/2-3,a);return <line key={v} x1={i.x} y1={i.y} x2={o.x} y2={o.y} stroke="#000" strokeWidth="2" opacity="0.6"/>;})}
              {/* Boundary labels */}
              {([{v:0,t:'$0'},{v:60,t:'$60'},{v:70,t:'$70'},{v:80,t:'$80'},{v:90,t:'$90'},{v:100,t:'$100+'}] as {v:number,t:string}[]).map(({v,t})=>{
                const a=gA(v);const p=gP(GR+GSW/2+9,a);
                return <text key={v} x={p.x} y={p.y+4} textAnchor={v<=20?'end':'start'} fill="#4b5563" fontSize="9" fontFamily="monospace">{t}</text>;
              })}
              {/* Needle */}
              {perHourGross>0&&<polygon points={`${tip.x},${tip.y} ${b1.x},${b1.y} ${b2.x},${b2.y}`} fill={zColor} opacity="0.92"/>}
              <circle cx={GCX} cy={GCY} r="9" fill="#0a0a0a" stroke={zColor} strokeWidth="2"/>
              <text x={GCX} y={GCY-26} textAnchor="middle" fill={zColor} fontSize="28" fontWeight="900" fontFamily="'JetBrains Mono',monospace">
                {perHourGross>0?`$${perHourGross.toFixed(0)}`:'—'}
              </text>
              <text x={GCX} y={GCY-9} textAnchor="middle" fill="#6b7280" fontSize="9" fontFamily="monospace">/hr gross</text>
              {perHourGross>0&&(
                <text x={GCX} y={GCY+18} textAnchor="middle" fill={zColor} fontSize="8" fontWeight="bold" fontFamily="monospace" letterSpacing="2">
                  {perHourGross>=90?'EXCEPTIONAL':perHourGross>=70?'EXCELLENT':perHourGross>=60?'MINIMUM OK':'⚠ BELOW $60'}
                </text>
              )}
            </svg>
          );
        })()}

        {/* HOY — DAILY GOAL circular ring */}
        {(() => {
          const R=36,SW=9,CX=44,CY=44;
          const circ=2*Math.PI*R;
          const dash=circ*Math.min(goalPct/100,1);
          const rc=goalPct>=100?"#4ade80":goalPct>=70?"#f6dd8c":"#d9b64f";
          return (
            <div className="flex items-center gap-4 bg-[#080808] border border-[#1a1a1a] rounded-2xl p-3.5">
              <svg width="88" height="88" viewBox="0 0 88 88" className="flex-shrink-0">
                <circle cx={CX} cy={CY} r={R} fill="none" stroke="#1e1e1e" strokeWidth={SW}/>
                <circle cx={CX} cy={CY} r={R} fill="none" stroke={rc} strokeWidth={SW}
                  strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
                  transform={`rotate(-90 ${CX} ${CY})`}
                  style={{transition:'stroke-dasharray 0.6s ease'}}/>
                <text x={CX} y={CY+1} textAnchor="middle" dominantBaseline="middle"
                  fill={rc} fontSize="13" fontWeight="900" fontFamily="'JetBrains Mono',monospace">
                  {goalPct.toFixed(0)}%
                </text>
                <text x={CX} y={CY+16} textAnchor="middle" fill="#4b5563" fontSize="8" fontFamily="monospace">
                  ${grossToday.toFixed(0)}/${todayGoal}
                </text>
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-[8px] text-neutral-400 uppercase tracking-widest">EARNED TODAY</p>
                <p className="font-mono-jet text-[24px] font-black leading-none mt-0.5" style={{color:rc}}>${grossToday.toFixed(2)}</p>
                <div className="grid grid-cols-2 gap-x-3 mt-2">
                  <div>
                    <p className="text-[8px] text-neutral-400 uppercase">Remaining</p>
                    <p className="font-mono-jet text-[14px] font-bold text-neutral-300">${remainingToGoal.toFixed(0)}</p>
                  </div>
                  <div>
                    <p className="text-[8px] text-neutral-400 uppercase">$/Hour</p>
                    <p className={`font-mono-jet text-[14px] font-bold ${perHourGross>=80?"text-[#4ade80]":perHourGross>=60?"text-[#f6dd8c]":"text-neutral-400"}`}>
                      {perHourGross>0?`$${perHourGross.toFixed(2)}`:"—"}
                    </p>
                  </div>
                </div>
                {projectedFinish&&grossToday<todayGoal&&(
                  <p className="text-[9px] text-[#4ade80] font-semibold mt-1.5">✓ Goal ~ {projectedFinish.toLocaleTimeString([],{hour:"numeric",minute:"2-digit"})}</p>
                )}
                {grossToday>=todayGoal&&(
                  <p className="text-[9px] text-[#4ade80] font-semibold mt-1.5">🏆 Daily goal ${todayGoal} reached!</p>
                )}
              </div>
            </div>
          );
        })()}

        {/* $/hr goal slider */}
        <div className="rounded-xl p-3.5" style={{ background: "#080808", border: "1px solid #1e1400" }}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-neutral-400">Gross hourly rate target</span>
            <span className="font-mono-jet text-[20px] font-black" style={goldGradientStyle}>${goal}/h</span>
          </div>
          <input type="range" min={50} max={100} step={1} value={goal}
            onChange={e => setGoal(parseInt(e.target.value))} className="w-full mt-3" />
          <div className="flex justify-between mt-1">
            <span className="text-[10px] font-mono-jet text-neutral-400">$50</span>
            <span className="text-[10px] font-mono-jet text-neutral-400">$100</span>
          </div>
        </div>

        {/* THIS SHIFT · ACTIVE HRS · DAILY GOAL */}
        <div className="grid grid-cols-3 gap-2">
          {([
            ["THIS SHIFT",  grossToday>0?`$${grossToday.toFixed(2)}`:"—",
              grossToday>0?"#f6dd8c":"#374151"],
            ["ACTIVE HRS",  activeHoursDecimal>0?`${activeHoursDecimal.toFixed(1)}h`:"—",
              activeHoursDecimal>0?"#f6dd8c":"#374151"],
            ["DAILY GOAL",  `${goalPct.toFixed(0)}%`,
              goalPct>=100?"#4ade80":goalPct>=70?"#f6dd8c":"#9ca3af"],
          ] as [string,string,string][]).map(([label, val, col]) => (
            <div key={label} className="rounded-xl p-3" style={{ background: "#080808", border: `1px solid ${col}22` }}>
              <p className="text-[9px] tracking-[0.14em] text-neutral-400">{label}</p>
              <p className="font-mono-jet text-[15px] font-black mt-1" style={{ color: col }}>{val}</p>
            </div>
          ))}
        </div>

        {/* ODOMETER · MILES + IRS DEDUCTION */}
        <div className="flex items-center justify-between rounded-xl px-4 py-3" style={{ background: "#080808", border: "1px solid #1a1e1a" }}>
          <div>
            <p className="text-[9px] tracking-[0.18em] text-neutral-300 font-bold uppercase">Odometer · This Shift</p>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="font-mono-jet text-[26px] font-black text-[#f6dd8c]">{shiftMiles.toFixed(1)}</span>
              <span className="text-[11px] text-neutral-400 font-semibold">mi</span>
            </div>
            <p className="text-[9px] text-neutral-400 mt-0.5">{gps.status==="active"?"● GPS tracking":"○ GPS inactive"}</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] tracking-[0.18em] text-neutral-300 font-bold uppercase">IRS Deduction</p>
            <p className="font-mono-jet text-[20px] font-black text-[#4ade80] mt-1">
              ${(shiftMiles * IRS_RATE_PER_MILE).toFixed(2)}
            </p>
            <p className="text-[9px] text-neutral-400 mt-0.5">${IRS_RATE_PER_MILE.toFixed(2)}/mi · 2025 rate</p>
          </div>
        </div>

        {/* Smart suggestion */}
        <div className={`rounded-xl p-3.5 border-l-[3px] ${
          smartSuggestion.type === "gold"    ? "bg-[#1a1600] border border-[#2a2200] border-l-[#f6dd8c]"
          : smartSuggestion.type === "hot"  ? "bg-[#1a0800] border border-[#2a1000] border-l-[#fb923c]"
          : smartSuggestion.type === "warm" ? "bg-[#1a1200] border border-[#2a1e00] border-l-[#fbbf24]"
          : smartSuggestion.type === "good" ? "bg-[#052e16] border border-[#166534] border-l-[#4ade80]"
          : smartSuggestion.type === "purple" ? "bg-[#1a1625] border border-[#2a2340] border-l-[#a78bfa]"
          : smartSuggestion.type === "cold" ? "bg-[#0a0a14] border border-[#1a1a2a] border-l-[#60a5fa]"
          : smartSuggestion.type === "warn" ? "bg-[#1a0f00] border border-[#2a1800] border-l-[#f59e0b]"
          : "bg-[#141414] border border-[#2e2e2e] border-l-[#374151]"
        }`}>
          <div className="flex items-start gap-2">
            <span className="text-[16px] flex-shrink-0 mt-0.5">{smartSuggestion.emoji}</span>
            <p className="text-[11px] leading-[1.5] text-neutral-200">{smartSuggestion.text}</p>
          </div>
          {perHourGross > 0 && grossToday < todayGoal && (
            <p className="text-[10px] font-mono-jet text-neutral-400 mt-2">
              At this pace you need {perHourGross > 0 ? `${(remainingToGoal / perHourGross).toFixed(1)}h` : "—"} more to reach ${todayGoal}
            </p>
          )}
        </div>

        {/* ZONES HOY — NYC TLC demand intelligence */}
        {(() => {
          const h = currentTime.getHours();
          const urgentRate = perHourGross > 0 && perHourGross < 60;
          const headerLabel = urgentRate ? "ZONES HOY — REPOSICIONATE" : "ZONES HOY";
          const headerAccent = urgentRate ? "#ef4444" : "#f6dd8c";
          const headerBg     = urgentRate ? "#120505" : "#0d0d0d";
          const headerBorder = urgentRate ? "#ef444430" : "#2a2200";

          const heatEmoji:  Record<string, string> = { hot: "🔥", warm: "🟡", cold: "⚪" };
          const heatColor:  Record<string, string> = { hot: "#fb923c", warm: "#fbbf24", cold: "#6b7280" };
          const heatLabel:  Record<string, string> = { hot: "ALTA",   warm: "MEDIA",   cold: "BAJA"  };

          // Hour label for subtitle
          const hLabel = `${currentTime.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
          const dow = currentTime.getDay();
          const dayLabel = (dow === 0 || dow === 6) ? "Fin de semana" : "Día laboral";

          return (
            <div className="rounded-xl overflow-hidden" style={{ background: headerBg, border: `1px solid ${headerBorder}`, borderLeft: `3px solid ${headerAccent}` }}>
              {/* Header */}
              <div className="flex items-center justify-between px-3.5 pt-3 pb-2.5" style={{ borderBottom: `1px solid ${headerBorder}` }}>
                <div className="flex items-center gap-2">
                  <span className="text-[15px]">{urgentRate ? "🚨" : "🗺"}</span>
                  <div>
                    <p className="text-[9px] tracking-[0.18em] font-bold" style={{ color: headerAccent }}>{headerLabel}</p>
                    <p className="text-[8px] text-neutral-500 mt-0.5">{dayLabel} · {hLabel}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[8px] text-neutral-500 font-mono-jet">NYC TLC data</p>
                  <p className="text-[8px] text-neutral-600">2023–2025 avg</p>
                </div>
              </div>

              {/* Zone list */}
              <div className="px-3.5 py-2.5 space-y-2.5">
                {demandZones.length === 0 ? (
                  <p className="text-[11px] text-neutral-500 py-1">No hay datos para esta hora.</p>
                ) : (
                  demandZones.map((z, i) => {
                    const isTop = i === 0;
                    const distLabel = z.km !== null
                      ? z.km < 1 ? `${(z.km * 1000).toFixed(0)} m` : `${z.km.toFixed(1)} km`
                      : null;
                    return (
                      <div key={z.id} className="flex items-center gap-2.5">
                        {/* Rank + heat indicator */}
                        <div className="flex flex-col items-center gap-0.5 w-5 flex-shrink-0">
                          <span className="text-[14px] leading-none">{heatEmoji[z.heat]}</span>
                          <span className="text-[7px] font-mono-jet font-bold" style={{ color: heatColor[z.heat] }}>
                            {heatLabel[z.heat]}
                          </span>
                        </div>
                        {/* Zone name */}
                        <div className="flex-1 min-w-0">
                          <p className={`text-[12px] font-semibold leading-tight truncate ${isTop ? "text-white" : "text-neutral-300"}`}>
                            {z.name}
                          </p>
                          {isTop && (
                            <p className="text-[8px] font-mono-jet mt-0.5" style={{ color: heatColor[z.heat] }}>
                              ↑ Mejor zona ahora
                            </p>
                          )}
                        </div>
                        {/* Distance badge */}
                        <div className="flex-shrink-0 text-right">
                          {distLabel ? (
                            <span className="font-mono-jet text-[10px] text-neutral-400">{distLabel}</span>
                          ) : (
                            <span className="font-mono-jet text-[9px] text-neutral-600">GPS off</span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer legend + GPS note */}
              <div className="px-3.5 pb-3 pt-1.5 flex items-center justify-between" style={{ borderTop: `1px solid ${headerBorder}` }}>
                <div className="flex items-center gap-2">
                  <span className="text-[10px]">🔥</span><span className="text-[8px] text-neutral-600">Alta</span>
                  <span className="text-[10px] ml-1">🟡</span><span className="text-[8px] text-neutral-600">Media</span>
                  <span className="text-[10px] ml-1">⚪</span><span className="text-[8px] text-neutral-600">Baja</span>
                </div>
                <span className="text-[8px] font-mono-jet text-neutral-600">
                  {gps.lat && gps.lng ? `± GPS activo` : "Activa GPS p/ distancia"}
                </span>
              </div>
            </div>
          );
        })()}

        {/* Trip stats strip */}
        <div className="grid grid-cols-3 gap-0 bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl overflow-hidden">
          <div className="p-3 border-r border-[#1f1f1f] text-center">
            <p className="text-[9px] text-neutral-400 tracking-widest">TRIPS TODAY</p>
            <p className="font-mono-jet text-[13px] font-semibold mt-1 text-white">{todayTrips.length}</p>
          </div>
          <div className="p-3 border-r border-[#1f1f1f] text-center">
            <p className="text-[9px] text-neutral-400 tracking-widest">AVG/TRIP</p>
            <p className="font-mono-jet text-[13px] font-semibold mt-1 text-[#f6dd8c]">
              ${todayTrips.length ? (grossToday / todayTrips.length).toFixed(2) : "0.00"}
            </p>
          </div>
          <div className="p-3 text-center">
            <p className="text-[9px] text-neutral-400 tracking-widest">WEEK TOTAL</p>
            <p className="font-mono-jet text-[13px] font-semibold mt-1 text-[#f5c518]">${weeklyTotal.toFixed(2)}</p>
          </div>
        </div>

        {/* E-ZPass toll tracking */}
        <div className="rounded-xl bg-[#1a1625] border border-[#2a2340] border-l-[3px] border-l-[#8b5cf6] p-3.5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6]" />
              <p className="text-[10px] tracking-[0.18em] font-bold text-[#a78bfa]">E-ZPASS {TOLL_YEAR} · TOLLS PAID</p>
            </div>
            <span className="font-mono-jet text-[11px] font-bold text-[#c4b5fd]">${totalTollsToday.toFixed(2)} today</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {([["WEEK", tollsWeek], ["MONTH", tollsMonth], ["YEAR", tollsYear]] as [string,number][]).map(([label, val]) => (
              <div key={label} className="text-center">
                <p className="text-[8px] text-[#6d5a9c] tracking-widest">{label}</p>
                <p className="font-mono-jet text-[12px] font-semibold text-[#c4b5fd] mt-0.5">${val.toFixed(2)}</p>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-[#c4b5fd]/70 mt-2">
            {shiftActive ? "⚡ Geofencing active — auto-detecting tolls" : "Start your shift for auto toll detection"}
          </p>
        </div>
      </div>

      {/* Financial Intelligence — monthly summary */}
      <div className="rounded-[20px] p-4" style={{ background: "#0d0d0d", border: "1px solid #1e1e1e" }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[9px] tracking-[0.22em] text-neutral-300 font-bold uppercase">Financial Intelligence</p>
            <p className="text-[11px] font-semibold text-neutral-300 mt-0.5">
              {currentTime.toLocaleDateString('en-US',{month:'long',year:'numeric'})}
            </p>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold tracking-[0.12em] border ${
            _dbOnTrack
              ? 'bg-[#052e16] border-[#4ade8044] text-[#4ade80]'
              : 'bg-[#1a0f00] border-[#f6dd8c44] text-[#f6dd8c]'
          }`}>
            {_dbOnTrack ? '✓ On track' : '↗ Keep pushing'}
          </span>
        </div>
        <div className="mb-3">
          <p className="text-[8px] text-neutral-400 uppercase tracking-widest">Net balance</p>
          <p className={`font-mono-jet text-[30px] font-black leading-none tracking-tight mt-0.5 ${_dbNetMonth>=0?'text-[#f6dd8c]':'text-red-400'}`}>
            {_dbNetMonth>=0?'+':''}{_dbNetMonth.toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0})}
          </p>
        </div>
        <div className="flex gap-4 mb-3">
          <div>
            <p className="text-[8px] text-neutral-400 uppercase tracking-widest">INCOME</p>
            <p className="font-mono-jet text-[16px] font-bold text-[#4ade80] mt-0.5">${_dbEarnMonth.toLocaleString('en-US',{maximumFractionDigits:0})}</p>
          </div>
          <div>
            <p className="text-[8px] text-neutral-400 uppercase tracking-widest">EXPENSES</p>
            <p className="font-mono-jet text-[16px] font-bold text-red-400 mt-0.5">-${_dbExpMonth.toLocaleString('en-US',{maximumFractionDigits:0})}</p>
          </div>
        </div>
        {_dbMonthGoal>0 && (
          <div>
            <div className="flex justify-between text-[9px] mb-1.5">
              <span className="font-mono-jet text-neutral-400">${_dbEarnMonth.toFixed(0)} earned</span>
              <span className="font-mono-jet text-[#f6dd8c]">Goal ${_dbMonthGoal.toLocaleString('en-US',{maximumFractionDigits:0})}</span>
            </div>
            <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700"
                style={{width:`${_dbMonthPct}%`,background:'linear-gradient(90deg,#d9b64f,#f6dd8c)'}}/>
            </div>
          </div>
        )}
      </div>

      {/* Shift Breakdown — daily detail below the gauge */}
      <div>
        <p className="text-[10px] tracking-[0.22em] text-neutral-400 font-bold mb-2.5">SHIFT BREAKDOWN</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 rounded-xl p-3.5 flex items-start justify-between gap-3"
            style={{ background: "#0d0d0d", border: "1px solid #1e1400" }}>
            <div className="flex-1">
              <p className="text-[9px] tracking-[0.18em] font-bold mb-2" style={{ color: "#d97706" }}>TODAY'S BREAKDOWN</p>
              <div className="space-y-1">
                {([
                  ["Fare",  todayTrips.reduce((a,b) => a + b.earnings, 0)],
                  ["Tips",  todayTrips.reduce((a,b) => a + b.tips + b.extra, 0)],
                  ["Tolls", totalTollsToday],
                ] as [string,number][]).map(([label, val]) => (
                  <div key={label} className="flex items-center gap-4">
                    <span className="text-[10px] text-neutral-400 font-mono-jet w-14">{label}</span>
                    <span className="font-mono-jet text-[12px] font-semibold text-neutral-100">${val.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-[8px] text-neutral-400 tracking-widest uppercase mb-1">GROSS TODAY</p>
              <p className="font-mono-jet text-[22px] font-black text-[#f6dd8c] leading-none">${grossToday.toFixed(2)}</p>
              <p className="text-[9px] text-neutral-400 mt-0.5">{todayTrips.length} trip{todayTrips.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
          <div className="rounded-xl p-3.5" style={{ background: "#0d0d0d", border: "1px solid #1e0a0a" }}>
            <p className="text-[9px] tracking-[0.18em] font-bold text-[#ef4444]">TODAY'S EXPENSES</p>
            <p className="font-mono-jet text-[22px] font-black text-[#ef4444] mt-2">
              {expensesToday > 0 ? `−$${expensesToday.toFixed(2)}` : "$0.00"}
            </p>
            <p className="text-[10px] text-neutral-400 mt-1 font-mono-jet">
              {expenses.filter(e => e.date === toYYYYMMDD(currentTime)).length} entries today
            </p>
          </div>
          <div className="rounded-xl p-3.5" style={{ background: "#0d0d0d", border: `1px solid ${netToday >= 0 ? "#0a1e0a" : "#1e0a0a"}` }}>
            <p className={`text-[9px] tracking-[0.18em] font-bold ${netToday >= 0 ? "text-[#4ade80]" : "text-[#ef4444]"}`}>NET EARNINGS TODAY</p>
            <p className={`font-mono-jet text-[22px] font-black mt-2 ${netToday >= 0 ? "text-[#4ade80]" : "text-[#ef4444]"}`}>
              ${netToday.toFixed(2)}
            </p>
            <p className="text-[10px] text-neutral-400 mt-1 font-mono-jet">income − expenses · weekly ref. ${weeklyTotal.toFixed(0)}</p>
          </div>
        </div>
      </div>

    </div>
  );

  // ─── Entry Form ───────────────────────────────────────────────
  const meta = getPlatformMeta(tripForm.platform);

  const EntryFormContent = (
    <div id="trip-entry-form" className="w-full max-w-[480px] mx-auto">

      {/* ══ HEADER: title/date/time left · live total right ══ */}
      <div className="flex items-end justify-between gap-3 pb-3">
        <div className="flex-1 min-w-0">
          <h2 className="text-white font-black text-[22px] tracking-[0.04em] uppercase leading-none">DAILY ENTRY</h2>
          {editingId && <span className="text-[10px] text-amber-400 font-bold mt-1.5 block">✎ EDITING MODE</span>}
          <div className="flex gap-1.5 mt-2">
            <input type="date" value={tripForm.tripDate}
              aria-label="Trip date"
              placeholder="Select date"
              onChange={e => setTripForm(s => ({ ...s, tripDate: e.target.value }))}
              className={`min-w-0 flex-1 h-9 rounded-lg px-2.5 text-white text-[12px] focus:outline-none border ${
                editingId ? "bg-amber-400/5 border-amber-400/40 focus:border-amber-400" : "bg-[#111] border-[#333] focus:border-[#555]"
              }`} />
            <input type="time" value={tripForm.tripTime}
              aria-label="Trip time"
              placeholder="Select time"
              onChange={e => setTripForm(s => ({ ...s, tripTime: e.target.value }))}
              className={`w-[92px] h-9 rounded-lg px-2.5 text-white text-[12px] focus:outline-none border ${
                editingId ? "bg-amber-400/5 border-amber-400/40 focus:border-amber-400" : "bg-[#111] border-[#333] focus:border-[#555]"
              }`} />
            {editingId && <span className="self-center text-[9px] text-amber-400 font-bold flex-shrink-0">⚠ LATE?</span>}
          </div>
        </div>
        <div className="text-right flex-shrink-0 pb-1">
          <p className="text-[9px] text-neutral-500 uppercase tracking-[0.14em] font-bold">TOTAL</p>
          <p className="font-mono-jet font-black leading-none mt-0.5"
            style={{ fontSize: 26, color: grandTotalLive > 0 ? "#facc15" : "#3a3a3a",
              textShadow: grandTotalLive > 0 ? "0 0 16px rgba(250,204,21,0.55)" : "none" }}>
            ${grandTotalLive.toFixed(2)}
          </p>
        </div>
      </div>

      {/* ══ REVENUE SOURCE — dropdown ════════════════════════════ */}
      <div className="pt-2 pb-2">
        <p className="text-[9px] tracking-[0.2em] text-neutral-500 font-bold uppercase mb-2">REVENUE SOURCE</p>

        {/* Collapsed trigger */}
        <button type="button" onClick={() => setShowPlatformDropdown(v => !v)}
          className="w-full h-[58px] rounded-2xl flex items-center gap-3 px-4 border-2 transition-all active:scale-[0.99]"
          style={{
            background: "#0f0f0f",
            borderColor: showPlatformDropdown ? "#facc15" : "#333",
            boxShadow: showPlatformDropdown ? "0 0 14px rgba(250,204,21,0.14)" : "none",
          }}>
          <div className={`w-10 h-10 rounded-full ${meta.logoBg ?? "bg-white"} flex items-center justify-center flex-shrink-0 overflow-hidden border border-white/10`}>
            {meta.logo ? <img src={meta.logo} alt={tripForm.platform} className={`w-full h-full ${(meta.logoBg && meta.logoBg !== "bg-white") ? "object-cover" : "object-contain"}`} />
              : <span className="text-[14px] font-black text-black">{meta.initial}</span>}
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="text-white font-bold text-[15px] truncate leading-tight">{tripForm.platform}</p>
            {meta.tags.length > 0 && (
              <p className="text-[9px] text-neutral-500 font-semibold leading-none mt-0.5">{meta.tags.join(" · ")}</p>
            )}
          </div>
          <span className="text-neutral-400 text-[14px] flex-shrink-0 transition-transform duration-200"
            style={{ transform: showPlatformDropdown ? "rotate(180deg)" : "none" }}>▾</span>
        </button>

        {/* Expanded list */}
        {showPlatformDropdown && (
          <div className="mt-2 rounded-2xl border border-[#333] bg-[#0a0a0a] overflow-hidden">
            {([
              { label: "RIDESHARE",      platforms: ["Uber", "Lyft", "Empower", "TBZI Luxury"] },
              { label: "VOUCHER",        platforms: ["Gallant", "Aventus Ride", "Classic Ryde"] },
              { label: "ACCESS-A-RIDE",  platforms: ["EcoRide", "Aki Technology"] },
              { label: "OTHER",          platforms: ["Island City Transit", "Transit Tax", "Throo", "Brakha Group", "Other"] },
            ] as { label: string; platforms: string[] }[]).map(group => (
              <div key={group.label}>
                <p className="px-4 pt-2.5 pb-1 text-[8px] tracking-[0.2em] text-neutral-600 font-bold uppercase">{group.label}</p>
                {group.platforms.map(name => {
                  const m2 = getPlatformMeta(name);
                  const isSel = tripForm.platform === name;
                  return (
                    <button key={name} type="button"
                      onClick={() => { setTripForm(s => ({ ...s, platform: name })); setShowPlatformDropdown(false); }}
                      className="w-full flex items-center gap-3 px-4 h-[52px] transition-all active:bg-white/5"
                      style={{
                        background: isSel ? "rgba(250,204,21,0.07)" : "transparent",
                        borderLeft: isSel ? "3px solid #facc15" : "3px solid transparent",
                      }}>
                      <div className={`w-8 h-8 rounded-full ${m2.logoBg ?? "bg-white"} flex items-center justify-center flex-shrink-0 overflow-hidden border border-white/10`}>
                        {m2.logo ? <img src={m2.logo} alt={name} className={`w-full h-full ${(m2.logoBg && m2.logoBg !== "bg-white") ? "object-cover" : "object-contain"}`} />
                          : <span className="text-[11px] font-black text-black">{m2.initial}</span>}
                      </div>
                      <span className="flex-1 text-left text-[14px] font-semibold truncate" style={{ color: isSel ? "#facc15" : "#ccc" }}>{name}</span>
                      {isSel && <span className="text-[#facc15] text-[16px] flex-shrink-0">✓</span>}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ══ GROSS FARE + REF ═══════════════════════════════════════ */}
      <div className="border-t border-[#252525] pt-3 pb-3">
        <div className="grid grid-cols-[minmax(0,1fr)_140px] gap-2 items-end">
          <div className="min-w-0">
            <p className="text-[9px] tracking-[0.2em] text-neutral-500 font-bold uppercase mb-2">GROSS FARE</p>
            <div className="flex items-center rounded-2xl transition-all"
              style={{
                height: 72, background: "#080808",
                border: `2.5px solid ${tripForm.earnings ? "#facc15" : "#333"}`,
                boxShadow: tripForm.earnings ? "0 0 24px rgba(250,204,21,0.18)" : "none",
              }}>
              <span className="pl-4 font-black select-none" style={{ fontSize: 30, color: tripForm.earnings ? "#facc15" : "#555" }}>$</span>
              <input inputMode="decimal" value={tripForm.earnings}
                onChange={e => { if (numericFilter(e.target.value)) setTripForm(s => ({ ...s, earnings: e.target.value })); }}
                placeholder="0.00"
                className="flex-1 h-full bg-transparent pl-2 pr-4 font-black font-mono-jet placeholder:text-[#2a2a2a] focus:outline-none"
                style={{ fontSize: 42, color: tripForm.earnings ? "#facc15" : undefined }} />
            </div>
          </div>
          <div className="rounded-xl border bg-[#080808] px-3 h-[72px] flex flex-col justify-center"
            style={{ borderColor: "#2e2e2e" }}>
            <label className="text-[8px] text-neutral-500 font-bold uppercase tracking-wider block mb-1">REF</label>
            <input value={tripForm.reference}
              onChange={e => setTripForm(s => ({ ...s, reference: e.target.value }))}
              placeholder="Invoice / reference"
              className="w-full bg-transparent text-white text-[13px] placeholder:text-[#333] focus:outline-none min-w-0" />
          </div>
        </div>
      </div>

      {/* ══ ORIGIN (PICKUP LOCATION) ══════════════════════════════ */}
      <div className="border-t border-[#252525] pt-3">
        <p className="text-[9px] tracking-[0.2em] text-neutral-500 font-bold uppercase mb-1.5">
          ORIGIN <span className="text-neutral-600 normal-case font-normal tracking-normal">· Pickup Location</span>
        </p>
        <div className={`rounded-xl bg-[#080808] px-3 border overflow-hidden ${pickupLocationCapture ? "h-[112px]" : "min-h-[54px]"}`}
          style={{ borderColor: "#444" }}>
          {pickupLocationCapture && (
            <div className="h-[42px] flex items-center gap-2 min-w-0">
              <span className="text-[17px] leading-none flex-shrink-0">{pickupLocationCapture.categoryIcon ?? pickupLocationCapture.poiHeader.split(" ")[0]}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 min-w-0 leading-tight h-[18px]">
                  <span className="text-[8px] text-neutral-500 font-bold uppercase tracking-wider flex-shrink-0">
                    {pickupLocationCapture.category ?? "LOCATION"}
                  </span>
                  <p className="text-[12px] font-bold text-white truncate">
                    {pickupLocationCapture.locationName ?? pickupLocationCapture.poiHeader.replace(/^\S+\s*/, "")}
                  </p>
                </div>
                <div className="flex items-center gap-2 min-w-0 h-[16px]">
                  {pickupLocationCapture.terminal && (
                    <span className="text-[9px] text-[#facc15] font-semibold truncate flex-shrink-0">{pickupLocationCapture.terminal}</span>
                  )}
                  <p className="text-[9px] text-neutral-400 leading-tight truncate">{pickupLocationCapture.cityState}</p>
                </div>
              </div>
            </div>
          )}
          <div className={`flex items-center gap-2 ${pickupLocationCapture ? "min-h-[36px] border-t border-[#1e1e1e]" : "min-h-[54px]"}`}>
            {pickupLocationCapture
              ? <span className="text-[8px] tracking-[0.12em] text-neutral-600 font-bold uppercase flex-shrink-0">DIRECTIONS</span>
              : <span className="text-[#4ade80] text-[18px] flex-shrink-0">📍</span>}
            <input value={tripForm.pickup}
              onChange={e => setTripForm(s => ({ ...s, pickup: e.target.value }))}
              placeholder="Directions / street, city"
              className="flex-1 bg-transparent text-white text-[13px] placeholder:text-[#444] focus:outline-none min-w-0 truncate" />
            <button type="button" onClick={async () => {
              setPickupResolving(true);
              let lat: number;
              let lng: number;
              let accuracy: number;
              let capturedAt: Date;
              try {
                const position = await requestFreshGpsPosition();
                lat = position.coords.latitude;
                lng = position.coords.longitude;
                accuracy = position.coords.accuracy ?? 999;
                capturedAt = new Date(position.timestamp || Date.now());
                setGps({ lat, lng, acc: accuracy, timestamp: position.timestamp, status: "active" });
              } catch {
                setGps(s => ({ ...s, status: "error" }));
                showToast("Unable to confirm a fresh GPS location");
                setPickupResolving(false);
                return;
              }
              if (accuracy > GPS_RELIABLE_ACCURACY_METERS) {
                showToast(`GPS signal too weak (±${Math.round(accuracy)} m) — move to an open area`);
                setPickupResolving(false);
                return;
              }
              try {
                const capture = await reverseGeocodeRich(lat, lng, undefined, capturedAt, undefined, accuracy);
                setPickupLocationCapture(capture);
                setTripForm(s => ({
                  ...s,
                  pickup: capture.physicalAddress,
                  pickupTimestamp: capture.timestamp,
                }));
                showToast("Pickup resolved ✓");
              } catch {
                const capture = fallbackLocationCapture(lat, lng, capturedAt, undefined, accuracy);
                setPickupLocationCapture(capture);
                setTripForm(s => ({
                  ...s,
                  pickup: capture.physicalAddress,
                  pickupTimestamp: capture.timestamp,
                }));
                showToast("GPS coordinates saved (offline)");
              } finally { setPickupResolving(false); }
            }} className="flex-shrink-0 w-9 h-8 rounded-lg bg-[#052e16] border border-[#166534] flex items-center justify-center text-[10px] font-bold text-[#4ade80] active:scale-90 transition-all">
              {pickupResolving ? <span className="animate-spin text-[10px]">⏳</span> : "GPS"}
            </button>
          </div>
        {pickupLocationCapture && (
          <div className="border-t border-[#1e1e1e] py-1 grid grid-cols-2 gap-2">
            <p className="font-mono-jet text-[9px] text-[#4ade80] leading-tight truncate">
              <span className="text-[7px] tracking-wider text-neutral-600 mr-1">GPS</span>
              {pickupLocationCapture.coordinates.replace(/^GPS\s*/, "")}
              {pickupLocationCapture.accuracyMeters !== undefined && (
                <span className={pickupLocationCapture.accuracyMeters <= GPS_RELIABLE_ACCURACY_METERS ? "text-[#4ade80]" : "text-[#f87171]"}>
                  {" "}±{Math.round(pickupLocationCapture.accuracyMeters)}m
                </span>
              )}
            </p>
            <p className="font-mono-jet text-[9px] text-neutral-500 leading-tight truncate"><span className="text-[7px] tracking-wider text-neutral-600 mr-1">DATE / TIME</span>{tripForm.pickupTimestamp || pickupLocationCapture.timestamp}</p>
          </div>
        )}
        </div>
      </div>

      {/* ══ DESTINATION (DROP-OFF LOCATION) ══════════════════════ */}
      <div className="border-t border-[#252525] pt-3 pb-3">
        <p className="text-[9px] tracking-[0.2em] text-neutral-500 font-bold uppercase mb-1.5">
          DESTINATION <span className="text-neutral-600 normal-case font-normal tracking-normal">· Drop-off Location</span>
        </p>
        <div className={`rounded-xl bg-[#080808] px-3 border overflow-hidden ${dropoffLocationCapture ? "h-[112px]" : "min-h-[54px]"}`}
          style={{ borderColor: "#444" }}>
          {dropoffLocationCapture && (
            <div className="h-[42px] flex items-center gap-2 min-w-0">
              <span className="text-[17px] leading-none flex-shrink-0">{dropoffLocationCapture.categoryIcon ?? dropoffLocationCapture.poiHeader.split(" ")[0]}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 min-w-0 leading-tight h-[18px]">
                  <span className="text-[8px] text-neutral-500 font-bold uppercase tracking-wider flex-shrink-0">
                    {dropoffLocationCapture.category ?? "LOCATION"}
                  </span>
                  <p className="text-[12px] font-bold text-white truncate">
                    {dropoffLocationCapture.locationName ?? dropoffLocationCapture.poiHeader.replace(/^\S+\s*/, "")}
                  </p>
                </div>
                <div className="flex items-center gap-2 min-w-0 h-[16px]">
                  {dropoffLocationCapture.terminal && (
                    <span className="text-[9px] text-[#facc15] font-semibold truncate flex-shrink-0">{dropoffLocationCapture.terminal}</span>
                  )}
                  <p className="text-[9px] text-neutral-400 leading-tight truncate">{dropoffLocationCapture.cityState}</p>
                </div>
              </div>
            </div>
          )}
          <div className={`flex items-center gap-2 ${dropoffLocationCapture ? "min-h-[36px] border-t border-[#1e1e1e]" : "min-h-[54px]"}`}>
            {dropoffLocationCapture
              ? <span className="text-[8px] tracking-[0.12em] text-neutral-600 font-bold uppercase flex-shrink-0">DIRECTIONS</span>
              : <span className="text-[#60a5fa] text-[18px] flex-shrink-0">📍</span>}
            <input value={tripForm.dropoff}
              onChange={e => setTripForm(s => ({ ...s, dropoff: e.target.value }))}
              placeholder="Directions / street, city"
              className="flex-1 bg-transparent text-white text-[13px] placeholder:text-[#444] focus:outline-none min-w-0 truncate" />
            <button type="button" onClick={async () => {
              setDropoffResolving(true);
              let lat: number;
              let lng: number;
              let accuracy: number;
              let capturedAt: Date;
              try {
                const position = await requestFreshGpsPosition();
                lat = position.coords.latitude;
                lng = position.coords.longitude;
                accuracy = position.coords.accuracy ?? 999;
                capturedAt = new Date(position.timestamp || Date.now());
                setGps({ lat, lng, acc: accuracy, timestamp: position.timestamp, status: "active" });
              } catch {
                setGps(s => ({ ...s, status: "error" }));
                showToast("Unable to confirm a fresh GPS location");
                setDropoffResolving(false);
                return;
              }
              if (accuracy > GPS_RELIABLE_ACCURACY_METERS) {
                showToast(`GPS signal too weak (±${Math.round(accuracy)} m) — move to an open area`);
                setDropoffResolving(false);
                return;
              }
              try {
                const capture = await reverseGeocodeRich(lat, lng, undefined, capturedAt, undefined, accuracy);
                setDropoffLocationCapture(capture);
                setTripForm(s => ({
                  ...s,
                  dropoff: capture.physicalAddress,
                  dropoffTimestamp: capture.timestamp,
                }));
                showToast("Drop-off resolved ✓");
              } catch {
                const capture = fallbackLocationCapture(lat, lng, capturedAt, undefined, accuracy);
                setDropoffLocationCapture(capture);
                setTripForm(s => ({
                  ...s,
                  dropoff: capture.physicalAddress,
                  dropoffTimestamp: capture.timestamp,
                }));
                showToast("GPS coordinates saved (offline)");
              } finally { setDropoffResolving(false); }
            }} className="flex-shrink-0 w-9 h-8 rounded-lg bg-[#0c1a33] border border-[#1e3a8a] flex items-center justify-center text-[10px] font-bold text-[#60a5fa] active:scale-90 transition-all">
              {dropoffResolving ? <span className="animate-spin text-[10px]">⏳</span> : "GPS"}
            </button>
          </div>
        {dropoffLocationCapture && (
          <div className="border-t border-[#1e1e1e] py-1 grid grid-cols-2 gap-2">
            <p className="font-mono-jet text-[9px] text-[#60a5fa] leading-tight truncate">
              <span className="text-[7px] tracking-wider text-neutral-600 mr-1">GPS</span>
              {dropoffLocationCapture.coordinates.replace(/^GPS\s*/, "")}
              {dropoffLocationCapture.accuracyMeters !== undefined && (
                <span className={dropoffLocationCapture.accuracyMeters <= GPS_RELIABLE_ACCURACY_METERS ? "text-[#4ade80]" : "text-[#f87171]"}>
                  {" "}±{Math.round(dropoffLocationCapture.accuracyMeters)}m
                </span>
              )}
            </p>
            <p className="font-mono-jet text-[9px] text-neutral-500 leading-tight truncate"><span className="text-[7px] tracking-wider text-neutral-600 mr-1">DATE / TIME</span>{tripForm.dropoffTimestamp || dropoffLocationCapture.timestamp}</p>
          </div>
        )}
        </div>
      </div>

      {/* ══ LOCATION CATEGORY ════════════════════════════════════ */}
      <div className="border-t border-[#252525] pt-3 pb-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[9px] tracking-[0.2em] text-neutral-500 font-bold uppercase">LOCATION CATEGORY</p>
          <div className="flex gap-1.5">
            <button type="button" onClick={() => { if (!gps.lat) startGPS(); setShowPickupMenu(v => !v); setShowDropoffMenu(false); }}
              className={`px-2.5 h-6 rounded-full text-[8px] font-bold tracking-wider border transition-all ${
                showPickupMenu ? "bg-[#052e16] border-[#166534] text-[#4ade80]" : "bg-transparent border-[#333] text-neutral-400 hover:text-neutral-300"
              }`}>PICKUP</button>
            <button type="button" onClick={() => { if (!gps.lat) startGPS(); setShowDropoffMenu(v => !v); setShowPickupMenu(false); }}
              className={`px-2.5 h-6 rounded-full text-[8px] font-bold tracking-wider border transition-all ${
                showDropoffMenu ? "bg-[#0c1a33] border-[#1e3a8a] text-[#60a5fa]" : "bg-transparent border-[#333] text-neutral-400 hover:text-neutral-300"
              }`}>DROP-OFF</button>
          </div>
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {LOCATION_CATEGORIES.map(cat => {
            const icon = LOCATION_CATEGORY_ICONS[cat] || "📌";
            const isPickupSet = pickupLocationCapture?.category === cat || tripForm.pickup.startsWith(cat);
            const isDropSet   = dropoffLocationCapture?.category === cat || tripForm.dropoff.startsWith(cat);
            const isSet = isPickupSet || isDropSet;
            return (
              <button key={cat} type="button" onClick={async () => {
                const target = showPickupMenu ? "pickup" : "dropoff";
                const applyCapture = (capture: LocationCapture) => {
                  if (target === "pickup") {
                    setPickupLocationCapture(capture);
                    setTripForm(s => ({ ...s, pickup: capture.physicalAddress, pickupTimestamp: capture.timestamp }));
                  } else {
                    setDropoffLocationCapture(capture);
                    setTripForm(s => ({ ...s, dropoff: capture.physicalAddress, dropoffTimestamp: capture.timestamp }));
                  }
                };

                applyCapture(fallbackLocationCapture(null, null, new Date(), cat));
                if (target === "pickup") setShowPickupMenu(false);
                else setShowDropoffMenu(false);
                showToast(`${target === "pickup" ? "Pickup" : "Drop-off"}: ${cat} · confirming GPS…`);

                try {
                  const position = await requestFreshGpsPosition();
                  const lat = position.coords.latitude;
                  const lng = position.coords.longitude;
                  const accuracy = position.coords.accuracy ?? 999;
                  const capturedAt = new Date(position.timestamp || Date.now());
                  setGps({ lat, lng, acc: accuracy, timestamp: position.timestamp, status: "active" });
                  applyCapture(fallbackLocationCapture(lat, lng, capturedAt, cat, accuracy));
                  if (accuracy > GPS_RELIABLE_ACCURACY_METERS) {
                    showToast(`Category saved · GPS weak (±${Math.round(accuracy)} m), address not confirmed`);
                    return;
                  }
                  try {
                    applyCapture(await reverseGeocodeRich(lat, lng, undefined, capturedAt, cat, accuracy));
                    showToast(`${target === "pickup" ? "Pickup" : "Drop-off"} GPS confirmed ✓`);
                  } catch {
                    showToast("GPS coordinates confirmed · address service unavailable");
                  }
                } catch {
                  setGps(s => ({ ...s, status: "error" }));
                  showToast("Category saved · GPS location could not be confirmed");
                }
              }}
                className="h-[52px] rounded-xl flex flex-col items-center justify-center gap-0.5 border-2 transition-all active:scale-95"
                style={{
                  background: isSet ? "rgba(250,204,21,0.08)" : (showPickupMenu || showDropoffMenu) ? "#111" : "#0a0a0a",
                  borderColor: isSet ? "#facc15" : (showPickupMenu || showDropoffMenu) ? "#2e2e2e" : "#1e1e1e",
                }}>
                <span className="text-[18px] leading-none">{icon}</span>
                <span className="text-[7px] font-bold leading-none" style={{ color: isSet ? "#facc15" : "#666" }}>{cat}</span>
              </button>
            );
          })}
        </div>
        {gps.lat && (showPickupMenu || showDropoffMenu) && (
          <p className="font-mono-jet text-[9px] text-[#4ade80] mt-1.5 truncate px-0.5">
            📍 {gps.lat.toFixed(4)}, {gps.lng?.toFixed(4)}{gpsAddress ? ` · ${gpsAddress}` : ""}
          </p>
        )}
      </div>

      {/* ══ ADDITIONAL INCOME & DEDUCTIONS ═══════════════════════ */}
      <div className="border-t border-[#252525] pt-3 pb-3">
        <p className="text-[9px] tracking-[0.2em] text-neutral-500 font-bold uppercase mb-2">ADDITIONAL INCOME &amp; DEDUCTIONS</p>
        <div className="grid grid-cols-2 gap-2">
          {/* TIPS (GRATUITY) */}
          <div className="rounded-2xl border bg-[#080808] px-3 pt-2.5 pb-3 focus-within:border-[#facc15]/50 transition-colors"
            style={{ minHeight: 64, borderColor: "#333" }}>
            <label className="text-[8px] text-neutral-500 font-bold uppercase tracking-wider block mb-2">TIPS (GRATUITY)</label>
            <div className="flex items-center">
              <span className="text-neutral-500 text-[13px] mr-1.5">$</span>
              <input inputMode="decimal" value={tripForm.tips}
                onChange={e => { if (numericFilter(e.target.value)) setTripForm(s => ({ ...s, tips: e.target.value })); }}
                placeholder="0.00"
                className="flex-1 bg-transparent text-white text-[20px] font-bold font-mono-jet placeholder:text-[#2a2a2a] focus:outline-none" />
            </div>
          </div>

          {/* OTHER CASH INCOME */}
          <div className="rounded-2xl border bg-[#080808] px-3 pt-2.5 pb-3 focus-within:border-[#facc15]/50 transition-colors"
            style={{ minHeight: 64, borderColor: "#333" }}>
            <label className="text-[8px] text-neutral-500 font-bold uppercase tracking-wider block mb-2">OTHER CASH INCOME</label>
            <div className="flex items-center">
              <span className="text-neutral-500 text-[13px] mr-1.5">$</span>
              <input inputMode="decimal" value={tripForm.otherCashIncome}
                onChange={e => { if (numericFilter(e.target.value)) setTripForm(s => ({ ...s, otherCashIncome: e.target.value })); }}
                placeholder="0.00"
                className="flex-1 bg-transparent text-white text-[20px] font-bold font-mono-jet placeholder:text-[#2a2a2a] focus:outline-none" />
            </div>
          </div>

          {/* TOLL REIMBURSEMENT */}
          <div className="rounded-2xl border bg-[#080808] px-3 pt-2.5 pb-3 transition-colors"
            style={{ minHeight: 64, borderColor: detectedToll && !tollManuallyEdited ? "#166534" : detectedToll && tollManuallyEdited ? "#92400e" : "#333" }}>
            <div className="flex items-center gap-1.5 mb-2">
              <label className="text-[8px] text-neutral-500 font-bold uppercase tracking-wider">TOLL REIMB.</label>
              {detectedToll ? (
                tollManuallyEdited
                  ? <span className="text-[7px] font-bold text-amber-400 animate-pulse">✎ EDITED</span>
                  : <span className="text-[7px] font-bold text-[#4ade80]">⚡ AUTO · {tripTollEvents.length} {tripTollEvents.length === 1 ? "TOLL" : "TOLLS"}</span>
              ) : <span className="text-[7px] font-bold text-neutral-600">GPS AUTO</span>}
            </div>
            {detectedToll && (
              <p className="text-[8px] text-neutral-600 font-mono-jet mb-1 -mt-1">{detectedToll.plaza} · ${detectedToll.rate.toFixed(2)}{detectedToll.rate === 16.79 ? " Peak" : detectedToll.rate === 14.79 ? " Off-pk" : ""}</p>
            )}
            <div className="flex items-center">
              <span className="text-neutral-500 text-[13px] mr-1.5">$</span>
              <input inputMode="decimal" value={tripForm.toll}
                onChange={e => {
                  if (!numericFilter(e.target.value)) return;
                  setTripForm(s => ({ ...s, toll: e.target.value }));
                  setTollManuallyEdited(true);
                }}
                placeholder="0.00"
                className="flex-1 bg-transparent text-white text-[20px] font-bold font-mono-jet placeholder:text-[#2a2a2a] focus:outline-none" />
            </div>
          </div>

          {/* PLATFORM COMMISSION */}
          <div className="rounded-2xl border bg-[#080808] px-3 pt-2.5 pb-3 focus-within:border-red-500/40 transition-colors"
            style={{ minHeight: 64, borderColor: "#333" }}>
            <label className="text-[8px] text-neutral-500 font-bold uppercase tracking-wider block mb-2">PLATFORM COMM.</label>
            <div className="flex items-center">
              <span className="text-neutral-500 text-[13px] mr-1.5">$</span>
              <input inputMode="decimal" value={tripForm.platformFee}
                onChange={e => { if (numericFilter(e.target.value)) setTripForm(s => ({ ...s, platformFee: e.target.value })); }}
                placeholder="0.00"
                className="flex-1 bg-transparent text-white text-[20px] font-bold font-mono-jet placeholder:text-[#2a2a2a] focus:outline-none" />
            </div>
          </div>
        </div>
      </div>

      {/* ══ NOTES ═════════════════════════════════════════════════ */}
      <div className="border-t border-[#252525] pt-2 pb-2">
        <div className="flex items-start gap-3 rounded-xl border bg-[#080808] px-3 py-2.5" style={{ borderColor: "#2e2e2e" }}>
          <span className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider flex-shrink-0 mt-0.5">NOTE</span>
          <textarea value={tripForm.notes} onChange={e => setTripForm(s => ({ ...s, notes: e.target.value }))}
            placeholder="Surge, traffic, late toll, details…"
            rows={Math.min(4, Math.max(1, tripForm.notes.split("\n").length))}
            className="flex-1 max-h-[92px] overflow-y-auto bg-transparent text-[13px] text-[#d1d5db] placeholder:text-[#333] focus:outline-none resize-none leading-relaxed min-w-0" />
        </div>
      </div>

      {/* ══ TRIP MILEAGE + TRACKING ═══════════════════════════════ */}
      <div className="border-t border-[#252525] pt-2 pb-2">
        <div className="grid grid-cols-2 gap-2 items-stretch">
          <div className="rounded-xl border bg-[#080808] px-3 h-[62px] flex flex-col justify-center"
            style={{ borderColor: parseFloat(tripForm.tripMiles) > 0 ? "#facc15" : "#2e2e2e" }}>
            <div className="flex items-center justify-between mb-1">
              <p className="text-[8px] tracking-[0.12em] text-neutral-500 font-bold uppercase">TRIP MILEAGE</p>
              {tripTracking && (
                <span className="flex items-center gap-1 text-[8px] font-bold text-[#4ade80]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-pulse inline-block" />
                  TRACKING
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-mono-jet text-[19px] font-bold"
                style={{ color: parseFloat(tripForm.tripMiles) > 0 ? "#facc15" : (tripTracking ? "#4ade80" : "#555") }}>
                {tripTracking ? tripMilesDisplay.toFixed(2) : (tripForm.tripMiles || "—")}
              </span>
              <span className="text-[10px] text-neutral-500 font-mono-jet">mi</span>
              {!tripTracking && (
                <>
                  <input
                    inputMode="decimal"
                    value={tripForm.tripMiles}
                    onChange={e => { if (numericFilter(e.target.value)) setTripForm(s => ({ ...s, tripMiles: e.target.value })); }}
                    placeholder="0.00"
                    className="absolute opacity-0 w-0 h-0 pointer-events-none"
                    aria-hidden
                  />
                  <button type="button"
                    onClick={() => {
                      const v = window.prompt("Enter miles manually:", tripForm.tripMiles || "0");
                      if (v !== null && numericFilter(v)) setTripForm(s => ({ ...s, tripMiles: v }));
                    }}
                    aria-label="Edit trip mileage"
                    className="ml-auto h-8 w-8 rounded-lg border border-[#2e2e2e] bg-[#0a0a0a] flex items-center justify-center active:scale-95 transition-all text-neutral-400 text-[13px]">
                    ✏️
                  </button>
                </>
              )}
            </div>
          </div>

          {!tripTracking ? (
            <button type="button" onClick={startTripTracking}
              className="h-[62px] w-full flex items-center justify-center gap-2 px-3 rounded-xl border border-[#2e2e2e] bg-[#0a0a0a] active:scale-[0.99] transition-all">
              <span className="text-[#facc15] text-[14px]">▶</span>
              <span className="text-[10px] font-bold text-white tracking-[0.06em]">START TRACKING</span>
            </button>
          ) : (
            <button type="button" onClick={() => stopTripTracking(true)}
              className="h-[62px] w-full flex items-center justify-center gap-2 px-3 rounded-xl border border-[#4ade80]/40 bg-[#052e16]/30 active:scale-[0.99] transition-all">
              <span className="text-[#f87171] text-[14px]">⏹</span>
              <span className="text-[10px] font-bold text-[#4ade80] tracking-[0.06em]">STOP &amp; SAVE</span>
            </button>
          )}
        </div>
        <p className="text-[8px] text-neutral-600 mt-1 leading-relaxed">
          {tripTracking
            ? "GPS is recording your route. Tap STOP & SAVE when you arrive."
            : "Tap ▶ before you start driving. Or enter miles manually with ✏️."}
        </p>
      </div>

      {/* ══ POST TRANSACTION ══════════════════════════════════════ */}
      <div className="border-t border-[#252525] pt-4 space-y-2 pb-2">
        <button type="button" onClick={handleSave}
          className="w-full rounded-2xl font-black text-[17px] tracking-[0.08em] uppercase transition-all active:scale-[0.98]"
          style={{
            height: 60,
            background: grandTotalLive > 0 ? "#facc15" : "#1a1a1a",
            color: grandTotalLive > 0 ? "#000" : "#444",
            boxShadow: grandTotalLive > 0 ? "0 0 28px rgba(250,204,21,0.32)" : "none",
          }}>
          {editingId ? "✓ UPDATE TRANSACTION" : "✓ POST TRANSACTION"}
        </button>

        {editingId && (
          <button type="button" onClick={resetForm}
            className="w-full h-10 rounded-xl border text-[11px] font-semibold tracking-[0.08em] text-neutral-500 active:text-white transition-colors"
            style={{ borderColor: "#2e2e2e" }}>
            CANCEL EDIT
          </button>
        )}

        {/* Storage status — minimal */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${storageVerified ? "bg-[#22c55e] animate-pulse" : "bg-red-500"}`} />
            <span className={`text-[8px] font-bold tracking-widest ${storageVerified ? "text-[#4ade80]" : "text-red-400"}`}>
              {storageVerified ? "STORAGE OK" : "STORAGE ERR"}
            </span>
            <span className="text-[8px] text-neutral-500 font-mono-jet">· {trips.length} trips · {(storageBytes / 1024).toFixed(1)}KB</span>
          </div>
          <div className="flex gap-1.5">
            <button onClick={() => {
              try {
                const raw = localStorage.getItem("island-city-trips");
                if (raw) showToast(`✓ ${JSON.parse(raw).length} trips · ${(new Blob([raw]).size / 1024).toFixed(2)}KB`);
                else showToast("No data on disk yet");
              } catch { showToast("Error reading storage"); }
            }} className="px-2 h-5 rounded-full bg-[#111] border border-[#2e2e2e] text-[7px] font-bold tracking-widest text-neutral-500 active:text-white">VERIFY</button>
            <button onClick={() => {
              navigator.clipboard?.writeText(localStorage.getItem("island-city-trips") || "");
              showToast("JSON copied — backup ready");
            }} className="px-2 h-5 rounded-full bg-[#111] border border-[#2e2e2e] text-[7px] font-bold tracking-widest text-neutral-500 active:text-white">BACKUP</button>
          </div>
        </div>
      </div>
    </div>
  );

  // ─── Register ─────────────────────────────────────────────────
  const pendingTrips = trips.filter(t => (t.status ?? "pending") === "pending");
  const postedTrips  = trips.filter(t => t.status === "posted");

  const pendingByDate: Record<string, Trip[]> = {};
  for (const t of pendingTrips) {
    if (!pendingByDate[t.date]) pendingByDate[t.date] = [];
    pendingByDate[t.date].push(t);
  }
  const pendingSortedDates = Object.keys(pendingByDate).sort((a, b) => b.localeCompare(a));
  const pendingTotal    = pendingTrips.reduce((a, b) => a + b.grandTotal, 0);
  const pendingTodayAmt = pendingTrips.filter(t => t.date === toYYYYMMDD(currentTime)).reduce((a, b) => a + b.grandTotal, 0);
  const selectedCount   = selectedForPost.size;
  const selectedAmt     = pendingTrips.filter(t => selectedForPost.has(t.id)).reduce((a, b) => a + b.grandTotal, 0);

  const RegisterContent = (
    <div className="space-y-4 pb-24">
      {/* Page header */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[22px] font-bold text-white tracking-tight">Revenue Queue</h2>
          <p className="text-[10px] tracking-[0.12em] text-neutral-400 mt-0.5 uppercase font-semibold">Review &amp; audit before posting to Ledger</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {selectedCount > 0 && (
            <span className="px-2.5 py-1 rounded-full bg-[#facc15]/20 border border-[#facc15]/40 text-[#f6dd8c] text-[10px] font-bold">
              {selectedCount} selected
            </span>
          )}
          {/* ── Quick return to Entry ── */}
          <button
            onClick={() => setTripsTab("ENTRY")}
            className="h-9 px-3 rounded-xl bg-[#facc15] active:scale-[0.96] transition-all flex items-center gap-1.5 shadow-[0_0_14px_rgba(250,204,21,0.3)]">
            <span className="text-black text-[18px] font-black leading-none">＋</span>
            <span className="text-black text-[11px] font-black tracking-[0.08em] uppercase">New Trip</span>
          </button>
        </div>
      </div>

      {/* Sticky totals bar — always visible while scrolling */}
      <div className="sticky z-20 -mx-4 px-4 pt-2 pb-3 bg-black/96 backdrop-blur-sm border-b border-[#1a1a1a]" style={{ top: 'calc(146px + env(safe-area-inset-top))' }}>
        <div className="grid grid-cols-3 gap-2">
          {([
            ["PENDING", pendingTrips.length + (pendingTrips.length === 1 ? " trip" : " trips")],
            ["TODAY",   "$" + pendingTodayAmt.toFixed(2)],
            ["TOTAL",   "$" + pendingTotal.toFixed(2)],
          ] as [string, string][]).map(([lbl, val]) => (
            <div key={lbl} className="bg-[#0d0d0d] border border-[#2e2e2e] rounded-xl p-2 text-center">
              <p className="text-[8px] tracking-[0.15em] text-neutral-400 font-bold uppercase">{lbl}</p>
              <p className="font-mono-jet text-[14px] font-bold text-[#f6dd8c] mt-0.5">{val}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Storage pill */}
      <div className={`rounded-xl border px-3 py-2 flex items-center justify-between ${storageVerified ? "bg-[#052e16]/20 border-[#166534]/30" : "bg-[#1a0a0a] border-[#7f1d1d]/30"}`}>
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${storageVerified ? "bg-[#22c55e] animate-pulse" : "bg-red-500"}`} />
          <p className="font-mono-jet text-[10px] text-neutral-400">{trips.length} total · {(storageBytes / 1024).toFixed(2)}KB · {lastSavedAt !== "—" ? new Date(lastSavedAt).toLocaleTimeString() : "—"}</p>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold flex-shrink-0 ${storageVerified ? "bg-[#22c55e]/20 text-[#4ade80] border border-[#166534]" : "bg-red-900/30 text-red-400"}`}>
          {storageVerified ? "✓ SAVED" : "✗ ERR"}
        </span>
      </div>

      {/* Empty state */}
      {pendingTrips.length === 0 ? (
        <div className="bg-[#141414] border border-[#2e2e2e] rounded-2xl p-10 text-center space-y-2">
          <p className="text-[15px] font-semibold text-white">All trips posted ✓</p>
          <p className="text-[12px] text-neutral-400">Queue is clear — all revenue is in the Ledger</p>
          <button onClick={() => { setActiveTab("TRIPS"); setTripsTab("ENTRY"); }}
            className="mt-3 h-10 px-6 rounded-full border border-[#d9b64f]/50 text-[#f6dd8c] text-[12px] font-semibold hover:bg-[#f6dd8c]/10 transition-colors">
            + Log a trip
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {pendingSortedDates.map(date => {
            const dayTrips = pendingByDate[date];
            const dayTotal = dayTrips.reduce((a, b) => a + b.grandTotal, 0);
            const allSel   = dayTrips.every(t => selectedForPost.has(t.id));
            const someSel  = dayTrips.some(t  => selectedForPost.has(t.id));
            const dayLabel = new Date(date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

            return (
              <div key={date} className="space-y-2">
                {/* Day header with master checkbox */}
                <div className="flex items-center gap-3 px-1">
                  <button
                    onClick={() => {
                      const ids = new Set(selectedForPost);
                      if (allSel) { dayTrips.forEach(t => ids.delete(t.id)); }
                      else        { dayTrips.forEach(t => ids.add(t.id));    }
                      setSelectedForPost(ids);
                    }}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      allSel  ? "bg-[#facc15] border-[#facc15]" :
                      someSel ? "bg-[#facc15]/30 border-[#facc15]/60" :
                                "border-[#444] bg-transparent hover:border-[#888]"
                    }`}
                  >
                    {allSel  && <span className="text-black text-[10px] font-bold leading-none">✓</span>}
                    {!allSel && someSel && <span className="text-[#facc15] text-[10px] font-bold leading-none">−</span>}
                  </button>
                  <div className="flex-1 flex items-center justify-between">
                    <span className="text-[11px] font-bold tracking-[0.12em] text-neutral-400 uppercase">{dayLabel}</span>
                    <span className="font-mono-jet text-[11px] text-neutral-400">{dayTrips.length} trip{dayTrips.length !== 1 ? "s" : ""} · ${dayTotal.toFixed(2)}</span>
                  </div>
                </div>

                {/* Trip cards for this day */}
                {dayTrips.map(t => {
                  const pm    = getPlatformMeta(t.platform);
                  const isSel = selectedForPost.has(t.id);
                  const liveFare = parseFloat(inlineEditId === t.id ? inlineForm.earnings : String(t.earnings)) || 0;
                   const liveToll = parseFloat(inlineEditId === t.id ? inlineForm.toll : String(t.toll)) || 0;
                   const liveTotal = liveFare + t.tips + t.extra + (t.otherCash||0) + liveToll - t.fee;

                  return (
                    <div key={t.id} className={`border rounded-2xl p-4 space-y-3 transition-all duration-150 ${isSel ? "bg-[#141410] border-[#facc15]/30" : "bg-[#141414] border-[#2e2e2e]"}`}>
                      <div className="flex items-start gap-3">
                        {/* Per-trip checkbox */}
                        <button
                          onClick={() => {
                            const ids = new Set(selectedForPost);
                            if (ids.has(t.id)) ids.delete(t.id); else ids.add(t.id);
                            setSelectedForPost(ids);
                          }}
                          className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                            isSel ? "bg-[#facc15] border-[#facc15]" : "border-[#444] bg-transparent hover:border-[#888]"
                          }`}
                        >
                          {isSel && <span className="text-black text-[10px] font-bold leading-none">✓</span>}
                        </button>

                        <div className="flex-1 min-w-0">
                          {/* Time + platform + amount row */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap min-w-0">
                              <span className="font-mono-jet text-[11px] text-neutral-400">{t.time}</span>
                              <PlatformAvatar meta={pm} size="sm" />
                              <span className="px-2 py-0.5 rounded-full bg-[#1e1e1e] border border-[#333] text-[#e8c766] text-[9px] font-bold tracking-[0.12em]">{t.platform.toUpperCase()}</span>
                              {pm.tags.map(tg => (
                                <span key={tg} className={`text-[8px] font-bold uppercase tracking-[0.1em] px-2 py-0.5 rounded-full border ${getTagStyle(tg)}`}>{tg}</span>
                              ))}
                            </div>
                            <span className="font-mono-jet text-[17px] font-bold text-[#facc15] flex-shrink-0">${t.grandTotal.toFixed(2)}</span>
                          </div>

                          {t.reference && <p className="font-mono-jet text-[10px] text-neutral-400 mt-1">REF: {t.reference}</p>}

                          <p className="text-[13px] text-white/80 font-medium mt-1.5 leading-[1.3] break-words">
                            {t.pickup || "—"} <span className="text-neutral-400 mx-1">→</span> {t.dropoff || "—"}
                          </p>

                          <div className="flex gap-2 font-mono-jet text-[9px] text-neutral-400 flex-wrap mt-1">
                            <span>Fare ${t.earnings.toFixed(2)}</span>
                            {t.tips > 0  && <span>Tips ${t.tips.toFixed(2)}</span>}
                            {t.extra > 0 && <span>Extra ${t.extra.toFixed(2)}</span>}
                            {t.toll > 0  && <span>Toll ${t.toll.toFixed(2)}</span>}
                            {t.fee > 0   && <span>Fee −${t.fee.toFixed(2)}</span>}
                            {t.miles && t.miles > 0 && <span className="text-[#facc15]">🛣 {t.miles.toFixed(2)} mi</span>}
                            {t.gps       && <span>📍 {t.gps.lat.toFixed(4)},{t.gps.lng.toFixed(4)}</span>}
                          </div>
                          {t.notes && <p className="text-[11px] text-neutral-400 mt-1 leading-[1.4] break-words whitespace-pre-line">{t.notes}</p>}
                        </div>
                      </div>

                      {/* Inline edit form */}
                      {inlineEditId === t.id ? (
                        <div className="bg-[#0a0a0a] border border-[#2e2e2e] rounded-xl p-3 space-y-2">
                          {[["Reference", "reference"], ["Pickup", "pickup"], ["Drop-off", "dropoff"]].map(([ph, key]) => (
                            <input key={key}
                              value={inlineForm[key as keyof typeof inlineForm]}
                              onChange={e => setInlineForm(s => ({ ...s, [key]: e.target.value }))}
                              placeholder={ph}
                              className="w-full h-10 rounded-lg bg-black border border-[#262626] px-3 text-[13px] text-white placeholder:text-[#6b7280] focus:outline-none" />
                          ))}
                          <input value={inlineForm.earnings} inputMode="decimal"
                            onChange={e => setInlineForm(s => ({ ...s, earnings: e.target.value }))}
                            placeholder="Earnings"
                            className="w-full h-10 rounded-lg bg-black border border-[#262626] px-3 text-[13px] text-white font-mono-jet placeholder:text-[#6b7280] focus:outline-none" />
                          <input value={inlineForm.toll} inputMode="decimal"
                            onChange={e => { if (numericFilter(e.target.value)) setInlineForm(s => ({ ...s, toll: e.target.value })); }}
                            placeholder="Toll total"
                            className="w-full h-10 rounded-lg bg-black border border-[#262626] px-3 text-[13px] text-white font-mono-jet placeholder:text-[#6b7280] focus:outline-none" />
                          <textarea value={inlineForm.notes}
                            onChange={e => setInlineForm(s => ({ ...s, notes: e.target.value }))}
                            placeholder="Notes and E-ZPass toll breakdown"
                            rows={4}
                            className="w-full min-h-[88px] rounded-lg bg-black border border-[#262626] px-3 py-2 text-[12px] leading-relaxed text-white placeholder:text-[#6b7280] focus:outline-none resize-y" />
                          {/* Live total preview */}
                          <div className="flex items-center justify-between bg-black rounded-lg px-3 py-2 border border-[#2e2e2e]">
                            <span className="font-mono-jet text-[9px] text-neutral-400 truncate pr-2">
                              ${liveFare.toFixed(2)} fare + ${t.tips.toFixed(2)} tips + ${t.extra.toFixed(2)} extra + ${liveToll.toFixed(2)} toll − ${t.fee.toFixed(2)} fee
                            </span>
                            <span className="font-mono-jet text-[15px] font-bold text-[#facc15] flex-shrink-0">
                              = ${liveTotal.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => handleInlineSave(t.id)} className="flex-1 h-9 rounded-full bg-[#facc15] text-black text-[12px] font-bold">Save</button>
                            <button onClick={() => setInlineEditId(null)} className="flex-1 h-9 rounded-full bg-[#1e1e1e] border border-[#2a2a2a] text-neutral-400 text-[12px]">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 gap-2 pt-1">
                          <button onClick={() => handleInlineEditStart(t)}
                            className="h-9 rounded-full bg-[#1e1e1e] border border-[#2a2a2a] text-white text-[11px] font-semibold hover:bg-[#252525] transition-colors">
                            ✏️ Quick
                          </button>
                          <button onClick={() => handleEditToEntry(t)}
                            className="h-9 rounded-full bg-[#1e1e1e] border border-[#2a2a2a] text-[#f6dd8c] text-[11px] font-semibold hover:bg-[#252525] transition-colors">
                            Full Edit
                          </button>
                          <button onClick={() => handleDelete(t.id)}
                            className="h-9 rounded-full bg-[#1e1e1e] border border-[#2a2a2a] text-[#f87171] text-[11px] font-semibold hover:bg-[#2a1a1a] transition-colors">
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* Floating POST TO LEDGER button — when trips selected */}
      {selectedCount > 0 && (
        <div className="fixed bottom-[76px] left-1/2 -translate-x-1/2 z-50 w-full max-w-[440px] px-4 pointer-events-none">
          <div className="flex items-center gap-2">
            {/* Quick return pill — always accessible even when posting */}
            <button
              onClick={() => setTripsTab("ENTRY")}
              style={{ pointerEvents: "auto" }}
              className="h-14 w-14 rounded-2xl bg-black border-2 border-[#facc15]/60 flex flex-col items-center justify-center gap-0.5 flex-shrink-0 shadow-lg transition-all active:scale-95">
              <span className="text-[#facc15] text-[18px] font-black leading-none">＋</span>
              <span className="text-[#facc15] text-[7px] font-bold tracking-widest uppercase">ENTRY</span>
            </button>
            <button
              onClick={handlePostToLedger}
              style={{ pointerEvents: "auto" }}
              className="flex-1 h-14 rounded-2xl bg-[#facc15] hover:bg-[#fde047] active:scale-[0.98] text-black font-bold text-[14px] tracking-[0.06em] shadow-[0_0_32px_rgba(250,204,21,0.45)] transition-all flex items-center justify-center gap-3">
              <span>POST {selectedCount} TO LEDGER</span>
              <span className="font-mono-jet opacity-80">${selectedAmt.toFixed(2)}</span>
              <span>→</span>
            </button>
          </div>
        </div>
      )}

      {/* Floating NEW TRIP button — when nothing selected */}
      {selectedCount === 0 && (
        <div className="fixed bottom-[76px] left-1/2 -translate-x-1/2 z-50 w-full max-w-[440px] px-4 pointer-events-none">
          <button
            onClick={() => setTripsTab("ENTRY")}
            style={{ pointerEvents: "auto" }}
            className="w-full h-14 rounded-2xl border-2 border-[#facc15]/50 bg-black active:scale-[0.98] text-[#facc15] font-bold text-[15px] tracking-[0.08em] shadow-[0_0_20px_rgba(250,204,21,0.15)] transition-all flex items-center justify-center gap-2">
            <span className="text-[22px] font-black leading-none">＋</span>
            <span>NEW TRIP</span>
          </button>
        </div>
      )}
    </div>
  );

  // ─── Ledger ───────────────────────────────────────────────────
  const ledgerByDate: Record<string, Trip[]> = {};
  for (const t of postedTrips) {
    if (!ledgerByDate[t.date]) ledgerByDate[t.date] = [];
    ledgerByDate[t.date].push(t);
  }
  const ledgerSortedDates = Object.keys(ledgerByDate).sort((a, b) => b.localeCompare(a));
  const postedTotal = postedTrips.reduce((a, b) => a + b.grandTotal, 0);

  const LedgerContent = (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[22px] font-bold text-white tracking-tight">Ledger</h2>
        <span className="font-mono-jet text-[12px] text-[#4ade80]">{postedTrips.length} posted</span>
      </div>

      {/* Sticky totals bar */}
      <div className="sticky z-20 -mx-4 px-4 pt-2 pb-3 bg-black/96 backdrop-blur-sm border-b border-[#1a1a1a]" style={{ top: 'calc(146px + env(safe-area-inset-top))' }}>
        <div className="grid grid-cols-2 gap-2">
          {([
            ["POSTED TRIPS", String(postedTrips.length)],
            ["LEDGER TOTAL", "$" + postedTotal.toFixed(2)],
          ] as [string, string][]).map(([lbl, val]) => (
            <div key={lbl} className="bg-[#0d140d] border border-[#1a3a1a] rounded-xl p-2.5 text-center">
              <p className="text-[8px] tracking-[0.15em] text-[#4ade80]/80 font-bold uppercase">{lbl}</p>
              <p className="font-mono-jet text-[15px] font-bold text-[#4ade80] mt-0.5">{val}</p>
            </div>
          ))}
        </div>
      </div>

      {postedTrips.length === 0 ? (
        <div className="bg-[#141414] border border-[#2e2e2e] rounded-2xl p-10 text-center space-y-2">
          <p className="text-[15px] font-semibold text-white">Ledger is empty</p>
          <p className="text-[12px] text-neutral-400">Review and approve trips in the Revenue Queue first</p>
          <button onClick={() => { setActiveTab("TRIPS"); setTripsTab("REGISTER"); }}
            className="mt-3 h-10 px-6 rounded-full border border-[#166534]/60 text-[#4ade80] text-[12px] font-semibold hover:bg-[#4ade80]/10 transition-colors">
            Go to Revenue Queue →
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {ledgerSortedDates.map(date => {
            const dayTrips = ledgerByDate[date];
            const dayTotal = dayTrips.reduce((a, b) => a + b.grandTotal, 0);
            const dayLabel = new Date(date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
            return (
              <div key={date} className="space-y-2">
                {/* Day header */}
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80]" />
                    <span className="text-[11px] font-bold tracking-[0.12em] text-[#4ade80]/90 uppercase">{dayLabel}</span>
                  </div>
                  <span className="font-mono-jet text-[11px] text-[#4ade80]/85">{dayTrips.length} trip{dayTrips.length !== 1 ? "s" : ""} · ${dayTotal.toFixed(2)}</span>
                </div>

                {/* Posted trip cards — read-only */}
                {dayTrips.map(t => {
                  const pm = getPlatformMeta(t.platform);
                  return (
                    <div key={t.id} className="bg-[#0c140c] border border-[#1a2e1a] rounded-2xl p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          <span className="font-mono-jet text-[11px] text-neutral-400">{t.time}</span>
                          <PlatformAvatar meta={pm} size="sm" />
                          <span className="px-2 py-0.5 rounded-full bg-[#0d1f0d] border border-[#1a3a1a] text-[#4ade80] text-[9px] font-bold tracking-[0.12em]">{t.platform.toUpperCase()}</span>
                          <span className="px-2 py-0.5 rounded-full bg-[#052e16] border border-[#166534] text-[#4ade80] text-[8px] font-bold tracking-widest">✓ POSTED</span>
                        </div>
                        <span className="font-mono-jet text-[17px] font-bold text-[#4ade80] flex-shrink-0">${t.grandTotal.toFixed(2)}</span>
                      </div>
                      {t.reference && <p className="font-mono-jet text-[10px] text-neutral-400">REF: {t.reference}</p>}
                      <p className="text-[13px] text-white/70 font-medium leading-[1.3] break-words">
                        {t.pickup || "—"} <span className="text-neutral-400 mx-1">→</span> {t.dropoff || "—"}
                      </p>
                      <div className="flex gap-2 font-mono-jet text-[9px] text-neutral-400 flex-wrap">
                        <span>Fare ${t.earnings.toFixed(2)}</span>
                        {t.tips > 0  && <span>Tips ${t.tips.toFixed(2)}</span>}
                        {t.extra > 0 && <span>Extra ${t.extra.toFixed(2)}</span>}
                        {t.toll > 0  && <span>Toll ${t.toll.toFixed(2)}</span>}
                        {t.fee > 0   && <span>Fee −${t.fee.toFixed(2)}</span>}
                        {t.postedAt  && <span>📋 Posted {new Date(t.postedAt).toLocaleDateString()}</span>}
                      </div>
                      {t.notes && <p className="text-[11px] text-neutral-400 leading-[1.4] break-words whitespace-pre-line">{t.notes}</p>}
                      {/* Ledger actions */}
                      <div className="flex gap-2 pt-1">
                        <button onClick={() => handleUnpostTrip(t.id)}
                          className="flex-1 h-8 rounded-full border border-[#2a2a2a] text-neutral-400 text-[10px] font-semibold tracking-wide hover:border-[#f6dd8c]/40 hover:text-[#f6dd8c] transition-colors">
                          ↩ Regresar al Register
                        </button>
                        <button onClick={() => handleDeletePostedTrip(t.id)}
                          className="h-8 w-8 rounded-full border border-[#3a1010] text-[#ff6b6b] text-[12px] hover:bg-[#ff6b6b]/10 transition-colors flex items-center justify-center">
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // ─── Expenses ─────────────────────────────────────────────────
  const totalExpenses    = expenses.reduce((a, e) => a + e.amount, 0);
  const todayExpenses    = expenses.filter(e => e.date === toYYYYMMDD(currentTime));
  const todayExpenseTotal = todayExpenses.reduce((a, e) => a + e.amount, 0);
  const expensesWeek = useMemo(() => {
    const weekAgo = new Date(currentTime); weekAgo.setDate(weekAgo.getDate() - 7);
    return expenses.filter(e => e.date >= weekAgo.toISOString().slice(0, 10)).reduce((a, e) => a + e.amount, 0);
  }, [expenses, currentTime]);
  const expensesMonth = useMemo(() => {
    const ym = toYYYYMMDD(currentTime).slice(0, 7);
    return expenses.filter(e => e.date.startsWith(ym)).reduce((a, e) => a + e.amount, 0);
  }, [expenses, currentTime]);
  const allExpenseTypes      = useMemo(() => [...EXPENSE_TYPES,      ...customExpenseTypes],      [customExpenseTypes]);
  const allExpenseCategories = useMemo(() => [...EXPENSE_CATEGORIES, ...customExpenseCategories], [customExpenseCategories]);
  const allVendors           = useMemo(() => [...NYC_DEFAULT_VENDORS, ...(customVendors.filter(v=>!NYC_DEFAULT_VENDORS.includes(v)))], [customVendors]);

  // ── Expense summary by period and category (for budget overview) ─────────
  const expSummary = useMemo(() => {
    const today     = toYYYYMMDD(currentTime);
    const wd        = currentTime.getDay();
    const monOffset = wd === 0 ? -6 : 1 - wd;
    const weekStart = toYYYYMMDD(new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate() + monOffset));
    const monthStr  = today.slice(0, 7);
    const yearStr   = today.slice(0, 4);
    const logOnly   = expenses.filter(e => !e.frequency || e.frequency === 'none');
    // Calendar-aligned trip date helper (same predicate style as expense filter)
    const tripDate  = (t: Trip) => t.date || (t.timestamp ?? "").slice(0, 10);
    const summarise = (subset: Expense[], tripSubset: Trip[]) => {
      const total = subset.reduce((a, e) => a + e.amount, 0);
      const byCategory: Record<string, number> = {};
      subset.forEach(e => { byCategory[e.category] = (byCategory[e.category] || 0) + e.amount; });
      const toll = tripSubset.reduce((a, t) => a + t.toll, 0);
      return { total, byCategory, toll };
    };
    return {
      day:   summarise(
        logOnly.filter(e => e.date === today),
        trips.filter(t => tripDate(t) === today),
      ),
      week:  summarise(
        logOnly.filter(e => e.date >= weekStart && e.date <= today),
        trips.filter(t => { const d = tripDate(t); return d >= weekStart && d <= today; }),
      ),
      month: summarise(
        logOnly.filter(e => e.date.startsWith(monthStr)),
        trips.filter(t => tripDate(t).startsWith(monthStr)),
      ),
      year:  summarise(
        logOnly.filter(e => e.date.startsWith(yearStr)),
        trips.filter(t => tripDate(t).startsWith(yearStr)),
      ),
    };
  }, [expenses, trips, currentTime]);

  // Period-filtered expenses — EXPENSE LOG only (one-time, non-recurring entries)
  const expPeriodFiltered = useMemo(() => {
    const today     = toYYYYMMDD(currentTime);
    const wd        = currentTime.getDay();
    const monOffset = wd === 0 ? -6 : 1 - wd;
    const weekStart = toYYYYMMDD(new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate() + monOffset));
    const monthStr  = today.slice(0,7);
    const yearStr   = today.slice(0,4);
    // Bills (recurring) live in MY BILLS — exclude them from the log
    const logOnly = expenses.filter(e => !e.frequency || e.frequency === 'none');
    if (expPeriod === 'DAY')   return logOnly.filter(e => e.date === today);
    if (expPeriod === 'WEEK')  return logOnly.filter(e => e.date >= weekStart && e.date <= today);
    if (expPeriod === 'MONTH') return logOnly.filter(e => e.date.startsWith(monthStr));
    if (expPeriod === 'YEAR')  return logOnly.filter(e => e.date.startsWith(yearStr));
    return logOnly;
  }, [expenses, expPeriod, currentTime]);

  const ExpensesContent = (
    <div className="space-y-4">

      {/* ── Bank Statement Import Modal ──────────────────────────────────────── */}
      {showStatementImport && (
        <div className="fixed inset-0 z-[60] bg-[#080808] flex flex-col">
          {/* Hidden file input */}
          <input
            ref={statementInputRef}
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp,image/heic,.pdf"
            className="hidden"
            onChange={handleStatementScan}
          />

          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-4 border-b border-[#1e1e1e] flex-shrink-0">
            <button
              onClick={() => { setShowStatementImport(false); setStatementTransactions([]); setStatementScanError(null); setStatementScanning(false); setStatementPurpose({}); }}
              className="w-9 h-9 rounded-full bg-[#1e1e1e] flex items-center justify-center text-white text-[14px] flex-shrink-0">
              ✕
            </button>
            <div>
              <h2 className="text-[17px] font-bold text-white leading-tight">Import Bank Statement</h2>
              <p className="text-[10px] text-neutral-500">PDF or photo · Chase · BofA · Credit Union · Any bank</p>
            </div>
          </div>

          {/* Step 0: Upload */}
          {!statementScanning && statementTransactions.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 gap-6">
              <div className="text-[72px]">🏦</div>
              <div className="text-center">
                <h3 className="text-[18px] font-bold text-white mb-2">Upload your bank statement</h3>
                <p className="text-[12px] text-neutral-400 leading-relaxed">Gemini AI reads every transaction<br/>and auto-categorizes them for you</p>
              </div>
              <button
                onClick={() => { setStatementScanError(null); statementInputRef.current?.click(); }}
                className="w-full max-w-xs h-[56px] rounded-2xl bg-[#facc15] text-black font-bold text-[15px] tracking-wide active:scale-95 transition-all">
                📄 Choose File
              </button>
              <p className="text-[10px] text-neutral-600 text-center leading-relaxed">
                PDF · JPEG · PNG · WEBP supported<br/>File is sent to AI for reading only
              </p>
              {statementScanError && (
                <div className="w-full max-w-xs bg-[#2d1515] border border-[#f87171]/30 rounded-xl p-3 text-[12px] text-[#f87171] text-center">
                  ⚠️ {statementScanError}
                  <br/>
                  <button
                    onClick={() => { setStatementScanError(null); statementInputRef.current?.click(); }}
                    className="mt-2 text-[#facc15] font-bold underline">
                    Try again
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step 1: Scanning */}
          {statementScanning && (
            <div className="flex-1 flex flex-col items-center justify-center gap-5">
              <div className="text-[56px] animate-pulse">🤖</div>
              <div className="text-center">
                <p className="text-[18px] font-bold text-white mb-1">Reading your statement…</p>
                <p className="text-[12px] text-neutral-400">Gemini AI is extracting all transactions</p>
              </div>
              <div className="flex gap-2 mt-2">
                {[0,1,2].map(i => (
                  <div key={i} className="w-2.5 h-2.5 rounded-full bg-[#facc15] animate-bounce"
                    style={{ animationDelay: i * 0.15 + "s" }} />
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Review transactions */}
          {!statementScanning && statementTransactions.length > 0 && (
            <>
              {/* Summary bar */}
              {(() => {
                const selectedCount = Object.values(statementSelected).filter(Boolean).length;
                const matchedCount = statementTransactions.filter(tx => tx.matchedExpenseId).length;
                const creditCount = statementTransactions.filter(tx => tx.txType === "credit").length;
                return (
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-[#0d0d0d] border-b border-[#1e1e1e] flex-shrink-0">
                    <span className="text-[11px] font-bold text-[#facc15]">{selectedCount} to import</span>
                    <span className="text-neutral-700">·</span>
                    <span className="text-[10px] text-neutral-500">{matchedCount} already recorded</span>
                    <span className="text-neutral-700">·</span>
                    <span className="text-[10px] text-neutral-500">{creditCount} credits</span>
                    <div className="ml-auto flex gap-3">
                      <button
                        onClick={() => {
                          const all: Record<number,boolean> = {};
                          statementTransactions.forEach((tx, i) => { if (!tx.matchedExpenseId) all[i] = true; });
                          setStatementSelected(all);
                        }}
                        className="text-[10px] text-[#facc15] font-bold">All</button>
                      <button
                        onClick={() => setStatementSelected({})}
                        className="text-[10px] text-neutral-500 font-bold">None</button>
                    </div>
                  </div>
                );
              })()}

              {/* Transaction list — grouped by Gemini-assigned category */}
              <div className="flex-1 overflow-y-auto pb-28">
                <div className="p-3 space-y-4">
                  {(() => {
                    // Group by Gemini category (stable — doesn't shift when user edits)
                    const groups: Record<string, number[]> = {};
                    statementTransactions.forEach((tx, i) => {
                      const cat = tx.category || "Other";
                      if (!groups[cat]) groups[cat] = [];
                      groups[cat].push(i);
                    });
                    const bizCount = Object.values(statementPurpose).filter(p => p === "business").length;
                    const perCount = Object.values(statementPurpose).filter(p => p === "personal").length;
                    return (
                      <>
                        {/* Biz / Personal summary pill */}
                        {(bizCount + perCount) > 0 && (
                          <div className="flex gap-2 px-1 -mt-1 mb-1">
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#4ade80]/10 text-[#4ade80] border border-[#4ade80]/20">🏢 {bizCount} business</span>
                            {perCount > 0 && <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#818cf8]/10 text-[#818cf8] border border-[#818cf8]/20">👤 {perCount} personal</span>}
                          </div>
                        )}
                        {Object.entries(groups).map(([cat, indices]) => {
                          const catDebitTotal = indices.reduce((s, i) => statementTransactions[i].txType === "debit" ? s + statementTransactions[i].amount : s, 0);
                          const catSelCount = indices.filter(i => !!statementSelected[i]).length;
                          return (
                            <div key={cat}>
                              {/* Category header */}
                              <div className="flex items-center justify-between px-1 mb-1.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold text-neutral-400 tracking-[0.1em] uppercase">{cat}</span>
                                  <span className="text-[8px] text-neutral-600">{indices.length} tx</span>
                                  {catSelCount > 0 && (
                                    <span className="text-[8px] font-bold bg-[#facc15]/15 text-[#f6dd8c] px-1.5 py-0.5 rounded-full">{catSelCount} ✓</span>
                                  )}
                                </div>
                                {catDebitTotal > 0 && (
                                  <span className="text-[10px] font-mono-jet text-neutral-500">−${catDebitTotal.toFixed(2)}</span>
                                )}
                              </div>
                              {/* Transactions */}
                              <div className="space-y-1.5">
                                {indices.map(i => {
                                  const tx = statementTransactions[i];
                                  const isSelected = !!statementSelected[i];
                                  const isMatched = !!tx.matchedExpenseId;
                                  const isCredit = tx.txType === "credit";
                                  const purpose = statementPurpose[i] ?? "business";
                                  return (
                                    <div key={i}
                                      onClick={() => { if (!isMatched) setStatementSelected(s => ({ ...s, [i]: !s[i] })); }}
                                      className="rounded-xl border px-3 py-2.5 transition-all active:scale-[0.99]"
                                      style={{
                                        background: isMatched ? "#0a1a0a" : isSelected ? "#1a1500" : "#0f0f0f",
                                        borderColor: isMatched ? "rgba(74,222,128,0.2)" : isSelected ? "rgba(250,204,21,0.4)" : "#1e1e1e",
                                        opacity: isMatched ? 0.65 : 1,
                                      }}>
                                      <div className="flex items-start gap-2.5">
                                        {/* Checkbox */}
                                        <div className="mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                                          style={{
                                            borderColor: isMatched ? "#4ade80" : isSelected ? "#facc15" : "#444",
                                            background: isMatched ? "rgba(74,222,128,0.15)" : isSelected ? "#facc15" : "transparent",
                                          }}>
                                          {(isMatched || isSelected) && (
                                            <span className="text-[10px] font-bold" style={{ color: isMatched ? "#4ade80" : "#000" }}>✓</span>
                                          )}
                                        </div>
                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                          <p className="text-[12px] font-semibold text-white leading-tight truncate">
                                            {tx.vendor || tx.description}
                                          </p>
                                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                            <span className="text-[9px] text-neutral-600 font-mono-jet">{tx.date}</span>
                                            {isMatched && (
                                              <span className="text-[8px] text-[#4ade80] bg-[#4ade80]/10 px-1.5 py-0.5 rounded-full border border-[#4ade80]/20">✓ Recorded</span>
                                            )}
                                            {isCredit && (
                                              <span className="text-[8px] text-[#818cf8] bg-[#818cf8]/10 px-1.5 py-0.5 rounded-full border border-[#818cf8]/20">↑ income</span>
                                            )}
                                            {/* Category override dropdown */}
                                            {!isMatched && !isCredit && (
                                              <select
                                                value={statementCategories[i] || tx.category}
                                                onClick={e => e.stopPropagation()}
                                                onChange={e => { e.stopPropagation(); setStatementCategories(s => ({ ...s, [i]: e.target.value })); }}
                                                className="text-[8px] bg-[#1a1a1a] border border-[#2e2e2e] text-neutral-400 rounded-lg px-1.5 py-0.5 max-w-[110px]"
                                              >
                                                {["Gas/Fuel","Car Wash","Tolls","EZ-Pass","Food & Drink","Vehicle Maintenance","Insurance","Phone","Parking","Supplies","Other"].map(c => (
                                                  <option key={c} value={c}>{c}</option>
                                                ))}
                                              </select>
                                            )}
                                          </div>
                                        </div>
                                        {/* Amount + Biz/Personal toggle */}
                                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                                          <p className="text-[14px] font-bold font-mono-jet"
                                            style={{ color: isCredit ? "#4ade80" : isSelected ? "#facc15" : "#888" }}>
                                            {isCredit ? "+" : "−"}${tx.amount.toFixed(2)}
                                          </p>
                                          {!isMatched && !isCredit && (
                                            <button
                                              onClick={e => {
                                                e.stopPropagation();
                                                setStatementPurpose(prev => ({ ...prev, [i]: purpose === "business" ? "personal" : "business" }));
                                              }}
                                              className="text-[8px] font-bold px-1.5 py-0.5 rounded-full border transition-all"
                                              style={{
                                                background: purpose === "business" ? "rgba(74,222,128,0.1)" : "rgba(129,140,248,0.12)",
                                                borderColor: purpose === "business" ? "rgba(74,222,128,0.3)" : "rgba(129,140,248,0.35)",
                                                color: purpose === "business" ? "#4ade80" : "#818cf8",
                                              }}>
                                              {purpose === "business" ? "🏢 Biz" : "👤 Personal"}
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Import footer */}
              <div className="absolute bottom-0 left-0 right-0 px-4 pb-8 pt-4"
                style={{ background: "linear-gradient(to top, #080808 70%, transparent)" }}>
                {(() => {
                  const count = Object.values(statementSelected).filter(Boolean).length;
                  const total = statementTransactions
                    .filter((_, i) => statementSelected[i])
                    .reduce((a, tx) => a + tx.amount, 0);
                  return (
                    <button
                      onClick={handleStatementImport}
                      disabled={count === 0}
                      className="w-full h-[56px] rounded-2xl text-[15px] font-bold tracking-wide transition-all active:scale-95 disabled:opacity-40"
                      style={{ background: count > 0 ? "#facc15" : "#1e1e1e", color: count > 0 ? "#000" : "#555" }}>
                      {count === 0
                        ? "Select transactions to import"
                        : "Import " + count + " expense" + (count === 1 ? "" : "s") + " · $" + total.toFixed(2)}
                    </button>
                  );
                })()}
              </div>
            </>
          )}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[22px] font-bold text-white">Expenses</h2>
          {(() => {
            const biz = expenses.filter(e => !e.purpose || e.purpose === "business").reduce((a,e)=>a+e.amount,0);
            const per = expenses.filter(e => e.purpose === "personal").reduce((a,e)=>a+e.amount,0);
            return (
              <p className="text-[11px] text-neutral-400 mt-0.5 font-mono-jet">
                <span className="text-[#4ade80]">🏢 −${biz.toFixed(2)}</span>
                <span className="text-neutral-500"> · </span>
                <span className="text-[#818cf8]">👤 −${per.toFixed(2)}</span>
              </p>
            );
          })()}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setShowStatementImport(true); setStatementTransactions([]); setStatementScanError(null); }}
            className="h-10 px-3 rounded-full bg-[#0d1f0d] border border-[#4ade80]/30 text-[#4ade80] text-[11px] font-bold tracking-wide hover:bg-[#4ade80]/10 transition-colors flex items-center gap-1.5">
            📄 Import
          </button>
          <button
            onClick={() => {
              setShowExpenseForm(true); setEditingExpenseId(null);
              setExpenseForm({ name: "", type: "Gasoline / Fuel", category: "Vehicle & Fuel", description: "", amount: "", date: new Date().toISOString().slice(0,10), frequency: "monthly", dueDate: "", purpose: "business" });
              setAddingCustomType(false); setAddingCustomCat(false); setAddingCustomVendor(false);
            }}
            className="h-10 px-4 rounded-full bg-[#1e1e1e] border border-[#333] text-white text-[12px] font-bold tracking-wide hover:bg-[#2a2a2a] transition-colors">
            + Bill
          </button>
          <button
            onClick={() => {
              if (showExpenseForm && !editingExpenseId) { setShowExpenseForm(false); }
              else { setShowExpenseForm(true); setEditingExpenseId(null); resetExpenseForm(); setAddingCustomType(false); setAddingCustomCat(false); setAddingCustomVendor(false); }
            }}
            className="h-10 px-4 rounded-full bg-[#facc15] text-black text-[12px] font-bold tracking-wide hover:bg-[#fde047] transition-colors">
            {showExpenseForm && !editingExpenseId ? "✕ Close" : "+ Expense"}
          </button>
        </div>
      </div>

      {/* Entry / Edit form */}
      {showExpenseForm && (
        <div className="bg-[#101010] border border-[#2a2a2a] rounded-2xl p-4 space-y-3">
          {/* Hidden file input for camera/gallery */}
          <input
            ref={receiptInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleReceiptScan}
          />

          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-bold tracking-[0.16em] text-white uppercase">
              {editingExpenseId
                ? (expenseForm.frequency && expenseForm.frequency !== 'none' ? "✏️ Edit Bill" : "✏️ Edit Expense")
                : (expenseForm.frequency && expenseForm.frequency !== 'none' ? "📋 New Bill" : "New Expense")}
            </h3>
            <div className="flex items-center gap-2">
              {/* Receipt scan button */}
              <button
                onClick={() => { setReceiptScanError(null); receiptInputRef.current?.click(); }}
                disabled={scanningReceipt}
                className="flex items-center gap-1.5 h-8 px-3 rounded-full border text-[10px] font-bold transition-colors disabled:opacity-50"
                style={{ background: scanningReceipt ? "#1a1a1a" : "#0d1f0d", borderColor: "#4ade8033", color: "#4ade80" }}
              >
                {scanningReceipt
                  ? <><span className="animate-spin inline-block w-3 h-3 border border-[#4ade80] border-t-transparent rounded-full"/>Scanning…</>
                  : <>📷 Scan Receipt</>
                }
              </button>
              {editingExpenseId && (
                <button onClick={() => { setEditingExpenseId(null); resetExpenseForm(); setShowExpenseForm(false); }}
                  className="text-[10px] text-neutral-400 hover:text-white transition-colors">← Cancel</button>
              )}
            </div>{/* end flex items-center gap-2 */}
          </div>{/* end flex items-center justify-between */}

          {/* ── Business / Personal toggle ── */}
          <div className="flex gap-2">
            {(["business", "personal"] as const).map(p => (
              <button key={p} onClick={() => setExpenseForm(s => ({ ...s, purpose: p }))}
                className={`flex-1 h-9 rounded-full text-[11px] font-bold tracking-[0.08em] uppercase transition-all border ${
                  expenseForm.purpose === p
                    ? p === "business"
                      ? "bg-[#0d2010] border-[#4ade80]/50 text-[#4ade80]"
                      : "bg-[#0e0e20] border-[#818cf8]/50 text-[#818cf8]"
                    : "bg-black/40 border-[#2a2a2a] text-neutral-500 hover:text-neutral-300"
                }`}>
                {p === "business" ? "🏢 Business" : "👤 Personal"}
              </button>
            ))}
          </div>

          {/* Vendor / Name dropdown */}
          <div>
            <label className="text-[9px] text-neutral-300 font-bold uppercase tracking-widest mb-1 block">Vendor / Expense Name</label>
            <div className="relative">
              <select value={expenseForm.name}
                onChange={e => { if (e.target.value === "__add__") { setAddingCustomVendor(true); } else { setExpenseForm(s => ({ ...s, name: e.target.value })); } }}
                className="w-full h-11 rounded-xl bg-black border border-[#262626] px-3 pr-8 text-white text-[13px] appearance-none focus:outline-none">
                <option value="" disabled>Select a vendor...</option>
                {allVendors.map(v => <option key={v} value={v}>{v}</option>)}
                {allVendors.length > 0 && <option disabled>──────────</option>}
                <option value="__add__">➕ Add vendor...</option>
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 text-[10px]">▼</span>
            </div>
            {addingCustomVendor && (
              <div className="flex gap-2 mt-2">
                <input value={newCustomVendor} onChange={e => setNewCustomVendor(e.target.value)}
                  placeholder="e.g. BP Queens Blvd, Jiffy Lube..."
                  onKeyDown={e => { if (e.key === "Enter" && newCustomVendor.trim()) { const v = newCustomVendor.trim(); setCustomVendors(p => [...p, v]); setExpenseForm(s => ({ ...s, name: v })); setNewCustomVendor(""); setAddingCustomVendor(false); } }}
                  className="flex-1 h-10 rounded-xl bg-black border border-[#facc15]/40 px-3 text-white text-[13px] focus:outline-none" autoFocus />
                <button onClick={() => { if (newCustomVendor.trim()) { const v = newCustomVendor.trim(); setCustomVendors(p => [...p, v]); setExpenseForm(s => ({ ...s, name: v })); setNewCustomVendor(""); setAddingCustomVendor(false); } }}
                  className="h-10 px-3 rounded-xl bg-[#facc15] text-black text-[12px] font-bold">Add</button>
                <button onClick={() => { setAddingCustomVendor(false); setNewCustomVendor(""); }}
                  className="h-10 px-3 rounded-xl bg-[#1e1e1e] border border-[#2a2a2a] text-neutral-400 text-[12px]">✕</button>
              </div>
            )}
          </div>

          {/* Type dropdown */}
          <div>
            <label className="text-[9px] text-neutral-300 font-bold uppercase tracking-widest mb-1 block">Expense Type</label>
            <div className="relative">
              <select value={expenseForm.type}
                onChange={e => { if (e.target.value === "__add__") { setAddingCustomType(true); } else { setExpenseForm(s => ({ ...s, type: e.target.value })); } }}
                className="w-full h-11 rounded-xl bg-black border border-[#262626] px-3 pr-8 text-white text-[13px] appearance-none focus:outline-none">
                {allExpenseTypes.map(t => <option key={t} value={t}>{t}</option>)}
                <option disabled>──────────</option>
                <option value="__add__">➕ Add new type...</option>
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 text-[10px]">▼</span>
            </div>
            {addingCustomType && (
              <div className="flex gap-2 mt-2">
                <input value={newCustomType} onChange={e => setNewCustomType(e.target.value)}
                  placeholder="New type name..."
                  onKeyDown={e => { if (e.key === "Enter" && newCustomType.trim()) { const t = newCustomType.trim(); setCustomExpenseTypes(p => [...p, t]); setExpenseForm(s => ({ ...s, type: t })); setNewCustomType(""); setAddingCustomType(false); } }}
                  className="flex-1 h-10 rounded-xl bg-black border border-[#facc15]/40 px-3 text-white text-[13px] focus:outline-none" autoFocus />
                <button onClick={() => { if (newCustomType.trim()) { const t = newCustomType.trim(); setCustomExpenseTypes(p => [...p, t]); setExpenseForm(s => ({ ...s, type: t })); setNewCustomType(""); setAddingCustomType(false); } }}
                  className="h-10 px-3 rounded-xl bg-[#facc15] text-black text-[12px] font-bold">Add</button>
                <button onClick={() => { setAddingCustomType(false); setNewCustomType(""); }}
                  className="h-10 px-3 rounded-xl bg-[#1e1e1e] border border-[#2a2a2a] text-neutral-400 text-[12px]">✕</button>
              </div>
            )}
          </div>

          {/* Category dropdown */}
          <div>
            <label className="text-[9px] text-neutral-300 font-bold uppercase tracking-widest mb-1 block">Category (IRS Schedule C)</label>
            <div className="relative">
              <select value={expenseForm.category}
                onChange={e => { if (e.target.value === "__add__") { setAddingCustomCat(true); } else { setExpenseForm(s => ({ ...s, category: e.target.value })); } }}
                className="w-full h-11 rounded-xl bg-black border border-[#262626] px-3 pr-8 text-white text-[13px] appearance-none focus:outline-none">
                {allExpenseCategories.map(c => <option key={c} value={c}>{c}</option>)}
                <option disabled>──────────</option>
                <option value="__add__">➕ Add category...</option>
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 text-[10px]">▼</span>
            </div>
            {addingCustomCat && (
              <div className="flex gap-2 mt-2">
                <input value={newCustomCat} onChange={e => setNewCustomCat(e.target.value)}
                  placeholder="New category..."
                  onKeyDown={e => { if (e.key === "Enter" && newCustomCat.trim()) { const c = newCustomCat.trim(); setCustomExpenseCategories(p => [...p, c]); setExpenseForm(s => ({ ...s, category: c })); setNewCustomCat(""); setAddingCustomCat(false); } }}
                  className="flex-1 h-10 rounded-xl bg-black border border-[#facc15]/40 px-3 text-white text-[13px] focus:outline-none" autoFocus />
                <button onClick={() => { if (newCustomCat.trim()) { const c = newCustomCat.trim(); setCustomExpenseCategories(p => [...p, c]); setExpenseForm(s => ({ ...s, category: c })); setNewCustomCat(""); setAddingCustomCat(false); } }}
                  className="h-10 px-3 rounded-xl bg-[#facc15] text-black text-[12px] font-bold">Add</button>
                <button onClick={() => { setAddingCustomCat(false); setNewCustomCat(""); }}
                  className="h-10 px-3 rounded-xl bg-[#1e1e1e] border border-[#2a2a2a] text-neutral-400 text-[12px]">✕</button>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="text-[9px] text-neutral-300 font-bold uppercase tracking-widest mb-1 block">Description (optional)</label>
            <input value={expenseForm.description} onChange={e => setExpenseForm(s => ({ ...s, description: e.target.value }))}
              placeholder="Additional notes about this expense..."
              className="w-full h-11 rounded-xl bg-black border border-[#262626] px-3 text-white text-[14px] placeholder:text-neutral-400 focus:outline-none" />
          </div>

          {/* Amount + Date */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-[9px] text-neutral-300 font-bold uppercase tracking-widest mb-1 block">Amount ($)</label>
              <input inputMode="decimal" value={expenseForm.amount}
                onChange={e => { if (numericFilter(e.target.value)) setExpenseForm(s => ({ ...s, amount: e.target.value })); }}
                placeholder="0.00"
                className="w-full h-11 rounded-xl bg-black border border-[#262626] px-3 text-white text-[18px] font-bold font-mono-jet placeholder:text-neutral-400 focus:outline-none" />
            </div>
            <div className="w-[130px] flex-shrink-0">
              <label className="text-[9px] text-neutral-300 font-bold uppercase tracking-widest mb-1 block">Date</label>
              <input type="date" value={expenseForm.date} onChange={e => setExpenseForm(s => ({ ...s, date: e.target.value }))}
                className="w-full h-11 rounded-xl bg-black border border-[#262626] px-2 text-white text-[11px] focus:outline-none" />
            </div>
          </div>

          {/* Frequency (recurring) */}
          <div>
            <label className="text-[9px] text-neutral-300 font-bold uppercase tracking-widest mb-1.5 block">Frequency (recurring expense)</label>
            <div className="flex gap-1.5">
              {(["none","daily","weekly","monthly"] as const).map(f => (
                <button key={f} onClick={() => setExpenseForm(s => ({ ...s, frequency: f }))}
                  className={`flex-1 h-9 rounded-xl text-[10px] font-bold transition-colors ${
                    expenseForm.frequency === f
                      ? "bg-[#facc15] text-black"
                      : "bg-[#1e1e1e] text-neutral-400 border border-[#262626] hover:text-white"
                  }`}>
                  {f === "none" ? "One-time" : f === "daily" ? "Daily" : f === "weekly" ? "Weekly" : "Monthly"}
                </button>
              ))}
            </div>
          </div>

          {/* Due date — only if recurring */}
          {expenseForm.frequency !== "none" && (
            <div>
              <label className="text-[9px] text-neutral-300 font-bold uppercase tracking-widest mb-1 block">Next due date</label>
              <input type="date" value={expenseForm.dueDate}
                onChange={e => setExpenseForm(s => ({ ...s, dueDate: e.target.value }))}
                className="w-full h-11 rounded-xl bg-black border border-[#262626] px-3 text-white text-[13px] focus:outline-none" />
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-2 pt-1">
            <button onClick={handleSaveExpense}
              className="flex-1 h-12 rounded-full bg-[#facc15] text-black text-[13px] font-bold tracking-wide hover:bg-[#fde047] transition-colors">
              {editingExpenseId ? "Update" : "Save Expense"}
            </button>
            <button onClick={() => { setShowExpenseForm(false); setEditingExpenseId(null); resetExpenseForm(); setAddingCustomType(false); setAddingCustomCat(false); setAddingCustomVendor(false); }}
              className="h-12 px-5 rounded-full bg-[#1e1e1e] border border-[#2a2a2a] text-neutral-400 text-[13px] hover:text-white transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── MY BILLS ── */}
      {(() => {
        const bills = expenses.filter(e => e.frequency && e.frequency !== 'none');
        const monthlyEq = bills.reduce((s,e) => {
          if (e.frequency==='daily')   return s + e.amount * 30;
          if (e.frequency==='weekly')  return s + e.amount * 4.33;
          return s + e.amount;
        }, 0);
        const todayStr = toYYYYMMDD(currentTime);
        return (
          <div className="bg-[#0d0d0d] border border-orange-400/20 rounded-2xl overflow-hidden">
            {/* Orange top accent */}
            <div className="h-[3px] bg-gradient-to-r from-orange-400/90 to-orange-400/10" />
            {/* Section header */}
            <div className="flex items-center justify-between px-4 pt-3 pb-3 border-b border-[#1a1a1a]">
              <div>
                <p className="text-[10px] text-orange-300 font-bold uppercase tracking-widest">📋 My Bills</p>
                <p className="text-[10px] text-neutral-400 mt-0.5 font-mono-jet">
                  {bills.length} active · ~−${monthlyEq.toFixed(0)}/mo
                </p>
              </div>
              <button onClick={() => {
                setShowExpenseForm(true); setEditingExpenseId(null);
                setExpenseForm({ name: "", type: "Gasoline / Fuel", category: "Vehicle & Fuel", description: "", amount: "", date: new Date().toISOString().slice(0,10), frequency: "monthly", dueDate: "", purpose: "business" });
                setAddingCustomType(false); setAddingCustomCat(false); setAddingCustomVendor(false);
              }} className="h-8 px-3 rounded-full bg-orange-400/10 border border-orange-400/30 text-orange-300 text-[10px] font-bold tracking-wide hover:bg-orange-400/20 transition-colors">
                + Add Bill
              </button>
            </div>
            {/* Bills list */}
            {bills.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <p className="text-[28px] mb-2">🧾</p>
                <p className="text-[13px] text-neutral-400">No bills yet</p>
                <p className="text-[10px] text-neutral-400 mt-1">Add rent, car payment, memberships — anything that repeats</p>
              </div>
            ) : (
              <div className="divide-y divide-[#1a1a1a]">
                {bills.map(b => {
                  const freqLabel = b.frequency==='daily' ? 'Daily' : b.frequency==='weekly' ? 'Weekly' : 'Monthly';
                  const freqColor = b.frequency==='daily' ? 'text-orange-400' : b.frequency==='weekly' ? 'text-blue-400' : 'text-[#4ade80]';
                  const nextDue   = b.dueDate ? new Date(b.dueDate + 'T00:00:00') : null;
                  const daysUntil = nextDue ? Math.ceil((nextDue.getTime() - new Date(todayStr+'T00:00:00').getTime()) / 86400000) : null;
                  const dueStr    = daysUntil !== null
                    ? daysUntil === 0 ? '⚠️ Due today'
                    : daysUntil < 0  ? `${Math.abs(daysUntil)}d overdue`
                    : daysUntil <= 5 ? `⏰ Due in ${daysUntil}d`
                    : `Due in ${daysUntil}d`
                    : null;
                  const urgentDue = daysUntil !== null && daysUntil <= 3;
                  return (
                    <div key={b.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[13px] font-semibold text-white truncate">{b.vendor}</span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] ${freqColor}`}>🔄 {freqLabel}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-[10px] text-neutral-400">{b.category}</span>
                          {dueStr && <span className={`text-[10px] font-mono-jet ${urgentDue ? 'text-orange-400 font-bold' : 'text-neutral-400'}`}>{dueStr}</span>}
                        </div>
                        {b.note && <p className="text-[10px] text-neutral-400 mt-0.5 italic">{b.note}</p>}
                      </div>
                      <div className="flex-shrink-0 flex items-center gap-2">
                        <span className="font-mono-jet text-[15px] font-bold text-orange-400">−${b.amount.toFixed(2)}</span>
                        <button onClick={() => { setEditingExpenseId(b.id); setExpenseForm({ name: b.vendor, type: b.type||"Other", category: b.category, description: b.note, amount: String(b.amount), date: b.date, frequency: b.frequency||"none", dueDate: b.dueDate||"", purpose: b.purpose ?? "business" }); setShowExpenseForm(true); setAddingCustomType(false); setAddingCustomCat(false); setAddingCustomVendor(false); }}
                          className="w-7 h-7 rounded-full bg-[#1e1e1e] border border-[#2a2a2a] text-neutral-400 text-[10px] flex items-center justify-center">✏️</button>
                        <button onClick={() => handleDeleteExpense(b.id)}
                          className="w-7 h-7 rounded-full bg-[#1e1e1e] border border-[#2a2a2a] text-[#f87171] text-[10px] flex items-center justify-center">✕</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* ── BUDGET OVERVIEW ── */}
      {(() => {
        // Monthly budget → prorated target per period
        // Week: monthly × 12 / 52  (annualise then divide by 52 weeks)
        // Day:  monthly × 12 / 365 (annualise then divide by 365 days)
        const budgetFor = (cat: string, periodId: 'DAY'|'WEEK'|'MONTH'|'YEAR') => {
          const monthly = expBudgets[cat] || 0;
          if (!monthly) return 0;
          if (periodId === 'DAY')   return monthly * 12 / 365;
          if (periodId === 'WEEK')  return monthly * 12 / 52;
          if (periodId === 'YEAR')  return monthly * 12;
          return monthly; // MONTH
        };
        const periodMap: { id: 'DAY'|'WEEK'|'MONTH'|'YEAR'; label: string; short: string; data: typeof expSummary.day }[] = [
          { id: 'DAY',   label: 'Today',      short: 'Day',   data: expSummary.day   },
          { id: 'WEEK',  label: 'This Week',  short: 'Week',  data: expSummary.week  },
          { id: 'MONTH', label: 'This Month', short: 'Month', data: expSummary.month },
          { id: 'YEAR',  label: 'This Year',  short: 'Year',  data: expSummary.year  },
        ];
        const selected  = periodMap.find(p => p.id === expPeriod) ?? periodMap[2];
        const catData   = selected.data.byCategory;
        const tripToll  = selected.data.toll;
        // All expense categories (built-in + custom) that have spending or a budget set
        const allCats   = allExpenseCategories.filter(c => (catData[c] || 0) > 0 || expBudgets[c]);
        const hasBudget = allExpenseCategories.some(c => expBudgets[c]);
        return (
          <div className="bg-[#0d0d0d] border border-[#facc15]/20 rounded-2xl overflow-hidden">
            {/* Gold top accent */}
            <div className="h-[3px] bg-gradient-to-r from-[#facc15]/90 to-[#facc15]/10" />

            {/* Period cards row */}
            <div className="grid grid-cols-4 divide-x divide-[#1a1a1a] border-b border-[#1a1a1a]">
              {periodMap.map(p => {
                const isActive = expPeriod === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setExpPeriod(p.id)}
                    className="flex flex-col items-center py-3 px-1 transition-colors"
                    style={{ background: isActive ? "rgba(250,204,21,0.07)" : "transparent" }}
                  >
                    <span className={`text-[8px] font-bold uppercase tracking-widest mb-1 ${isActive ? 'text-[#facc15]' : 'text-neutral-500'}`}>{p.short}</span>
                    <span className={`font-mono-jet text-[13px] font-bold ${isActive ? 'text-[#ff6b6b]' : 'text-neutral-400'}`}>
                      −${(p.data.total + p.data.toll).toFixed(0)}
                    </span>
                    {isActive && <div className="w-5 h-[2px] rounded-full bg-[#facc15] mt-1.5" />}
                  </button>
                );
              })}
            </div>

            {/* Section header */}
            <div className="flex items-center justify-between px-4 pt-3 pb-2">
              <div>
                <p className="text-[10px] text-[#facc15] font-bold uppercase tracking-widest">📊 Budget Overview</p>
                <p className="text-[10px] text-neutral-400 mt-0.5 font-mono-jet">{selected.label} · −${(selected.data.total + tripToll).toFixed(2)}</p>
              </div>
              <button
                onClick={() => setShowBudgetEditor(s => !s)}
                className="h-7 px-3 rounded-full border text-[9px] font-bold tracking-wide transition-colors"
                style={{ background: showBudgetEditor ? "rgba(250,204,21,0.12)" : "rgba(30,30,30,0.8)", borderColor: showBudgetEditor ? "rgba(250,204,21,0.4)" : "#333", color: showBudgetEditor ? "#facc15" : "#888" }}
              >
                {showBudgetEditor ? "✕ Done" : "⚙ Set Budgets"}
              </button>
            </div>

            {/* Budget editor — collapsible */}
            {showBudgetEditor && (
              <div className="px-4 pb-3 border-b border-[#1a1a1a] space-y-2">
                <p className="text-[9px] text-neutral-500 mb-2">Set monthly budget targets per category. Leave blank = no limit.</p>
                {allExpenseCategories.map(cat => (
                  <div key={cat} className="flex items-center gap-3">
                    <span className="flex-1 text-[11px] text-neutral-300 truncate">{cat}</span>
                    <div className="relative w-[90px] flex-shrink-0">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 text-[11px]">$</span>
                      <input
                        inputMode="decimal"
                        value={expBudgets[cat] ? String(expBudgets[cat]) : ""}
                        placeholder="—"
                        onChange={e => {
                          const v = parseFloat(e.target.value);
                          setExpBudgets(prev => {
                            const next = { ...prev };
                            if (isNaN(v) || e.target.value === "") delete next[cat];
                            else next[cat] = v;
                            return next;
                          });
                        }}
                        className="w-full h-8 rounded-lg bg-black border border-[#2a2a2a] pl-5 pr-2 text-white text-[12px] font-mono-jet focus:outline-none focus:border-[#facc15]/40"
                      />
                    </div>
                    <span className="text-[9px] text-neutral-500 w-[22px] text-right">/mo</span>
                  </div>
                ))}
              </div>
            )}

            {/* Category breakdown */}
            <div className="px-4 pt-3 pb-4 space-y-3">
              {allCats.length === 0 && tripToll === 0 ? (
                <p className="text-[11px] text-neutral-500 text-center py-4">No expenses recorded for {selected.label.toLowerCase()}</p>
              ) : (
                <>
                  {allCats.map(cat => {
                    const spent       = catData[cat] || 0;
                    const periodBudget = budgetFor(cat, selected.id);
                    const pct          = periodBudget > 0 ? Math.min((spent / periodBudget) * 100, 100) : 0;
                    const over         = periodBudget > 0 && spent > periodBudget;
                    const barColor     = over ? "#f87171" : pct > 75 ? "#fb923c" : "#facc15";
                    return (
                      <div key={cat}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] text-neutral-300 truncate max-w-[55%]">{cat}</span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono-jet text-[12px] font-bold text-[#ff6b6b]">−${spent.toFixed(2)}</span>
                            {periodBudget > 0 && (
                              <span className={`text-[9px] font-mono-jet ${over ? 'text-[#f87171]' : 'text-neutral-500'}`}>
                                / ${periodBudget.toFixed(0)}
                              </span>
                            )}
                          </div>
                        </div>
                        {periodBudget > 0 && (
                          <div className="h-[4px] rounded-full bg-[#1e1e1e] overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: barColor }} />
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Trip-toll line — calendar-aligned, same period as expenses */}
                  {tripToll > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] text-neutral-300 flex items-center gap-1.5">
                          🚗 Tolls (from trips)
                          <span className="text-[8px] text-neutral-600 font-mono-jet">auto</span>
                        </span>
                        <span className="font-mono-jet text-[12px] font-bold text-[#ff6b6b]">−${tripToll.toFixed(2)}</span>
                      </div>
                      {(() => {
                        const tollPeriodBudget = budgetFor("Tolls & Parking", selected.id);
                        if (!tollPeriodBudget) return null;
                        const combined = (catData["Tolls & Parking"] || 0) + tripToll;
                        const ratio = combined / tollPeriodBudget; // unbounded — use for color
                        const barW  = Math.min(ratio * 100, 100);  // clamped — use for width
                        const barColor = ratio >= 1 ? "#f87171" : ratio >= 0.75 ? "#fb923c" : "#facc15";
                        return (
                          <div className="h-[4px] rounded-full bg-[#1e1e1e] overflow-hidden">
                            <div className="h-full rounded-full transition-all"
                              style={{ width: `${barW}%`, background: barColor }} />
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Grand total */}
                  <div className="pt-2 border-t border-[#1e1e1e] flex items-center justify-between">
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Total Spent</span>
                    <span className="font-mono-jet text-[14px] font-bold text-[#ff6b6b]">
                      −${(selected.data.total + tripToll).toFixed(2)}
                    </span>
                  </div>
                  {hasBudget && (() => {
                    // Total budget prorated to selected period
                    const totalBudget = allExpenseCategories.reduce((a, c) => a + budgetFor(c, selected.id), 0);
                    const totalSpent  = selected.data.total + tripToll;
                    const remBudget   = totalBudget - totalSpent;
                    return totalBudget > 0 ? (
                      <div className="flex items-center justify-between -mt-1">
                        <span className="text-[10px] text-neutral-500 uppercase tracking-wider">Remaining</span>
                        <span className={`font-mono-jet text-[13px] font-bold ${remBudget < 0 ? 'text-[#f87171]' : 'text-[#4ade80]'}`}>
                          {remBudget < 0 ? "−" : "+"}${Math.abs(remBudget).toFixed(2)}
                        </span>
                      </div>
                    ) : null;
                  })()}
                </>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── EXPENSE LOG ── */}
      {(() => {
        const filtered    = expPeriodFiltered; // log-only (one-time entries), pre-filtered by period
        const periodTotal = filtered.reduce((a,e)=>a+e.amount,0);
        const labels:{id:'DAY'|'WEEK'|'MONTH'|'YEAR'|'ALL',label:string}[] = [
          {id:'DAY',label:'Today'},{id:'WEEK',label:'Week'},{id:'MONTH',label:'Month'},{id:'YEAR',label:'Year'},{id:'ALL',label:'All'}
        ];
        return (
          <div>
            {/* Section label */}
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest">📅 Expense Log</p>
              <span className="text-[10px] text-neutral-400 font-mono-jet">one-time &amp; unexpected</span>
            </div>
            {/* Period selector */}
            <div className="flex gap-1.5 mb-3">
              {labels.map(l=>(
                <button key={l.id} onClick={()=>setExpPeriod(l.id)}
                  className={`flex-1 h-8 rounded-xl text-[10px] font-bold transition-colors ${expPeriod===l.id?'bg-[#facc15] text-black':'bg-[#1e1e1e] text-neutral-400 border border-[#262626]'}`}>
                  {l.label}
                </button>
              ))}
            </div>
            {/* Period summary */}
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-[10px] text-neutral-400 tracking-[0.18em] uppercase">{expPeriod==='ALL'?'All expenses':'Expenses this '+labels.find(l=>l.id===expPeriod)?.label.toLowerCase()}</span>
              <span className="font-mono-jet text-[14px] font-bold text-[#ff6b6b]">−${periodTotal.toFixed(2)}</span>
            </div>
            {/* Filtered list */}
            <div>
              <p className="text-[10px] tracking-[0.22em] text-neutral-400 font-semibold mb-2.5">EXPENSE LOG · {filtered.length} entries</p>
              {filtered.length === 0 ? (
                <div className="bg-[#141414] border border-[#2e2e2e] rounded-2xl p-10 text-center">
                  <p className="text-[32px] mb-2">🧾</p>
                  <p className="text-[14px] text-neutral-400">No expenses for this period</p>
                  <p className="text-[11px] text-neutral-400 mt-1">Change the filter or add an expense above</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {[...filtered].sort((a,b)=>b.date.localeCompare(a.date)).map(ex=>(
                    <div key={ex.id} className={`bg-[#141414] border rounded-xl p-3.5 transition-colors ${ex.verified?"border-[#4ade80]/30":"border-[#2e2e2e]"}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[13px] font-semibold text-white">{ex.vendor}</span>
                            {ex.verified && <span className="text-[9px] bg-[#4ade80]/10 text-[#4ade80] px-2 py-0.5 rounded-full border border-[#4ade80]/20 font-mono-jet">✓ VERIFIED</span>}
                            {ex.receiptDocId && (
                              <button
                                onClick={() => setViewingDoc({ id: ex.receiptDocId!, type: "receipt", fileDate: ex.date, category: ex.category, vendor: ex.vendor, amount: String(ex.amount), createdAt: ex.date, objectPath: "" })}
                                className="text-[9px] bg-[#f6dd8c]/10 text-[#f6dd8c] px-2 py-0.5 rounded-full border border-[#f6dd8c]/20 font-mono-jet hover:bg-[#f6dd8c]/20 transition-colors">
                                📎 RECEIPT
                              </button>
                            )}
                            <span className={`text-[9px] px-2 py-0.5 rounded-full border font-mono-jet ${
                              (ex.purpose || "business") === "personal"
                                ? "bg-[#818cf8]/10 text-[#818cf8] border-[#818cf8]/25"
                                : "bg-[#4ade80]/10 text-[#4ade80] border-[#4ade80]/25"
                            }`}>
                              {(ex.purpose || "business") === "personal" ? "👤 Personal" : "🏢 Business"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="font-mono-jet text-[10px] text-neutral-400">{ex.date}</span>
                            {ex.type&&<span className="text-[10px] text-neutral-400 bg-[#1e1e1e] px-2 py-0.5 rounded-full">{ex.type}</span>}
                          </div>
                          <span className="text-[10px] text-neutral-400 mt-0.5 block">{ex.category}</span>
                          {ex.note&&<p className="text-[11px] text-neutral-400 mt-1 italic">{ex.note}</p>}
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <p className="font-mono-jet text-[17px] font-bold text-[#ff6b6b]">−${ex.amount.toFixed(2)}</p>
                          <div className="flex items-center gap-1 mt-2 justify-end">
                            <button onClick={()=>handleToggleExpenseVerified(ex.id)}
                              className={`w-7 h-7 rounded-full border text-[11px] flex items-center justify-center transition-all ${ex.verified?"bg-[#4ade80]/20 border-[#4ade80]/40 text-[#4ade80]":"bg-[#1e1e1e] border-[#2a2a2a] text-neutral-400"}`}>✓</button>
                            <button onClick={()=>{setEditingExpenseId(ex.id);setExpenseForm({name:ex.vendor,type:ex.type||"Other",category:ex.category,description:ex.note,amount:String(ex.amount),date:ex.date,frequency:ex.frequency||"none",dueDate:ex.dueDate||"",purpose:ex.purpose||"business"});setShowExpenseForm(true);setAddingCustomType(false);setAddingCustomCat(false);}}
                              className="w-7 h-7 rounded-full bg-[#1e1e1e] border border-[#2a2a2a] text-neutral-400 text-[10px] flex items-center justify-center">✏️</button>
                            <button onClick={()=>handleDeleteExpense(ex.id)}
                              className="w-7 h-7 rounded-full bg-[#1e1e1e] border border-[#2a2a2a] text-[#f87171] text-[10px] flex items-center justify-center">✕</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── 📁 Documents Archive ── */}
      <div className="mt-4">
        <button
          onClick={() => { setShowDocuments(s => { if (!s) loadDocuments(); return !s; }); }}
          className="w-full flex items-center justify-between px-4 py-3 bg-[#0a0a1a] border border-[#4b4b8b]/40 rounded-2xl mb-3 transition-colors hover:border-[#818cf8]/40"
        >
          <div className="flex items-center gap-2">
            <span className="text-[15px]">📁</span>
            <span className="text-[10px] tracking-[0.18em] text-[#818cf8] font-bold uppercase">Saved Documents</span>
            {documents.length > 0 && (
              <span className="text-[9px] bg-[#818cf8]/10 text-[#818cf8] px-2 py-0.5 rounded-full border border-[#818cf8]/20 font-mono-jet">{documents.length}</span>
            )}
          </div>
          <span className="text-[#818cf8] text-[11px] font-mono-jet">{showDocuments ? "▲ hide" : "▼ show"}</span>
        </button>

        {showDocuments && (
          <div className="space-y-2">
            {docsLoading ? (
              <div className="text-center py-10 text-neutral-400 text-[13px]">Loading…</div>
            ) : documents.length === 0 ? (
              <div className="bg-[#0a0a1a] border border-[#4b4b8b]/30 rounded-2xl p-10 text-center">
                <p className="text-[32px] mb-2">📁</p>
                <p className="text-[14px] text-neutral-400">No saved documents yet</p>
                <p className="text-[11px] text-neutral-400 mt-1">Receipts scanned with the 📷 button are archived here automatically</p>
              </div>
            ) : (
              <div className="space-y-2">
                {documents.map(doc => (
                  <div key={doc.id} className="bg-[#0a0a1a] border border-[#4b4b8b]/30 rounded-xl overflow-hidden">
                    <div className="flex gap-3 p-3">
                      {/* Thumbnail */}
                      <button onClick={() => setViewingDoc(doc)} className="flex-shrink-0">
                        {doc.type === "receipt" ? (
                          <img src={"/api/documents/" + doc.id + "/file"} alt="receipt"
                            className="w-16 h-16 object-cover rounded-lg border border-[#4b4b8b]/40"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                        ) : (
                          <div className="w-16 h-16 rounded-lg border border-[#4b4b8b]/40 bg-[#1a1a2e] flex items-center justify-center text-[28px]">🏦</div>
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[13px] font-semibold text-white truncate">{doc.vendor || "—"}</span>
                          {doc.category && <span className="text-[9px] text-[#818cf8] bg-[#818cf8]/10 px-2 py-0.5 rounded-full border border-[#818cf8]/20">{doc.category}</span>}
                        </div>
                        <p className="text-[10px] text-neutral-400 font-mono-jet mt-0.5">
                          {doc.fileDate || new Date(doc.createdAt).toLocaleDateString([], { month:"short", day:"numeric", year:"numeric" })}
                          {doc.amount ? " · $" + parseFloat(doc.amount).toFixed(2) : ""}
                        </p>
                        <p className="text-[9px] text-neutral-500 mt-0.5 capitalize">{doc.type}</p>
                      </div>
                      <div className="flex-shrink-0 flex flex-col gap-1.5 items-end">
                        <button onClick={() => setViewingDoc(doc)}
                          className="w-8 h-8 rounded-full bg-[#1a1a2e] border border-[#4b4b8b]/40 text-[#818cf8] text-[12px] flex items-center justify-center">👁</button>
                        <button onClick={async () => {
                          if (!window.confirm("Delete this document? Cannot be undone.")) return;
                          await fetch("/api/documents/" + doc.id, { method: "DELETE" });
                          setDocuments(d => d.filter(x => x.id !== doc.id));
                          showToast("Document deleted");
                        }} className="w-8 h-8 rounded-full bg-[#1a1a2e] border border-[#4b4b8b]/40 text-[#f87171] text-[11px] flex items-center justify-center">✕</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  // ─── Reports ──────────────────────────────────────────────────
  // Only posted (Ledger) trips count toward the financial statement
  const grossAll    = postedTrips.reduce((a, b) => a + b.grandTotal, 0);

  // Financial Statement uses BUSINESS expenses only (personal are excluded from IRS deductions)
  const bizExpenses = expenses.filter(e => !e.purpose || e.purpose === "business");
  const expensesAll = bizExpenses.reduce((a, b) => a + b.amount, 0);
  const netAll      = grossAll - expensesAll;

  // ── IRS-ready Financial Statement — fixed: year filter, deduction exclusivity, HTML escaping
  const handlePrintIRSStatement = () => {
    // ── 0. HTML-escape helper (prevents XSS from user-entered data) ──────────
    const esc = (v: unknown): string =>
      String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]!));

    // ── 1. Date-range: only the selected tax year ────────────────────────────
    const yrStr = String(stmtYear);
    const yearStart = yrStr + "-01-01";
    const yearEnd   = yrStr + "-12-31";
    const inYear = (date: string) => date >= yearStart && date <= yearEnd;

    const yrTrips    = postedTrips.filter(t => inYear(t.date));
    const yrBizExp   = expenses.filter(e => inYear(e.date) && (!e.purpose || e.purpose === "business"));
    const yrHours    = hoursLog.filter(h => (h.date || "").startsWith(yrStr));

    // ── 2. Year-keyed mileage rate ───────────────────────────────────────────
    const yrRate    = IRS_MILEAGE_RATES[stmtYear];   // undefined if year not in map
    const rateKnown = yrRate !== undefined;

    // ── 3. Deduction method exclusivity ─────────────────────────────────────
    // Standard mileage: exclude actual vehicle-operating expense categories
    // (fuel, maintenance, insurance) — tolls/parking remain deductible either way.
    // Actual expenses: include all categories, no mileage deduction.
    const VEHICLE_ONLY_CATS = new Set(["Vehicle & Fuel", "Maintenance & Repairs", "Insurance"]);
    const usingMileage = stmtMethod === "mileage" && rateKnown;

    const deductibleExp    = usingMileage
      ? yrBizExp.filter(e => !VEHICLE_ONLY_CATS.has(e.category))
      : yrBizExp;
    const vehicleOnlyExp   = usingMileage
      ? yrBizExp.filter(e => VEHICLE_ONLY_CATS.has(e.category))
      : [];

    // ── 4. Platform fees — deductible as commissions (Schedule C Line 10) ───
    const gFees      = yrTrips.reduce((a, t) => a + (t.fee || 0), 0);

    const expTotal   = deductibleExp.reduce((a, e) => a + e.amount, 0) + gFees;
    const vehicleTotal = vehicleOnlyExp.reduce((a, e) => a + e.amount, 0);
    const milesTotal = usingMileage ? yrHours.reduce((a, h) => a + (h.miles || 0), 0) : 0;
    const mileageDed = rateKnown ? +(milesTotal * yrRate).toFixed(2) : 0;

    // ── 5. Income components (gross, before platform fee deduction) ────────────
    const gEarn  = yrTrips.reduce((a, t) => a + (t.earnings || 0), 0);
    const gTips  = yrTrips.reduce((a, t) => a + (t.tips || 0), 0);
    const gExt   = yrTrips.reduce((a, t) => a + (t.extra || 0), 0);
    const gOther = yrTrips.reduce((a, t) => a + (t.otherCash || 0), 0);
    const gToll  = yrTrips.reduce((a, t) => a + (t.toll || 0), 0);
    const gTotal = gEarn + gTips + gExt + gOther + gToll;

    const hrsTotal = yrHours.reduce((a, h) => a + h.hours, 0);

    const netAfterExp     = gTotal - expTotal;
    const netAfterMileage = usingMileage ? +(netAfterExp - mileageDed).toFixed(2) : +netAfterExp.toFixed(2);
    const netCls          = netAfterMileage >= 0 ? "net-pos" : "net-neg";

    // ── 6. Build HTML rows (all user values HTML-escaped) ───────────────────
    const byCat: Record<string, number> = {};
    deductibleExp.forEach(e => { byCat[esc(e.category)] = (byCat[esc(e.category)] || 0) + e.amount; });
    const catRows = [
      // Platform fees always shown first (Schedule C Line 10 — commissions)
      ...(gFees > 0
        ? ['<tr><td style="padding:6px 12px;border-bottom:1px solid #eee">Platform Commissions &amp; Fees (Schedule C Line 10)</td>'
          + '<td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right;font-family:monospace">$' + gFees.toFixed(2) + '</td></tr>']
        : []),
      ...Object.entries(byCat).sort((a, b) => b[1] - a[1])
        .map(([c, a]) => '<tr><td style="padding:6px 12px;border-bottom:1px solid #eee">' + c + '</td>'
          + '<td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right;font-family:monospace">$' + a.toFixed(2) + '</td></tr>'),
    ].join('');

    const tripRows = [...yrTrips].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 50)
      .map(t => '<tr>'
        + '<td style="padding:4px 8px;border-bottom:1px solid #f0f0f0;font-size:11px">' + esc(t.date) + '</td>'
        + '<td style="padding:4px 8px;font-size:11px">' + esc(t.platform) + '</td>'
        + '<td style="padding:4px 8px;font-size:11px">' + esc(t.pickup) + ' → ' + esc(t.dropoff) + '</td>'
        + '<td style="padding:4px 8px;text-align:right;font-family:monospace;font-size:11px">$' + t.grandTotal.toFixed(2) + '</td>'
        + '</tr>').join('');

    const otherCashRow = gOther > 0
      ? '<tr><td style="padding:6px 12px;border-bottom:1px solid #eee">Other Cash Income</td>'
        + '<td style="padding:6px 12px;text-align:right;font-family:monospace">$' + gOther.toFixed(2) + '</td></tr>'
      : '';

    const tripSection = yrTrips.length > 0
      ? '<h2>Trip Detail — ' + yrStr + ' (Most Recent 50 of ' + yrTrips.length + ')</h2>'
        + '<table><tr><th>Date</th><th>Platform</th><th>Route</th><th style="text-align:right">Total</th></tr>'
        + tripRows + '</table>'
      : '';

    // Vehicle-expense exclusion notice (standard mileage method only)
    const vehicleExclusionSection = (usingMileage && vehicleTotal > 0)
      ? '<h2>Vehicle Operating Expenses — Excluded (Standard Mileage Method)</h2>'
        + '<p style="font-size:11px;color:#555;margin:0 0 8px">Because you are using the Standard Mileage Rate, actual vehicle operating expenses (fuel, maintenance, insurance) cannot also be deducted. They are listed here for reference only and are <strong>not</strong> included in the expense total above.</p>'
        + '<table><tr><th>Category</th><th style="text-align:right">Amount</th></tr>'
        + (() => {
            const vByCat: Record<string, number> = {};
            vehicleOnlyExp.forEach(e => { vByCat[esc(e.category)] = (vByCat[esc(e.category)] || 0) + e.amount; });
            return Object.entries(vByCat).sort((a, b) => b[1] - a[1])
              .map(([c, a]) => '<tr><td style="padding:4px 12px;border-bottom:1px solid #eee;font-size:11px">' + c + '</td>'
                + '<td style="padding:4px 12px;text-align:right;font-family:monospace;font-size:11px">$' + a.toFixed(2) + '</td></tr>').join('');
          })()
        + '<tr style="background:#fff8e7"><td style="padding:6px 12px;font-size:11px;color:#a07000">EXCLUDED TOTAL</td>'
        + '<td style="padding:6px 12px;text-align:right;font-family:monospace;font-size:11px;color:#a07000">$' + vehicleTotal.toFixed(2) + ' (not deducted)</td></tr></table>'
      : '';

    const mileageSection = !rateKnown
      ? '<p style="font-size:11px;color:#c0392b;background:#fff8f8;border:1px solid #f5c6c6;border-radius:4px;padding:8px 12px;margin:4px 0">⚠ The IRS standard mileage rate for ' + yrStr + ' is not yet confirmed in this app. Switch to Actual Expenses method, or verify the ' + yrStr + ' rate at <strong>irs.gov</strong> and consult your tax professional before claiming a mileage deduction.</p>'
      : (usingMileage && milesTotal > 0)
        ? '<h2>IRS Standard Mileage Deduction (Schedule C, Part II Line 9)</h2>'
          + '<table><tr><th>Description</th><th style="text-align:right">Amount</th></tr>'
          + '<tr><td style="padding:6px 12px;border-bottom:1px solid #eee">GPS Miles Tracked (' + yrStr + ')</td>'
          + '<td style="padding:6px 12px;text-align:right;font-family:monospace">' + milesTotal.toFixed(1) + ' mi</td></tr>'
          + '<tr><td style="padding:6px 12px;border-bottom:1px solid #eee">IRS Standard Rate — ' + yrStr + ' (source: irs.gov)</td>'
          + '<td style="padding:6px 12px;text-align:right;font-family:monospace">$' + yrRate.toFixed(2) + '/mi</td></tr>'
          + '<tr style="background:#f9f9f9"><td style="padding:8px 12px;font-weight:bold">MILEAGE DEDUCTION</td>'
          + '<td style="padding:8px 12px;text-align:right;font-family:monospace;font-weight:bold;color:#c0392b">−$' + mileageDed.toFixed(2) + '</td></tr></table>'
          + '<p style="font-size:11px;color:#777;margin:6px 0 0">⚠ Standard mileage rate is used. Vehicle operating expenses (fuel, maintenance, insurance) are listed separately above and have been excluded from the deductible total.</p>'
        : (usingMileage
            ? '<p style="font-size:11px;color:#aaa;margin:4px 0">No GPS miles recorded in ' + yrStr + '. Miles are tracked when a shift is clocked out.</p>'
            : '<p style="font-size:11px;color:#555;margin:4px 0">Using Actual Expenses method — standard mileage deduction not applied. All vehicle operating expenses are included in Business Expenses above.</p>');

    const bankVerifiedSection = (() => {
      const stmtExps = deductibleExp.filter(e => e.type === "Statement Import");
      if (stmtExps.length === 0) return '<p style="font-size:11px;color:#aaa;margin:4px 0">No bank statement imported for ' + yrStr + '.</p>';
      const stmtTotal = stmtExps.reduce((a, e) => a + e.amount, 0);
      const stmtByCat: Record<string, number> = {};
      stmtExps.forEach(e => { stmtByCat[esc(e.category)] = (stmtByCat[esc(e.category)] || 0) + e.amount; });
      const stmtRows = Object.entries(stmtByCat).sort((a, b) => b[1] - a[1])
        .map(([c, a]) => '<tr><td style="padding:4px 12px;border-bottom:1px solid #eee;font-size:11px">' + c + '</td>'
          + '<td style="padding:4px 12px;text-align:right;font-family:monospace;font-size:11px">$' + a.toFixed(2) + '</td></tr>').join('');
      const coveragePct = expTotal > 0 ? Math.min((stmtTotal / expTotal) * 100, 100).toFixed(0) : "0";
      return '<h2>Bank Statement Verified Expenses</h2>'
        + '<p style="font-size:11px;color:#555;margin:0 0 8px">Expenses imported from your bank statement and confirmed against records. Included in Business Expenses total above.</p>'
        + '<table><tr><th>Category</th><th style="text-align:right">Bank Verified</th></tr>'
        + stmtRows
        + '<tr style="background:#f0fff4"><td style="padding:6px 12px;font-weight:bold;color:#1a7a4a">VERIFIED TOTAL</td>'
        + '<td style="padding:6px 12px;text-align:right;font-family:monospace;font-weight:bold;color:#1a7a4a">$' + stmtTotal.toFixed(2) + ' (' + coveragePct + '% of deductible expenses)</td></tr></table>';
    })();

    const methodLabel = usingMileage ? "Standard Mileage Method (§ 1.274-5)" : "Actual Expenses Method";

    const html = [
      '<!DOCTYPE html><html><head><meta charset="utf-8">',
      '<title>IslandCity · IRS Schedule C Statement · ' + yrStr + '</title>',
      '<style>',
      'body{font-family:Georgia,serif;max-width:720px;margin:40px auto;color:#111;font-size:13px;line-height:1.6}',
      'h1{font-size:22px;margin:0 0 4px}',
      'h2{font-size:13px;font-weight:bold;text-transform:uppercase;letter-spacing:.08em;margin:28px 0 8px;border-bottom:2px solid #111;padding-bottom:4px}',
      'table{width:100%;border-collapse:collapse}',
      'th{text-align:left;padding:6px 12px;background:#f5f5f5;font-size:11px;text-transform:uppercase;letter-spacing:.06em}',
      '.total{font-weight:bold;font-size:16px}.net-pos{color:#1a7a4a}.net-neg{color:#c0392b}',
      '.footer{margin-top:40px;font-size:10px;color:#777;border-top:1px solid #ddd;padding-top:12px}',
      '.method-badge{display:inline-block;padding:3px 8px;border-radius:4px;background:#f0f8ff;border:1px solid #b8d4ee;font-size:11px;color:#1a4a7a;margin:4px 0 16px}',
      '@media print{body{margin:20px}}',
      '</style></head><body>',
      '<h1>IslandCity Driver Accounting</h1>',
      '<p style="color:#555;margin:0 4px 2px 0"><strong>Schedule C Financial Statement · Tax Year ' + yrStr + '</strong></p>',
      '<p class="method-badge">Deduction method: ' + methodLabel + '</p>',
      '<p style="color:#777;font-size:11px;margin:0 0 20px">Printed ' + new Date().toLocaleDateString() + ' · ' + yrTrips.length + ' posted trips in ' + yrStr + ' · pending trips excluded</p>',

      '<h2>Gross Income — ' + yrStr + ' (Posted Trips Only)</h2>',
      '<table><tr><th>Description</th><th style="text-align:right">Amount</th></tr>',
      '<tr><td style="padding:6px 12px;border-bottom:1px solid #eee">Rideshare Fare Earnings</td><td style="padding:6px 12px;text-align:right;font-family:monospace">$' + gEarn.toFixed(2) + '</td></tr>',
      '<tr><td style="padding:6px 12px;border-bottom:1px solid #eee">Tips / Gratuity</td><td style="padding:6px 12px;text-align:right;font-family:monospace">$' + gTips.toFixed(2) + '</td></tr>',
      '<tr><td style="padding:6px 12px;border-bottom:1px solid #eee">Extras / Bonuses</td><td style="padding:6px 12px;text-align:right;font-family:monospace">$' + gExt.toFixed(2) + '</td></tr>',
      otherCashRow,
      '<tr><td style="padding:6px 12px;border-bottom:1px solid #eee">Toll Reimbursements</td><td style="padding:6px 12px;text-align:right;font-family:monospace">$' + gToll.toFixed(2) + '</td></tr>',
      '<tr style="background:#f9f9f9"><td style="padding:8px 12px;font-weight:bold">TOTAL GROSS INCOME</td>',
      '<td style="padding:8px 12px;text-align:right;font-family:monospace;font-weight:bold" class="total">$' + gTotal.toFixed(2) + '</td></tr></table>',

      '<h2>Business Expenses — ' + yrStr + ' (Schedule C, Part II)</h2>',
      '<table><tr><th>Category</th><th style="text-align:right">Total</th></tr>',
      catRows || '<tr><td style="padding:6px 12px;color:#999" colspan="2">No deductible expenses recorded for ' + yrStr + '</td></tr>',
      '<tr style="background:#f9f9f9"><td style="padding:8px 12px;font-weight:bold">TOTAL DEDUCTIBLE EXPENSES</td>',
      '<td style="padding:8px 12px;text-align:right;font-family:monospace;font-weight:bold">$' + expTotal.toFixed(2) + '</td></tr></table>',

      vehicleExclusionSection,
      bankVerifiedSection,
      mileageSection,

      '<h2>Net Taxable Income — ' + yrStr + ' (Schedule C)</h2>',
      '<table><tr><th>Description</th><th style="text-align:right">Amount</th></tr>',
      '<tr><td style="padding:6px 12px;border-bottom:1px solid #eee">Gross Income</td>',
      '<td style="padding:6px 12px;text-align:right;font-family:monospace">$' + gTotal.toFixed(2) + '</td></tr>',
      '<tr><td style="padding:6px 12px;border-bottom:1px solid #eee">Deductible Business Expenses</td>',
      '<td style="padding:6px 12px;text-align:right;font-family:monospace">−$' + expTotal.toFixed(2) + '</td></tr>',
      (usingMileage && milesTotal > 0 && rateKnown
        ? '<tr><td style="padding:6px 12px;border-bottom:1px solid #eee">IRS Standard Mileage Deduction (' + milesTotal.toFixed(1) + ' mi × $' + yrRate.toFixed(2) + ')</td>'
          + '<td style="padding:6px 12px;text-align:right;font-family:monospace">−$' + mileageDed.toFixed(2) + '</td></tr>'
        : ''),
      '<tr style="background:#f0f0f0"><td style="padding:10px 12px;font-weight:bold;font-size:15px">NET PROFIT / LOSS</td>',
      '<td style="padding:10px 12px;text-align:right;font-family:monospace;font-size:18px;font-weight:bold" class="' + netCls + '">',
      (netAfterMileage >= 0 ? '$' + netAfterMileage.toFixed(2) : '−$' + Math.abs(netAfterMileage).toFixed(2)),
      '</td></tr></table>',

      '<h2>Hours &amp; Activity — ' + yrStr + '</h2>',
      '<table><tr><th>Metric</th><th style="text-align:right">Value</th></tr>',
      '<tr><td style="padding:6px 12px;border-bottom:1px solid #eee">Total Driving Hours</td>',
      '<td style="padding:6px 12px;text-align:right;font-family:monospace">' + hrsTotal.toFixed(1) + ' hrs</td></tr>',
      '<tr><td style="padding:6px 12px;border-bottom:1px solid #eee">Total Miles Tracked (GPS)</td>',
      '<td style="padding:6px 12px;text-align:right;font-family:monospace">' + yrHours.reduce((a, h) => a + (h.miles || 0), 0).toFixed(1) + ' mi</td></tr>',
      '<tr><td style="padding:6px 12px;border-bottom:1px solid #eee">Total Shifts Logged</td>',
      '<td style="padding:6px 12px;text-align:right;font-family:monospace">' + yrHours.length + '</td></tr>',
      '<tr><td style="padding:6px 12px;border-bottom:1px solid #eee">Total Trips Posted</td>',
      '<td style="padding:6px 12px;text-align:right;font-family:monospace">' + yrTrips.length + '</td></tr>',
      '<tr><td style="padding:6px 12px">Average Earnings / Hour</td>',
      '<td style="padding:6px 12px;text-align:right;font-family:monospace">' + (hrsTotal > 0 ? '$' + (gTotal / hrsTotal).toFixed(2) : '—') + '/hr</td></tr></table>',

      tripSection,

      '<div class="footer">',
      '<p><strong>IslandCity Driver Accounting</strong> · Generated ' + new Date().toLocaleString() + '</p>',
      '<p>Tax year: <strong>' + yrStr + '</strong> · Deduction method: <strong>' + methodLabel + '</strong>' + (rateKnown ? ' · IRS mileage rate: $' + yrRate.toFixed(2) + '/mi (' + yrStr + ')' : ' · ' + yrStr + ' mileage rate: verify at irs.gov') + ' — always confirm at <strong>irs.gov</strong> before filing.</p>',
      '<p>Based on trips posted to the Ledger. Pending Register trips are excluded. Consult a licensed tax professional before filing. This document does not constitute tax advice.</p>',
      '</div></body></html>',
    ].join('\n');
    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); setTimeout(() => win.print(), 400); }
  };

  const ReportsContent = (
    <div className="space-y-4">
      <h2 className="text-[22px] font-bold text-white">Reports</h2>

      <div className="bg-[#141414] border border-[#2e2e2e] rounded-[20px] p-5 space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-[11px] tracking-[0.18em] text-neutral-400 font-semibold">FINANCIAL SUMMARY</p>
          <span className="text-[10px] font-mono-jet px-2 py-1 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] text-neutral-400">
            {currentTime.toLocaleDateString()} · {hoursLog.length} shifts
          </span>
        </div>
        {/* Source note */}
        <div className="flex items-center gap-2 -mt-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80]" />
          <p className="text-[10px] text-[#4ade80]/90 font-mono-jet">
            {postedTrips.length} posted (Ledger) · {pendingTrips.length} pending (Register, excluded)
          </p>
        </div>
        <div className="space-y-3">
          {([["Gross Earnings (Ledger)", `$${grossAll.toFixed(2)}`, "text-white"], ["Operating Expenses", `−$${expensesAll.toFixed(2)}`, "text-[#ff6b6b]"], ["Hours Today / Week", `${cumulative.hoy.toFixed(1)}h / ${cumulative.semana.toFixed(1)}h`, "text-white"]] as [string,string,string][]).map(([label, val, cls]) => (
            <div key={String(label)} className="flex justify-between">
              <span className="text-[13px] text-neutral-400">{label}</span>
              <span className={`font-mono-jet text-[13px] font-semibold ${cls}`}>{val}</span>
            </div>
          ))}
          <div className="h-px bg-[#222]" />
          <div className="flex justify-between">
            <span className="text-[13px] font-bold text-white">Net Earnings</span>
            <span className={`font-mono-jet text-[18px] font-bold ${netAll >= 0 ? "text-[#f5c518]" : "text-[#ff6b6b]"}`}>${netAll.toFixed(2)}</span>
          </div>
        </div>

        {/* Hours breakdown */}
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-3.5">
          <p className="text-[10px] tracking-[0.18em] text-neutral-400 font-semibold mb-2">HOURS LOG</p>
          <div className="grid grid-cols-4 gap-2">
            {[["Today", cumulative.hoy], ["Week", cumulative.semana], ["Month", cumulative.mes], ["Year", cumulative.año]].map(([label, val]) => (
              <div key={String(label)} className="text-center">
                <p className="text-[9px] text-neutral-400 tracking-widest">{label}</p>
                <p className="font-mono-jet text-[13px] font-semibold text-white mt-1">{Number(val).toFixed(1)}h</p>
              </div>
            ))}
          </div>
        </div>

        {/* Shift history */}
        {hoursLog.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] tracking-[0.18em] text-neutral-400 font-semibold">RECENT SHIFTS</p>
            {hoursLog.slice(0, 5).map((h, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-b border-[#1a1a1a] last:border-0">
                <div>
                  <p className="text-[12px] font-semibold text-white">{h.date}</p>
                  {h.clockIn && h.clockOut && (
                    <p className="font-mono-jet text-[10px] text-neutral-400">
                      {new Date(h.clockIn).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} – {new Date(h.clockOut).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                      {h.breakMs > 0 ? ` · ${(h.breakMs / 3600000).toFixed(1)}h break` : ""}
                    </p>
                  )}
                </div>
                <span className="font-mono-jet text-[14px] font-bold text-[#f6dd8c]">{h.hours.toFixed(2)}h</span>
              </div>
            ))}
          </div>
        )}

        {/* ── Bank Statement Reconciliation Status ── */}
        {(() => {
          const monthStr = toYYYYMMDD(currentTime).slice(0, 7);
          const stmtThisMonth = expenses.filter(e => e.type === "Statement Import" && e.date.startsWith(monthStr));
          const stmtTotal = stmtThisMonth.reduce((s, e) => s + e.amount, 0);
          const stmtBiz = stmtThisMonth.filter(e => !e.purpose || e.purpose === "business").reduce((s, e) => s + e.amount, 0);
          const stmtPer = stmtThisMonth.filter(e => e.purpose === "personal").reduce((s, e) => s + e.amount, 0);
          const totalExpThisMonth = expenses.filter(e => e.date.startsWith(monthStr) && (!e.frequency || e.frequency === "none")).reduce((s, e) => s + e.amount, 0);
          const coveragePct = totalExpThisMonth > 0 ? Math.min((stmtTotal / totalExpThisMonth) * 100, 100) : 0;
          const isReconciled = stmtThisMonth.length > 0;
          return (
            <div className={`rounded-xl border p-3.5 space-y-2.5 ${isReconciled ? "bg-[#081408] border-[#4ade80]/20" : "bg-[#111] border-[#2a2a2a]"}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-black tracking-[0.14em] ${isReconciled ? "text-[#4ade80]" : "text-neutral-500"}`}>
                    {isReconciled ? "✓ RECONCILED" : "○ NOT RECONCILED"}
                  </span>
                </div>
                <span className="text-[9px] text-neutral-600 font-mono-jet">{monthStr}</span>
              </div>
              {isReconciled ? (
                <>
                  <div className="flex gap-3 flex-wrap">
                    <div><p className="text-[13px] font-bold text-white">{stmtThisMonth.length}</p><p className="text-[9px] text-neutral-500">verified tx</p></div>
                    <div><p className="text-[13px] font-bold text-[#4ade80]">−${stmtBiz.toFixed(2)}</p><p className="text-[9px] text-neutral-500">🏢 deductible</p></div>
                    {stmtPer > 0 && <div><p className="text-[13px] font-bold text-[#818cf8]">−${stmtPer.toFixed(2)}</p><p className="text-[9px] text-neutral-500">👤 personal</p></div>}
                    <div><p className="text-[13px] font-bold text-neutral-300">{coveragePct.toFixed(0)}%</p><p className="text-[9px] text-neutral-500">of month exp</p></div>
                  </div>
                  {/* Coverage bar */}
                  <div className="h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
                    <div className="h-full bg-[#4ade80] rounded-full transition-all" style={{ width: coveragePct + "%" }} />
                  </div>
                </>
              ) : (
                <p className="text-[11px] text-neutral-500 leading-relaxed">
                  Import a bank statement to verify and reconcile this month's expenses.
                </p>
              )}
            </div>
          );
        })()}

        {/* IRS Statement Controls — year + method + print */}
        <div className="space-y-3 bg-[#0d0d0d] border border-[#2a2a2a] rounded-2xl p-4">
          <p className="text-[10px] tracking-[0.16em] text-neutral-500 font-semibold uppercase">IRS Financial Statement</p>

          {/* Tax year selector — only years with confirmed IRS rates */}
          <div className="flex items-center justify-between gap-3">
            <span className="text-[12px] text-neutral-400">Tax Year</span>
            <div className="flex gap-1.5 flex-wrap justify-end">
              {IRS_CONFIRMED_YEARS.map(yr => (
                <button key={yr} onClick={() => setStmtYear(yr)}
                  className={`h-7 px-3 rounded-full text-[10px] font-bold border transition-colors ${stmtYear === yr ? "bg-[#facc15] text-black border-[#facc15]" : "bg-transparent text-neutral-400 border-[#333] hover:border-[#facc15]/40"}`}>
                  {yr}
                </button>
              ))}
            </div>
          </div>

          {/* Deduction method selector */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-[12px] text-neutral-400">Deduction Method</span>
              <p className="text-[9px] text-neutral-600 mt-0.5">Choose one — IRS does not allow both</p>
            </div>
            <div className="flex gap-1.5 shrink-0">
              <button onClick={() => setStmtMethod("mileage")}
                className={`h-7 px-2.5 rounded-full text-[10px] font-bold border transition-colors ${stmtMethod === "mileage" ? "bg-[#facc15] text-black border-[#facc15]" : "bg-transparent text-neutral-400 border-[#333] hover:border-[#facc15]/40"}`}>
                Mileage
              </button>
              <button onClick={() => setStmtMethod("actual")}
                className={`h-7 px-2.5 rounded-full text-[10px] font-bold border transition-colors ${stmtMethod === "actual" ? "bg-[#facc15] text-black border-[#facc15]" : "bg-transparent text-neutral-400 border-[#333] hover:border-[#facc15]/40"}`}>
                Actual Exp.
              </button>
            </div>
          </div>

          {/* Method note */}
          <p className="text-[10px] text-neutral-600 leading-relaxed">
            {stmtMethod === "mileage"
              ? (IRS_MILEAGE_RATES[stmtYear]
                  ? "Standard mileage ($" + IRS_MILEAGE_RATES[stmtYear].toFixed(2) + "/mi for " + stmtYear + "): vehicle fuel, maintenance & insurance are excluded and shown separately."
                  : "Standard mileage: " + stmtYear + " rate not yet confirmed — verify at irs.gov before selecting this method.")
              : "Actual expenses: all operating costs included; no mileage deduction applied."}
          </p>

          <button onClick={handlePrintIRSStatement}
            className="w-full h-11 rounded-full bg-[#1e1e1e] border border-[#facc15]/30 text-[#facc15] text-[12px] font-bold tracking-[0.1em] hover:bg-[#facc15]/10 transition-colors flex items-center justify-center gap-2">
            🖨 Print {stmtYear} IRS Statement
          </button>
        </div>

        {/* Toll deduction note */}
        <div className="rounded-xl bg-[#1a1625] border-l-[3px] border-l-[#8b5cf6] border border-[#2a2340] p-3.5">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6]" />
            <p className="text-[10px] tracking-[0.18em] font-bold text-[#a78bfa]">IRS DEDUCTIONS · TOLLS {TOLL_YEAR}</p>
          </div>
          <p className="text-[12px] text-[#c4b5fd]/90 mt-1.5 leading-[1.5]">
            E-ZPass tolls are 100% deductible as a business expense (Schedule C, Line 9).
            Keep your monthly E-ZPass statements as backup documentation for your tax filing.
          </p>
        </div>
      </div>
    </div>
  );

  // ─── FINANCES computed ────────────────────────────────────────
  const _finToday   = toYYYYMMDD(currentTime);
  const _finWd      = currentTime.getDay(); // JS: 0=Sun
  const _finMon     = new Date(currentTime);
  _finMon.setDate(currentTime.getDate() + (_finWd === 0 ? -6 : 1 - _finWd));
  const _finWeekStart  = toYYYYMMDD(_finMon);
  const _finMonthStart = `${currentTime.getFullYear()}-${String(currentTime.getMonth()+1).padStart(2,'0')}-01`;
  const _finYearStart  = `${currentTime.getFullYear()}-01-01`;
  // _tripNet: gross income per trip — must match grandTotal logic (includes otherCash)
  const _tripNet = (t: Trip) => (t.earnings||0)+(t.tips||0)+(t.extra||0)+(t.otherCash||0)+(t.toll||0);

  const _earnToday = trips.filter(t=>t.date===_finToday).reduce((a,t)=>a+_tripNet(t),0);
  const _earnWeek  = trips.filter(t=>t.date>=_finWeekStart).reduce((a,t)=>a+_tripNet(t),0);
  const _earnMonth = trips.filter(t=>t.date>=_finMonthStart).reduce((a,t)=>a+_tripNet(t),0);
  const _earnYear  = trips.filter(t=>t.date>=_finYearStart).reduce((a,t)=>a+_tripNet(t),0);

  // Weekly bar chart (Mon i=0 … Sun i=6)
  const _DAY = ['M','Tu','W','Th','F','Sa','Su'] as const;
  const _DAY_FULL = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'] as const;
  const _weekChart = Array.from({length:7},(_,i)=>{
    const d=new Date(_finMon); d.setDate(_finMon.getDate()+i);
    const ds=toYYYYMMDD(d);
    const actual=trips.filter(t=>t.date===ds).reduce((a,t)=>a+_tripNet(t),0);
    const isoDay=i===6?7:i+1;
    const dayPlan=workDays.includes(isoDay)?(dayTargets[isoDay]??dailyGoal):0;
    return {day:_DAY[i],actual,projected:dayPlan,ds};
  });

  // Projections — use per-day targets
  const _todayISO      = _finWd===0?7:_finWd;
  const _weekPlanTotal = workDays.reduce((s,iso)=>s+(dayTargets[iso]??dailyGoal),0);
  const _avgDayTarget  = workDays.length>0?_weekPlanTotal/workDays.length:dailyGoal;
  // Week: actual so far + planned targets for remaining work days this week
  const _todayRem      = workDays.includes(_todayISO) ? Math.max((dayTargets[_todayISO]??dailyGoal)-_earnToday,0) : 0;
  const _remainWkPlan  = _todayRem + workDays.filter(d=>d>_todayISO).reduce((s,iso)=>s+(dayTargets[iso]??dailyGoal),0);
  const _projWeek      = _earnWeek + _remainWkPlan;

  // Month: actual + estimated remaining work days × avg daily target
  const _dimM      = new Date(currentTime.getFullYear(),currentTime.getMonth()+1,0).getDate();
  const _remainDaysM = _dimM - currentTime.getDate();
  const _projMonth = _earnMonth + _avgDayTarget*Math.round(_remainDaysM*(workDays.length/7));

  // Year: actual + estimated remaining work days × avg daily target
  const _doy       = Math.ceil((currentTime.getTime()-new Date(_finYearStart+'T00:00:00').getTime())/86400000);
  const _projYear  = _earnYear + _avgDayTarget*Math.round((365-_doy)*(workDays.length/7));
  const _annTarget = _weekPlanTotal*52;
  const _yearPct   = _annTarget>0?Math.min(_projYear/_annTarget,1):0;

  // Platform table
  const _byPlat: Record<string,{today:number,week:number,month:number}>={};
  trips.forEach(t=>{
    if(!_byPlat[t.platform])_byPlat[t.platform]={today:0,week:0,month:0};
    const a=_tripNet(t);
    if(t.date===_finToday)_byPlat[t.platform].today+=a;
    if(t.date>=_finWeekStart)_byPlat[t.platform].week+=a;
    if(t.date>=_finMonthStart)_byPlat[t.platform].month+=a;
  });
  const _platRows=Object.entries(_byPlat).sort((a,b)=>b[1].week-a[1].week);

  // Expense health
  const _monthFixed=expenses.reduce((s,e)=>{
    if(e.frequency==='daily')return s+e.amount*30;
    if(e.frequency==='weekly')return s+e.amount*4.33;
    if(e.frequency==='monthly')return s+e.amount;
    return s;
  },0);
  const _expMonth=expenses.filter(e=>e.date>=_finMonthStart).reduce((s,e)=>s+e.amount,0);
  const _netProj=_projMonth-(_expMonth+_monthFixed);

  // Ring — uses today's specific per-day target
  const _todayPlan = workDays.includes(_todayISO)?(dayTargets[_todayISO]??dailyGoal):dailyGoal;
  const _ringPct=Math.min(_earnToday/Math.max(_todayPlan,1),1);
  const _CX=60,_CY=60;

  // ── Monthly cash flow (Proyecciones) ──────────────────────────
  // Weekly recurring expense amount (templates, not one-time entries)
  // Excludes expenses whose endDate (repeat-until) has already passed
  const _recurWk = expenses.reduce((s,e)=>{
    if(!e.frequency||e.frequency==='none') return s;
    if(e.endDate && e.endDate < _mwTodayStr) return s; // expired
    if(e.frequency==='monthly') return s+e.amount/4.33;
    if(e.frequency==='weekly')  return s+e.amount;
    if(e.frequency==='daily')   return s+e.amount*7;
    return s;
  },0);
  // Per-day recurring helper — accounts for expenses that may expire mid-projection
  const _recurPerDay = (dateStr: string) => expenses.reduce((s,e) => {
    if(!e.frequency||e.frequency==='none') return s;
    if(e.endDate && e.endDate < dateStr) return s;
    if(e.frequency==='monthly') return s+e.amount/(4.33*7);
    if(e.frequency==='weekly')  return s+e.amount/7;
    if(e.frequency==='daily')   return s+e.amount;
    return s;
  }, 0);

  const _mwYear=currentTime.getFullYear(), _mwMo=currentTime.getMonth();
  const _mwFirst=new Date(_mwYear,_mwMo,1);
  const _mwLast=new Date(_mwYear,_mwMo+1,0);
  const _mwTodayStr=toYYYYMMDD(currentTime);

  // Build weeks overlapping the current month (start on Monday)
  const _mwWeeks=(()=>{
    type W={start:Date;end:Date;wStr:string;eStr:string;label:string;
      projIncome:number;projExp:number;actualIncome:number;actualExp:number;
      isPast:boolean;isCurrent:boolean};
    const wks:W[]=[];
    const ws0=new Date(_mwFirst);
    const sd=ws0.getDay(); ws0.setDate(ws0.getDate()-(sd===0?6:sd-1));
    let ws=ws0;
    while(ws<=_mwLast){
      const we=new Date(ws); we.setDate(we.getDate()+6);
      const wStr=toYYYYMMDD(ws), eStr=toYYYYMMDD(we);
      // Priority: weekOverrides > recurringPlan (for future weeks) > base workDays/dayTargets
      const _wkOv=weekOverrides[wStr];
      const _isFutureWk=wStr>_finWeekStart;
      const _inRecurPlan=_isFutureWk&&recurringPlan.enabled&&recurringPlan.untilDate>=wStr;
      const _effWD=_wkOv?.workDays??(_inRecurPlan?recurringPlan.workDays:workDays);
      const _effDT=_wkOv?.dayTargets??(_inRecurPlan?recurringPlan.dayTargets:dayTargets);
      // Projected income: work days in this week that fall in the current month
      let projIncome=0, daysInMo=0;
      for(let di=0;di<7;di++){
        const dd=new Date(ws); dd.setDate(ws.getDate()+di);
        if(dd.getMonth()!==_mwMo){ws=new Date(ws);ws.setDate(ws.getDate()-di+di);continue;}
        daysInMo++;
        const iso=dd.getDay()===0?7:dd.getDay();
        if(_effWD.includes(iso))projIncome+=(_effDT[iso]??dailyGoal);
      }
      const projExp=_recurWk*(daysInMo/7);
      const actualIncome=trips.filter(t=>t.date>=wStr&&t.date<=eStr).reduce((a,t)=>a+_tripNet(t),0);
      // One-time expenses logged in this date range
      const actualExpOneTime=expenses.filter(e=>(!e.frequency||e.frequency==='none')&&e.date>=wStr&&e.date<=eStr).reduce((a,e)=>a+e.amount,0);
      // For past/current weeks include the pro-rated recurring cost so Net is accurate
      const actualExp=actualExpOneTime+projExp;
      const isPast=eStr<_mwTodayStr, isCurrent=wStr<=_mwTodayStr&&eStr>=_mwTodayStr;
      const m1=ws.toLocaleDateString('en-US',{month:'short'}), m2=we.toLocaleDateString('en-US',{month:'short'});
      const label=m1===m2?`${ws.getDate()}–${we.getDate()} ${m1}`:`${ws.getDate()} ${m1}–${we.getDate()} ${m2}`;
      wks.push({start:new Date(ws),end:new Date(we),wStr,eStr,label,projIncome,projExp,actualIncome,actualExp,isPast,isCurrent});
      ws=new Date(ws); ws.setDate(ws.getDate()+7);
    }
    return wks;
  })();

  // Running balance forward from today's bankBalance
  const _mwCurIdx=_mwWeeks.findIndex(w=>w.isCurrent);
  const _mwBalances:number[]=_mwWeeks.map(()=>NaN);
  if(_mwCurIdx>=0){
    const curW=_mwWeeks[_mwCurIdx];
    const daysPast=Math.max(0,Math.floor((currentTime.getTime()-curW.start.getTime())/86400000));
    const remRecurWk=_recurWk*((7-daysPast)/7);
    _mwBalances[_mwCurIdx]=bankBalance+_remainWkPlan-remRecurWk;
    for(let i=_mwCurIdx+1;i<_mwWeeks.length;i++){
      _mwBalances[i]=_mwBalances[i-1]+_mwWeeks[i].projIncome-_mwWeeks[i].projExp;
    }
  }

  // Monthly goal = sum of planned income across every day in the month
  const _mwMonthGoal=(()=>{
    let tot=0;
    for(let d=new Date(_mwFirst);d<=_mwLast;d.setDate(d.getDate()+1)){
      const iso=d.getDay()===0?7:d.getDay();
      if(workDays.includes(iso))tot+=(dayTargets[iso]??dailyGoal);
    }
    return tot;
  })();
  const _mwEarned=trips.filter(t=>t.date>=toYYYYMMDD(_mwFirst)&&t.date<=_mwTodayStr).reduce((a,t)=>a+_tripNet(t),0);

  // Scheduled payments viability (monthly recurring with dueDate)
  const _mwPayments=expenses
    .filter(e=>e.frequency==='monthly'&&e.dueDate)
    .map(e=>{
      const dueStr=e.dueDate!;
      const dueDate=new Date(dueStr+'T00:00:00');
      const daysUntil=Math.round((dueDate.getTime()-currentTime.getTime())/86400000);
      const wkIdx=_mwWeeks.findIndex(w=>dueStr>=w.wStr&&dueStr<=w.eStr);
      const projBal=wkIdx>=0&&!isNaN(_mwBalances[wkIdx])?_mwBalances[wkIdx]:bankBalance;
      const covered=projBal>=e.amount;
      return {name:e.vendor||e.category,amount:e.amount,dueStr,daysUntil,projBal,covered};
    })
    .sort((a,b)=>a.daysUntil-b.daysUntil);

  // ─── 14-day cash flow projection ──────────────────────────────
  // _cfDailyRecur = today's flat daily rate (for the Recurring Drain display card)
  const _cfDailyRecur = _recurWk / 7;
  const _cfDays = (() => {
    const days: {
      date:Date; dateStr:string; shortLabel:string; fullLabel:string;
      isToday:boolean; isWorkDay:boolean;
      income:number; paymentTotal:number; payments:Expense[];
      balance:number;
    }[] = [];
    let bal = bankBalance;
    for (let i = 0; i < 14; i++) {
      const d = new Date(currentTime);
      d.setDate(currentTime.getDate() + i);
      const dateStr = toYYYYMMDD(d);
      const iso = d.getDay() === 0 ? 7 : d.getDay();
      const isWorkDay = workDays.includes(iso);
      const isToday = i === 0;
      const income = isToday ? 0 : (isWorkDay ? (dayTargets[iso] ?? dailyGoal) : 0);
      // Only include active payments on this specific date (skip if expense endDate has passed)
      const payments = expenses.filter(e =>
        e.dueDate === dateStr && e.frequency === 'monthly' &&
        (!e.endDate || e.endDate >= dateStr)
      );
      const paymentTotal = payments.reduce((s,e) => s + e.amount, 0);
      // Use per-day recurring so expired expenses don't drain future balance
      if (!isToday) bal = bal + income - _recurPerDay(dateStr) - paymentTotal;
      const shortLabel = isToday ? 'NOW'
        : d.toLocaleDateString('en-US',{weekday:'short'}).slice(0,2).toUpperCase();
      const fullLabel = isToday ? 'Today'
        : d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
      days.push({date:new Date(d),dateStr,shortLabel,fullLabel,isToday,isWorkDay,income,paymentTotal,payments,balance:isToday?bankBalance:bal});
    }
    return days;
  })();
  const _cfMin = Math.min(..._cfDays.map(d => d.balance));
  const _cfMax = Math.max(..._cfDays.map(d => d.balance));
  const _cfPayments14 = expenses
    .filter(e => e.dueDate && e.frequency === 'monthly' && (!e.endDate || e.endDate >= e.dueDate!))
    .map(e => {
      const daysUntil = Math.round((new Date(e.dueDate!+'T12:00:00').getTime()-currentTime.getTime())/86400000);
      const dayEntry = _cfDays.find(d => d.dateStr === e.dueDate);
      const balAfter = dayEntry?.balance ?? bankBalance;
      // Pre-payment balance: dayEntry.balance already has paymentTotal subtracted, add it back to get pre-pay balance
      const prePayBal = dayEntry ? (dayEntry.balance + dayEntry.paymentTotal) : bankBalance;
      const covered   = prePayBal >= e.amount;
      return {name:e.vendor||e.category, amount:e.amount, dueStr:e.dueDate!, daysUntil, balAfter, covered};
    })
    .filter(p => p.daysUntil >= 0 && p.daysUntil <= 13)
    .sort((a,b) => a.daysUntil - b.daysUntil);

  const _finPageNames = ['This Week','Projections','Platforms','Financial Health'];

  const FinancesContent = (
    <div>
      {/* ── Header: page title + dot indicators ── */}
      <div className="flex items-start justify-between px-4 pt-4 pb-3">
        <div>
          <p className="text-[10px] tracking-[0.22em] text-neutral-400 font-semibold uppercase">Financial Intelligence</p>
          <p className="text-[12px] font-semibold text-neutral-200 mt-0.5">{_finPageNames[finPage]}</p>
        </div>
        <div className="flex items-center gap-1.5 mt-1">
          {[0,1,2,3].map(i=>(
            <button key={i}
              onClick={()=>{const el=finScrollRef.current;if(el)el.scrollTo({left:i*el.offsetWidth,behavior:'smooth'});}}
              style={{width:i===finPage?16:8,height:8,borderRadius:4,background:i===finPage?'#f6dd8c':'#2a2a2a',transition:'all 0.3s',flexShrink:0,border:'none',padding:0,cursor:'pointer'}}
            />
          ))}
        </div>
      </div>

      {/* ── Horizontal scroll container ── */}
      <div ref={finScrollRef}
        className="flex"
        style={{overflowX:'scroll',scrollSnapType:'x mandatory',scrollbarWidth:'none'} as React.CSSProperties}
        onScroll={e=>{const el=e.currentTarget;setFinPage(Math.round(el.scrollLeft/(el.offsetWidth||1)));}}
      >

        {/* ── PAGE 0 · This Week ── */}
        <div className="flex-shrink-0 w-full px-4 space-y-4 pb-6" style={{scrollSnapAlign:'start'}}>

          {/* ESTA SEMANA chart */}
          <div className="bg-[#101010] border border-[#2e2e2e] rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[9px] tracking-[0.22em] text-neutral-300 font-bold uppercase">THIS WEEK</p>
              <div className="flex gap-3 text-[8px] text-neutral-400">
                <span className="flex items-center gap-1"><span className="inline-block w-2 h-1.5 rounded bg-[#d9b64f]/30"/>Planned</span>
                <span className="flex items-center gap-1"><span className="inline-block w-2 h-1.5 rounded bg-[#f6dd8c]"/>Actual</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={90}>
              <BarChart data={_weekChart} barGap={2} barSize={14} margin={{top:0,right:0,bottom:0,left:0}}>
                <XAxis dataKey="day" tick={{fill:'#6b7280',fontSize:9}} axisLine={false} tickLine={false}/>
                <YAxis hide domain={[0,Math.max(..._weekChart.map(d=>Math.max(d.projected,d.actual)),1)*1.15]}/>
                <Tooltip contentStyle={{background:'#1a1a1a',border:'1px solid #2a2a2a',borderRadius:8,fontSize:11}}
                  labelStyle={{color:'#f6dd8c'}} formatter={(v:number)=>[`$${v.toFixed(0)}`]}/>
                <Bar dataKey="projected" name="Planned" fill="#d9b64f22" radius={[3,3,0,0]}/>
                <Bar dataKey="actual"    name="Actual"  fill="#f6dd8c"   radius={[3,3,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex justify-between mt-2 pt-2 border-t border-[#2e2e2e]">
              <div>
                <p className="text-[9px] text-neutral-400">Earned so far</p>
                <p className="text-[15px] font-bold text-[#f6dd8c] font-mono-jet">${_earnWeek.toFixed(2)}</p>
                <p className="text-[8px] text-neutral-400 mt-0.5">{cumulative.semana.toFixed(1)}h logged · {(() => { const wh = hoursLog.filter(h => h.date >= _finWeekStart); return wh.length; })()} shifts</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] text-neutral-400">Week plan total</p>
                <p className="text-[15px] font-bold text-white font-mono-jet">${_projWeek.toFixed(2)}</p>
                <p className="text-[8px] text-neutral-400 mt-0.5">pending + posted trips</p>
              </div>
            </div>
          </div>

          {/* PLAN SEMANAL DE INGRESOS */}
          <div className="bg-[#101010] border border-[#2e2e2e] rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[9px] tracking-[0.22em] text-neutral-300 font-bold uppercase">WEEKLY INCOME PLAN</p>
              <span className="text-[9px] text-neutral-400">{workDays.length} active day{workDays.length!==1?'s':''}</span>
            </div>
            <div className="grid grid-cols-7 gap-1 mb-1.5">
              {([1,2,3,4,5,6,7] as const).map((iso,i)=>{
                const on=workDays.includes(iso);
                return (
                  <button key={iso}
                    onClick={()=>setWorkDays(prev=>on?prev.filter(x=>x!==iso):[...prev,iso].sort())}
                    className={`flex flex-col items-center py-2 rounded-lg border transition-all active:scale-95 ${on?'bg-black border-[#f6dd8c]/50':'bg-[#0a0a0a] border-[#1a1a1a]'}`}>
                    <span className={`text-[9px] font-bold leading-none mb-1.5 ${on?'text-[#f6dd8c]':'text-neutral-400'}`}>{['M','Tu','W','Th','F','Sa','Su'][i]}</span>
                    <span className={`w-3 h-3 rounded-full transition-colors ${on?'bg-[#f6dd8c]':'bg-[#252525]'}`}/>
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-7 gap-1 mb-4">
              {([1,2,3,4,5,6,7] as const).map((iso)=>{
                const on=workDays.includes(iso);
                return (
                  <div key={iso} className={`transition-opacity ${on?'opacity-100':'opacity-20'}`}>
                    <input type="number" min="0" max="9999" step="10"
                      value={on?(dayTargets[iso]??dailyGoal):''} disabled={!on} placeholder="—"
                      onChange={e=>setDayTargets(prev=>({...prev,[iso]:parseFloat(e.target.value)||0}))}
                      className="w-full text-center bg-transparent text-[10px] font-bold font-mono-jet text-[#f6dd8c] focus:outline-none disabled:cursor-default border-b border-[#2a2a2a] pb-0.5 focus:border-[#f6dd8c]/50 transition-colors"
                    />
                  </div>
                );
              })}
            </div>
            <div className="pt-3 border-t border-[#2e2e2e]">
              <div className="flex items-baseline justify-between mb-0.5">
                <p className="text-[9px] text-neutral-400 uppercase tracking-[0.15em]">Weekly total</p>
                <p className="text-[22px] font-bold text-[#f6dd8c] font-mono-jet leading-none">
                  ${_weekPlanTotal.toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:0})}
                </p>
              </div>
              <p className="text-[8px] text-neutral-400 mb-3">avg ${_avgDayTarget.toFixed(0)}/day</p>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-black border border-[#2e2e2e] rounded-xl p-2.5 text-center">
                  <p className="text-[8px] text-neutral-400 uppercase tracking-widest mb-0.5">Est. monthly</p>
                  <p className="text-[13px] font-bold text-white font-mono-jet">${(_weekPlanTotal*4.33/1000).toFixed(1)}k</p>
                </div>
                <div className="bg-black border border-[#2e2e2e] rounded-xl p-2.5 text-center">
                  <p className="text-[8px] text-neutral-400 uppercase tracking-widest mb-0.5">Est. yearly</p>
                  <p className="text-[13px] font-bold text-white font-mono-jet">${(_annTarget/1000).toFixed(0)}k</p>
                </div>
              </div>
              <div className="bg-[#0f0a00] border border-[#d9b64f]/20 rounded-xl p-2.5 flex items-center gap-2">
                <span className="text-[#d9b64f] text-[12px]">💡</span>
                <p className="text-[9px] text-[#d9b64f]">Days without a custom target use <strong className="text-[#d9b64f]">${dailyGoal}/day</strong> as the default.</p>
              </div>
            </div>
          </div>

          {/* ── 🔁 Repeat this weekly pattern until a date ── */}
          <div className="bg-[#101010] border border-[#2e2e2e] rounded-2xl p-4 space-y-3">

            {/* Active plan summary */}
            {recurringPlan.enabled && !showRepeatIncomePicker && (
              <div className="bg-[#0c140c] border border-[#4ade80]/25 rounded-xl p-3 flex items-start justify-between gap-2">
                <div>
                  <p className="text-[9px] font-bold text-[#4ade80] mb-0.5">🔁 Repeating weekly pattern</p>
                  <p className="text-[11px] text-white font-semibold">
                    Until {new Date(recurringPlan.untilDate+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}
                  </p>
                  <p className="text-[9px] text-neutral-400 mt-0.5">
                    {recurringPlan.workDays.length} day{recurringPlan.workDays.length!==1?'s':''}/week · 
                    ${recurringPlan.workDays.reduce((s,iso)=>s+(recurringPlan.dayTargets[iso]??dailyGoal),0).toLocaleString('en-US',{maximumFractionDigits:0})}/wk projected
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={()=>{setRepeatIncomeUntil(recurringPlan.untilDate);setShowRepeatIncomePicker(true);}}
                    className="text-[9px] text-[#f6dd8c] border border-[#f6dd8c]/30 px-2 py-1 rounded-full">
                    Edit
                  </button>
                  <button onClick={()=>{setRecurringPlan({enabled:false,workDays:[],dayTargets:{},untilDate:""});showToast("Recurring pattern cleared ✓");}}
                    className="text-[9px] text-neutral-400 border border-[#2a2a2a] px-2 py-1 rounded-full hover:text-[#ff6b6b] hover:border-[#ff6b6b]/30 transition-colors">
                    Clear
                  </button>
                </div>
              </div>
            )}

            {/* Checkbox toggle row */}
            <button
              onClick={()=>{
                if(recurringPlan.enabled&&!showRepeatIncomePicker){
                  // Clicking while active + picker closed → clear the plan
                  setRecurringPlan({enabled:false,workDays:[],dayTargets:{},untilDate:""});
                  showToast("Recurring pattern cleared ✓");
                } else {
                  setRepeatIncomeUntil(recurringPlan.untilDate||"");
                  setShowRepeatIncomePicker(p=>!p);
                }
              }}
              className="w-full flex items-center gap-3 text-left">
              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${recurringPlan.enabled||showRepeatIncomePicker?'bg-[#f6dd8c] border-[#f6dd8c]':'bg-transparent border-[#3a3a3a]'}`}>
                {(recurringPlan.enabled||showRepeatIncomePicker) && <span className="text-black text-[11px] font-black leading-none">✓</span>}
              </div>
              <div className="flex-1">
                <p className="text-[12px] text-white font-semibold leading-snug">🔁 Repeat this weekly pattern until a date</p>
                <p className="text-[9px] text-neutral-400 mt-0.5">Spreads this exact schedule to every future week automatically</p>
              </div>
            </button>

            {/* Date picker (opens when checkbox is toggled) */}
            {showRepeatIncomePicker && (
              <div className="pt-1 space-y-3">
                <div>
                  <label className="text-[9px] text-neutral-300 font-bold uppercase tracking-widest mb-1.5 block">Repeat until</label>
                  <input type="date" value={repeatIncomeUntil}
                    min={_finWeekStart}
                    onChange={e=>setRepeatIncomeUntil(e.target.value)}
                    className="w-full h-11 rounded-xl bg-black border border-[#f6dd8c]/30 px-3 text-white text-[14px] font-semibold focus:outline-none focus:border-[#f6dd8c] transition-colors"/>
                </div>
                {repeatIncomeUntil && (()=>{
                  const nWeeks=Math.max(0,Math.ceil(
                    (new Date(repeatIncomeUntil+'T12:00:00').getTime()-new Date(_finWeekStart+'T12:00:00').getTime())
                    /(7*86400000)
                  ));
                  return (
                    <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-2 flex items-center justify-between">
                      <p className="text-[9px] text-neutral-400">{nWeeks} week{nWeeks!==1?'s':''} · {workDays.length} day{workDays.length!==1?'s':''}/wk</p>
                      <p className="font-mono-jet text-[11px] font-bold text-[#f6dd8c]">${_weekPlanTotal.toLocaleString('en-US',{maximumFractionDigits:0})}/wk</p>
                    </div>
                  );
                })()}
                <div className="flex gap-2">
                  <button onClick={()=>{
                    if(!repeatIncomeUntil){showToast("Pick an end date first");return;}
                    setRecurringPlan({enabled:true,workDays:[...workDays],dayTargets:{...dayTargets},untilDate:repeatIncomeUntil});
                    setShowRepeatIncomePicker(false);
                    showToast("Recurring pattern saved ✓");
                  }} className="flex-1 h-11 rounded-full bg-[#f6dd8c] text-black text-[13px] font-bold active:scale-95 transition-transform">
                    Save recurring pattern
                  </button>
                  <button onClick={()=>setShowRepeatIncomePicker(false)}
                    className="h-11 px-4 rounded-full border border-[#2a2a2a] text-neutral-400 text-[12px] hover:text-white transition-colors">
                    Cancel
                  </button>
                </div>
                <p className="text-[9px] text-neutral-400 text-center">Each individual week can still be adjusted when it arrives — just edit the plan above and it only affects that week.</p>
              </div>
            )}
          </div>

        </div>{/* end page 0 */}

        {/* ── PAGE 1 · Cash Flow 14-day ── */}
        <div className="flex-shrink-0 w-full px-4 space-y-4 pb-6" style={{scrollSnapAlign:'start'}}>

          {/* Header */}
          <div className="flex items-center gap-3 pt-1">
            <p className="text-[9px] tracking-[0.22em] text-neutral-300 font-bold uppercase">CASH FLOW</p>
            <span className="px-2.5 py-0.5 rounded-full bg-[#f6dd8c]/20 border border-[#f6dd8c]/30 text-[#f6dd8c] text-[8px] font-bold tracking-[0.12em]">14-DAY PROJECTION</span>
          </div>

          {/* 1 · Bank Balance */}
          <div className="bg-[#101010] border border-[#d9b64f]/25 rounded-2xl overflow-hidden" style={{position:'relative'}}>
            <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:'linear-gradient(90deg,#d9b64f,#f6dd8c44,transparent)'}}/>
            <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[9px] tracking-[0.22em] text-[#f6dd8c]/90 font-bold uppercase">BANK BALANCE TODAY</p>
              {!bankEditing && (
                <button onClick={()=>{setBankEditVal(bankBalance.toFixed(2));setBankEditing(true);}}
                  className="flex items-center gap-1 text-[9px] text-[#f6dd8c] border border-[#f6dd8c]/30 px-2.5 py-1 rounded-full active:scale-95 transition-transform">
                  ✏ Edit
                </button>
              )}
            </div>
            {bankEditing ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-neutral-400 text-[18px] font-mono-jet">$</span>
                  <input type="number" value={bankEditVal}
                    onChange={e=>setBankEditVal(e.target.value)}
                    className="flex-1 bg-black border border-[#f6dd8c]/40 rounded-xl px-3 py-2 text-[#f6dd8c] font-mono-jet text-[20px] font-bold focus:outline-none focus:border-[#f6dd8c]"
                    autoFocus inputMode="decimal"/>
                </div>
                <input type="text" placeholder="Optional note (e.g. car repair −$270)" value={bankEditNote}
                  onChange={e=>setBankEditNote(e.target.value)}
                  className="w-full bg-black border border-[#2e2e2e] rounded-xl px-3 py-1.5 text-neutral-300 text-[11px] focus:outline-none focus:border-[#f6dd8c]/30"/>
                <div className="flex gap-2">
                  <button onClick={()=>{
                    const nv=parseFloat(bankEditVal);
                    if(!isNaN(nv)){
                      const adj:BankAdjEntry={
                        id:Date.now().toString(),
                        date:toYYYYMMDD(currentTime),
                        time:currentTime.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}),
                        prevBalance:bankBalance, newBalance:nv,
                        note:bankEditNote.trim()
                      };
                      setBankAdjHistory(prev=>[adj,...prev].slice(0,20));
                      setBankBalance(nv);
                    }
                    setBankEditing(false); setBankEditVal(""); setBankEditNote("");
                  }} className="flex-1 bg-[#f6dd8c] text-black text-[12px] font-bold py-2.5 rounded-xl active:scale-95 transition-transform">
                    Save
                  </button>
                  <button onClick={()=>{setBankEditing(false);setBankEditVal("");setBankEditNote("");}}
                    className="px-4 text-neutral-400 text-[12px] border border-[#2a2a2a] rounded-xl">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="font-mono-jet text-[36px] font-black text-[#f6dd8c] leading-none tracking-tight">
                  ${bankBalance.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}
                </p>
                {bankAdjHistory.length>0 && (
                  <p className="text-[9px] text-neutral-400 mt-1">
                    Updated manually · {new Date(bankAdjHistory[0].date+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'})}
                  </p>
                )}
              </>
            )}
            </div>{/* close p-4 */}
          </div>{/* close bank balance card */}

          {/* ── Quick-Add Projected Expense (Part 3) ── */}
          <div className="bg-[#101010] border border-[#d9b64f]/25 rounded-2xl overflow-hidden" style={{position:'relative'}}>
            <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:'linear-gradient(90deg,#4ade8088,#4ade8022,transparent)'}}/>
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-[9px] tracking-[0.22em] text-[#4ade80]/90 font-bold uppercase">PROJECTED EXPENSES</p>
                  <p className="text-[9px] text-neutral-400 mt-0.5">Add recurring costs to your cash flow</p>
                </div>
                <button onClick={()=>setShowProjExpForm(p=>!p)}
                  className="flex items-center gap-1.5 h-7 px-3 rounded-full border text-[10px] font-bold transition-colors"
                  style={{background:showProjExpForm?'#1a0a0a':'#0d1f0d',borderColor:showProjExpForm?'#ff6b6b33':'#4ade8033',color:showProjExpForm?'#ff6b6b':'#4ade80'}}>
                  {showProjExpForm ? '✕ Cancel' : '+ Add expense'}
                </button>
              </div>
              {!showProjExpForm && expenses.some(e=>e.frequency&&e.frequency!=='none') && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] text-neutral-400">{expenses.filter(e=>e.frequency&&e.frequency!=='none').length} recurring · </span>
                  <span className="font-mono-jet text-[9px] font-bold text-orange-400">−${_monthFixed.toFixed(0)}/mo</span>
                </div>
              )}
              {showProjExpForm && (
                <div className="space-y-3 mt-3">
                  <div>
                    <label className="text-[9px] text-neutral-300 font-bold uppercase tracking-widest mb-1 block">Vendor / Expense Name</label>
                    <div className="relative">
                      <select value={projExpForm.name} onChange={e=>setProjExpForm(s=>({...s,name:e.target.value}))}
                        className="w-full h-11 rounded-xl bg-black border border-[#262626] px-3 pr-8 text-white text-[13px] appearance-none focus:outline-none">
                        <option value="">Select a vendor...</option>
                        {allVendors.map(v=><option key={v} value={v}>{v}</option>)}
                      </select>
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 text-[10px]">▼</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="w-[110px] flex-shrink-0">
                      <label className="text-[9px] text-neutral-300 font-bold uppercase tracking-widest mb-1 block">Amount ($)</label>
                      <input inputMode="decimal" value={projExpForm.amount} onChange={e=>setProjExpForm(s=>({...s,amount:e.target.value}))}
                        placeholder="0.00"
                        className="w-full h-11 rounded-xl bg-black border border-[#262626] px-3 text-white text-[16px] font-bold font-mono-jet placeholder:text-neutral-400 focus:outline-none"/>
                    </div>
                    <div className="flex-1">
                      <label className="text-[9px] text-neutral-300 font-bold uppercase tracking-widest mb-1 block">Frequency</label>
                      <div className="flex gap-1">
                        {(['daily','weekly','monthly'] as const).map(f=>(
                          <button key={f} onClick={()=>setProjExpForm(s=>({...s,frequency:f}))}
                            className={`flex-1 h-11 rounded-xl text-[9px] font-bold transition-colors capitalize ${projExpForm.frequency===f?'bg-[#facc15] text-black':'bg-[#1e1e1e] text-neutral-400 border border-[#262626] hover:text-white'}`}>
                            {f}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-[9px] text-neutral-300 font-bold uppercase tracking-widest mb-1 block">Category (IRS Schedule C)</label>
                    <div className="relative">
                      <select value={projExpForm.category} onChange={e=>setProjExpForm(s=>({...s,category:e.target.value}))}
                        className="w-full h-11 rounded-xl bg-black border border-[#262626] px-3 pr-8 text-white text-[13px] appearance-none focus:outline-none">
                        {allExpenseCategories.map(c=><option key={c} value={c}>{c}</option>)}
                      </select>
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 text-[10px]">▼</span>
                    </div>
                  </div>
                  {projExpForm.frequency==='monthly' && (
                    <div>
                      <label className="text-[9px] text-neutral-300 font-bold uppercase tracking-widest mb-1 block">Next due date (optional)</label>
                      <input type="date" value={projExpForm.dueDate} onChange={e=>setProjExpForm(s=>({...s,dueDate:e.target.value}))}
                        className="w-full h-11 rounded-xl bg-black border border-[#262626] px-3 text-white text-[13px] focus:outline-none"/>
                    </div>
                  )}

                  {/* 🔁 Repeat until date toggle */}
                  <div className="border border-[#2e2e2e] rounded-xl p-3 space-y-2">
                    <button onClick={()=>setProjExpForm(s=>({...s,repeatEnabled:!s.repeatEnabled,repeatUntil:''}))}
                      className="w-full flex items-center gap-2.5 text-left">
                      <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${projExpForm.repeatEnabled?'bg-[#f6dd8c] border-[#f6dd8c]':'bg-transparent border-[#3a3a3a]'}`}>
                        {projExpForm.repeatEnabled && <span className="text-black text-[10px] font-black leading-none">✓</span>}
                      </div>
                      <div>
                        <p className="text-[11px] text-white font-semibold leading-none">🔁 Repeat until a date</p>
                        <p className="text-[9px] text-neutral-400 mt-0.5">Stop projecting this expense after a specific date</p>
                      </div>
                    </button>
                    {projExpForm.repeatEnabled && (
                      <div>
                        <label className="text-[9px] text-neutral-300 font-bold uppercase tracking-widest mb-1 block">Stop repeating after</label>
                        <input type="date" value={projExpForm.repeatUntil}
                          min={toYYYYMMDD(currentTime)}
                          onChange={e=>setProjExpForm(s=>({...s,repeatUntil:e.target.value}))}
                          className="w-full h-10 rounded-xl bg-black border border-[#f6dd8c]/30 px-3 text-white text-[13px] focus:outline-none focus:border-[#f6dd8c]"/>
                      </div>
                    )}
                  </div>

                  <button onClick={()=>{
                    const amt=parseFloat(projExpForm.amount);
                    if(!projExpForm.name.trim()||!amt||amt<=0){showToast("Enter a name and amount");return;}
                    if(projExpForm.repeatEnabled&&!projExpForm.repeatUntil){showToast("Pick an end date or uncheck Repeat");return;}
                    const newExp:Expense={
                      id:Date.now().toString(),
                      date:toYYYYMMDD(currentTime),
                      category:projExpForm.category,
                      vendor:projExpForm.name.trim(),
                      amount:amt, note:'', type:'Other', verified:false,
                      frequency:projExpForm.frequency,
                      dueDate:projExpForm.dueDate||undefined,
                      endDate:projExpForm.repeatEnabled?projExpForm.repeatUntil:undefined,
                    };
                    syncSaveExpenses([newExp,...expenses]);
                    setProjExpForm({name:'',amount:'',frequency:'monthly',category:'Vehicle & Fuel',dueDate:'',repeatEnabled:false,repeatUntil:''});
                    setShowProjExpForm(false);
                    const untilLabel=projExpForm.repeatEnabled?` · until ${new Date(projExpForm.repeatUntil+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'})}`:'';
                    showToast(`Expense saved ✓ $${amt.toFixed(2)}/${projExpForm.frequency}${untilLabel}`);
                  }} className="w-full h-12 rounded-full bg-[#facc15] text-black text-[13px] font-bold tracking-wide hover:bg-[#fde047] transition-colors">
                    Save Projected Expense
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 1b · Daily recurring drain */}
          {_cfDailyRecur > 0 && (
            <div className="bg-[#101010] border border-[#2e2e2e] rounded-2xl px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-[9px] tracking-[0.18em] text-orange-400 font-bold uppercase">RECURRING DRAIN</p>
                <p className="text-[10px] text-neutral-400 mt-0.5">Daily / weekly / monthly expenses combined</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-mono-jet text-[15px] font-bold text-orange-400">−${_cfDailyRecur.toFixed(2)}/day</p>
                <p className="font-mono-jet text-[10px] text-neutral-400">−${(_cfDailyRecur*30).toFixed(0)}/month</p>
              </div>
            </div>
          )}

          {/* 2 · Upcoming payments (next 14 days) */}
          {_cfPayments14.length > 0 && (
            <div className="bg-[#101010] border border-[#2e2e2e] rounded-2xl p-4">
              <p className="text-[9px] tracking-[0.22em] text-[#f6dd8c]/90 font-bold uppercase mb-3">⚡ UPCOMING PAYMENTS</p>
              <div className="space-y-2">
                {_cfPayments14.map(p=>(
                  <div key={p.dueStr} className={`flex items-center gap-3 rounded-xl px-3 py-3 border ${
                    p.daysUntil<=2 ? 'border-red-500/40 bg-[#0f0202]'
                    : p.covered   ? 'border-[#4ade80]/20 bg-[#020f02]'
                    :               'border-red-500/20 bg-[#0f0202]'
                  }`}>
                    <span className={`w-3 h-3 rounded-full flex-shrink-0 ${
                      p.daysUntil<=2 ? 'bg-red-500' : p.covered ? 'bg-[#4ade80]' : 'bg-red-500'
                    }`}/>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-white truncate">{p.name}</p>
                      <p className="text-[10px] text-neutral-400 mt-0.5">
                        {p.daysUntil===0?'Due today':p.daysUntil===1?'Tomorrow':`In ${p.daysUntil} days`}
                        {' · '}balance after: <span className="font-mono-jet">${p.balAfter.toLocaleString('en-US',{maximumFractionDigits:0})}</span>
                      </p>
                    </div>
                    <p className="font-mono-jet text-[16px] font-black text-red-400 flex-shrink-0">-${p.amount.toFixed(0)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3 · Daily balance bar chart */}
          <div className="bg-[#101010] border border-[#2e2e2e] rounded-2xl p-4">
            <p className="text-[9px] tracking-[0.22em] text-[#f6dd8c]/90 font-bold uppercase mb-3">DAILY BALANCE</p>
            <ResponsiveContainer width="100%" height={110}>
              <BarChart data={_cfDays.map(d=>({label:d.shortLabel,balance:d.balance,isToday:d.isToday,neg:d.balance<0}))}
                barSize={16} margin={{top:4,right:0,left:0,bottom:0}}>
                <XAxis dataKey="label" tick={{fontSize:8,fill:'#6b7280'}} axisLine={false} tickLine={false}/>
                <YAxis hide domain={[Math.min(_cfMin*1.1,0), _cfMax*1.1]}/>
                <Bar dataKey="balance" radius={[3,3,0,0]}>
                  {_cfDays.map((d,i)=>(
                    <Cell key={i}
                      fill={d.isToday ? '#f6dd8c' : d.balance<0 ? '#ef4444' : '#4ade80'}
                      fillOpacity={d.isToday ? 1 : 0.65}/>
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex justify-between text-[10px] font-mono-jet mt-1 px-1">
              <span className="text-neutral-400">Min: <span className={_cfMin<0?'text-red-400':'text-neutral-300'}>${_cfMin.toLocaleString('en-US',{maximumFractionDigits:0})}</span></span>
              <span className="text-neutral-400">Max: <span className="text-[#4ade80]">${_cfMax.toLocaleString('en-US',{maximumFractionDigits:0})}</span></span>
            </div>
          </div>

          {/* 4 · Detailed timeline */}
          <div className="bg-[#101010] border border-[#2e2e2e] rounded-2xl p-4">
            <p className="text-[9px] tracking-[0.22em] text-[#f6dd8c]/90 font-bold uppercase mb-1">DETAILED TIMELINE</p>
            <div>
              {_cfDays.map((d,i)=>(
                <div key={d.dateStr} className={`flex items-start gap-3 py-2.5 ${i<_cfDays.length-1?'border-b border-[#1e1e1e]':''}`}>
                  {/* Day label */}
                  <div className="w-[44px] flex-shrink-0 pt-0.5">
                    {d.isToday ? (
                      <span className="inline-block px-1.5 py-0.5 rounded bg-[#f6dd8c]/20 text-[#f6dd8c] text-[7px] font-black tracking-widest">TODAY</span>
                    ) : (
                      <span className="text-[10px] text-neutral-400 font-semibold">{d.shortLabel}</span>
                    )}
                  </div>
                  {/* Description */}
                  <div className="flex-1 min-w-0">
                    {d.isToday ? (
                      <p className="text-[12px] text-neutral-400">{d.isWorkDay ? 'Work day' : 'Rest'}</p>
                    ) : (
                      <div>
                        {d.income > 0 && (
                          <p className="text-[12px] text-[#4ade80] font-semibold">+${d.income.toLocaleString('en-US',{maximumFractionDigits:0})} income</p>
                        )}
                        {!d.isWorkDay && d.income===0 && d.paymentTotal===0 && (
                          <p className="text-[12px] text-neutral-400">Rest</p>
                        )}
                        {d.payments.map(p=>(
                          <p key={p.id} className="text-[11px] text-red-400 font-semibold">-${p.amount.toFixed(0)} {p.vendor||p.category}</p>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Balance */}
                  <p className={`font-mono-jet text-[14px] font-bold flex-shrink-0 ${
                    d.balance<0 ? 'text-red-400' : d.isToday ? 'text-[#f6dd8c]' : 'text-neutral-200'
                  }`}>
                    ${d.balance.toLocaleString('en-US',{maximumFractionDigits:0})}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* 5 · Annual outlook (preserved) */}
          <div className="bg-[#101010] border border-[#2e2e2e] rounded-2xl p-4">
            <p className="text-[9px] tracking-[0.22em] text-[#f6dd8c]/90 font-bold uppercase mb-3">ANNUAL OUTLOOK</p>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {([
                {label:'End of Week', val:_projWeek},
                {label:'End of Month',val:_projMonth},
                {label:'End of Year', val:_projYear},
              ] as {label:string,val:number}[]).map(({label,val})=>(
                <div key={label} className="bg-black border border-[#2e2e2e] rounded-xl p-2.5 text-center">
                  <p className="text-[8px] text-neutral-400 uppercase tracking-widest leading-tight mb-1">{label}</p>
                  <p className="text-[14px] font-bold text-[#f6dd8c] font-mono-jet">${(val/1000).toFixed(1)}k</p>
                </div>
              ))}
            </div>
            <div className="bg-black border border-[#2e2e2e] rounded-xl p-3">
              <div className="flex justify-between items-center mb-1.5">
                <p className="text-[9px] text-neutral-400">Annual goal · Super Plus</p>
                <p className="text-[9px] text-[#f6dd8c]">${(_annTarget/1000).toFixed(0)}k · {Math.round(_yearPct*100)}%</p>
              </div>
              <div className="h-2 bg-[#1e1e1e] rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{width:`${_yearPct*100}%`,background:'linear-gradient(to right,#d9b64f,#f6dd8c)'}}/>
              </div>
              <p className="text-[8px] text-neutral-400 mt-1.5">Based on weekly plan · {workDays.length} day{workDays.length!==1?'s':''}/week</p>
            </div>
          </div>

        </div>{/* end page 1 */}

        {/* ── PAGE 2 · Platforms ── */}
        <div className="flex-shrink-0 w-full px-4 pb-6" style={{scrollSnapAlign:'start'}}>
          {_platRows.length>0 ? (
            <div className="bg-[#101010] border border-[#2e2e2e] rounded-2xl p-4">
              <p className="text-[9px] tracking-[0.22em] text-neutral-300 font-bold uppercase mb-3">INCOME BY PLATFORM</p>
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="text-[8px] text-neutral-400 uppercase tracking-widest border-b border-[#2e2e2e]">
                    <th className="text-left pb-2 font-semibold">Platform</th>
                    <th className="text-right pb-2 font-semibold">Today</th>
                    <th className="text-right pb-2 font-semibold">Week</th>
                    <th className="text-right pb-2 font-semibold">Month</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1a1a1a]">
                  {_platRows.map(([platform,d])=>{
                    const meta=getPlatformMeta(platform);
                    return (
                      <tr key={platform}>
                        <td className="py-2">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-5 h-5 rounded-full ${meta.bg} flex items-center justify-center text-[7px] font-bold text-black flex-shrink-0`}>{meta.initial}</span>
                            <span className="text-neutral-300 text-[10px] truncate max-w-[70px]">{platform}</span>
                          </div>
                        </td>
                        <td className="py-2 text-right font-mono-jet text-neutral-400 text-[10px]">{d.today>0?`$${d.today.toFixed(0)}`:'—'}</td>
                        <td className="py-2 text-right font-mono-jet text-[#f6dd8c] font-semibold text-[10px]">${d.week.toFixed(0)}</td>
                        <td className="py-2 text-right font-mono-jet text-white text-[10px]">${d.month.toFixed(0)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <span className="text-[44px] mb-3">🚕</span>
              <p className="text-[13px] font-semibold text-neutral-400 mb-1">No trips recorded yet</p>
              <p className="text-[11px] text-neutral-400 leading-relaxed">Log your first trip to see<br/>your breakdown by platform here</p>
            </div>
          )}
        </div>{/* end page 2 */}

        {/* ── PAGE 3 · Financial Health ── */}
        <div className="flex-shrink-0 w-full px-4 space-y-4 pb-6" style={{scrollSnapAlign:'start'}}>
          {/* Monthly summary */}
          <div className="bg-[#101010] border border-[#2e2e2e] rounded-2xl p-4">
            <p className="text-[9px] tracking-[0.22em] text-neutral-300 font-bold uppercase mb-3">
              FINANCIAL HEALTH · {currentTime.toLocaleDateString('en-US',{month:'long'}).toUpperCase()}
            </p>
            <div className="space-y-2.5">
              {([
                {label:'Actual earnings this month',       val:_earnMonth,   color:'text-[#4ade80]'},
                {label:'Projected by month end',           val:_projMonth,   color:'text-[#f6dd8c]'},
                {label:'Actual expenses this month',       val:-_expMonth,   color:'text-red-400'},
                {label:'Projected recurring expenses',     val:-_monthFixed, color:'text-orange-400'},
              ] as {label:string,val:number,color:string}[]).map(({label,val,color})=>(
                <div key={label} className="flex justify-between items-center gap-2">
                  <p className="text-[11px] text-neutral-400 leading-tight">{label}</p>
                  <p className={`font-mono-jet text-[13px] font-bold flex-shrink-0 ${color}`}>
                    {val<0?`-$${Math.abs(val).toFixed(2)}`:`$${val.toFixed(2)}`}
                  </p>
                </div>
              ))}
              <div className="pt-2.5 border-t border-[#2a2a2a] flex justify-between items-center">
                <p className="text-[12px] font-bold text-white">PROJECTED NET EARNINGS</p>
                <p className={`font-mono-jet text-[19px] font-bold ${_netProj>=0?'text-[#4ade80]':'text-red-400'}`}>
                  {_netProj<0?`-$${Math.abs(_netProj).toFixed(2)}`:`$${_netProj.toFixed(2)}`}
                </p>
              </div>
            </div>
          </div>

          {/* Recurring expenses breakdown — all frequencies */}
          {expenses.some(e => e.frequency && e.frequency !== 'none') && (
            <div className="bg-[#101010] border border-[#2e2e2e] rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[9px] tracking-[0.22em] text-neutral-300 font-bold uppercase">RECURRING EXPENSES</p>
                <span className="font-mono-jet text-[11px] text-orange-400 font-bold">
                  −${_monthFixed.toFixed(0)}/mo
                </span>
              </div>
              <div className="space-y-2">
                {expenses.filter(e => e.frequency && e.frequency !== 'none').map(e => {
                  const monthlyEq =
                    e.frequency === 'daily'   ? e.amount * 30 :
                    e.frequency === 'weekly'  ? e.amount * 4.33 :
                    e.amount;
                  const freqLabel =
                    e.frequency === 'daily'   ? 'daily' :
                    e.frequency === 'weekly'  ? 'weekly' :
                    'monthly';
                  return (
                    <div key={e.id} className="flex items-center justify-between gap-2 py-1.5 border-b border-[#1a1a1a] last:border-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold text-white truncate">{e.vendor}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[9px] bg-orange-400/10 text-orange-400 px-1.5 py-0.5 rounded-full border border-orange-400/20 font-bold">{freqLabel}</span>
                          {e.dueDate && <span className="text-[9px] text-neutral-400 font-mono-jet">due {e.dueDate.slice(5)}</span>}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-mono-jet text-[13px] font-bold text-red-400">−${e.amount.toFixed(2)}</p>
                        {e.frequency !== 'monthly' && (
                          <p className="font-mono-jet text-[9px] text-neutral-400">≈${monthlyEq.toFixed(0)}/mo</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 pt-2 border-t border-[#1a1a1a] flex justify-between text-[10px]">
                <span className="text-neutral-400">Monthly total</span>
                <span className="font-mono-jet font-bold text-orange-400">−${_monthFixed.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Bank balance history */}
          {bankAdjHistory.length > 0 && (
            <div className="bg-[#101010] border border-[#2e2e2e] rounded-2xl p-4">
              <p className="text-[9px] tracking-[0.22em] text-neutral-300 font-bold uppercase mb-3">BALANCE ADJUSTMENT HISTORY</p>
              <div className="space-y-2">
                {bankAdjHistory.slice(0,6).map(adj => (
                  <div key={adj.id} className="flex items-start justify-between gap-2 py-1.5 border-b border-[#1a1a1a] last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="font-mono-jet text-[10px] text-neutral-400">{adj.date} · {adj.time}</p>
                      {adj.note && <p className="text-[11px] text-neutral-400 mt-0.5 truncate">{adj.note}</p>}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-mono-jet text-[11px] text-neutral-400">${adj.prevBalance.toFixed(0)} → <span className="text-[#f6dd8c] font-bold">${adj.newBalance.toFixed(0)}</span></p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>{/* end page 3 */}

      </div>{/* end horizontal scroll */}
    </div>
  );

  // ─── AI Assistant content ─────────────────────────────────────
  const AIAssistantContent = (
    <div className="space-y-3">
      {/* Period selector */}
      <div className="flex gap-2">
        {(["day","week","month"] as const).map(p => (
          <button key={p} onClick={() => setAiPeriod(p)}
            className={`flex-1 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
              aiPeriod === p
                ? "bg-[#1a1200] border border-[#d9b64f]/50 text-[#f6dd8c]"
                : "bg-[#0a0a0a] border border-[#1e1e1e] text-neutral-500"
            }`}>
            {p === "day" ? "DAY" : p === "week" ? "WEEK" : "MONTH"}
          </button>
        ))}
      </div>

      {/* Net earnings header */}
      <div className="bg-[#0a0a0a] border border-[#1e1e1e] rounded-2xl p-4">
        <p className="text-[10px] text-neutral-500 uppercase tracking-widest mb-1">
          Ganancia Neta · {aiPeriod === "day" ? "Hoy" : aiPeriod === "week" ? "Última Semana" : "Último Mes"}
        </p>
        <div className="flex items-baseline gap-3">
          <span className="font-mono-jet text-[32px] font-black" style={goldGradientStyle}>${aiMetrics.net.toFixed(2)}</span>
          <span className={`text-[15px] font-bold ${aiMetrics.margin >= 0 ? "text-[#4ade80]" : "text-red-400"}`}>{aiMetrics.margin.toFixed(1)}%</span>
        </div>
        <p className="text-[11px] text-neutral-500 mt-1">${aiMetrics.gross.toFixed(2)} bruto − ${aiMetrics.costs.toFixed(2)} costos</p>
        <p className="text-[10px] text-neutral-600 mt-0.5">{aiMetrics.tripCount} viajes · {aiMetrics.hours.toFixed(1)} hrs · {aiMetrics.miles.toFixed(1)} mi GPS</p>
      </div>

      {/* 4 metric cards */}
      <div className="grid grid-cols-2 gap-2">
        {([
          { label: "Earnings / mi", value: aiMetrics.earningsPerMile, sim: aiMetrics.simEarningsPerMile, color: "#4ade80" },
          { label: "Cost / mi",     value: aiMetrics.costPerMile,     sim: null,                         color: "#f87171" },
          { label: "Earnings / hr", value: aiMetrics.earningsPerHour, sim: aiMetrics.simEarningsPerHour, color: "#4ade80" },
          { label: "Cost / hr",     value: aiMetrics.costPerHour,     sim: null,                         color: "#f87171" },
        ] as { label: string; value: number; sim: number | null; color: string }[]).map(card => (
          <div key={card.label} className="bg-[#0a0a0a] border border-[#1e1e1e] rounded-xl p-3">
            <p className="text-[9px] text-neutral-500 uppercase tracking-wider mb-1">{card.label}</p>
            <p className="font-mono-jet text-[24px] font-black leading-none" style={{ color: card.color }}>
              {card.value > 0 ? `$${card.value.toFixed(2)}` : "—"}
            </p>
            {card.sim !== null && aiSimTarget > 0 && card.value > 0 && (
              <p className="text-[9px] text-[#facc15] mt-1">Meta → ${card.sim.toFixed(2)}</p>
            )}
            <p className="text-[9px] text-neutral-600 mt-0.5">{card.label.includes("mi") ? "$/mi" : "$/hr"}</p>
          </div>
        ))}
      </div>

      {/* Simulation slider */}
      <div className="bg-[#0a0a0a] border border-[#1e1e1e] rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[12px] font-bold text-white">Simular Meta $/hr</p>
            <p className="text-[9px] text-neutral-500">¿Cuánto quieres ganar por hora?</p>
          </div>
          <span className="font-mono-jet text-[18px] font-black text-[#facc15]">
            {aiSimTarget > 0 ? `$${aiSimTarget}/hr` : "OFF"}
          </span>
        </div>
        <input type="range" min={0} max={150} step={5} value={aiSimTarget}
          onChange={e => setAiSimTarget(parseInt(e.target.value))} className="w-full" />
        <div className="flex justify-between text-[9px] text-neutral-600 mt-1">
          <span>OFF</span><span>$50</span><span>$100</span><span>$150/hr</span>
        </div>
        {aiSimTarget > 0 && (
          <div className="mt-3 flex justify-between text-[11px]">
            <div>
              <p className="text-neutral-500">Gross simulado</p>
              <p className="font-mono-jet font-bold text-[#facc15]">${aiMetrics.simGross.toFixed(2)}</p>
              <p className="text-[9px] text-neutral-600">${aiSimTarget}/hr × {aiMetrics.hours.toFixed(1)} hrs</p>
            </div>
            <div className="text-right">
              <p className="text-neutral-500">Net simulado</p>
              <p className="font-mono-jet font-bold text-[#4ade80]">${aiMetrics.simNet.toFixed(2)}</p>
              <p className="text-[9px] text-neutral-600">− ${aiMetrics.costs.toFixed(2)} costos</p>
            </div>
          </div>
        )}
      </div>

      {/* LimoSys Evaluator */}
      <div className="bg-[#0a0a0a] border border-[#1e1e1e] rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[14px] font-black text-white">LimoSys Evaluator</p>
            <p className="text-[9px] text-neutral-500">Umbrales mínimos para aceptar ofertas</p>
          </div>
          <button onClick={() => setLimoOverlayOn(v => !v)}
            className="relative w-11 h-6 rounded-full transition-colors shrink-0"
            style={{ background: limoOverlayOn ? "#00cc44" : "#2a2a2a" }}>
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${limoOverlayOn ? "left-[22px]" : "left-0.5"}`} />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[9px] text-neutral-500 uppercase tracking-wider block mb-1">Mín $/hr</label>
            <input type="number" min={0} step={1} value={limoMinHourly}
              onChange={e => setLimoMinHourly(parseFloat(e.target.value) || 0)}
              className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2.5 font-mono-jet text-[20px] font-bold text-[#FFFF00] text-center outline-none focus:border-[#FFFF00]/40" />
          </div>
          <div>
            <label className="text-[9px] text-neutral-500 uppercase tracking-wider block mb-1">Mín $/mi</label>
            <input type="number" min={0} step={0.1} value={limoMinPerMile}
              onChange={e => setLimoMinPerMile(parseFloat(e.target.value) || 0)}
              className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2.5 font-mono-jet text-[20px] font-bold text-[#FFFF00] text-center outline-none focus:border-[#FFFF00]/40" />
          </div>
        </div>
        <button
          onClick={() => {
            try { localStorage.setItem("ic-limo-min-hr", String(limoMinHourly)); localStorage.setItem("ic-limo-min-mi", String(limoMinPerMile)); } catch {}
            showToast("✓ Parámetros LimoSys guardados");
          }}
          className="w-full py-2.5 rounded-xl text-[12px] font-black tracking-wider text-black"
          style={{ background: "linear-gradient(90deg,#f6dd8c,#d9b64f)" }}
        >Apply $/mi and $/hr to Trip Filters</button>

        <div className="h-px bg-[#1e1e1e]" />

        {/* How-to steps */}
        <div className="bg-[#050f05] border border-[#00FF00]/20 rounded-xl p-3 space-y-1.5">
          <p className="text-[10px] font-black text-[#00FF00]/70 uppercase tracking-widest mb-2">¿Cómo usar?</p>
          {[
            { n: "1", t: "En LimoSys, toma un screenshot", s: "Botón lateral + subir volumen en iPhone" },
            { n: "2", t: "Toca el botón verde abajo", s: "Selecciona desde Fototeca / Photo Library" },
            { n: "3", t: "Gemini analiza TODAS las ofertas", s: "Overlay flotante aparece con veredicto" },
          ].map(step => (
            <div key={step.n} className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black shrink-0 mt-0.5"
                style={{ background: "#00FF00", color: "#000" }}>{step.n}</span>
              <div>
                <p className="text-[11px] font-bold text-white">{step.t}</p>
                <p className="text-[9px] text-neutral-500">{step.s}</p>
              </div>
            </div>
          ))}
        </div>

        <button onClick={() => limoInputRef.current?.click()} disabled={limoCapturing}
          className="w-full py-3 rounded-xl text-[13px] font-black tracking-wide flex items-center justify-center gap-2 active:scale-95 transition-all"
          style={{ background: "#000", border: "2px solid #00FF00", color: "#00FF00", boxShadow: "0 0 18px rgba(0,255,0,0.12)" }}>
          {limoCapturing
            ? <><div className="w-4 h-4 rounded-full border-2 border-[#00FF00] border-t-transparent animate-spin" />Analizando con Gemini…</>
            : <>📸 Paso 2: Seleccionar Screenshot de LimoSys</>}
        </button>
        {limoError && <p className="text-red-400 text-[11px] text-center">{limoError}</p>}

        {limoOffers.length > 0 && (
          <div className="space-y-2">
            <p className="text-[9px] text-neutral-500 uppercase tracking-wider">
              {limoOffers.length} oferta{limoOffers.length > 1 ? "s" : ""} detectada{limoOffers.length > 1 ? "s" : ""}
            </p>
            {limoOffers.map((o, i) => (
              <div key={i} className="rounded-xl p-3 relative"
                style={{ background: "#000", border: `1.5px solid ${o.decision === "TOMAR" ? "#00FF00" : "#FF0000"}` }}>
                {o.isBest && (
                  <span className="absolute top-2 right-2 text-[8px] font-black px-1.5 py-0.5 rounded-full"
                    style={{ background: "#FFFF00", color: "#000" }}>⭐ MEJOR</span>
                )}
                <div className="flex items-center gap-3 mb-1 pr-12">
                  <span className="text-[14px] font-black" style={{ color: o.decision === "TOMAR" ? "#00FF00" : "#FF0000" }}>
                    {o.decision === "TOMAR" ? "🟢 TOMAR" : "🔴 RECHAZAR"}
                  </span>
                  <span className="font-mono-jet text-[15px] font-black text-[#FFFF00]">${o.price.toFixed(2)}</span>
                  <span className="font-mono-jet text-[12px] font-bold text-white ml-auto">💰 ${o.hourlyRate.toFixed(2)}/hr</span>
                </div>
                <p className="text-[11px] font-bold text-white">📍 {o.origin} ➔ {o.destination}</p>
                <p className="text-[9px] text-neutral-500 mt-0.5">⏱️ {o.pickupTime} · {o.company} · ${o.perMileRate.toFixed(2)}/mi</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <input ref={limoInputRef} type="file" accept="image/*,image/heic,image/heif" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleLimoCapture(f); if (limoInputRef.current) limoInputRef.current.value = ""; }} />
    </div>
  );

  // ─── Render ───────────────────────────────────────────────────
  return (
    <div className="h-[100dvh] min-h-0 overflow-hidden bg-black text-white selection:bg-[#d9b64f]/30">
      <div className="w-full max-w-[480px] mx-auto h-full min-h-0 bg-black border-x border-[#121212] relative flex flex-col overflow-hidden">

        {/* TRIPS sub-navigation — directly below the system status bar */}
        {activeTab === "TRIPS" && (
          <div className="flex-shrink-0 z-20 bg-black px-4 pt-[max(8px,env(safe-area-inset-top))] pb-2">
            <div className="flex gap-2">
              {([
                { key: "ENTRY",    label: "💰 Daily Entry", badge: 0 },
                { key: "REGISTER", label: "📋 Queue",   badge: pendingTrips.length },
                { key: "LEDGER",   label: "📖 Ledger",  badge: postedTrips.length },
              ] as { key: TripsTab; label: string; badge: number }[]).map(({ key, label, badge }) => {
                const active = tripsTab === key;
                return (
                  <button key={key} onClick={() => setTripsTab(key)}
                    className={`flex-1 h-8 rounded-full text-[9px] font-bold tracking-[0.1em] border transition-all relative ${
                      active
                        ? "bg-[#1a1200] border-[#f6dd8c]/40 text-[#f6dd8c]"
                        : "bg-transparent border-[#2a2a2a] text-neutral-500 hover:text-neutral-300"
                    }`}>
                    {label}
                    {badge > 0 && (
                      <span className={`absolute -top-1.5 -right-1 text-[7px] font-bold min-w-[14px] h-[14px] flex items-center justify-center rounded-full px-[3px] ${
                        key === "LEDGER" ? "bg-[#4ade80]/25 text-[#4ade80]" : "bg-[#facc15]/25 text-[#f6dd8c]"
                      }`}>{badge}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain px-4 pb-36 pt-3"
          style={{ scrollbarGutter: "stable" }}>
          {activeTab === "DASHBOARD" && DashboardContent}
          {activeTab === "FINANCES"  && FinancesContent}
          {activeTab === "TRIPS" && tripsTab === "ENTRY"    && EntryFormContent}
          {activeTab === "TRIPS" && tripsTab === "REGISTER" && RegisterContent}
          {activeTab === "TRIPS" && tripsTab === "LEDGER"   && LedgerContent}
          {activeTab === "EXPENSES"  && ExpensesContent}
          {activeTab === "REPORTS"   && ReportsContent}
          {activeTab === "AI"        && AIAssistantContent}
          {activeTab === "INVENTORY" && <MigrationInventory userId={userId} />}
        </div>

        {/* ── Broadcast Eval Modal ─────────────────────────────────────────── */}
        {showBroadcastModal && (() => {
          // Per-base stats computed inline for modal (week start mirrors _finWeekStart)
          const _bwd = currentTime.getDay();
          const _bMon = new Date(currentTime);
          _bMon.setDate(currentTime.getDate() + (_bwd === 0 ? -6 : 1 - _bwd));
          const _bWeekStart = toYYYYMMDD(_bMon);
          const _bNet = (t: Trip) => (t.earnings||0)+(t.tips||0)+(t.extra||0)+(t.otherCash||0)+(t.toll||0);
          const _bByPlat: Record<string,{week:number;total:number;count:number;weekCount:number}> = {};
          trips.forEach(t => {
            if (!_bByPlat[t.platform]) _bByPlat[t.platform] = { week:0, total:0, count:0, weekCount:0 };
            const n = _bNet(t);
            _bByPlat[t.platform].total += n;
            _bByPlat[t.platform].count++;
            if (t.date >= _bWeekStart) { _bByPlat[t.platform].week += n; _bByPlat[t.platform].weekCount++; }
          });
          const _bRows = Object.entries(_bByPlat).sort((a,b)=>b[1].week-a[1].week);

          const recColor = broadcastResult?.recommendation === "GO" ? "#4ade80"
            : broadcastResult?.recommendation === "SKIP" ? "#f87171" : "#facc15";
          const recBg = broadcastResult?.recommendation === "GO"
            ? "linear-gradient(135deg,#071410,#0a1a10)"
            : broadcastResult?.recommendation === "SKIP"
            ? "linear-gradient(135deg,#140707,#1a0a0a)"
            : "linear-gradient(135deg,#141000,#1a1600)";
          const recBorder = broadcastResult?.recommendation === "GO"
            ? "rgba(74,222,128,0.28)" : broadcastResult?.recommendation === "SKIP"
            ? "rgba(248,113,113,0.28)" : "rgba(250,204,21,0.28)";

          return (
            <div className="fixed inset-0 z-[60] bg-black/96 flex flex-col"
              style={{ paddingTop:'env(safe-area-inset-top)', paddingBottom:'env(safe-area-inset-bottom)' }}>

              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#1c1c1c] flex-shrink-0">
                <div>
                  <p className="text-[12px] font-black text-[#c4b5fd] tracking-[0.18em]">📡 BROADCAST</p>
                  <p className="text-[9px] text-neutral-600 tracking-[0.1em] mt-0.5">AI JOB EVALUATOR · NYC TRAFFIC</p>
                </div>
                <button onClick={() => { setShowBroadcastModal(false); setBroadcastResult(null); setBroadcastError(null); setBroadcastCapturing(false); }}
                  className="w-8 h-8 rounded-full bg-[#1e1e1e] flex items-center justify-center text-neutral-500 text-[13px]">✕</button>
              </div>

              {/* Scrollable body */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

                {/* ── Capture button (idle) */}
                {!broadcastCapturing && !broadcastResult && !broadcastError && (
                  <div>
                    <button onClick={() => broadcastInputRef.current?.click()}
                      className="w-full h-[68px] rounded-2xl flex items-center justify-center gap-3 font-bold text-[14px] tracking-wide transition-all active:scale-[0.97]"
                      style={{ background:"linear-gradient(135deg,#110d1e,#0d0a18)", border:"1.5px solid rgba(167,139,250,0.35)", color:"#c4b5fd" }}>
                      <span className="text-[26px]">📸</span>
                      Capture Job Offer
                    </button>
                    <p className="text-[10px] text-neutral-600 text-center mt-2">Photo or screenshot of any rideshare job offer</p>
                  </div>
                )}

                {/* ── AI processing */}
                {broadcastCapturing && (
                  <div className="flex flex-col items-center justify-center py-14 gap-5">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center"
                      style={{ background:"#0e0817", border:"1.5px solid rgba(167,139,250,0.3)" }}>
                      <span className="text-[30px]">🤖</span>
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-[#c4b5fd] text-center tracking-wide animate-pulse">ANALYZING JOB…</p>
                      <p className="text-[11px] text-neutral-500 text-center mt-1">Checking traffic + earnings potential</p>
                    </div>
                    <div className="flex gap-[6px]">
                      {[0,1,2].map(i => (
                        <div key={i} className="w-2 h-2 rounded-full bg-[#a78bfa] animate-bounce"
                          style={{ animationDelay: i*0.15+"s" }} />
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Error */}
                {broadcastError && !broadcastCapturing && (
                  <div className="bg-[#1a0808] border border-[#f87171]/20 rounded-2xl p-5 text-center space-y-2">
                    <p className="text-[22px]">⚠️</p>
                    <p className="text-[13px] text-[#f87171] font-bold">Evaluation failed</p>
                    <p className="text-[11px] text-neutral-400 leading-relaxed">{broadcastError}</p>
                    <button onClick={() => { setBroadcastError(null); broadcastInputRef.current?.click(); }}
                      className="mt-1 text-[11px] text-[#a78bfa] font-bold">Try again →</button>
                  </div>
                )}

                {/* ── Result card */}
                {broadcastResult && !broadcastCapturing && (() => {
                  const ev = broadcastResult;
                  return (
                    <div className="rounded-2xl overflow-hidden"
                      style={{ background: recBg, border: `1.5px solid ${recBorder}` }}>

                      {/* Recommendation hero */}
                      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
                        <span className="text-[38px] leading-none">
                          {ev.recommendation === "GO" ? "✅" : ev.recommendation === "SKIP" ? "❌" : "⚠️"}
                        </span>
                        <div>
                          <p className="text-[30px] font-black leading-none" style={{ color: recColor }}>{ev.recommendation}</p>
                          <p className="text-[9px] font-bold tracking-[0.14em] mt-0.5 opacity-60" style={{ color: recColor }}>
                            {ev.confidence.toUpperCase()} CONFIDENCE
                          </p>
                        </div>
                        {ev.estimatedNetDollars > 0 && (
                          <div className="ml-auto text-right">
                            <p className="text-[24px] font-black text-white leading-tight">${ev.estimatedNetDollars.toFixed(2)}</p>
                            <p className="text-[9px] text-neutral-500 tracking-wide">EST. NET</p>
                            {ev.estimatedHourlyRate > 0 && (
                              <p className="text-[10px] font-bold text-[#f6dd8c] mt-0.5">${ev.estimatedHourlyRate.toFixed(0)}/hr</p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Job details */}
                      {(ev.jobDetails.pickup || ev.jobDetails.dropoff) && (
                        <div className="mx-4 mb-3 bg-black/30 rounded-xl p-3 space-y-2">
                          {ev.jobDetails.pickup && (
                            <div className="flex gap-2 items-start">
                              <span className="text-[9px] text-neutral-500 w-10 shrink-0 pt-0.5 font-bold">FROM</span>
                              <span className="text-[12px] text-white font-medium leading-tight">{ev.jobDetails.pickup}</span>
                            </div>
                          )}
                          {ev.jobDetails.dropoff && (
                            <div className="flex gap-2 items-start">
                              <span className="text-[9px] text-neutral-500 w-10 shrink-0 pt-0.5 font-bold">TO</span>
                              <span className="text-[12px] text-white font-medium leading-tight">{ev.jobDetails.dropoff}</span>
                            </div>
                          )}
                          <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1.5 border-t border-white/[0.06]">
                            {ev.jobDetails.fare !== "not shown" && (
                              <div><p className="text-[12px] text-white font-bold">{ev.jobDetails.fare}</p><p className="text-[8px] text-neutral-500 tracking-wide">FARE</p></div>
                            )}
                            {ev.jobDetails.distance !== "not shown" && (
                              <div><p className="text-[12px] text-white font-bold">{ev.jobDetails.distance}</p><p className="text-[8px] text-neutral-500 tracking-wide">DIST</p></div>
                            )}
                            {ev.jobDetails.estimatedDuration !== "not shown" && (
                              <div><p className="text-[12px] text-white font-bold">{ev.jobDetails.estimatedDuration}</p><p className="text-[8px] text-neutral-500 tracking-wide">TIME</p></div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Traffic note */}
                      {ev.trafficNote && (
                        <div className="mx-4 mb-3 flex gap-2 items-start bg-black/20 rounded-xl px-3 py-2">
                          <span className="text-[14px] shrink-0">🚦</span>
                          <p className="text-[11px] text-neutral-400 leading-relaxed">{ev.trafficNote}</p>
                        </div>
                      )}

                      {/* Factors */}
                      {ev.factors.length > 0 && (
                        <div className="mx-4 mb-3 space-y-1.5">
                          {ev.factors.map((f, i) => (
                            <div key={i} className="flex gap-2 items-start">
                              <span className="text-[10px] text-neutral-600 mt-0.5 shrink-0">•</span>
                              <p className="text-[11px] text-neutral-300 leading-relaxed">{f}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Tip */}
                      {ev.tip && (
                        <div className="mx-4 mb-3 flex gap-2 items-start">
                          <span className="text-[13px] shrink-0">💡</span>
                          <p className="text-[11px] text-neutral-400 italic leading-relaxed">{ev.tip}</p>
                        </div>
                      )}

                      {/* Accept / Skip buttons */}
                      <div className="flex gap-2 px-4 pb-4">
                        <button onClick={() => { markBroadcastAccepted(ev.id, true); showToast("✅ Logged as accepted"); }}
                          className={`flex-1 h-10 rounded-xl text-[12px] font-bold border transition-all ${ev.accepted === true ? "bg-[#4ade80]/20 text-[#4ade80] border-[#4ade80]/40" : "bg-transparent text-neutral-500 border-[#2e2e2e]"}`}>
                          ✅ Took it
                        </button>
                        <button onClick={() => { markBroadcastAccepted(ev.id, false); showToast("❌ Logged as skipped"); }}
                          className={`flex-1 h-10 rounded-xl text-[12px] font-bold border transition-all ${ev.accepted === false ? "bg-[#f87171]/15 text-[#f87171] border-[#f87171]/35" : "bg-transparent text-neutral-500 border-[#2e2e2e]"}`}>
                          ❌ Skipped
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {/* Evaluate another button (shown after a result) */}
                {broadcastResult && !broadcastCapturing && (
                  <button onClick={() => { setBroadcastResult(null); setBroadcastError(null); setTimeout(() => broadcastInputRef.current?.click(), 80); }}
                    className="w-full h-11 rounded-xl text-[12px] font-bold text-[#a78bfa] border border-[#a78bfa]/20">
                    📸 Evaluate another job
                  </button>
                )}

                {/* ── Per-base earnings stats */}
                {!broadcastCapturing && (
                  <div>
                    <p className="text-[10px] font-bold text-neutral-600 tracking-[0.12em] uppercase mb-2.5">
                      Earnings by Base · This Week
                    </p>
                    {_bRows.length === 0 ? (
                      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl py-6 text-center">
                        <p className="text-[11px] text-neutral-600">No trips this week yet</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {_bRows.map(([plat, vals]) => {
                          const avgPerTrip = vals.count > 0 ? vals.total / vals.count : 0;
                          return (
                            <div key={plat}
                              className="bg-[#0c0c0c] border border-[#1e1e1e] rounded-xl px-3 py-2.5 flex items-center gap-3">
                              <div className="w-[30px] h-[30px] rounded-full bg-[#1e1e1e] border border-[#333] flex items-center justify-center text-[11px] font-bold text-neutral-400 shrink-0">{plat.charAt(0)}</div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[12px] font-bold text-white truncate">{plat}</p>
                                <p className="text-[9px] text-neutral-500">
                                  {vals.weekCount} trip{vals.weekCount !== 1 ? "s" : ""} · avg ${avgPerTrip.toFixed(2)}
                                </p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-[15px] font-black text-[#f6dd8c]">${vals.week.toFixed(2)}</p>
                                <p className="text-[8px] text-neutral-600">THIS WEEK</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* ── Recent eval history (shown on idle screen only) */}
                {!broadcastCapturing && !broadcastResult && broadcastHistory.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-neutral-600 tracking-[0.12em] uppercase mb-2.5">Recent Evaluations</p>
                    <div className="space-y-1.5">
                      {broadcastHistory.slice(0, 6).map(ev => (
                        <button key={ev.id} onClick={() => setBroadcastResult(ev)}
                          className="w-full bg-[#0c0c0c] border border-[#1e1e1e] rounded-xl px-3 py-2.5 flex items-center gap-3 text-left active:opacity-70">
                          <span className="text-[18px] shrink-0">
                            {ev.recommendation === "GO" ? "✅" : ev.recommendation === "SKIP" ? "❌" : "⚠️"}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-bold text-white truncate">
                              {ev.jobDetails.pickup || "Job offer"}
                              {ev.jobDetails.dropoff ? ` → ${ev.jobDetails.dropoff}` : ""}
                            </p>
                            <p className="text-[9px] text-neutral-600">
                              {new Date(ev.timestamp).toLocaleString("en-US", { month:"short", day:"numeric", hour:"numeric", minute:"2-digit" })}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {ev.estimatedNetDollars > 0 && (
                              <p className="text-[12px] font-bold text-neutral-400">${ev.estimatedNetDollars.toFixed(2)}</p>
                            )}
                            {ev.accepted !== undefined && (
                              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${ev.accepted ? "bg-[#4ade80]/15 text-[#4ade80]" : "bg-[#f87171]/15 text-[#f87171]"}`}>
                                {ev.accepted ? "TOOK" : "SKIP"}
                              </span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

              </div>{/* end scrollable body */}

              {/* Hidden file input */}
              <input ref={broadcastInputRef} type="file" accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleBroadcastCapture(f); e.target.value = ""; }} />
            </div>
          );
        })()}

        {/* ── Voice / Trip-Flow Panel ──────────────────────────────────────── */}
        {showVoicePanel && (
          <div className="fixed bottom-[138px] left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-[440px] z-50"
            style={{ filter: "drop-shadow(0 0 24px rgba(0,0,0,0.9))" }}>
            <div className="bg-[#0e0e0e] rounded-2xl overflow-hidden"
              style={{ border: voiceTripStep === "started" ? "1px solid rgba(74,222,128,0.25)" : voiceTripStep === "listening" ? "1px solid rgba(239,68,68,0.3)" : voiceTripStep === "confirm" ? "1px solid rgba(250,204,21,0.35)" : "1px solid rgba(250,204,21,0.2)" }}>

              {/* ── STEP 1: Trip in progress ── */}
              {voiceTripStep === "started" && (
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#4ade80] animate-pulse" />
                      <span className="text-[11px] font-black text-[#4ade80] tracking-[0.12em]">TRIP IN PROGRESS</span>
                    </div>
                    <span className="text-[13px] font-mono-jet text-white font-bold">
                      {String(Math.floor(vtElapsed / 60)).padStart(2,"0")}:{String(vtElapsed % 60).padStart(2,"0")}
                    </span>
                  </div>
                  <div className="bg-[#0a1a0a] rounded-xl px-3 py-2.5 space-y-1">
                    <p className="text-[9px] text-neutral-600 font-bold uppercase tracking-[0.1em]">📍 Pickup</p>
                    {vtPickup ? (
                      <p className="text-[12px] text-white leading-snug">{vtPickup.addr}</p>
                    ) : (
                      <p className="text-[11px] text-neutral-500 animate-pulse italic">Getting GPS…</p>
                    )}
                  </div>
                  <button
                    onClick={endVoiceTripFlow}
                    disabled={!vtPickup}
                    className="w-full h-12 rounded-xl font-black text-[13px] tracking-[0.08em] transition-all active:scale-[0.98]"
                    style={{
                      background: vtPickup ? "#facc15" : "#1e1e1e",
                      color: vtPickup ? "#000" : "#555",
                    }}>
                    🏁 END TRIP + SAY FARE
                  </button>
                  <button onClick={resetVoiceTripFlow} className="w-full text-[10px] text-neutral-600 py-0.5">Cancel trip</button>
                </div>
              )}

              {/* ── STEP 2: Listening for fare ── */}
              {voiceTripStep === "listening" && (
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#f87171] animate-pulse" />
                    <span className="text-[11px] font-black text-[#f87171] tracking-[0.12em]">
                      {voiceListening ? "LISTENING FOR FARE…" : voiceParsing ? "UNDERSTANDING…" : voiceError ? "TRY AGAIN" : "READY"}
                    </span>
                  </div>
                  {vtDropoff && (
                    <div className="bg-[#1a0f00] rounded-xl px-3 py-2 space-y-1">
                      <p className="text-[9px] text-neutral-600 font-bold uppercase tracking-[0.1em]">🏁 Dropoff</p>
                      <p className="text-[12px] text-white leading-snug">{vtDropoff.addr}</p>
                    </div>
                  )}
                  <div className="bg-[#111] rounded-xl px-3 py-3 min-h-[48px] flex items-center">
                    {voiceListening && (
                      <p className="text-[14px] text-white leading-snug">
                        {voiceTranscript || <span className="text-neutral-500 italic text-[13px]">Speak now…</span>}
                      </p>
                    )}
                    {voiceParsing && !voiceListening && (
                      <p className="text-[13px] text-neutral-300 italic truncate">"{voiceTranscript}"</p>
                    )}
                    {voiceError && <p className="text-[12px] text-[#f87171]">{voiceError}</p>}
                    {!voiceListening && !voiceParsing && !voiceError && (
                      <p className="text-[12px] text-neutral-500 italic">Say: "forty-five fifty, two tip, three toll"</p>
                    )}
                  </div>
                  {voiceError && (
                    <button onClick={() => { setVoiceError(null); startVoiceForFare(); }}
                      className="w-full h-10 rounded-xl bg-[#1e1e1e] text-[#facc15] font-bold text-[12px]">
                      🎤 Try again
                    </button>
                  )}
                  <button onClick={resetVoiceTripFlow} className="w-full text-[10px] text-neutral-600 py-0.5">Cancel</button>
                </div>
              )}

              {/* ── STEP 3: Confirm & Save ── */}
              {voiceTripStep === "confirm" && vtFare && (
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-[#facc15] tracking-[0.12em]">CONFIRM TRIP</span>
                    <span className="text-[18px] font-black font-mono-jet text-white">
                      ${(parseFloat(vtFare.earnings || "0") + parseFloat(vtFare.tips || "0") + parseFloat(vtFare.toll || "0") - parseFloat(vtFare.platformFee || "0")).toFixed(2)}
                    </span>
                  </div>
                  {/* Route */}
                  <div className="bg-[#111] rounded-xl px-3 py-2.5 space-y-2">
                    {vtPickup && (
                      <div className="flex items-start gap-2">
                        <span className="text-[11px] text-[#4ade80] mt-0.5 flex-shrink-0">📍</span>
                        <p className="text-[11px] text-neutral-300 leading-snug">{vtPickup.addr}</p>
                      </div>
                    )}
                    {vtDropoff && (
                      <div className="flex items-start gap-2">
                        <span className="text-[11px] text-[#facc15] mt-0.5 flex-shrink-0">🏁</span>
                        <p className="text-[11px] text-neutral-300 leading-snug">{vtDropoff.addr}</p>
                      </div>
                    )}
                    {vtStartTime && (
                      <p className="text-[9px] text-neutral-600 font-mono-jet pl-5">
                        {Math.round((Date.now() - vtStartTime.getTime()) / 60000)} min trip
                      </p>
                    )}
                  </div>
                  {/* Fare breakdown — editable */}
                  <div className="grid grid-cols-2 gap-1.5">
                    {([
                      { label: "Fare",         key: "earnings",    color: "#facc15" },
                      { label: "Tips",         key: "tips",        color: "#4ade80" },
                      { label: "Toll",         key: "toll",        color: "#818cf8" },
                      { label: "Platform fee", key: "platformFee", color: "#f87171" },
                    ] as const).map(({ label, key, color }) => (
                      <div key={key} className="bg-[#111] rounded-xl px-2.5 py-2">
                        <p className="text-[8px] font-bold uppercase tracking-[0.1em]" style={{ color }}>{label}</p>
                        <input
                          type="number" inputMode="decimal"
                          value={vtFare[key]}
                          onChange={e => setVtFare(prev => prev ? { ...prev, [key]: e.target.value } : prev)}
                          className="w-full bg-transparent text-[14px] font-bold font-mono-jet text-white outline-none mt-0.5"
                        />
                      </div>
                    ))}
                  </div>
                  {/* Platform */}
                  <div className="bg-[#111] rounded-xl px-3 py-2">
                    <p className="text-[8px] font-bold uppercase tracking-[0.1em] text-neutral-500 mb-1">Platform</p>
                    <select
                      value={vtFare.platform}
                      onChange={e => setVtFare(prev => prev ? { ...prev, platform: e.target.value } : prev)}
                      className="w-full bg-transparent text-[13px] text-white outline-none">
                      {["Uber","Lyft","Via","Curb","Alto","Arro","HopSkipDrive","Revel","Other"].map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={confirmAndSaveVoiceTrip}
                    disabled={vtSaving}
                    className="w-full rounded-xl font-black text-[14px] tracking-[0.06em] transition-all active:scale-[0.98]"
                    style={{ background: "#facc15", color: "#000", height: "52px" }}>
                    {vtSaving ? "Saving…" : "✓ SAVE TRIP"}
                  </button>
                  <button onClick={resetVoiceTripFlow} className="w-full text-[10px] text-neutral-600 py-0.5">Discard</button>
                </div>
              )}

              {/* ── IDLE: legacy voice assistant (expense / clock commands) ── */}
              {voiceTripStep === "idle" && (
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{
                        background: voiceListening ? "#1a0606" : voiceParsing ? "#1a1400" : "#1a1a1a",
                        border: voiceListening ? "1px solid rgba(239,68,68,0.4)" : voiceParsing ? "1px solid rgba(250,204,21,0.3)" : "1px solid #2e2e2e",
                      }}>
                      <span className="text-[15px]">
                        {voiceListening ? "🔴" : voiceParsing ? "🤖" : voiceError ? "⚠️" : "🎤"}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      {voiceListening && (
                        <>
                          <p className="text-[11px] font-bold text-[#f87171] animate-pulse tracking-wide">LISTENING…</p>
                          <p className="text-[14px] text-white mt-1 leading-snug min-h-[20px]">
                            {voiceTranscript || <span className="text-neutral-500 italic text-[13px]">Speak now…</span>}
                          </p>
                        </>
                      )}
                      {voiceParsing && !voiceListening && (
                        <>
                          <p className="text-[11px] font-bold text-[#facc15] tracking-wide">UNDERSTANDING…</p>
                          <p className="text-[13px] text-neutral-300 mt-1 leading-snug italic truncate">"{voiceTranscript}"</p>
                        </>
                      )}
                      {voiceError && !voiceListening && !voiceParsing && (
                        <>
                          <p className="text-[11px] font-bold text-[#f87171]">Couldn't understand</p>
                          <p className="text-[12px] text-neutral-400 mt-0.5 leading-snug">{voiceError}</p>
                          <button onClick={() => { setVoiceError(null); startVoice(); }}
                            className="mt-2 text-[11px] text-[#facc15] font-bold">Try again →</button>
                        </>
                      )}
                      {!voiceListening && !voiceParsing && !voiceError && (
                        <p className="text-[13px] text-neutral-400">Voice commands</p>
                      )}
                    </div>
                    <button
                      onClick={() => { stopVoice(); setShowVoicePanel(false); setVoiceError(null); setVoiceParsing(false); }}
                      className="w-7 h-7 rounded-full bg-[#1e1e1e] flex items-center justify-center text-neutral-500 text-[11px] flex-shrink-0">
                      ✕
                    </button>
                  </div>
                  {!voiceListening && !voiceParsing && !voiceError && (
                    <div className="mt-3 pt-3 border-t border-[#1e1e1e] space-y-1">
                      <p className="text-[9px] text-neutral-600 font-bold uppercase tracking-[0.12em] mb-1.5">Say:</p>
                      {[
                        "\"Spent sixty on gas at BP\"",
                        "\"Clock in\" · \"Clock out\" · \"Break\"",
                      ].map((ex, i) => <p key={i} className="text-[10px] text-neutral-500 leading-relaxed">{ex}</p>)}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* LimoSys Draggable Overlay */}
        {limoOverlayOn && limoOffers.length > 0 && (() => {
          const cur = limoOffers[Math.min(limoOfferIdx, limoOffers.length - 1)];
          const total = limoOffers.length;
          const idx = Math.min(limoOfferIdx, total - 1);
          return (
            <div
              className="fixed z-[100] select-none"
              style={{
                left: `calc(50% + ${limoOverlayPos.x}px)`,
                top: `${limoOverlayPos.y}px`,
                transform: "translateX(-50%)",
                width: "min(95vw, 440px)",
                background: "#000000",
                border: `2px solid ${cur.decision === "TOMAR" ? "#00FF00" : "#FF0000"}`,
                borderRadius: "14px",
                boxShadow: `0 0 32px ${cur.decision === "TOMAR" ? "rgba(0,255,0,0.28)" : "rgba(255,0,0,0.28)"}`,
                cursor: "grab",
              }}
              onPointerDown={onLimoDragStart}
              onPointerMove={onLimoDragMove}
              onPointerUp={onLimoDragEnd}
              onPointerCancel={onLimoDragEnd}
            >
              {/* Handle bar */}
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#111]">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-neutral-700 font-mono-jet tracking-widest">⠿⠿ LIMOSYS AI ⠿⠿</span>
                  {cur.isBest && <span className="text-[8px] font-black px-1 py-0.5 rounded" style={{ background: "#FFFF00", color: "#000" }}>⭐ MEJOR</span>}
                </div>
                <div className="flex items-center gap-1">
                  {/* Navigation arrows */}
                  {total > 1 && (
                    <>
                      <button onPointerDown={e => e.stopPropagation()}
                        onClick={() => setLimoOfferIdx(i => Math.max(0, i - 1))}
                        disabled={idx === 0}
                        className="w-6 h-6 flex items-center justify-center text-[14px] font-black disabled:opacity-30 active:text-white text-neutral-400">‹</button>
                      <span className="font-mono-jet text-[9px] text-neutral-500">{idx + 1}/{total}</span>
                      <button onPointerDown={e => e.stopPropagation()}
                        onClick={() => setLimoOfferIdx(i => Math.min(total - 1, i + 1))}
                        disabled={idx === total - 1}
                        className="w-6 h-6 flex items-center justify-center text-[14px] font-black disabled:opacity-30 active:text-white text-neutral-400">›</button>
                    </>
                  )}
                  <span className="text-[9px] text-neutral-600 font-mono-jet ml-1">{cur.company}</span>
                  <button onPointerDown={e => e.stopPropagation()} onClick={() => setLimoOverlayOn(false)}
                    className="text-neutral-600 text-[12px] active:text-white w-5 h-5 flex items-center justify-center ml-1">✕</button>
                </div>
              </div>
              {/* Row 1: Decision | Price | $/hr | time */}
              <div className="flex items-center justify-between px-3 py-2.5 gap-2">
                <span className="text-[15px] font-black shrink-0" style={{ color: cur.decision === "TOMAR" ? "#00FF00" : "#FF0000" }}>
                  {cur.decision === "TOMAR" ? "🟢 ¡TOMAR!" : "🔴 RECHAZAR"}
                </span>
                <span className="font-mono-jet text-[18px] font-black text-[#FFFF00]">${cur.price.toFixed(2)}</span>
                <span className="font-mono-jet text-[13px] font-bold text-white">💰 ${cur.hourlyRate.toFixed(2)}/hr</span>
                <span className="font-mono-jet text-[11px] font-bold text-[#FFFF00] shrink-0">⏱️ {cur.pickupTime}</span>
              </div>
              {/* Row 2: Route + $/mi */}
              <div className="px-3 pb-3 flex items-end justify-between">
                <span className="text-[13px] font-bold text-white">📍 {cur.origin} ➔ {cur.destination}</span>
                <span className="font-mono-jet text-[11px] text-neutral-400 shrink-0 ml-2">${cur.perMileRate.toFixed(2)}/mi</span>
              </div>
            </div>
          );
        })()}

        {/* ✨ Gemini Assistant button */}
        <button
          onClick={() => setShowGeminiChat(v => !v)}
          className="fixed bottom-[76px] left-4 z-50 w-[52px] h-[52px] rounded-full flex items-center justify-center transition-all active:scale-90"
          style={{
            background: showGeminiChat ? "#0a1a14" : "#111111",
            border: showGeminiChat ? "2px solid rgba(74,222,128,0.55)" : "2px solid rgba(74,222,128,0.22)",
            boxShadow: showGeminiChat
              ? "0 0 22px rgba(74,222,128,0.25), 0 4px 16px rgba(0,0,0,0.7)"
              : "0 0 18px rgba(74,222,128,0.06), 0 4px 16px rgba(0,0,0,0.6)",
          }}>
          <span className="text-[22px] select-none">✨</span>
          {geminiLoading && (
            <span className="absolute inset-[-4px] rounded-full border-2 border-[#4ade80]/30 animate-ping pointer-events-none" />
          )}
        </button>

        {/* ✨ Gemini Assistant Chat Panel */}
        {showGeminiChat && (
          <div
            className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-[55] flex flex-col"
            style={{
              height: "76vh",
              background: "#080808",
              borderTop: "1px solid #1e1e1e",
              borderLeft: "1px solid #141414",
              borderRight: "1px solid #141414",
              borderRadius: "20px 20px 0 0",
              boxShadow: "0 -8px 40px rgba(74,222,128,0.08)",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a1a1a] shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-[18px]">✨</span>
                <div>
                  <p className="text-[13px] font-bold text-[#4ade80] tracking-wide">IslandCity AI</p>
                  <p className="text-[9px] text-neutral-500 tracking-wider">Gemini · datos de tu turno en tiempo real</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {geminiMessages.length > 0 && (
                  <button
                    onClick={() => setGeminiMessages([])}
                    className="text-[10px] text-neutral-600 active:text-neutral-400 px-2 py-1"
                  >borrar</button>
                )}
                <button
                  onClick={() => setShowGeminiChat(false)}
                  className="w-7 h-7 rounded-full bg-[#1a1a1a] flex items-center justify-center text-neutral-400 active:text-white"
                >✕</button>
              </div>
            </div>

            {/* Message list */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ overscrollBehavior: "contain" }}>
              {geminiMessages.length === 0 && !geminiLoading && (
                <div className="flex flex-col items-center justify-center h-full gap-3 pb-8">
                  <span className="text-[40px]">✨</span>
                  <p className="text-[13px] text-neutral-400 text-center leading-relaxed px-6">
                    Pregúntame sobre tus ganancias, gastos, o estrategia de manejo. Puedes hablar o escribir.
                  </p>
                  {/* Quick prompts */}
                  {[
                    "¿Cuánto gané hoy?",
                    "¿Cuánto me falta para mi meta?",
                    "¿Cuánto gasté este mes?",
                  ].map(q => (
                    <button
                      key={q}
                      onClick={() => sendGeminiMessage(q)}
                      className="text-[12px] text-[#4ade80] border border-[#4ade80]/25 rounded-full px-4 py-1.5 active:bg-[#4ade80]/10"
                    >{q}</button>
                  ))}
                </div>
              )}
              {geminiMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                      msg.role === "user"
                        ? "bg-[#1a1400] text-[#f6dd8c] rounded-br-sm"
                        : "bg-[#0f1f0f] text-[#c8f0c8] rounded-bl-sm border border-[#1e3a1e]"
                    }`}
                    style={{ whiteSpace: "pre-wrap" }}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {geminiLoading && (
                <div className="flex justify-start">
                  <div className="bg-[#0f1f0f] border border-[#1e3a1e] rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1.5 items-center">
                    {[0,1,2].map(i => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#4ade80]/60 animate-bounce"
                        style={{ animationDelay: i * 0.15 + "s" }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={geminiEndRef} />
            </div>

            {/* Input bar */}
            <div
              className="shrink-0 flex items-center gap-2 px-3 py-2 border-t border-[#1a1a1a]"
              style={{ paddingBottom: "max(8px, env(safe-area-inset-bottom))" }}
            >
              {/* Mic button */}
              <button
                onClick={handleGeminiVoice}
                disabled={geminiLoading && !geminiChatRec}
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-90"
                style={{
                  background: geminiChatRec ? "#1a0505" : "#161616",
                  border: geminiChatRec ? "1.5px solid rgba(239,68,68,0.6)" : "1.5px solid #2a2a2a",
                }}
              >
                {geminiChatRec ? (
                  <>
                    <span className="text-[18px]">⏹</span>
                    <span className="absolute inset-[-3px] rounded-full border border-red-500/30 animate-ping pointer-events-none" />
                  </>
                ) : (
                  <span className="text-[18px]">🎤</span>
                )}
              </button>

              {/* Text input */}
              <input
                type="text"
                value={geminiInput}
                onChange={e => setGeminiInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendGeminiMessage(geminiInput); }}}
                placeholder="Escribe o habla con Gemini…"
                disabled={geminiLoading || geminiChatRec}
                className="flex-1 bg-[#111] border border-[#222] rounded-full px-4 py-2.5 text-[13px] text-white placeholder-neutral-600 outline-none focus:border-[#4ade80]/40"
              />

              {/* Send button */}
              <button
                onClick={() => sendGeminiMessage(geminiInput)}
                disabled={!geminiInput.trim() || geminiLoading}
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-90 disabled:opacity-30"
                style={{
                  background: geminiInput.trim() ? "linear-gradient(135deg,#1a3a1a,#0f2a0f)" : "#111",
                  border: geminiInput.trim() ? "1.5px solid rgba(74,222,128,0.5)" : "1.5px solid #222",
                }}
              >
                <span className="text-[16px]">↑</span>
              </button>
            </div>
          </div>
        )}

        {/* 📡 Broadcast button */}
        <button
          onClick={() => setShowBroadcastModal(true)}
          className="fixed bottom-[76px] right-[72px] z-50 w-[52px] h-[52px] rounded-full flex items-center justify-center transition-all active:scale-90"
          style={{
            background: showBroadcastModal ? "#0e0a1a" : "#111111",
            border: showBroadcastModal ? "2px solid rgba(167,139,250,0.6)" : "2px solid rgba(167,139,250,0.25)",
            boxShadow: showBroadcastModal
              ? "0 0 22px rgba(167,139,250,0.3), 0 4px 16px rgba(0,0,0,0.7)"
              : "0 0 18px rgba(167,139,250,0.06), 0 4px 16px rgba(0,0,0,0.6)",
          }}>
          <span className="text-[22px] select-none">📡</span>
        </button>

        {/* ── Mic / Trip-flow button ── */}
        <button
          onClick={() => {
            if (voiceTripStep === "started") { endVoiceTripFlow(); return; }
            if (voiceTripStep === "listening") { voiceListening ? stopVoice() : startVoiceForFare(); return; }
            if (voiceTripStep === "confirm") return; // locked during confirm
            // Idle: tap = start two-tap GPS trip flow
            startVoiceTripFlow();
          }}
          className="fixed bottom-[76px] right-4 z-50 w-[52px] h-[52px] rounded-full flex items-center justify-center transition-all active:scale-90"
          style={{
            background: voiceTripStep === "started" ? "#061a06" : voiceTripStep === "listening" || voiceListening ? "#1a0505" : voiceTripStep === "confirm" ? "#1a1400" : "#111111",
            border: voiceTripStep === "started" ? "2px solid rgba(74,222,128,0.55)" : voiceTripStep === "listening" || voiceListening ? "2px solid rgba(239,68,68,0.55)" : voiceTripStep === "confirm" ? "2px solid rgba(250,204,21,0.55)" : "2px solid rgba(250,204,21,0.28)",
            boxShadow: voiceTripStep === "started"
              ? "0 0 22px rgba(74,222,128,0.22), 0 4px 16px rgba(0,0,0,0.7)"
              : voiceListening
                ? "0 0 22px rgba(239,68,68,0.28), 0 4px 16px rgba(0,0,0,0.7)"
                : "0 0 18px rgba(250,204,21,0.08), 0 4px 16px rgba(0,0,0,0.6)",
          }}>
          {voiceParsing && voiceTripStep !== "started" ? (
            <div className="flex gap-[3px] items-center">
              {[0,1,2].map(i => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#facc15] animate-bounce"
                  style={{ animationDelay: i * 0.13 + "s" }} />
              ))}
            </div>
          ) : voiceTripStep === "started" ? (
            <span className="text-[20px] select-none">🏁</span>
          ) : voiceTripStep === "confirm" ? (
            <span className="text-[20px] select-none">✓</span>
          ) : (
            <span className="text-[22px] select-none">{voiceListening ? "⏹" : "🎤"}</span>
          )}
          {(voiceTripStep === "started") && (
            <span className="absolute inset-[-4px] rounded-full border-2 border-[#4ade80]/35 animate-ping pointer-events-none" />
          )}
          {voiceListening && voiceTripStep === "listening" && (
            <span className="absolute inset-[-4px] rounded-full border-2 border-[#f87171]/35 animate-ping pointer-events-none" />
          )}
        </button>

        {/* Bottom tab bar */}
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-40 bg-[#030303] border-t border-[#1c1c1c]"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div className="flex">
            {([
              { key: "DASHBOARD" as Tab, Icon: Home,      label: "DASH",     color: "#f6dd8c" },
              { key: "TRIPS"     as Tab, Icon: Banknote,  label: "TRIPS",    color: "#fbbf24" },
              { key: "EXPENSES"  as Tab, Icon: Receipt,   label: "EXPENSES", color: "#fb923c" },
              { key: "FINANCES"  as Tab, Icon: BarChart2, label: "FINANCE",  color: "#60a5fa" },
              { key: "REPORTS"   as Tab, Icon: FileText,  label: "REPORTS",  color: "#a78bfa" },
              { key: "AI"        as Tab, Icon: Brain,     label: "AI",       color: "#4ade80" },
              { key: "INVENTORY" as Tab, Icon: ClipboardList, label: "DATA", color: "#f472b6" },
            ]).map(({ key, Icon, label, color }) => {
              const active  = activeTab === key;
              const badge   = key === "TRIPS" ? pendingTrips.length : 0;
              return (
                <span key={key} className="contents">
                  <button onClick={() => setActiveTab(key)}
                    className={`flex-1 h-[62px] flex flex-col items-center justify-center gap-[3px] relative transition-all ${
                      active ? "" : "text-neutral-600 hover:text-neutral-400"
                    }`}
                    style={active ? { color } : undefined}>
                    {active && (
                      <span className="absolute top-1.5 left-1.5 right-1.5 bottom-1.5 rounded-2xl pointer-events-none"
                        style={{ background: color, opacity: 0.07 }} />
                    )}
                    <div className="relative z-10">
                      <Icon size={active ? 20 : 18} strokeWidth={active ? 2 : 1.5} />
                      {badge > 0 && (
                        <span className="absolute -top-[5px] -right-[8px] min-w-[14px] h-[14px] flex items-center justify-center rounded-full text-[7px] font-bold bg-[#facc15]/25 text-[#f6dd8c] px-[3px]">
                          {badge > 99 ? "99+" : badge}
                        </span>
                      )}
                    </div>
                    <span className={`text-[7.5px] tracking-[0.1em] z-10 ${active ? "font-bold" : "font-semibold"}`}>{label}</span>
                  </button>
                  {key === "AI" && (
                    <button onClick={() => { setShowSettings(true); setResetStep(0); }}
                      aria-label="Open settings"
                      className="flex-1 h-[62px] flex flex-col items-center justify-center gap-[3px] relative text-neutral-600 hover:text-neutral-400 transition-all">
                      <span className="relative z-10 w-5 h-5 rounded-full border border-[#d9b64f]/55 flex items-center justify-center text-[10px] font-bold text-[#f6dd8c]">M</span>
                      <span className="text-[7.5px] tracking-[0.1em] z-10 font-semibold">MENU</span>
                    </button>
                  )}
                </span>
              );
            })}
          </div>
        </div>


        {/* Document viewer modal */}
        {viewingDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/92"
            onClick={() => setViewingDoc(null)}>
            <div className="relative max-w-[92vw] max-h-[90vh] flex flex-col items-center"
              onClick={e => e.stopPropagation()}>
              <button onClick={() => setViewingDoc(null)}
                className="absolute -top-9 right-0 text-white text-[12px] font-bold tracking-wide bg-[#1a1a2e] border border-[#4b4b8b]/40 px-3 py-1 rounded-full">
                ✕ Close
              </button>
              {viewingDoc.type === "receipt" ? (
                <img src={"/api/documents/" + viewingDoc.id + "/file"} alt="receipt"
                  className="max-w-full max-h-[78vh] object-contain rounded-2xl border border-[#4b4b8b]/40 shadow-2xl" />
              ) : (
                <div className="bg-[#0a0a1a] border border-[#4b4b8b]/40 p-10 rounded-2xl text-center">
                  <p className="text-[52px] mb-4">🏦</p>
                  <p className="text-white text-[16px] font-semibold mb-2">{viewingDoc.vendor || "Bank Statement"}</p>
                  <a href={"/api/documents/" + viewingDoc.id + "/file"} target="_blank" rel="noopener noreferrer"
                    className="text-[#818cf8] underline text-[13px]">Open PDF ↗</a>
                </div>
              )}
              <div className="mt-3 flex items-center gap-3 text-[11px] text-neutral-400">
                {viewingDoc.vendor   && <span className="font-semibold text-white">{viewingDoc.vendor}</span>}
                {viewingDoc.category && <span className="bg-[#818cf8]/10 text-[#818cf8] px-2 py-0.5 rounded-full border border-[#818cf8]/20">{viewingDoc.category}</span>}
                {viewingDoc.amount   && <span className="font-mono-jet text-[#f6dd8c]">${parseFloat(viewingDoc.amount).toFixed(2)}</span>}
                {viewingDoc.fileDate && <span className="font-mono-jet">{viewingDoc.fileDate}</span>}
              </div>
            </div>
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div className="fixed bottom-[76px] left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full bg-[#facc15] text-black text-[12px] font-bold tracking-wide shadow-xl border border-black/10 max-w-[90%] text-center">
            {toast}
          </div>
        )}

        {/* Gold bottom line */}
        <div className="pointer-events-none fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] h-[1px] bg-gradient-to-r from-transparent via-[#d9b64f]/40 to-transparent" />

        {/* ── Settings / Danger Zone panel ────────────────────── */}
        {showSettings && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={() => { setShowSettings(false); setResetStep(0); }}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

            {/* Sheet */}
            <div className="relative bg-[#0e0e0e] border-t border-[#2e2e2e] rounded-t-[28px] px-5 pt-5 pb-10 space-y-5 max-w-[480px] w-full mx-auto"
              onClick={e => e.stopPropagation()}>

              {/* Handle */}
              <div className="w-10 h-1 rounded-full bg-[#333] mx-auto mb-1" />

              {/* Title */}
              <div className="flex items-center justify-between">
                <h2 className="text-[14px] font-bold tracking-[0.1em]">Settings</h2>
                <button onClick={() => { setShowSettings(false); setResetStep(0); }}
                  className="text-neutral-400 text-[13px] hover:text-white transition-colors">✕ Close</button>
              </div>

              {/* Profile row */}
              <div className="flex items-center gap-3 bg-[#141414] border border-[#2e2e2e] rounded-2xl p-3.5">
                <div className="w-10 h-10 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-[15px] font-bold text-[#f6dd8c]">M</div>
                <div>
                  <p className="text-[13px] font-semibold">Miguel</p>
                  <p className="text-[10px] text-neutral-400 font-mono-jet">NYC TLC Driver · IslandCity</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-[10px] text-neutral-400 font-mono-jet">{trips.length} trips saved</p>
                  <p className="text-[10px] text-neutral-400 font-mono-jet">{expenses.length} expenses</p>
                </div>
              </div>

              {/* Storage info */}
              <div className="bg-[#141414] border border-[#2e2e2e] rounded-2xl p-3.5 space-y-1.5">
                <p className="text-[9px] tracking-[0.16em] text-neutral-400 font-semibold uppercase">Storage</p>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-neutral-300">Trips saved</span>
                  <span className="font-mono-jet text-[12px] text-[#f6dd8c]">{trips.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-neutral-300">Saved expenses</span>
                  <span className="font-mono-jet text-[12px] text-[#f6dd8c]">{expenses.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-neutral-300">Days with hours</span>
                  <span className="font-mono-jet text-[12px] text-[#f6dd8c]">{hoursLog.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-neutral-300">Storage size</span>
                  <span className="font-mono-jet text-[12px] text-neutral-400">{(storageBytes / 1024).toFixed(1)} KB</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-neutral-300">Last saved</span>
                  <span className="font-mono-jet text-[10px] text-neutral-400 text-right max-w-[180px] truncate">{lastSavedAt === "—" ? "—" : new Date(lastSavedAt).toLocaleString()}</span>
                </div>
              </div>

              {/* ── Cloud backup status ── */}
              <div className="bg-[#0a1a0e] border border-[#4ade80]/25 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[9px] tracking-[0.16em] text-[#4ade80] font-semibold uppercase">☁️ Cloud Backup</p>
                  <span className={`text-[9px] font-mono-jet ${cloudBackupAt ? "text-[#4ade80]" : "text-neutral-400"}`}>
                    {cloudBackupAt
                      ? `Last: ${cloudBackupAt.toLocaleDateString([], { month:"short", day:"numeric" })} · ${cloudBackupAt.toLocaleTimeString([], { hour:"numeric", minute:"2-digit" })}`
                      : "Not yet backed up"}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  Tu data se guarda automáticamente en la nube cada hora y al terminar el turno. Si reinstala la app o cambias de teléfono, se restaura solo.
                </p>
                <button
                  onClick={async () => { await saveCloudBackup(); showToast("☁️ Cloud backup saved ✓"); }}
                  className="w-full h-11 rounded-full bg-[#0d1f12] border border-[#4ade80]/30 text-[#4ade80] text-[12px] font-bold tracking-[0.1em] hover:bg-[#4ade80]/10 transition-colors">
                  ☁️ Save to cloud now
                </button>
              </div>

              {/* ── GitHub code backup ── */}
              <div className="bg-[#080d18] border border-[#818cf8]/20 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[9px] tracking-[0.16em] text-[#818cf8] font-semibold uppercase">🐙 GitHub Backup</p>
                  <span className={`text-[9px] font-mono-jet ${githubPushAt ? "text-[#818cf8]" : "text-neutral-500"}`}>
                    {githubPushAt
                      ? `Last: ${githubPushAt.toLocaleDateString([], { month:"short", day:"numeric" })} · ${githubPushAt.toLocaleTimeString([], { hour:"numeric", minute:"2-digit" })}`
                      : "Not yet pushed"}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  El código fuente se sube automáticamente a GitHub una vez al día. Si Replit tuviera algún problema, el código queda seguro en tu cuenta de GitHub.
                </p>
                <button
                  disabled={githubPushing}
                  onClick={async () => {
                    setGithubPushing(true);
                    try {
                      const res = await fetch("/api/git-push", { method: "POST" });
                      const data = await res.json() as { ok: boolean; skipped?: boolean; pushedAt?: string; error?: string };
                      if (data.ok && data.pushedAt) {
                        const now = new Date(data.pushedAt);
                        setGithubPushAt(now);
                        try { localStorage.setItem("ic-last-github-push", now.toISOString()); } catch {}
                        showToast("🐙 Code pushed to GitHub ✓");
                      } else if (data.skipped) {
                        showToast("GitHub: pushed recently, try again in a few minutes");
                      } else {
                        showToast("GitHub push failed — check token");
                      }
                    } catch { showToast("GitHub push failed"); }
                    setGithubPushing(false);
                  }}
                  className="w-full h-11 rounded-full border text-[12px] font-bold tracking-[0.1em] transition-colors"
                  style={{
                    background: githubPushing ? "#0d0d1a" : "#0d1020",
                    borderColor: "rgba(129,140,248,0.3)",
                    color: githubPushing ? "#555" : "#818cf8",
                  }}>
                  {githubPushing ? "Pushing…" : "🐙 Push to GitHub now"}
                </button>
              </div>

              {/* ── Toll rate verification reminder ── */}
              <div className="bg-[#141414] border border-[#2e2e2e] rounded-2xl p-3.5 space-y-2">
                <p className="text-[9px] tracking-[0.16em] text-neutral-400 font-semibold uppercase">🛣️ Tarifas de peajes</p>
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  Verificadas por última vez:{" "}
                  <span className="text-white font-mono-jet">
                    {tollRatesLastVerifiedDate.toLocaleDateString("es-US", { year: "numeric", month: "short", day: "numeric" })}
                  </span>
                </p>
                {tollRatesNeedReview && (
                  <button
                    onClick={() => showToast("🛣️ Recuerda pedirle a Claude que verifique las tarifas actualizadas")}
                    className="w-full rounded-xl border border-amber-400/25 px-3 py-2 text-left text-[10px] leading-relaxed text-amber-300/90 hover:bg-amber-400/5 transition-colors">
                    Han pasado más de 30 días — toca aquí para recordar verificar tarifas actualizadas
                  </button>
                )}
              </div>

              {/* Backup — #8 */}
              <div className="bg-[#141414] border border-[#2e2e2e] rounded-2xl p-4 space-y-3">
                <p className="text-[9px] tracking-[0.16em] text-neutral-400 font-semibold uppercase">📦 Data Backup</p>
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  Download a <span className="font-mono-jet text-white">.json</span> file with all your trips, expenses, and hours. Save it to your phone, Google Drive, or iCloud as a backup.
                </p>
                <button onClick={handleExportBackup}
                  className="w-full h-11 rounded-full bg-[#facc15] text-black text-[12px] font-bold tracking-[0.1em] hover:bg-[#fde047] transition-colors">
                  ⬇ Download full backup
                </button>
                 {!legacyClaimResolved && (
                   <div className="border-t border-[#2a2a2a] pt-3">
                     <p className="text-[10px] text-neutral-500 mb-2">
                       ¿Tienes respaldos antiguos sin asignar a tu cuenta?
                     </p>
                     <button
                       disabled={claimingLegacyBackups}
                       onClick={handleClaimLegacyBackups}
                       className="w-full h-10 rounded-full border border-[#facc15]/25 text-[#d9b64f] text-[11px] font-bold tracking-[0.06em] hover:bg-[#facc15]/10 transition-colors disabled:opacity-50">
                       {claimingLegacyBackups ? "Reclamando…" : "🔓 Reclamar mis respaldos anteriores"}
                     </button>
                   </div>
                 )}
                {/* Restore from backup */}
                <div className="border-t border-[#2a2a2a] pt-3">
                  <p className="text-[10px] text-neutral-400 mb-2">Have a saved backup? Restore it here:</p>
                  <label className="block w-full h-11 rounded-full border border-[#3a3a3a] text-neutral-400 text-[12px] font-bold tracking-[0.1em] hover:border-[#facc15]/40 hover:text-[#facc15] transition-colors cursor-pointer flex items-center justify-center gap-2">
                    <span>📂 Restore from .json file</span>
                    <input type="file" accept=".json" className="hidden" onChange={handleImportBackup} />
                  </label>
                </div>
              </div>

              {/* Danger zone */}
              <div className="bg-[#120808] border border-[#3a1010] rounded-2xl p-4 space-y-3">
                <p className="text-[9px] tracking-[0.16em] text-[#ff6b6b]/70 font-semibold uppercase">⚠️ Danger Zone</p>
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  Erases <span className="text-white font-semibold">all trips, expenses, and hours</span> saved. This action cannot be undone. Your history will be permanently lost.
                </p>

                {resetStep === 0 && (
                  <button onClick={() => setResetStep(1)}
                    className="w-full h-11 rounded-full border border-[#ff6b6b]/40 text-[#ff6b6b] text-[12px] font-bold tracking-[0.1em] hover:bg-[#ff6b6b]/10 transition-colors">
                    🗑 Reset all data
                  </button>
                )}

                {resetStep === 1 && (
                  <div className="space-y-2">
                    <p className="text-[11px] text-[#ff6b6b] font-semibold text-center">Are you sure? This action cannot be undone.</p>
                    <div className="flex gap-2">
                      <button onClick={() => setResetStep(0)}
                        className="flex-1 h-11 rounded-full border border-[#333] text-neutral-400 text-[12px] font-bold hover:text-white transition-colors">
                        Cancel
                      </button>
                      <button onClick={handleFactoryReset}
                        className="flex-1 h-11 rounded-full bg-[#ff6b6b] text-black text-[12px] font-bold tracking-[0.08em] hover:bg-[#ff4444] transition-colors">
                        Yes, erase everything
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Import backup confirmation modal ────────────────────── */}
      {importPreview && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center" style={{ background: "rgba(0,0,0,0.75)" }}
          onClick={() => setImportPreview(null)}>
          <div className="w-full max-w-md bg-[#141414] border border-[#2e2e2e] rounded-t-3xl p-6 space-y-5"
            onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="text-center space-y-1">
              <p className="text-[10px] tracking-[0.18em] text-[#facc15] font-semibold uppercase">📦 Restaurar backup</p>
              <p className="text-white text-[14px] font-bold leading-snug">
                {importPreview.tripCount} viajes · {importPreview.expenseCount} gastos · {importPreview.dayCount} días de horas
              </p>
              <p className="text-[11px] text-neutral-400">¿Cómo quieres importar estos datos?</p>
            </div>

            {/* Options */}
            <div className="space-y-3">
              <button
                onClick={() => confirmImport("merge")}
                className="w-full rounded-2xl border border-[#3a3a3a] p-4 text-left hover:border-[#facc15]/50 transition-colors active:bg-[#1e1e1e]">
                <p className="text-white text-[13px] font-bold mb-0.5">➕ Añadir a lo existente</p>
                <p className="text-neutral-400 text-[11px] leading-relaxed">
                  Combina el backup con tus datos actuales. Los viajes y gastos duplicados se omiten.
                </p>
              </button>

              <button
                onClick={() => confirmImport("replace")}
                className="w-full rounded-2xl border border-[#ff6b6b]/30 p-4 text-left hover:border-[#ff6b6b]/60 transition-colors active:bg-[#1e0808]">
                <p className="text-[#ff6b6b] text-[13px] font-bold mb-0.5">🔄 Reemplazar todo</p>
                <p className="text-neutral-400 text-[11px] leading-relaxed">
                  Borra los datos actuales y los reemplaza con el backup. Esta acción no se puede deshacer.
                </p>
              </button>
            </div>

            {/* Cancel */}
            <button
              onClick={() => setImportPreview(null)}
              className="w-full h-11 rounded-full border border-[#2e2e2e] text-neutral-400 text-[12px] font-bold hover:text-white transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
