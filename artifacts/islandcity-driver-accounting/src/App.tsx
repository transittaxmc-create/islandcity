import { useState, useMemo, useEffect, useRef } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

type TurnStatus = "START" | "BREAK" | "END";
type Tab = "ENTRY" | "REGISTER" | "DASHBOARD" | "EXPENSES" | "REPORTS" | "LEDGER" | "FINANCES";

type Trip = {
  id: string;
  reference: string;
  earnings: number;
  tips: number;
  extra: number;
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
  status: "pending" | "posted";
  reviewed: boolean;
  postedAt?: string;
};

type TripForm = {
  reference: string;
  earnings: string;
  tips: string;
  extraCash: string;
  toll: string;
  platformFee: string;
  platform: string;
  pickup: string;
  dropoff: string;
  notes: string;
};

type GpsState = {
  lat: number | null;
  lng: number | null;
  acc: number | null;
  status: "inactive" | "searching" | "active" | "error";
};

type HoursEntry = {
  date: string;
  hours: number;
  clockIn: string;
  clockOut: string;
  breakMs: number;
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
};
type ProjectionEntry = { date: string; projectedRevenue: number; projectedSavings: number; }; type FinancialSummary = { totalRevenue: number; totalExpenses: number; netIncome: number; projections: ProjectionEntry[]; };
// ── Toll plaza list — update rates each January ───────────────────────────
// Last updated: 2026 · E-ZPass · passenger car · per crossing
// Sources: MTA Bridges & Tunnels 2026; Port Authority 2026 schedule
// Port Authority peak = Mon–Fri 6–10 AM and 4–9 PM; all other = off-peak
const TOLL_YEAR = 2026;
const TOLL_PLAZAS: {
  name: string; lat: number; lng: number;
  rate: number; offPeak?: number; type: string;
}[] = [
  // ── MTA Bridges & Tunnels ─────────────────────────────────────────────
  { name: "Queens Midtown Tunnel",      lat: 40.7434, lng: -73.9637, rate: 7.46, type: "MTA" },
  { name: "Hugh L. Carey Tunnel",       lat: 40.6895, lng: -74.0149, rate: 7.46, type: "MTA" },
  { name: "RFK Bridge",                 lat: 40.7800, lng: -73.9500, rate: 7.46, type: "MTA" },
  { name: "Verrazzano-Narrows Bridge",  lat: 40.6066, lng: -74.0449, rate: 7.46, type: "MTA" },
  { name: "Whitestone Bridge",          lat: 40.7960, lng: -73.8305, rate: 7.46, type: "MTA" },
  { name: "Throgs Neck Bridge",         lat: 40.8010, lng: -73.7970, rate: 7.46, type: "MTA" },
  { name: "Henry Hudson Bridge",        lat: 40.8760, lng: -73.9300, rate: 3.42, type: "MTA" },
  { name: "Cross Bay Bridge",           lat: 40.5960, lng: -73.8400, rate: 2.80, type: "MTA" },
  { name: "Marine Parkway Bridge",      lat: 40.5800, lng: -73.8900, rate: 2.80, type: "MTA" },
  // ── Port Authority (peak / off-peak) ──────────────────────────────────
  { name: "Lincoln Tunnel",             lat: 40.7589, lng: -74.0060, rate: 16.79, offPeak: 14.79, type: "Port Authority" },
  { name: "Holland Tunnel",             lat: 40.7260, lng: -74.0270, rate: 16.79, offPeak: 14.79, type: "Port Authority" },
  { name: "George Washington Bridge",   lat: 40.8517, lng: -73.9527, rate: 16.79, offPeak: 14.79, type: "Port Authority" },
  { name: "Goethals Bridge",            lat: 40.6400, lng: -74.1900, rate: 16.79, offPeak: 14.79, type: "Port Authority" },
  { name: "Bayonne Bridge",             lat: 40.6400, lng: -74.1100, rate: 16.79, offPeak: 14.79, type: "Port Authority" },
  { name: "Outerbridge Crossing",       lat: 40.5200, lng: -74.2500, rate: 16.79, offPeak: 14.79, type: "Port Authority" },
];

const LOCATION_CATEGORIES = [
  "Hospital", "City", "Home", "Suburbs", "Office",
  "Airport", "Restaurant", "Train/Bus", "Hotel", "Tourist",
] as const;

const AIRPORTS = [
  { name: "JFK Airport", lat: 40.6413, lng: -73.7781 },
  { name: "LGA Airport", lat: 40.7769, lng: -73.874 },
  { name: "EWR Airport", lat: 40.6895, lng: -74.1745 },
  { name: "ISP Airport", lat: 40.7952, lng: -73.1002 },
] as const;

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

const STATE_ABBR: Record<string, string> = {
  "New York": "NY", "New Jersey": "NJ", "Connecticut": "CT",
  "Pennsylvania": "PA", "Florida": "FL", "California": "CA",
  "Massachusetts": "MA", "Texas": "TX", "Illinois": "IL",
  "Georgia": "GA", "Maryland": "MD", "Virginia": "VA",
  "North Carolina": "NC", "Ohio": "OH", "Michigan": "MI",
};

async function reverseGeocodeRich(
  lat: number, lng: number, signal?: AbortSignal
): Promise<string> {
  // 1. Airport proximity (within 5 km → likely at the airport)
  let nearAirport: { name: string; dist: number } | null = null;
  for (const ap of AIRPORTS) {
    const d = haversineKm(lat, lng, ap.lat, ap.lng);
    if (d < 5 && (!nearAirport || d < nearAirport.dist))
      nearAirport = { name: ap.name, dist: d };
  }

  // 2. Nominatim reverse geocode – zoom 18 = building level
  const url =
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2` +
    `&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
  const res = await fetch(url, {
    signal,
    headers: { "User-Agent": "IslandCity-Driver-App/1.0" },
  });
  if (!res.ok) return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  const data = await res.json();
  const addr: Record<string, string> = data.address || {};
  const placeName: string = data.name || "";

  const parts: string[] = [];
  const city = addr.city || addr.town || addr.village || addr.county || "";
  const road  = addr.road || addr.pedestrian || addr.footway || addr.path || "";

  // 3. Branch by location type
  if (addr.aeroway === "terminal" && placeName) {
    // Airport terminal → full name
    const airport = addr.aerodrome || nearAirport?.name || "Airport";
    parts.push(`${airport} – ${placeName}`);
  } else if (addr.aeroway === "aerodrome" || addr.aerodrome) {
    // Aerodrome → airport name
    parts.push(nearAirport?.name || addr.aerodrome || placeName || "Airport");
  } else if (nearAirport && nearAirport.dist < 2) {
    // Within 2 km of known airport → airport name
    parts.push(nearAirport.name);
  } else if (placeName && addr.amenity === "hospital") {
    // Hospital → name + city
    parts.push(placeName);
    if (city) parts.push(city);
  } else {
    // Everything else (house, business, office, restaurant…) → street + city only
    if (road) {
      parts.push(road);          // no house number
    } else if (placeName) {
      parts.push(placeName);     // last resort fallback
    }
    if (city) parts.push(city);
  }

  // 8. Coordinates suffix (always included)
  const coord = `${lat.toFixed(5)},${lng.toFixed(5)}`;

  const label =
    parts.filter(Boolean).join(", ") ||
    data.display_name?.split(",").slice(0, 3).join(",").trim() ||
    coord;

  return `${label} · ${coord}`;
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
  "EcoRide":           { initial: "E", bg: "bg-[#22c55e]", tags: ["ACCESS-A-RIDE", "VOUCHER"] },
  "Uber":              { initial: "U", bg: "bg-white",     logoBg: "bg-white", tags: [], logo: "/logos/uber.png" },
  "Lyft":              { initial: "L", bg: "bg-[#ff00bf]", logoBg: "bg-black", tags: [], logo: "/logos/lyft.png" },
  "Empower":           { initial: "E", bg: "bg-[#3b82f6]", logoBg: "bg-white", tags: [], logo: "/logos/empower.png" },
  "Gallant":           { initial: "G", bg: "bg-[#f97316]", logoBg: "bg-white", tags: ["VOUCHER"], logo: "/logos/gallant.png" },
  "Aventus Ride":      { initial: "A", bg: "bg-[#8b5cf6]", logoBg: "bg-white", tags: ["VOUCHER"], logo: "/logos/aventus.png" },
  "Classic Ryde":      { initial: "CR", bg: "bg-[#14b8a6]", logoBg: "bg-white", tags: ["VOUCHER"], logo: "/logos/classicryde.png" },
  "Aki Technology":    { initial: "AKI", bg: "bg-[#0ea5e9]", logoBg: "bg-white", tags: ["ACCESS-A-RIDE", "VOUCHER"], note: "Medical", logo: "/logos/aki.png" },
  "Street Hail":       { initial: "SH", bg: "bg-[#6b7280]", tags: [], logo: "/logos/streethail.png" },
  "Island City Transit": { initial: "ICT", bg: "bg-[#1f2937]", tags: ["PRIVATE"] },
  "Transit Tax":       { initial: "TT", bg: "bg-[#374151]", tags: ["TAX"] },
  "Other":             { initial: "O", bg: "bg-[#9ca3af]", tags: [] },
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
        <img src={src} alt="" className="w-full h-full object-contain p-[2px]" />
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
const CLEAN_SLATE_VERSION = "2026-08-11-v6";
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

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("DASHBOARD");
  const [goal, setGoal] = useState(60);
  const [toast, setToast] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date());

  const [trips, setTrips] = useState<Trip[]>(() => {
    try {
      const raw = localStorage.getItem("island-city-trips");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0)
          return parsed.map((t: Trip) => ({
            status: "pending" as const, reviewed: false, ...t,
          }));
      }
    } catch {}
    return initialTrips;
  });

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    try {
      const raw = localStorage.getItem("island-city-expenses");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return initialExpenses;
  });

  const [hoursLog, setHoursLog] = useState<HoursEntry[]>(() => {
    try {
      const raw = localStorage.getItem("island-city-hours");
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  });

  // Settings / reset panel
  const [showSettings,     setShowSettings]     = useState(false);
  const [resetStep,        setResetStep]        = useState<0|1|2>(0); // 0=idle 1=confirm 2=done

  // Shift clock
  const [clockInTime, setClockInTime] = useState<Date | null>(null);
  const [totalBreakMs, setTotalBreakMs] = useState(0);
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [breakStart, setBreakStart] = useState<Date | null>(null);
  const [shiftActive, setShiftActive] = useState(false);
  const [lastShiftDate, setLastShiftDate] = useState<string>(() => {
    try { return localStorage.getItem("ic-last-shift-date") || ""; } catch { return ""; }
  });
  const watchIdRef = useRef<number | null>(null);
  const [gps, setGps] = useState<GpsState>({ lat: null, lng: null, acc: null, status: "inactive" });
  const [gpsAddress, setGpsAddress] = useState("");
  const [gpsAirport, setGpsAirport] = useState("");

  const [showPickupMenu, setShowPickupMenu] = useState(false);
  const [showDropoffMenu, setShowDropoffMenu] = useState(false);
  const [pickupResolving, setPickupResolving] = useState(false);
  const [dropoffResolving, setDropoffResolving] = useState(false);
  const [selectedForPost, setSelectedForPost] = useState<Set<string>>(new Set());

  // Toll detection
  const [detectedToll, setDetectedToll] = useState<{ plaza: string; rate: number; at: string } | null>(null);
  const [tollManuallyEdited, setTollManuallyEdited] = useState(false);
  const lastDetectedPlazaRef = useRef<string | null>(null);

  // Refs that always hold the latest state — used by the iOS pagehide/
  // visibilitychange listener so it never captures a stale closure.
  const tripsRef     = useRef<Trip[]>([]);
  const expensesRef  = useRef<Expense[]>([]);

  // Storage state
  const [lastSavedAt, setLastSavedAt] = useState<string>(() => {
    try { return localStorage.getItem("island-city-last-saved") || "—"; } catch { return "—"; }
  });
  const [storageVerified, setStorageVerified] = useState(false);
  const [storageBytes, setStorageBytes] = useState(0);

  const financialSummary = useMemo(() => {
    const totalRevenue = trips.reduce((sum, trip) => {
      const earnings = typeof trip.earnings === 'number' ? trip.earnings : 0;
      const tips = typeof trip.tips === 'number' ? trip.tips : 0;
      const extra = typeof trip.extra === 'number' ? trip.extra : 0;
      const toll = typeof trip.toll === 'number' ? trip.toll : 0;
      return sum + earnings + tips + extra + toll;
    }, 0);

    const totalExpenses = expenses.reduce((sum, expense) => {
      const amount = typeof expense.amount === 'number' ? expense.amount : 0;
      return sum + amount;
    }, 0);

    const netIncome = totalRevenue - totalExpenses;

    return {
      totalRevenue,
      totalExpenses,
      netIncome,
      projections: [] 
    };
  }, [trips, expenses]);

  const [tripForm, setTripForm] = useState<TripForm>({
    reference: "", earnings: "", tips: "", extraCash: "", toll: "",
    platformFee: "", platform: "Uber", pickup: "", dropoff: "", notes: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [inlineEditId, setInlineEditId] = useState<string | null>(null);
  const [inlineForm, setInlineForm] = useState({ pickup: "", dropoff: "", earnings: "", reference: "" });

  // Expense form
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    name: "", type: "Gasoline / Fuel", category: "Vehicle & Fuel",
    description: "", amount: "", date: new Date().toISOString().slice(0, 10),
    frequency: "none" as "none" | "daily" | "weekly" | "monthly",
    dueDate: "",
  });
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);

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

  // FINANCES — goal + working days (persisted)
  const [dailyGoal, setDailyGoal] = useState<number>(() => {
    try { return parseInt(localStorage.getItem("ic-daily-goal") || "500") || 500; } catch { return 500; }
  });
  const [workDays, setWorkDays] = useState<number[]>(() => {
    try { return JSON.parse(localStorage.getItem("ic-work-days") || "[1,2,3,4,5]"); } catch { return [1,2,3,4,5]; }
  });

  // Live clock
  useEffect(() => {
    const id = window.setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Persist trips
  useEffect(() => {
    try {
      const payload = JSON.stringify(trips);
      localStorage.setItem("island-city-trips", payload);
      const nowISO = new Date().toISOString();
      localStorage.setItem("island-city-last-saved", nowISO);
      localStorage.setItem("island-city-trips-count", String(trips.length));
      setLastSavedAt(nowISO);
      setStorageBytes(new Blob([payload]).size);
      const check = localStorage.getItem("island-city-trips");
      setStorageVerified(!!check && check.length > 2);
    } catch { setStorageVerified(false); }
  }, [trips]);

  // Persist expenses
  useEffect(() => {
    try { localStorage.setItem("island-city-expenses", JSON.stringify(expenses)); } catch {}
  }, [expenses]);
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

  // Persist hours
  useEffect(() => {
    try { localStorage.setItem("island-city-hours", JSON.stringify(hoursLog)); } catch {}
  }, [hoursLog]);

  // Persist FINANCES settings
  useEffect(() => { try { localStorage.setItem("ic-daily-goal", String(dailyGoal)); } catch {} }, [dailyGoal]);
  useEffect(() => { try { localStorage.setItem("ic-work-days", JSON.stringify(workDays)); } catch {} }, [workDays]);

  // Keep refs in sync so the pagehide listener always has the latest state
  useEffect(() => { tripsRef.current    = trips;    }, [trips]);
  useEffect(() => { expensesRef.current = expenses; }, [expenses]);

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
        localStorage.setItem("island-city-trips",    JSON.stringify(tripsRef.current));
        localStorage.setItem("island-city-expenses", JSON.stringify(expensesRef.current));
      } catch {}
    };
    const onVisibility = () => { if (document.visibilityState === "hidden") flush(); };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flush);
    };
  }, []); // set up once — refs always point to current state

  // Initial storage check
  useEffect(() => {
    try {
      const raw = localStorage.getItem("island-city-trips");
      if (raw) { setStorageBytes(new Blob([raw]).size); setStorageVerified(true); }
    } catch { setStorageVerified(false); }
  }, []);

  // ── GPS toll geofencing ───────────────────────────────────────────────────
  useEffect(() => {
    if (!gps.lat || !gps.lng) return;
    const GEOFENCE_KM = 0.35; // ~350 m radius around each plaza
    for (const plaza of TOLL_PLAZAS) {
      const d = haversineKm(gps.lat, gps.lng, plaza.lat, plaza.lng);
      if (d <= GEOFENCE_KM) {
        // Avoid re-firing for the same plaza
        if (lastDetectedPlazaRef.current === plaza.name) return;
        lastDetectedPlazaRef.current = plaza.name;

        // Port Authority: choose peak vs off-peak by time of day
        let rate = plaza.rate;
        if (plaza.offPeak !== undefined) {
          const now = new Date();
          const h = now.getHours();
          const dow = now.getDay(); // 0=Sun 6=Sat
          const isWeekday = dow >= 1 && dow <= 5;
          const isPeak = isWeekday && ((h >= 6 && h < 10) || (h >= 16 && h < 21));
          rate = isPeak ? plaza.rate : plaza.offPeak;
        }

        const at = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
        setDetectedToll({ plaza: plaza.name, rate, at });

        // Auto-fill only if field is empty
        setTripForm(s => {
          if (!s.toll) return { ...s, toll: String(rate) };
          return s;
        });
        setTollManuallyEdited(false);
        showToast(`⚡ Toll detected · ${plaza.name} · $${rate.toFixed(2)}`);
        return;
      }
    }
    // Driver moved away from all plazas — clear the "last detected" so re-entry fires again
    lastDetectedPlazaRef.current = null;
  }, [gps.lat, gps.lng]); // eslint-disable-line react-hooks/exhaustive-deps

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
        const rich = await reverseGeocodeRich(gps.lat!, gps.lng!, controller.signal);
        setGpsAddress(rich);
      } catch {}
    })();
    return () => controller.abort();
  }, [gps.lat, gps.lng]);

  const startGPS = () => {
    if (!navigator.geolocation) { setGps(s => ({ ...s, status: "error" })); return; }
    setGps(s => ({ ...s, status: "searching" }));
    if (watchIdRef.current !== null) {
      try { navigator.geolocation.clearWatch(watchIdRef.current); } catch {}
    }
    const id = navigator.geolocation.watchPosition(
      pos => setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude, acc: pos.coords.accuracy, status: "active" }),
      () => setGps(s => ({ ...s, status: "error" })),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
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
    showToast("Backup descargado ✓");
  };

  const handleClockIn = () => {
    const now = new Date();
    const todayYMD = toYYYYMMDD(now);
    const isNewDay = lastShiftDate !== "" && lastShiftDate !== todayYMD;

    if (isNewDay) {
      // New day — reset entry form so the screen starts clean
      setTripForm({
        reference: "", earnings: "", tips: "", extraCash: "", toll: "",
        platformFee: "", platform: "Uber", pickup: "", dropoff: "", notes: "",
      });
      setEditingId(null);
      showToast(`Nuevo día ${todayYMD} · pantallas limpias ✓`);
    }

    setLastShiftDate(todayYMD);
    setClockInTime(now);
    setTotalBreakMs(0);
    setIsOnBreak(false);
    setBreakStart(null);
    setShiftActive(true);
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
      { date: toYYYYMMDD(now), hours, clockIn: clockInTime.toISOString(), clockOut: now.toISOString(), breakMs },
      ...p,
    ].slice(0, 60));
    setShiftActive(false);
    setIsOnBreak(false);
    setBreakStart(null);
    setTotalBreakMs(0);
    setClockInTime(null);
    stopGPS();
    showToast(`Clock Out · ${hours.toFixed(2)}h saved`);
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
    const e = parseFloat(tripForm.earnings) || 0;
    const t = parseFloat(tripForm.tips) || 0;
    const ex = parseFloat(tripForm.extraCash) || 0;
    const tl = parseFloat(tripForm.toll) || 0;
    const f = parseFloat(tripForm.platformFee) || 0;
    return e + t + ex + tl - f;
  }, [tripForm.earnings, tripForm.tips, tripForm.extraCash, tripForm.toll, tripForm.platformFee]);

  const todayTrips = useMemo(() => {
    // When a shift is active: only count trips entered AFTER the shift started.
    // This prevents pre-shift trips from inflating grossToday and making $/hr
    // show astronomically high numbers (e.g. $144 ÷ 40 seconds = $12,000/hr).
    // When no shift is active: show all trips for today's calendar date.
    if (shiftActive && clockInTime) {
      const shiftStartMs = clockInTime.getTime();
      return trips.filter(t => {
        try { return new Date(t.timestamp || t.date).getTime() >= shiftStartMs; } catch { return false; }
      });
    }
    const todayStr = currentTime.toDateString();
    return trips.filter(t => {
      try { return new Date(t.timestamp || t.date).toDateString() === todayStr; } catch { return true; }
    });
  }, [trips, currentTime, shiftActive, clockInTime]);

  const todayEarnings = useMemo(() => todayTrips.reduce((a, b) => a + b.grandTotal, 0), [todayTrips]);
  const totalTollsToday = useMemo(() => todayTrips.reduce((a, b) => a + b.toll, 0), [todayTrips]);

  // GROSS = fare + tips + extra + toll (everything customer paid, before platform fee)
  const grossToday = useMemo(() =>
    todayTrips.reduce((a, b) => a + b.earnings + b.tips + b.extra + b.toll, 0),
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
    const h = activeHoursDecimal > 0 ? activeHoursDecimal : (cumulative.hoy ?? 0);
    if (h > 0.002 && grossToday > 0) return grossToday / h;
    return 0;
  }, [grossToday, activeHoursDecimal, cumulative.hoy]);
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

  // ── Daily goal (driven by FINANCES settings) ─────────────────
  const goalPct        = Math.min((grossToday / dailyGoal) * 100, 100);
  const remainingToGoal = Math.max(dailyGoal - grossToday, 0);
  const projectedFinish = useMemo(() => {
    if (perHourGross <= 0 || grossToday >= dailyGoal) return null;
    return new Date(Date.now() + (remainingToGoal / perHourGross) * 3600000);
  }, [perHourGross, remainingToGoal, grossToday, dailyGoal]);

  // ── Smart suggestion (time-of-day + pace) ────────────────────
  const smartSuggestion = useMemo(() => {
    const h   = currentTime.getHours();
    const dow = currentTime.getDay();
    const wd  = dow >= 1 && dow <= 5;
    const we  = !wd;
    if (grossToday >= dailyGoal)
      return { emoji: "🏆", text: "$500 goal reached! Outstanding shift.", type: "gold" };
    if (wd && h >= 7 && h < 9)
      return { emoji: "🔥", text: "Morning rush — Midtown, Queens→Manhattan, Penn Station. Stay on the move.", type: "hot" };
    if (h >= 12 && h < 14)
      return { emoji: "🍽", text: "Lunch surge — Midtown, FiDi, Brooklyn Heights. Fast short trips.", type: "warm" };
    if (wd && h >= 17 && h < 20)
      return { emoji: "⚡", text: "Evening peak — best time of day. JFK/LGA also busy. Be aggressive.", type: "hot" };
    if (we && (h >= 22 || h < 2))
      return { emoji: "🌙", text: "Weekend night — LES, Williamsburg, Midtown. High surge potential.", type: "purple" };
    if (h >= 2 && h < 6)
      return { emoji: "😴", text: "Dead zone 2–6 AM — very low demand. Rest or reposition. Protect your rate.", type: "cold" };
    if (wd && h >= 9 && h < 11)
      return { emoji: "📉", text: "Post-rush valley. Good time for a break or airport queue (JFK/LGA).", type: "warn" };
    if (perHourGross > 0 && perHourGross < 60)
      return { emoji: "📊", text: `Pace $${perHourGross.toFixed(0)}/h — below $60 minimum. Check surge areas or reposition.`, type: "warn" };
    if (perHourGross >= 60 && perHourGross < 70)
      return { emoji: "👍", text: `Pace $${perHourGross.toFixed(0)}/h — close to $70 target. Stay in high-demand zones.`, type: "warm" };
    if (perHourGross >= 70)
      return { emoji: "💪", text: `Strong at $${perHourGross.toFixed(0)}/h. You're on track for a great shift.`, type: "good" };
    return { emoji: "📍", text: "Start your shift to begin tracking performance.", type: "neutral" };
  }, [currentTime, grossToday, perHourGross]);

  const resetForm = () => {
    setTripForm({ reference: "", earnings: "", tips: "", extraCash: "", toll: "", platformFee: "", platform: "Uber", pickup: "", dropoff: "", notes: "" });
    setEditingId(null);
    setDetectedToll(null);
    setTollManuallyEdited(false);
    lastDetectedPlazaRef.current = null;
  };

  const handleSave = () => {
    if (!tripForm.earnings && !tripForm.pickup) { showToast("Enter at least earnings or pickup location"); return; }
    const now = new Date();
    const e = parseFloat(tripForm.earnings) || 0;
    const t = parseFloat(tripForm.tips) || 0;
    const ex = parseFloat(tripForm.extraCash) || 0;
    const tl = parseFloat(tripForm.toll) || 0;
    const f = parseFloat(tripForm.platformFee) || 0;
    const newTrip: Trip = {
      id: editingId || Date.now().toString(),
      reference: tripForm.reference.trim(),
      earnings: e, tips: t, extra: ex, toll: tl, fee: f,
      platform: tripForm.platform,
      pickup: tripForm.pickup.trim(),
      dropoff: tripForm.dropoff.trim(),
      notes: tripForm.notes,
      grandTotal: e + t + ex + tl - f,
      time: now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
      date: toYYYYMMDD(now),
      timestamp: now.toISOString(),
      gps: gps.lat && gps.lng ? { lat: gps.lat, lng: gps.lng, acc: gps.acc ?? undefined } : undefined,
      status: "pending" as const,
      reviewed: false,
    };
    const updated = editingId ? trips.map(p => p.id === editingId ? newTrip : p) : [newTrip, ...trips];
    syncSaveTrips(updated);
    resetForm();
    showToast(editingId ? `Trip updated ✓` : `Trip saved ✓ $${newTrip.grandTotal.toFixed(2)}`);
    setActiveTab("REGISTER");
  };

  const handleEditToEntry = (trip: Trip) => {
    setEditingId(trip.id);
    setTripForm({
      reference: trip.reference, earnings: String(trip.earnings), tips: String(trip.tips),
      extraCash: String(trip.extra), toll: String(trip.toll), platformFee: String(trip.fee),
      platform: trip.platform, pickup: trip.pickup, dropoff: trip.dropoff, notes: trip.notes,
    });
    setActiveTab("ENTRY");
  };

  // Sync-save helpers — write to localStorage BEFORE calling the React setter.
  // iOS can kill the JS process within ~100ms of a user action (swipe-up to
  // close, home button, phone call), before the async useEffect ever runs.
  // Writing synchronously here guarantees the data survives any timing window.
  const syncSaveTrips = (newTrips: Trip[]) => {
    try { localStorage.setItem("island-city-trips", JSON.stringify(newTrips)); } catch {}
    setTrips(newTrips);
  };
  const syncSaveExpenses = (newExpenses: Expense[]) => {
    try { localStorage.setItem("island-city-expenses", JSON.stringify(newExpenses)); } catch {}
    setExpenses(newExpenses);
  };
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
    setInlineForm({ pickup: trip.pickup, dropoff: trip.dropoff, earnings: String(trip.earnings), reference: trip.reference });
  };

  const handleInlineSave = (id: string) => {
    setTrips(prev => prev.map(t => {
      if (t.id !== id) return t;
      const newEarnings = parseFloat(inlineForm.earnings) || 0;
      return { ...t, pickup: inlineForm.pickup, dropoff: inlineForm.dropoff, earnings: newEarnings, reference: inlineForm.reference, grandTotal: newEarnings + t.tips + t.extra + t.toll - t.fee };
    }));
    setInlineEditId(null);
    showToast("Trip updated ✓");
  };

  const handlePostToLedger = () => {
    if (selectedForPost.size === 0) return;
    const now = new Date().toISOString();
    const count = selectedForPost.size;
    setTrips(prev => prev.map(t =>
      selectedForPost.has(t.id)
        ? { ...t, status: "posted" as const, reviewed: true, postedAt: now }
        : t
    ));
    setSelectedForPost(new Set());
    showToast(`${count} trip${count !== 1 ? "s" : ""} posted to Ledger ✓`);
    setActiveTab("LEDGER");
  };

  const resetExpenseForm = () => setExpenseForm({
    name: "", type: "Gasoline / Fuel", category: "Vehicle & Fuel",
    description: "", amount: "", date: new Date().toISOString().slice(0, 10),
    frequency: "none", dueDate: "",
  });

  const handleSaveExpense = () => {
    if (!expenseForm.name.trim() || !expenseForm.amount) {
      showToast("Ingresa nombre y cantidad"); return;
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
    };
    if (editingExpenseId) {
      syncSaveExpenses(expenses.map(e => e.id === editingExpenseId ? newExpense : e));
    } else {
      syncSaveExpenses([newExpense, ...expenses]);
    }
    resetExpenseForm();
    setEditingExpenseId(null);
    setShowExpenseForm(false);
    showToast(`Gasto guardado ✓ $${newExpense.amount.toFixed(2)}`);
  };

  const handleDeleteExpense = (id: string) => {
    if (!window.confirm("¿Eliminar este gasto?")) return;
    syncSaveExpenses(expenses.filter(e => e.id !== id));
    showToast("Gasto eliminado");
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

  const shiftStatusLabel = shiftActive ? (isOnBreak ? "ON BREAK" : "ON ROUTE") : "OFF DUTY";

  // ─── Dashboard ───────────────────────────────────────────────
  const DashboardContent = (
    <div className="space-y-5">
      <div>
        <h2 className="text-[24px] font-bold leading-tight">Good morning, Miguel.</h2>
        <p className="font-mono-jet text-[11px] tracking-[0.18em] mt-1.5 uppercase" style={goldGradientStyle}>
          {currentTime.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).toUpperCase()}
        </p>
        <p className="font-mono-jet text-[10px] text-neutral-600 mt-1">
          {currentTime.toLocaleTimeString()} · Live · LocalStorage stamped
        </p>
      </div>

      {/* Main status card */}
      <div className="bg-[#141414] border border-[#222] rounded-[20px] px-4 pt-3.5 pb-3 overflow-hidden relative">
        <div className="flex items-center justify-between">
          <p className="font-mono-jet text-[10px] text-neutral-400">
            {currentTime.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} ·{" "}
            {currentTime.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
          </p>
          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[9px] tracking-[0.12em] font-semibold ${
            shiftActive ? "bg-[#2ecc71]/15 border-[#2ecc71]/30 text-[#6ee7a8]" : "bg-[#1e1e1e] border-[#2a2a2a] text-neutral-500"
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${shiftActive ? "bg-[#2ecc71] animate-pulse" : "bg-neutral-600"}`} />
            {shiftStatusLabel}
          </span>
        </div>
        <div className="mt-2">
          <p className="font-mono-jet text-[11px] text-neutral-400">
            {gps.lat && gps.lng ? `${gps.lat.toFixed(4)}, ${gps.lng.toFixed(4)}` : "GPS not active"}{gps.acc ? ` · ±${Math.round(gps.acc)}m` : ""}
          </p>
          {gpsAddress && <p className="text-[11px] text-neutral-300 mt-0.5 truncate">{gpsAddress}</p>}
          {gpsAirport && <p className="font-mono-jet text-[10px] text-[#f6dd8c] mt-0.5">✈ {gpsAirport}</p>}
        </div>
        <p className="font-mono-jet text-[28px] font-bold text-[#f5c518] mt-2 tracking-tight">${grossToday.toFixed(2)}</p>
        <p className="font-mono-jet text-[10px] text-neutral-500 mt-0.5">{todayTrips.length} {todayTrips.length === 1 ? "trip" : "trips"} · fare + tips + toll</p>
        <div className="mt-3 h-px bg-[#222]" />
        <div className="mt-2.5 flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${shiftActive ? "bg-[#2ecc71]" : "bg-neutral-700"}`} />
          <span className={`text-[10px] font-mono-jet ${shiftActive ? "text-[#6ee7a8]" : "text-neutral-500"}`}>
            {shiftActive ? (isOnBreak ? "On break" : "On track") : "Shift ended"}
          </span>
          <span className="ml-auto text-[9px] text-neutral-600 font-mono-jet flex items-center gap-1">
            <span className={`w-1 h-1 rounded-full ${gps.status === "active" ? "bg-[#2ecc71]" : gps.status === "searching" ? "bg-yellow-400 animate-pulse" : "bg-neutral-600"}`} />
            GPS {gps.status}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {(["START", "BREAK", "END"] as TurnStatus[]).map(s => {
            const isActive = (s === "START" && shiftActive && !isOnBreak) || (s === "BREAK" && isOnBreak) || (s === "END" && !shiftActive);
            const disabled = s === "BREAK" && !shiftActive;
            return (
              <button key={s} onClick={() => handleTurnButton(s)} disabled={disabled}
                className={`h-[38px] rounded-full border text-[11px] tracking-[0.12em] font-bold transition-all ${
                  disabled ? "border-[#1a1a1a] bg-[#0a0a0a] text-neutral-600 cursor-not-allowed"
                  : isActive ? "border-[#d9b64f] text-black"
                  : "border-[#d9b64f]/60 text-[#f6dd8c] bg-transparent hover:bg-[#f6dd8c]/10"
                }`}
                style={isActive ? { background: "linear-gradient(90deg, #f6dd8c, #d9b64f)" } : {}}>
                {s === "BREAK" ? (isOnBreak ? "RESUME" : "BREAK") : s}
              </button>
            );
          })}
        </div>
      </div>

      {/* Performance grid */}
      <div>
        <p className="text-[10px] tracking-[0.22em] text-neutral-500 font-semibold mb-2.5">PERFORMANCE</p>
        <div className="grid grid-cols-2 gap-3">
          {/* HOY BREAKDOWN */}
          <div className="bg-[#141414] border border-[#222] rounded-xl p-3.5">
            <p className="text-[9px] tracking-[0.18em] text-neutral-500 font-semibold">HOY BREAKDOWN</p>
            <div className="mt-2 space-y-1">
              {([
                ["Fare", todayTrips.reduce((a,b) => a + b.earnings, 0)],
                ["Tips", todayTrips.reduce((a,b) => a + b.tips + b.extra, 0)],
                ["Tolls", totalTollsToday],
              ] as [string,number][]).map(([label, val]) => (
                <div key={label} className="flex justify-between items-center">
                  <span className="text-[10px] text-neutral-500 font-mono-jet">{label}</span>
                  <span className="font-mono-jet text-[12px] font-semibold text-neutral-200">${val.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
          {/* $/HORA GROSS */}
          <div className="bg-[#141414] border border-[#222] rounded-xl p-3.5">
            <p className="text-[9px] tracking-[0.18em] text-neutral-500 font-semibold">$/HORA GROSS</p>
            <p className={`font-mono-jet text-[20px] font-semibold mt-2 ${perHourGross >= 70 ? "text-[#4ade80]" : perHourGross >= 60 ? "text-[#f6dd8c]" : perHourGross > 0 ? "text-[#ff6b6b]" : "text-white"}`}>
              {perHourGross > 0 ? `$${perHourGross.toFixed(2)}` : "—"}
            </p>
            <div className="mt-1 space-y-0.5">
              <p className="text-[10px] text-neutral-500 font-mono-jet">
                {shiftActive ? activeHoursFormatted : cumulative.hoy > 0 ? `${cumulative.hoy.toFixed(2)}h hoy` : "sin turno"}
              </p>
              <p className="text-[9px] font-mono-jet text-neutral-600">Sem {cumulative.semana.toFixed(1)}h · Mes {cumulative.mes.toFixed(1)}h</p>
            </div>
          </div>
          {/* GASTOS HOY */}
          <div className="bg-[#141414] border border-[#222] rounded-xl p-3.5">
            <p className="text-[9px] tracking-[0.18em] text-neutral-500 font-semibold">GASTOS HOY</p>
            <p className="font-mono-jet text-[20px] font-semibold text-[#ff6b6b] mt-2">
              {expensesToday > 0 ? `−$${expensesToday.toFixed(2)}` : "$0.00"}
            </p>
            <p className="text-[10px] text-neutral-600 mt-1 font-mono-jet">
              {expenses.filter(e => e.date === toYYYYMMDD(currentTime)).length} items hoy
            </p>
          </div>
          {/* NET HOY */}
          <div className="bg-[#141414] border border-[#222] rounded-xl p-3.5">
            <p className="text-[9px] tracking-[0.18em] text-neutral-500 font-semibold">NET HOY</p>
            <p className={`font-mono-jet text-[20px] font-semibold mt-2 ${netToday >= 0 ? "text-[#4ade80]" : "text-[#ff6b6b]"}`}>
              ${netToday.toFixed(2)}
            </p>
            <p className="text-[10px] text-neutral-600 mt-1 font-mono-jet">gross − gastos · ref. semanal ${weeklyTotal.toFixed(0)}</p>
          </div>
        </div>
      </div>

      {/* Goal tracker */}
      <div className="bg-[#141414] border border-[#222] rounded-[20px] p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] tracking-[0.18em] font-bold text-white">TODAY'S PERFORMANCE</h3>
          <span className={`font-mono-jet text-[11px] font-bold ${goalPct >= 100 ? "text-[#4ade80]" : "text-neutral-500"}`}>
            {goalPct.toFixed(0)}% del día
          </span>
        </div>

        {/* $500 daily goal progress bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-neutral-500 font-mono-jet">DAILY GOAL $500</span>
            <span className={`font-mono-jet font-bold ${goalPct >= 100 ? "text-[#4ade80]" : goalPct >= 70 ? "text-[#f6dd8c]" : "text-neutral-400"}`}>
              {goalPct.toFixed(0)}%
            </span>
          </div>
          <div className="h-3 bg-[#1a1a1a] rounded-full overflow-hidden border border-[#2a2a2a]">
            <div className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${goalPct}%`,
                background: goalPct >= 100 ? "#4ade80" : goalPct >= 70 ? "linear-gradient(90deg,#f6dd8c,#d9b64f)" : "linear-gradient(90deg,#374151,#f6dd8c)"
              }} />
          </div>
          <div className="flex items-center justify-between text-[10px] font-mono-jet">
            <span className="text-neutral-500">
              {grossToday >= dailyGoal ? "🏆 Goal reached!" : `Faltan $${remainingToGoal.toFixed(2)}`}
            </span>
            <span className="text-neutral-400">
              {projectedFinish
                ? `Llegas ~${projectedFinish.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
                : grossToday >= dailyGoal ? "✓ Done" : "—"}
            </span>
          </div>
        </div>

        {/* $/hr goal slider */}
        <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-neutral-500">Target $/hora (gross)</span>
            <span className="font-mono-jet text-[18px] font-bold" style={goldGradientStyle}>${goal}/h</span>
          </div>
          <input type="range" min={50} max={100} step={1} value={goal}
            onChange={e => setGoal(parseInt(e.target.value))} className="w-full mt-3" />
          <div className="flex justify-between mt-1">
            <span className="text-[10px] font-mono-jet text-neutral-600">$50</span>
            <span className="text-[10px] font-mono-jet text-neutral-600">$100</span>
          </div>
        </div>

        {/* Actual vs Goal vs Delta */}
        <div className="grid grid-cols-3 gap-2">
          {([
            ["ACTUAL/h", perHourGross > 0 ? `$${perHourGross.toFixed(2)}` : "—", perHourGross >= goal ? "text-[#4ade80]" : perHourGross >= 60 ? "text-[#f6dd8c]" : "text-[#ff6b6b]"],
            ["GOAL/h",   `$${goal.toFixed(0)}`,                             "text-[#f6dd8c]"],
            ["DELTA",    perHourGross > 0 ? `${perHourGross >= goal ? "+" : ""}$${(perHourGross - goal).toFixed(0)}/h` : "—", perHourGross >= goal ? "text-[#4ade80]" : "text-[#ff6b6b]"],
          ] as [string,string,string][]).map(([label, val, cls]) => (
            <div key={label} className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-3">
              <p className="text-[9px] tracking-[0.14em] text-neutral-500">{label}</p>
              <p className={`font-mono-jet text-[15px] font-semibold ${cls} mt-1`}>{val}</p>
            </div>
          ))}
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
          : "bg-[#141414] border border-[#222] border-l-[#374151]"
        }`}>
          <div className="flex items-start gap-2">
            <span className="text-[16px] flex-shrink-0 mt-0.5">{smartSuggestion.emoji}</span>
            <p className="text-[11px] leading-[1.5] text-neutral-200">{smartSuggestion.text}</p>
          </div>
          {perHourGross > 0 && grossToday < dailyGoal && (
            <p className="text-[10px] font-mono-jet text-neutral-500 mt-2">
              A este ritmo necesitas {perHourGross > 0 ? `${(remainingToGoal / perHourGross).toFixed(1)}h` : "—"} más para $500
            </p>
          )}
        </div>

        {/* Trip stats strip */}
        <div className="grid grid-cols-3 gap-0 bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl overflow-hidden">
          <div className="p-3 border-r border-[#1f1f1f] text-center">
            <p className="text-[9px] text-neutral-500 tracking-widest">TRIPS HOY</p>
            <p className="font-mono-jet text-[13px] font-semibold mt-1 text-white">{todayTrips.length}</p>
          </div>
          <div className="p-3 border-r border-[#1f1f1f] text-center">
            <p className="text-[9px] text-neutral-500 tracking-widest">$/VIAJE</p>
            <p className="font-mono-jet text-[13px] font-semibold mt-1 text-[#f6dd8c]">
              ${todayTrips.length ? (grossToday / todayTrips.length).toFixed(2) : "0.00"}
            </p>
          </div>
          <div className="p-3 text-center">
            <p className="text-[9px] text-neutral-500 tracking-widest">SEMANAL</p>
            <p className="font-mono-jet text-[13px] font-semibold mt-1 text-[#f5c518]">${weeklyTotal.toFixed(2)}</p>
          </div>
        </div>

        {/* E-ZPass toll tracking */}
        <div className="rounded-xl bg-[#1a1625] border border-[#2a2340] border-l-[3px] border-l-[#8b5cf6] p-3.5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6]" />
              <p className="text-[10px] tracking-[0.18em] font-bold text-[#a78bfa]">E-ZPASS {TOLL_YEAR} · TOLLS USADOS</p>
            </div>
            <span className="font-mono-jet text-[11px] font-bold text-[#c4b5fd]">${totalTollsToday.toFixed(2)} hoy</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {([["SEMANA", tollsWeek], ["MES", tollsMonth], ["AÑO", tollsYear]] as [string,number][]).map(([label, val]) => (
              <div key={label} className="text-center">
                <p className="text-[8px] text-[#6d5a9c] tracking-widest">{label}</p>
                <p className="font-mono-jet text-[12px] font-semibold text-[#c4b5fd] mt-0.5">${val.toFixed(2)}</p>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-[#c4b5fd]/70 mt-2">
            {shiftActive ? "⚡ Geofencing activo — auto-detectando peajes" : "Inicia turno para auto-detección de peajes"}
          </p>
        </div>
      </div>
    </div>
  );

  // ─── Entry Form ───────────────────────────────────────────────
  const meta = getPlatformMeta(tripForm.platform);

  const EntryFormContent = (
    <div id="trip-entry-form" className="w-full max-w-[480px] mx-auto bg-[#101010] border border-[#222] rounded-[24px] p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="w-1 h-6 bg-[#22c55e] rounded-full inline-block" />
          <h2 className="text-white font-bold text-[18px] tracking-[0.14em] uppercase">TRIP ENTRY</h2>
        </div>
        <span className="px-3 py-1 rounded-full bg-[#1e1e1e] border border-[#2a2a2a] text-[#9ca3af] text-[11px] tracking-[0.12em] font-semibold uppercase">
          {editingId ? "EDITING" : "NEW TRIP"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-[10px] tracking-[0.08em] text-[#9ca3af] font-bold uppercase">REFERENCE / INVOICE</label>
          <input value={tripForm.reference}
            onChange={e => setTripForm(s => ({ ...s, reference: e.target.value }))}
            placeholder="e.g. INV-2026-001"
            className="w-full h-11 rounded-xl bg-black border border-[#262626] px-3 text-white text-[13px] font-medium placeholder:text-[#6b7280] focus:outline-none focus:border-[#3a3a3a]" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] tracking-[0.08em] text-[#9ca3af] font-bold uppercase">EARNINGS <span className="font-normal normal-case opacity-70">Fare</span></label>
          <input inputMode="decimal" value={tripForm.earnings}
            onChange={e => { if (numericFilter(e.target.value)) setTripForm(s => ({ ...s, earnings: e.target.value })); }}
            placeholder="0.00"
            className="w-full h-11 rounded-xl bg-black border border-[#262626] px-3 text-white text-[16px] font-bold font-mono-jet placeholder:text-[#6b7280] focus:outline-none focus:border-[#3a3a3a]" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-[10px] tracking-[0.08em] text-[#9ca3af] font-bold uppercase">TIPS</label>
          <input inputMode="decimal" value={tripForm.tips}
            onChange={e => { if (numericFilter(e.target.value)) setTripForm(s => ({ ...s, tips: e.target.value })); }}
            placeholder="0.00"
            className="w-full h-11 rounded-xl bg-black border border-[#262626] px-3 text-white text-[16px] font-bold font-mono-jet placeholder:text-[#6b7280] focus:outline-none focus:border-[#3a3a3a]" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] tracking-[0.08em] text-[#9ca3af] font-bold uppercase">EXTRA CASH</label>
          <input inputMode="decimal" value={tripForm.extraCash}
            onChange={e => { if (numericFilter(e.target.value)) setTripForm(s => ({ ...s, extraCash: e.target.value })); }}
            placeholder="0.00"
            className="w-full h-11 rounded-xl bg-black border border-[#262626] px-3 text-white text-[16px] font-bold font-mono-jet placeholder:text-[#6b7280] focus:outline-none focus:border-[#3a3a3a]" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-[10px] tracking-[0.08em] text-[#9ca3af] font-bold uppercase">TOLL ($)</label>
            {detectedToll ? (
              tollManuallyEdited ? (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#2d1b00] border border-[#92400e] text-[#fbbf24] text-[10px] font-bold tracking-wider animate-pulse">
                  ✎ EDITED · detected ${detectedToll.rate.toFixed(2)}
                </span>
              ) : (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#052e16] border border-[#166534] text-[#4ade80] text-[10px] font-bold tracking-wider">
                  ⚡ DETECTED · {detectedToll.plaza}
                </span>
              )
            ) : (
              <span className="px-2 py-0.5 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] text-neutral-500 text-[10px] font-bold tracking-widest">GPS AUTO</span>
            )}
          </div>
          {detectedToll && (
            <p className="text-[10px] text-neutral-500 font-mono-jet">
              {detectedToll.plaza} · ${detectedToll.rate.toFixed(2)} · {detectedToll.at}
              {detectedToll.rate === 16.79 || detectedToll.rate === 14.79
                ? detectedToll.rate === 16.79 ? " · Peak" : " · Off-peak"
                : ""} · {TOLL_YEAR}
            </p>
          )}
          <input inputMode="decimal" value={tripForm.toll}
            onChange={e => {
              if (!numericFilter(e.target.value)) return;
              setTripForm(s => ({ ...s, toll: e.target.value }));
              if (detectedToll) setTollManuallyEdited(true);
            }}
            placeholder="e.g. 7.46"
            className={`w-full h-11 rounded-xl bg-black px-3 text-white text-[16px] font-bold font-mono-jet placeholder:text-[#6b7280] focus:outline-none transition-colors border ${
              detectedToll && !tollManuallyEdited
                ? "border-[#166534] focus:border-[#4ade80]"
                : detectedToll && tollManuallyEdited
                ? "border-[#92400e] focus:border-[#fbbf24]"
                : "border-[#262626] focus:border-[#3a3a3a]"
            }`} />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] tracking-[0.08em] text-[#9ca3af] font-bold uppercase">PLATFORM FEE ($)</label>
          <input inputMode="decimal" value={tripForm.platformFee}
            onChange={e => { if (numericFilter(e.target.value)) setTripForm(s => ({ ...s, platformFee: e.target.value })); }}
            placeholder="0.00"
            className="w-full h-11 rounded-xl bg-black border border-[#262626] px-3 text-white text-[16px] font-bold font-mono-jet placeholder:text-[#6b7280] focus:outline-none focus:border-[#3a3a3a]" />
        </div>
      </div>

      {/* Platform selector */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <label className="text-[10px] tracking-[0.08em] text-[#9ca3af] font-bold uppercase">PLATFORM</label>
          <PlatformAvatar meta={meta} size="sm" />
          <span className="text-[11px] font-semibold text-white truncate">{tripForm.platform}</span>
          {meta.tags.map(tg => (
            <span key={tg} className={`text-[8px] font-bold uppercase tracking-[0.1em] px-1.5 py-0.5 rounded-full border ${getTagStyle(tg)}`}>{tg}</span>
          ))}
        </div>
        <div className="relative">
          <select value={tripForm.platform} onChange={e => setTripForm(s => ({ ...s, platform: e.target.value }))}
            className="w-full h-11 rounded-xl bg-black border border-[#262626] px-3 pr-8 text-white text-[14px] font-bold appearance-none focus:outline-none focus:border-[#3a3a3a]">
            <option>EcoRide - 10% fee</option>
            <option>EcoRide</option>
            <option>Uber</option>
            <option>Lyft</option>
            <option>Empower</option>
            <option>Gallant</option>
            <option>Aventus Ride</option>
            <option>Classic Ryde</option>
            <option>Aki Technology</option>
            <option>Street Hail</option>
            <option>Island City Transit</option>
            <option>Transit Tax</option>
            <option>Other</option>
          </select>
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 text-[12px]">▼</span>
        </div>
      </div>

      {/* Pickup */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-full bg-[#052e16] border border-[#166534] text-[#4ade80] text-[10px] font-bold tracking-widest uppercase">PICKUP</span>
          <span className="text-[10px] text-[#6b7280]">Origin</span>
        </div>
        <div className="relative">
          <input value={tripForm.pickup}
            onChange={e => setTripForm(s => ({ ...s, pickup: e.target.value }))}
            placeholder={gps.lat ? `GPS: ${gps.lat.toFixed(4)},${gps.lng?.toFixed(4)}` : "Address or place"}
            className="w-full h-11 rounded-xl bg-black border border-[#262626] pl-3 pr-[44px] text-white text-[13px] font-medium placeholder:text-[#6b7280] focus:outline-none focus:border-[#14532d]" />
          <button type="button" onClick={async () => {
            if (!gps.lat || !gps.lng) { startGPS(); showToast("GPS searching… tap again when ready"); return; }
            setPickupResolving(true);
            try {
              const rich = await reverseGeocodeRich(gps.lat, gps.lng);
              setTripForm(s => ({ ...s, pickup: rich }));
              showToast("Pickup location resolved ✓");
            } catch {
              setTripForm(s => ({ ...s, pickup: `${gps.lat!.toFixed(5)},${gps.lng!.toFixed(5)}` }));
              showToast("GPS coordinates saved (sin conexión)");
            } finally { setPickupResolving(false); }
          }} className="absolute right-1 top-1 w-[36px] h-[36px] rounded-lg bg-[#052e16] border border-[#166534] flex items-center justify-center text-[14px] hover:bg-[#0a3a1f] transition-colors">
            {pickupResolving ? <span className="animate-spin text-[11px]">⏳</span> : "📍"}
          </button>
        </div>
        {gps.lat && (
          <div className="space-y-0.5">
            <p className="font-mono-jet text-[10px] text-[#4ade80]">GPS: {gps.lat.toFixed(5)},{gps.lng?.toFixed(5)} · ±{gps.acc ? Math.round(gps.acc) : "?"}m</p>
            {gpsAddress && <p className="font-mono-jet text-[10px] text-neutral-400 truncate">📍 {gpsAddress}</p>}
            {gpsAirport && <p className="font-mono-jet text-[10px] text-[#f6dd8c]">✈ Near {gpsAirport}</p>}
          </div>
        )}
      </div>

      {/* Dropoff */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-full bg-[#0c1a33] border border-[#1e3a8a] text-[#60a5fa] text-[10px] font-bold tracking-widest uppercase">DROP OFF</span>
          <span className="text-[10px] text-[#6b7280]">Destination</span>
        </div>
        <div className="relative">
          <input value={tripForm.dropoff}
            onChange={e => setTripForm(s => ({ ...s, dropoff: e.target.value }))}
            placeholder="Address or place"
            className="w-full h-11 rounded-xl bg-black border border-[#262626] pl-3 pr-[44px] text-white text-[13px] font-medium placeholder:text-[#6b7280] focus:outline-none focus:border-[#1e3a8a]" />
          <button type="button" onClick={async () => {
            if (!gps.lat || !gps.lng) { startGPS(); showToast("GPS searching… tap again when ready"); return; }
            setDropoffResolving(true);
            try {
              const rich = await reverseGeocodeRich(gps.lat, gps.lng);
              setTripForm(s => ({ ...s, dropoff: rich }));
              showToast("Drop-off location resolved ✓");
            } catch {
              setTripForm(s => ({ ...s, dropoff: `${gps.lat!.toFixed(5)},${gps.lng!.toFixed(5)}` }));
              showToast("GPS coordinates saved (sin conexión)");
            } finally { setDropoffResolving(false); }
          }} className="absolute right-1 top-1 w-[36px] h-[36px] rounded-lg bg-[#0c1a33] border border-[#1e3a8a] flex items-center justify-center text-[14px] hover:bg-[#132a5a] transition-colors">
            {dropoffResolving ? <span className="animate-spin text-[11px]">⏳</span> : "📍"}
          </button>
        </div>
      </div>

      {/* Quick location menus */}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => { if (!gps.lat) startGPS(); setShowPickupMenu(v => !v); setShowDropoffMenu(false); }}
          className="h-10 rounded-xl bg-black border border-[#14532d] px-3 flex items-center gap-2 text-white text-[11px] font-bold text-left hover:bg-[#052e16]/30 transition-colors">
          <span className="text-[#22c55e] text-[13px]">📍</span>
          <span className="truncate">Quick Pickup…</span>
        </button>
        <button type="button" onClick={() => { if (!gps.lat) startGPS(); setShowDropoffMenu(v => !v); setShowPickupMenu(false); }}
          className="h-10 rounded-xl bg-black border border-[#1e3a8a] px-3 flex items-center gap-2 text-white text-[11px] font-bold text-left hover:bg-[#0c1a33]/60 transition-colors">
          <span className="text-[#60a5fa] text-[13px]">📍</span>
          <span className="truncate">Quick Drop Off…</span>
        </button>
      </div>

      {showPickupMenu && (
        <div className="bg-[#141414] border border-[#222] rounded-2xl p-3">
          <p className="text-[11px] tracking-[0.12em] text-neutral-500 font-bold uppercase mb-2">PICKUP CATEGORY</p>
          {gps.lat && (
            <div className="w-full rounded-xl bg-black border border-[#262626] px-3 py-2 text-[12px] text-neutral-300 mb-3 flex flex-col">
              <span className="font-mono-jet truncate">📍 {gps.lat.toFixed(5)},{gps.lng?.toFixed(5)}{gps.acc ? ` · ±${Math.round(gps.acc)}m` : ""}</span>
              {gpsAddress && <span className="font-mono-jet text-[11px] text-neutral-400 mt-0.5">{gpsAddress}</span>}
              {gpsAirport && <span className="font-mono-jet text-[11px] text-[#f6dd8c] mt-0.5">✈ {gpsAirport}</span>}
            </div>
          )}
          <div className="grid grid-cols-2 gap-2.5">
            {LOCATION_CATEGORIES.map(cat => (
              <button key={`p-${cat}`} type="button" onClick={() => {
                const coord = gps.lat ? ` (${gps.lat.toFixed(4)},${gps.lng?.toFixed(4)})` : "";
                setTripForm(s => ({ ...s, pickup: `${cat}${coord}` }));
                setShowPickupMenu(false);
                showToast(`Pickup: ${cat}`);
              }} className="h-14 rounded-xl bg-[#1e1e1e] border border-[#2a2a2a] text-white text-[14px] font-medium hover:bg-[#2a2a2a] transition-colors text-center">
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {showDropoffMenu && (
        <div className="bg-[#141414] border border-[#222] rounded-2xl p-3">
          <p className="text-[11px] tracking-[0.12em] text-neutral-500 font-bold uppercase mb-2">DROP OFF CATEGORY</p>
          <div className="grid grid-cols-2 gap-2.5">
            {LOCATION_CATEGORIES.map(cat => (
              <button key={`d-${cat}`} type="button" onClick={() => {
                const coord = gps.lat ? ` (${gps.lat.toFixed(4)},${gps.lng?.toFixed(4)})` : "";
                setTripForm(s => ({ ...s, dropoff: `${cat}${coord}` }));
                setShowDropoffMenu(false);
                showToast(`Drop-off: ${cat}`);
              }} className="h-14 rounded-xl bg-[#1e1e1e] border border-[#2a2a2a] text-white text-[14px] font-medium hover:bg-[#2a2a2a] transition-colors text-center">
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-1">
        <label className="text-[10px] tracking-[0.08em] text-[#9ca3af] font-bold uppercase">NOTES</label>
        <textarea value={tripForm.notes} onChange={e => setTripForm(s => ({ ...s, notes: e.target.value }))}
          placeholder="Surge, traffic, late toll, invoice details…" rows={1}
          className="w-full rounded-xl bg-black border border-[#262626] px-3 py-2.5 text-[12px] text-[#d1d5db] placeholder:text-[#6b7280] focus:outline-none focus:border-[#3a3a3a] resize-none leading-[1.5]" />
      </div>

      {/* Grand total preview */}
      <div className="rounded-xl bg-black border border-[#262626] px-4 py-2.5 flex items-center justify-between">
        <span className="text-[10px] tracking-[0.08em] text-[#9ca3af] font-bold uppercase">GRAND TOTAL</span>
        <span className="font-mono-jet text-[22px] font-bold text-[#facc15] tracking-tight">${grandTotalLive.toFixed(2)}</span>
      </div>

      <button type="button" onClick={handleSave}
        className="w-full h-12 rounded-xl bg-[#facc15] hover:bg-[#fde047] text-black font-bold text-[16px] tracking-[0.14em] uppercase transition-colors shadow-[0_0_16px_rgba(250,204,21,0.2)]">
        {editingId ? "UPDATE TRIP" : "+ SAVE TRIP"}
      </button>
      {editingId && (
        <button type="button" onClick={resetForm}
          className="w-full h-11 rounded-2xl border border-[#2a2a2a] bg-[#0a0a0a] text-[12px] font-semibold tracking-[0.08em] text-neutral-400 hover:text-white transition-colors">
          CANCEL EDIT
        </button>
      )}

      {/* Storage status — compact bar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${storageVerified ? "bg-[#22c55e] animate-pulse" : "bg-red-500"}`} />
          <span className={`text-[9px] font-bold tracking-widest ${storageVerified ? "text-[#4ade80]" : "text-red-400"}`}>
            {storageVerified ? "STORAGE ACTIVE" : "STORAGE ERROR"}
          </span>
          <span className="text-[9px] text-neutral-600 font-mono-jet">· {trips.length} trips · {(storageBytes / 1024).toFixed(1)}KB</span>
        </div>
        <div className="flex gap-1.5">
          <button onClick={() => {
            try {
              const raw = localStorage.getItem("island-city-trips");
              if (raw) showToast(`✓ ${JSON.parse(raw).length} trips · ${(new Blob([raw]).size / 1024).toFixed(2)}KB`);
              else showToast("No data on disk yet");
            } catch { showToast("Error reading storage"); }
          }} className="px-2 h-6 rounded-full bg-[#1e1e1e] border border-[#2a2a2a] text-[8px] font-bold tracking-widest text-neutral-400 hover:text-white">
            VERIFY
          </button>
          <button onClick={() => {
            navigator.clipboard?.writeText(localStorage.getItem("island-city-trips") || "");
            showToast("JSON copied — backup ready");
          }} className="px-2 h-6 rounded-full bg-[#0a0a0a] border border-[#222] text-[8px] font-bold tracking-widest text-neutral-500 hover:text-white">
            BACKUP
          </button>
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
      <div className="flex items-center justify-between">
        <h2 className="text-[22px] font-bold text-white tracking-tight">Register</h2>
        <div className="flex items-center gap-2">
          {selectedCount > 0 && (
            <span className="px-2.5 py-1 rounded-full bg-[#facc15]/20 border border-[#facc15]/40 text-[#f6dd8c] text-[10px] font-bold">
              {selectedCount} selected
            </span>
          )}
          <span className="font-mono-jet text-[12px] text-neutral-500">{pendingTrips.length} pending</span>
        </div>
      </div>

      {/* Sticky totals bar — always visible while scrolling */}
      <div className="sticky z-20 -mx-4 px-4 pt-2 pb-3 bg-black/96 backdrop-blur-sm border-b border-[#1a1a1a]" style={{ top: 'calc(112px + env(safe-area-inset-top))' }}>
        <div className="grid grid-cols-3 gap-2">
          {([
            ["PENDING", pendingTrips.length + (pendingTrips.length === 1 ? " trip" : " trips")],
            ["TODAY",   "$" + pendingTodayAmt.toFixed(2)],
            ["TOTAL",   "$" + pendingTotal.toFixed(2)],
          ] as [string, string][]).map(([lbl, val]) => (
            <div key={lbl} className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-xl p-2 text-center">
              <p className="text-[8px] tracking-[0.15em] text-neutral-600 font-bold uppercase">{lbl}</p>
              <p className="font-mono-jet text-[14px] font-bold text-[#f6dd8c] mt-0.5">{val}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Storage pill */}
      <div className={`rounded-xl border px-3 py-2 flex items-center justify-between ${storageVerified ? "bg-[#052e16]/20 border-[#166534]/30" : "bg-[#1a0a0a] border-[#7f1d1d]/30"}`}>
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${storageVerified ? "bg-[#22c55e] animate-pulse" : "bg-red-500"}`} />
          <p className="font-mono-jet text-[10px] text-neutral-500">{trips.length} total · {(storageBytes / 1024).toFixed(2)}KB · {lastSavedAt !== "—" ? new Date(lastSavedAt).toLocaleTimeString() : "—"}</p>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold flex-shrink-0 ${storageVerified ? "bg-[#22c55e]/20 text-[#4ade80] border border-[#166534]" : "bg-red-900/30 text-red-400"}`}>
          {storageVerified ? "✓ SAVED" : "✗ ERR"}
        </span>
      </div>

      {/* Empty state */}
      {pendingTrips.length === 0 ? (
        <div className="bg-[#141414] border border-[#222] rounded-2xl p-10 text-center space-y-2">
          <p className="text-[15px] font-semibold text-white">All trips posted ✓</p>
          <p className="text-[12px] text-neutral-500">Nothing pending — check the Ledger tab</p>
          <button onClick={() => setActiveTab("ENTRY")}
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
                    <span className="font-mono-jet text-[11px] text-neutral-500">{dayTrips.length} trip{dayTrips.length !== 1 ? "s" : ""} · ${dayTotal.toFixed(2)}</span>
                  </div>
                </div>

                {/* Trip cards for this day */}
                {dayTrips.map(t => {
                  const pm    = getPlatformMeta(t.platform);
                  const isSel = selectedForPost.has(t.id);
                  const liveFare = parseFloat(inlineEditId === t.id ? inlineForm.earnings : String(t.earnings)) || 0;
                  const liveTotal = liveFare + t.tips + t.extra + t.toll - t.fee;

                  return (
                    <div key={t.id} className={`border rounded-2xl p-4 space-y-3 transition-all duration-150 ${isSel ? "bg-[#141410] border-[#facc15]/30" : "bg-[#141414] border-[#222]"}`}>
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
                              <span className="font-mono-jet text-[11px] text-neutral-500">{t.time}</span>
                              <PlatformAvatar meta={pm} size="sm" />
                              <span className="px-2 py-0.5 rounded-full bg-[#1e1e1e] border border-[#333] text-[#e8c766] text-[9px] font-bold tracking-[0.12em]">{t.platform.toUpperCase()}</span>
                              {pm.tags.map(tg => (
                                <span key={tg} className={`text-[8px] font-bold uppercase tracking-[0.1em] px-2 py-0.5 rounded-full border ${getTagStyle(tg)}`}>{tg}</span>
                              ))}
                            </div>
                            <span className="font-mono-jet text-[17px] font-bold text-[#facc15] flex-shrink-0">${t.grandTotal.toFixed(2)}</span>
                          </div>

                          {t.reference && <p className="font-mono-jet text-[10px] text-neutral-600 mt-1">REF: {t.reference}</p>}

                          <p className="text-[13px] text-white/80 font-medium mt-1.5 leading-[1.3] break-words">
                            {t.pickup || "—"} <span className="text-neutral-600 mx-1">→</span> {t.dropoff || "—"}
                          </p>

                          <div className="flex gap-2 font-mono-jet text-[9px] text-neutral-600 flex-wrap mt-1">
                            <span>Fare ${t.earnings.toFixed(2)}</span>
                            {t.tips > 0  && <span>Tips ${t.tips.toFixed(2)}</span>}
                            {t.extra > 0 && <span>Extra ${t.extra.toFixed(2)}</span>}
                            {t.toll > 0  && <span>Toll ${t.toll.toFixed(2)}</span>}
                            {t.fee > 0   && <span>Fee −${t.fee.toFixed(2)}</span>}
                            {t.gps       && <span>📍 {t.gps.lat.toFixed(4)},{t.gps.lng.toFixed(4)}</span>}
                          </div>
                          {t.notes && <p className="text-[11px] text-neutral-500 mt-1 leading-[1.4] break-words">{t.notes}</p>}
                        </div>
                      </div>

                      {/* Inline edit form */}
                      {inlineEditId === t.id ? (
                        <div className="bg-[#0a0a0a] border border-[#222] rounded-xl p-3 space-y-2">
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
                          {/* Live total preview */}
                          <div className="flex items-center justify-between bg-black rounded-lg px-3 py-2 border border-[#1e1e1e]">
                            <span className="font-mono-jet text-[9px] text-neutral-600 truncate pr-2">
                              ${liveFare.toFixed(2)} fare + ${t.tips.toFixed(2)} tips + ${t.extra.toFixed(2)} extra + ${t.toll.toFixed(2)} toll − ${t.fee.toFixed(2)} fee
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

      {/* Floating POST TO LEDGER button */}
      {selectedCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-[440px] px-4 pointer-events-none">
          <button
            onClick={handlePostToLedger}
            style={{ pointerEvents: "auto" }}
            className="w-full h-14 rounded-2xl bg-[#facc15] hover:bg-[#fde047] active:scale-[0.98] text-black font-bold text-[14px] tracking-[0.06em] shadow-[0_0_32px_rgba(250,204,21,0.45)] transition-all flex items-center justify-center gap-3">
            <span>POST {selectedCount} TO LEDGER</span>
            <span className="font-mono-jet opacity-80">${selectedAmt.toFixed(2)}</span>
            <span>→</span>
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
      <div className="sticky z-20 -mx-4 px-4 pt-2 pb-3 bg-black/96 backdrop-blur-sm border-b border-[#1a1a1a]" style={{ top: 'calc(112px + env(safe-area-inset-top))' }}>
        <div className="grid grid-cols-2 gap-2">
          {([
            ["POSTED TRIPS", String(postedTrips.length)],
            ["LEDGER TOTAL", "$" + postedTotal.toFixed(2)],
          ] as [string, string][]).map(([lbl, val]) => (
            <div key={lbl} className="bg-[#0d140d] border border-[#1a3a1a] rounded-xl p-2.5 text-center">
              <p className="text-[8px] tracking-[0.15em] text-[#4ade80]/50 font-bold uppercase">{lbl}</p>
              <p className="font-mono-jet text-[15px] font-bold text-[#4ade80] mt-0.5">{val}</p>
            </div>
          ))}
        </div>
      </div>

      {postedTrips.length === 0 ? (
        <div className="bg-[#141414] border border-[#222] rounded-2xl p-10 text-center space-y-2">
          <p className="text-[15px] font-semibold text-white">Ledger is empty</p>
          <p className="text-[12px] text-neutral-500">Review trips in Register and post them here</p>
          <button onClick={() => setActiveTab("REGISTER")}
            className="mt-3 h-10 px-6 rounded-full border border-[#166534]/60 text-[#4ade80] text-[12px] font-semibold hover:bg-[#4ade80]/10 transition-colors">
            Go to Register →
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
                    <span className="text-[11px] font-bold tracking-[0.12em] text-[#4ade80]/70 uppercase">{dayLabel}</span>
                  </div>
                  <span className="font-mono-jet text-[11px] text-[#4ade80]/60">{dayTrips.length} trip{dayTrips.length !== 1 ? "s" : ""} · ${dayTotal.toFixed(2)}</span>
                </div>

                {/* Posted trip cards — read-only */}
                {dayTrips.map(t => {
                  const pm = getPlatformMeta(t.platform);
                  return (
                    <div key={t.id} className="bg-[#0c140c] border border-[#1a2e1a] rounded-2xl p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          <span className="font-mono-jet text-[11px] text-neutral-500">{t.time}</span>
                          <PlatformAvatar meta={pm} size="sm" />
                          <span className="px-2 py-0.5 rounded-full bg-[#0d1f0d] border border-[#1a3a1a] text-[#4ade80] text-[9px] font-bold tracking-[0.12em]">{t.platform.toUpperCase()}</span>
                          <span className="px-2 py-0.5 rounded-full bg-[#052e16] border border-[#166534] text-[#4ade80] text-[8px] font-bold tracking-widest">✓ POSTED</span>
                        </div>
                        <span className="font-mono-jet text-[17px] font-bold text-[#4ade80] flex-shrink-0">${t.grandTotal.toFixed(2)}</span>
                      </div>
                      {t.reference && <p className="font-mono-jet text-[10px] text-neutral-600">REF: {t.reference}</p>}
                      <p className="text-[13px] text-white/70 font-medium leading-[1.3] break-words">
                        {t.pickup || "—"} <span className="text-neutral-600 mx-1">→</span> {t.dropoff || "—"}
                      </p>
                      <div className="flex gap-2 font-mono-jet text-[9px] text-neutral-600 flex-wrap">
                        <span>Fare ${t.earnings.toFixed(2)}</span>
                        {t.tips > 0  && <span>Tips ${t.tips.toFixed(2)}</span>}
                        {t.extra > 0 && <span>Extra ${t.extra.toFixed(2)}</span>}
                        {t.toll > 0  && <span>Toll ${t.toll.toFixed(2)}</span>}
                        {t.fee > 0   && <span>Fee −${t.fee.toFixed(2)}</span>}
                        {t.postedAt  && <span>📋 Posted {new Date(t.postedAt).toLocaleDateString()}</span>}
                      </div>
                      {t.notes && <p className="text-[11px] text-neutral-600 leading-[1.4] break-words">{t.notes}</p>}
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
  const allVendors           = useMemo(() => [...customVendors], [customVendors]);

  const ExpensesContent = (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[22px] font-bold text-white">Gastos</h2>
          <p className="text-[11px] text-neutral-500 mt-0.5 font-mono-jet">{expenses.length} registros · −${totalExpenses.toFixed(2)}</p>
        </div>
        <button
          onClick={() => {
            if (showExpenseForm && !editingExpenseId) { setShowExpenseForm(false); }
            else { setShowExpenseForm(true); setEditingExpenseId(null); resetExpenseForm(); setAddingCustomType(false); setAddingCustomCat(false); setAddingCustomVendor(false); }
          }}
          className="h-10 px-4 rounded-full bg-[#facc15] text-black text-[12px] font-bold tracking-wide hover:bg-[#fde047] transition-colors">
          {showExpenseForm && !editingExpenseId ? "✕ Cerrar" : "+ Nuevo Gasto"}
        </button>
      </div>

      {/* Entry / Edit form */}
      {showExpenseForm && (
        <div className="bg-[#101010] border border-[#2a2a2a] rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-bold tracking-[0.16em] text-white uppercase">
              {editingExpenseId ? "✏️ Editando gasto" : "Nuevo Gasto"}
            </h3>
            {editingExpenseId && (
              <button onClick={() => { setEditingExpenseId(null); resetExpenseForm(); setShowExpenseForm(false); }}
                className="text-[10px] text-neutral-500 hover:text-white transition-colors">← Cancelar</button>
            )}
          </div>

          {/* Vendor / Name dropdown */}
          <div>
            <label className="text-[9px] text-neutral-500 font-bold uppercase tracking-widest mb-1 block">Vendor / Nombre del gasto</label>
            <div className="relative">
              <select value={expenseForm.name}
                onChange={e => { if (e.target.value === "__add__") { setAddingCustomVendor(true); } else { setExpenseForm(s => ({ ...s, name: e.target.value })); } }}
                className="w-full h-11 rounded-xl bg-black border border-[#262626] px-3 pr-8 text-white text-[13px] appearance-none focus:outline-none">
                <option value="" disabled>Selecciona un vendor...</option>
                {allVendors.map(v => <option key={v} value={v}>{v}</option>)}
                {allVendors.length > 0 && <option disabled>──────────</option>}
                <option value="__add__">➕ Añadir vendor...</option>
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 text-[10px]">▼</span>
            </div>
            {addingCustomVendor && (
              <div className="flex gap-2 mt-2">
                <input value={newCustomVendor} onChange={e => setNewCustomVendor(e.target.value)}
                  placeholder="Ej: BP Queens Blvd, Jiffy Lube..."
                  onKeyDown={e => { if (e.key === "Enter" && newCustomVendor.trim()) { const v = newCustomVendor.trim(); setCustomVendors(p => [...p, v]); setExpenseForm(s => ({ ...s, name: v })); setNewCustomVendor(""); setAddingCustomVendor(false); } }}
                  className="flex-1 h-10 rounded-xl bg-black border border-[#facc15]/40 px-3 text-white text-[13px] focus:outline-none" autoFocus />
                <button onClick={() => { if (newCustomVendor.trim()) { const v = newCustomVendor.trim(); setCustomVendors(p => [...p, v]); setExpenseForm(s => ({ ...s, name: v })); setNewCustomVendor(""); setAddingCustomVendor(false); } }}
                  className="h-10 px-3 rounded-xl bg-[#facc15] text-black text-[12px] font-bold">Añadir</button>
                <button onClick={() => { setAddingCustomVendor(false); setNewCustomVendor(""); }}
                  className="h-10 px-3 rounded-xl bg-[#1e1e1e] border border-[#2a2a2a] text-neutral-400 text-[12px]">✕</button>
              </div>
            )}
          </div>

          {/* Type dropdown */}
          <div>
            <label className="text-[9px] text-neutral-500 font-bold uppercase tracking-widest mb-1 block">Tipo de gasto</label>
            <div className="relative">
              <select value={expenseForm.type}
                onChange={e => { if (e.target.value === "__add__") { setAddingCustomType(true); } else { setExpenseForm(s => ({ ...s, type: e.target.value })); } }}
                className="w-full h-11 rounded-xl bg-black border border-[#262626] px-3 pr-8 text-white text-[13px] appearance-none focus:outline-none">
                {allExpenseTypes.map(t => <option key={t} value={t}>{t}</option>)}
                <option disabled>──────────</option>
                <option value="__add__">➕ Añadir nuevo tipo...</option>
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 text-[10px]">▼</span>
            </div>
            {addingCustomType && (
              <div className="flex gap-2 mt-2">
                <input value={newCustomType} onChange={e => setNewCustomType(e.target.value)}
                  placeholder="Nombre del nuevo tipo..."
                  onKeyDown={e => { if (e.key === "Enter" && newCustomType.trim()) { const t = newCustomType.trim(); setCustomExpenseTypes(p => [...p, t]); setExpenseForm(s => ({ ...s, type: t })); setNewCustomType(""); setAddingCustomType(false); } }}
                  className="flex-1 h-10 rounded-xl bg-black border border-[#facc15]/40 px-3 text-white text-[13px] focus:outline-none" autoFocus />
                <button onClick={() => { if (newCustomType.trim()) { const t = newCustomType.trim(); setCustomExpenseTypes(p => [...p, t]); setExpenseForm(s => ({ ...s, type: t })); setNewCustomType(""); setAddingCustomType(false); } }}
                  className="h-10 px-3 rounded-xl bg-[#facc15] text-black text-[12px] font-bold">Añadir</button>
                <button onClick={() => { setAddingCustomType(false); setNewCustomType(""); }}
                  className="h-10 px-3 rounded-xl bg-[#1e1e1e] border border-[#2a2a2a] text-neutral-400 text-[12px]">✕</button>
              </div>
            )}
          </div>

          {/* Category dropdown */}
          <div>
            <label className="text-[9px] text-neutral-500 font-bold uppercase tracking-widest mb-1 block">Categoría (IRS Schedule C)</label>
            <div className="relative">
              <select value={expenseForm.category}
                onChange={e => { if (e.target.value === "__add__") { setAddingCustomCat(true); } else { setExpenseForm(s => ({ ...s, category: e.target.value })); } }}
                className="w-full h-11 rounded-xl bg-black border border-[#262626] px-3 pr-8 text-white text-[13px] appearance-none focus:outline-none">
                {allExpenseCategories.map(c => <option key={c} value={c}>{c}</option>)}
                <option disabled>──────────</option>
                <option value="__add__">➕ Añadir categoría...</option>
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 text-[10px]">▼</span>
            </div>
            {addingCustomCat && (
              <div className="flex gap-2 mt-2">
                <input value={newCustomCat} onChange={e => setNewCustomCat(e.target.value)}
                  placeholder="Nueva categoría..."
                  onKeyDown={e => { if (e.key === "Enter" && newCustomCat.trim()) { const c = newCustomCat.trim(); setCustomExpenseCategories(p => [...p, c]); setExpenseForm(s => ({ ...s, category: c })); setNewCustomCat(""); setAddingCustomCat(false); } }}
                  className="flex-1 h-10 rounded-xl bg-black border border-[#facc15]/40 px-3 text-white text-[13px] focus:outline-none" autoFocus />
                <button onClick={() => { if (newCustomCat.trim()) { const c = newCustomCat.trim(); setCustomExpenseCategories(p => [...p, c]); setExpenseForm(s => ({ ...s, category: c })); setNewCustomCat(""); setAddingCustomCat(false); } }}
                  className="h-10 px-3 rounded-xl bg-[#facc15] text-black text-[12px] font-bold">Añadir</button>
                <button onClick={() => { setAddingCustomCat(false); setNewCustomCat(""); }}
                  className="h-10 px-3 rounded-xl bg-[#1e1e1e] border border-[#2a2a2a] text-neutral-400 text-[12px]">✕</button>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="text-[9px] text-neutral-500 font-bold uppercase tracking-widest mb-1 block">Descripción (opcional)</label>
            <input value={expenseForm.description} onChange={e => setExpenseForm(s => ({ ...s, description: e.target.value }))}
              placeholder="Notas adicionales sobre este gasto..."
              className="w-full h-11 rounded-xl bg-black border border-[#262626] px-3 text-white text-[14px] placeholder:text-neutral-600 focus:outline-none" />
          </div>

          {/* Amount + Date */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-[9px] text-neutral-500 font-bold uppercase tracking-widest mb-1 block">Cantidad ($)</label>
              <input inputMode="decimal" value={expenseForm.amount}
                onChange={e => { if (numericFilter(e.target.value)) setExpenseForm(s => ({ ...s, amount: e.target.value })); }}
                placeholder="0.00"
                className="w-full h-11 rounded-xl bg-black border border-[#262626] px-3 text-white text-[18px] font-bold font-mono-jet placeholder:text-neutral-600 focus:outline-none" />
            </div>
            <div className="w-[130px] flex-shrink-0">
              <label className="text-[9px] text-neutral-500 font-bold uppercase tracking-widest mb-1 block">Fecha</label>
              <input type="date" value={expenseForm.date} onChange={e => setExpenseForm(s => ({ ...s, date: e.target.value }))}
                className="w-full h-11 rounded-xl bg-black border border-[#262626] px-2 text-white text-[11px] focus:outline-none" />
            </div>
          </div>

          {/* Frequency (recurring) */}
          <div>
            <label className="text-[9px] text-neutral-500 font-bold uppercase tracking-widest mb-1.5 block">Frecuencia (gasto recurrente)</label>
            <div className="flex gap-1.5">
              {(["none","daily","weekly","monthly"] as const).map(f => (
                <button key={f} onClick={() => setExpenseForm(s => ({ ...s, frequency: f }))}
                  className={`flex-1 h-9 rounded-xl text-[10px] font-bold transition-colors ${
                    expenseForm.frequency === f
                      ? "bg-[#facc15] text-black"
                      : "bg-[#1e1e1e] text-neutral-500 border border-[#262626] hover:text-white"
                  }`}>
                  {f === "none" ? "Una vez" : f === "daily" ? "Diario" : f === "weekly" ? "Semanal" : "Mensual"}
                </button>
              ))}
            </div>
          </div>

          {/* Due date — only if recurring */}
          {expenseForm.frequency !== "none" && (
            <div>
              <label className="text-[9px] text-neutral-500 font-bold uppercase tracking-widest mb-1 block">Próxima fecha de vencimiento</label>
              <input type="date" value={expenseForm.dueDate}
                onChange={e => setExpenseForm(s => ({ ...s, dueDate: e.target.value }))}
                className="w-full h-11 rounded-xl bg-black border border-[#262626] px-3 text-white text-[13px] focus:outline-none" />
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-2 pt-1">
            <button onClick={handleSaveExpense}
              className="flex-1 h-12 rounded-full bg-[#facc15] text-black text-[13px] font-bold tracking-wide hover:bg-[#fde047] transition-colors">
              {editingExpenseId ? "Actualizar" : "Guardar Gasto"}
            </button>
            <button onClick={() => { setShowExpenseForm(false); setEditingExpenseId(null); resetExpenseForm(); setAddingCustomType(false); setAddingCustomCat(false); setAddingCustomVendor(false); }}
              className="h-12 px-5 rounded-full bg-[#1e1e1e] border border-[#2a2a2a] text-neutral-400 text-[13px] hover:text-white transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Register */}
      <div>
        <p className="text-[10px] tracking-[0.22em] text-neutral-500 font-semibold mb-2.5">REGISTRO DE GASTOS</p>
        {expenses.length === 0 ? (
          <div className="bg-[#141414] border border-[#222] rounded-2xl p-10 text-center">
            <p className="text-[32px] mb-2">🧾</p>
            <p className="text-[14px] text-neutral-400">Sin gastos registrados</p>
            <p className="text-[11px] text-neutral-600 mt-1">Toca "+ Nuevo Gasto" para añadir</p>
          </div>
        ) : (
          <div className="space-y-2">
            {[...expenses].sort((a, b) => b.date.localeCompare(a.date)).map(ex => (
              <div key={ex.id} className={`bg-[#141414] border rounded-xl p-3.5 transition-colors ${ex.verified ? "border-[#4ade80]/30 bg-[#141414]" : "border-[#222]"}`}>
                <div className="flex items-start justify-between gap-3">
                  {/* Left: info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-semibold text-white">{ex.vendor}</span>
                      {ex.verified && (
                        <span className="text-[9px] bg-[#4ade80]/10 text-[#4ade80] px-2 py-0.5 rounded-full border border-[#4ade80]/20 flex-shrink-0 font-mono-jet">✓ VERIFIED</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="font-mono-jet text-[10px] text-neutral-500">{ex.date}</span>
                      {ex.type && <span className="text-[10px] text-neutral-400 bg-[#1e1e1e] px-2 py-0.5 rounded-full">{ex.type}</span>}
                    </div>
                    <span className="text-[10px] text-neutral-600 mt-0.5 block">{ex.category}</span>
                    {ex.note && <p className="text-[11px] text-neutral-500 mt-1 italic">{ex.note}</p>}
                  </div>
                  {/* Right: amount + actions */}
                  <div className="flex-shrink-0 text-right">
                    <p className="font-mono-jet text-[17px] font-bold text-[#ff6b6b]">−${ex.amount.toFixed(2)}</p>
                    <div className="flex items-center gap-1 mt-2 justify-end">
                      {/* Verify toggle */}
                      <button onClick={() => handleToggleExpenseVerified(ex.id)}
                        title={ex.verified ? "Marcar como no verificado" : "Marcar como verificado"}
                        className={`w-7 h-7 rounded-full border text-[11px] flex items-center justify-center transition-all ${ex.verified ? "bg-[#4ade80]/20 border-[#4ade80]/40 text-[#4ade80]" : "bg-[#1e1e1e] border-[#2a2a2a] text-neutral-500 hover:text-[#4ade80]"}`}>
                        ✓
                      </button>
                      {/* Edit */}
                      <button onClick={() => {
                        setEditingExpenseId(ex.id);
                        setExpenseForm({ name: ex.vendor, type: ex.type || "Other", category: ex.category, description: ex.note, amount: String(ex.amount), date: ex.date });
                        setShowExpenseForm(true);
                        setAddingCustomType(false);
                        setAddingCustomCat(false);
                      }}
                        className="w-7 h-7 rounded-full bg-[#1e1e1e] border border-[#2a2a2a] text-neutral-400 text-[10px] hover:text-white flex items-center justify-center transition-colors">
                        ✏️
                      </button>
                      {/* Delete */}
                      <button onClick={() => handleDeleteExpense(ex.id)}
                        className="w-7 h-7 rounded-full bg-[#1e1e1e] border border-[#2a2a2a] text-[#f87171] text-[10px] hover:bg-[#2a1a1a] flex items-center justify-center transition-colors">
                        ✕
                      </button>
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

  // ─── Reports ──────────────────────────────────────────────────
  // Only posted (Ledger) trips count toward the financial statement
  const grossAll    = postedTrips.reduce((a, b) => a + b.grandTotal, 0);
  const expensesAll = expenses.reduce((a, b) => a + b.amount, 0);
  const netAll      = grossAll - expensesAll;

  const ReportsContent = (
    <div className="space-y-4">
      <h2 className="text-[22px] font-bold text-white">Reports</h2>

      <div className="bg-[#141414] border border-[#222] rounded-[20px] p-5 space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-[11px] tracking-[0.18em] text-neutral-500 font-semibold">FINANCIAL SUMMARY</p>
          <span className="text-[10px] font-mono-jet px-2 py-1 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] text-neutral-400">
            {currentTime.toLocaleDateString()} · {hoursLog.length} shifts
          </span>
        </div>
        {/* Source note */}
        <div className="flex items-center gap-2 -mt-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80]" />
          <p className="text-[10px] text-[#4ade80]/70 font-mono-jet">
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
          <p className="text-[10px] tracking-[0.18em] text-neutral-500 font-semibold mb-2">HOURS LOG</p>
          <div className="grid grid-cols-4 gap-2">
            {[["Today", cumulative.hoy], ["Week", cumulative.semana], ["Month", cumulative.mes], ["Year", cumulative.año]].map(([label, val]) => (
              <div key={String(label)} className="text-center">
                <p className="text-[9px] text-neutral-600 tracking-widest">{label}</p>
                <p className="font-mono-jet text-[13px] font-semibold text-white mt-1">{Number(val).toFixed(1)}h</p>
              </div>
            ))}
          </div>
        </div>

        {/* Shift history */}
        {hoursLog.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] tracking-[0.18em] text-neutral-500 font-semibold">RECENT SHIFTS</p>
            {hoursLog.slice(0, 5).map((h, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-b border-[#1a1a1a] last:border-0">
                <div>
                  <p className="text-[12px] font-semibold text-white">{h.date}</p>
                  {h.clockIn && h.clockOut && (
                    <p className="font-mono-jet text-[10px] text-neutral-500">
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

        {/* Toll deduction note */}
        <div className="rounded-xl bg-[#1a1625] border-l-[3px] border-l-[#8b5cf6] border border-[#2a2340] p-3.5">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6]" />
            <p className="text-[10px] tracking-[0.18em] font-bold text-[#a78bfa]">IRS DEDUCTIONS · TOLLS {TOLL_YEAR}</p>
          </div>
          <p className="text-[12px] text-[#c4b5fd]/90 mt-1.5 leading-[1.5]">
            Los peajes de E-ZPass son 100% deducibles como gasto de negocio (Schedule C, Line 9).
            Guarda tus estados de cuenta de E-ZPass mensuales como respaldo para taxes.
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
  const _tripNet = (t: Trip) => (t.earnings||0)+(t.tips||0)+(t.extra||0)+(t.toll||0);

  const _earnToday = trips.filter(t=>t.date===_finToday).reduce((a,t)=>a+_tripNet(t),0);
  const _earnWeek  = trips.filter(t=>t.date>=_finWeekStart).reduce((a,t)=>a+_tripNet(t),0);
  const _earnMonth = trips.filter(t=>t.date>=_finMonthStart).reduce((a,t)=>a+_tripNet(t),0);
  const _earnYear  = trips.filter(t=>t.date>=_finYearStart).reduce((a,t)=>a+_tripNet(t),0);

  // Weekly bar chart (Mon i=0 … Sun i=6)
  const _DAY = ['L','M','M','J','V','S','D'] as const;
  const _weekChart = Array.from({length:7},(_,i)=>{
    const d=new Date(_finMon); d.setDate(_finMon.getDate()+i);
    const ds=toYYYYMMDD(d);
    const actual=trips.filter(t=>t.date===ds).reduce((a,t)=>a+_tripNet(t),0);
    const isoDay=i===6?7:i+1; // Mon=1…Sat=6,Sun=7
    return {day:_DAY[i],actual,projected:workDays.includes(isoDay)?dailyGoal:0,ds};
  });

  // Projections
  const _todayISO    = _finWd===0?7:_finWd;
  const _dWk  = new Set(trips.filter(t=>t.date>=_finWeekStart&&t.date<=_finToday).map(t=>t.date)).size;
  const _avgWk = _dWk>0?_earnWeek/_dWk:dailyGoal;
  const _projWeek  = _earnWeek + _avgWk * workDays.filter(d=>d>_todayISO).length;

  const _dMo  = new Set(trips.filter(t=>t.date>=_finMonthStart&&t.date<=_finToday).map(t=>t.date)).size;
  const _avgMo = _dMo>0?_earnMonth/_dMo:dailyGoal;
  const _dimM  = new Date(currentTime.getFullYear(),currentTime.getMonth()+1,0).getDate();
  const _projMonth = _earnMonth + _avgMo*Math.round((_dimM-currentTime.getDate())*(workDays.length/7));

  const _dYr  = new Set(trips.filter(t=>t.date>=_finYearStart&&t.date<=_finToday).map(t=>t.date)).size;
  const _avgYr = _dYr>0?_earnYear/_dYr:dailyGoal;
  const _doy   = Math.ceil((currentTime.getTime()-new Date(_finYearStart+'T00:00:00').getTime())/86400000);
  const _projYear  = _earnYear + _avgYr*Math.round((365-_doy)*(workDays.length/7));
  const _annTarget = dailyGoal*workDays.length*52;
  const _yearPct   = Math.min(_projYear/_annTarget,1);

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

  // Ring
  const _ringPct=Math.min(_earnToday/dailyGoal,1);
  const _R=52,_CX=60,_CY=60,_circ=2*Math.PI*_R,_arc=_circ*_ringPct;

  const FinancesContent = (
    <div className="space-y-4">

      {/* ── Label ── */}
      <div>
        <p className="text-[10px] tracking-[0.22em] text-neutral-500 font-semibold uppercase">Financial Intelligence</p>
        <p className="text-[10px] text-neutral-600 mt-0.5">Real vs. proyectado · actualizado en vivo</p>
      </div>

      {/* ── HOY — anillo de progreso ── */}
      <div className="bg-[#101010] border border-[#1e1e1e] rounded-2xl p-4">
        <p className="text-[9px] tracking-[0.22em] text-neutral-500 font-bold uppercase mb-3">HOY — META DIARIA</p>
        <div className="flex items-center gap-4">
          <svg width="120" height="120" viewBox="0 0 120 120" className="flex-shrink-0">
            <circle cx={_CX} cy={_CY} r={_R} fill="none" stroke="#1e1e1e" strokeWidth="10"/>
            <circle cx={_CX} cy={_CY} r={_R} fill="none"
              stroke={_ringPct>=1?"#4ade80":"#d9b64f"} strokeWidth="10" strokeLinecap="round"
              strokeDasharray={`${_arc} ${_circ}`} transform={`rotate(-90 ${_CX} ${_CY})`}/>
            <text x={_CX} y={_CY-7} textAnchor="middle" fill="#f6dd8c" fontSize="17" fontWeight="bold" fontFamily="monospace">{Math.round(_ringPct*100)}%</text>
            <text x={_CX} y={_CY+10} textAnchor="middle" fill="#6b7280" fontSize="8">${_earnToday.toFixed(0)} / ${dailyGoal}</text>
          </svg>
          <div className="flex-1 space-y-2.5">
            <div>
              <p className="text-[9px] text-neutral-500 uppercase tracking-widest">Ganado hoy</p>
              <p className="text-[24px] font-bold text-[#f6dd8c] font-mono-jet leading-none">${_earnToday.toFixed(2)}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-black rounded-lg p-2">
                <p className="text-[8px] text-neutral-600">Falta</p>
                <p className="text-[13px] font-bold text-white">${Math.max(dailyGoal-_earnToday,0).toFixed(0)}</p>
              </div>
              <div className="bg-black rounded-lg p-2">
                <p className="text-[8px] text-neutral-600">$/hora</p>
                <p className="text-[13px] font-bold text-white">${perHourGross.toFixed(2)}</p>
              </div>
            </div>
            {projectedFinish && (
              <p className="text-[9px] text-[#4ade80]">✓ Meta ≈ {projectedFinish.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</p>
            )}
          </div>
        </div>
      </div>

      {/* ── ESTA SEMANA — barras ── */}
      <div className="bg-[#101010] border border-[#1e1e1e] rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[9px] tracking-[0.22em] text-neutral-500 font-bold uppercase">ESTA SEMANA</p>
          <div className="flex gap-3 text-[8px] text-neutral-600">
            <span className="flex items-center gap-1"><span className="inline-block w-2 h-1.5 rounded bg-[#d9b64f]/30"/>Proyectado</span>
            <span className="flex items-center gap-1"><span className="inline-block w-2 h-1.5 rounded bg-[#f6dd8c]"/>Real</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={130}>
          <BarChart data={_weekChart} barGap={2} barSize={16} margin={{top:0,right:0,bottom:0,left:0}}>
            <XAxis dataKey="day" tick={{fill:'#6b7280',fontSize:10}} axisLine={false} tickLine={false}/>
            <YAxis hide domain={[0,Math.max(dailyGoal*1.15,1)]}/>
            <Tooltip contentStyle={{background:'#1a1a1a',border:'1px solid #2a2a2a',borderRadius:8,fontSize:11}}
              labelStyle={{color:'#f6dd8c'}} formatter={(v:number)=>[`$${v.toFixed(0)}`]}/>
            <Bar dataKey="projected" fill="#d9b64f22" radius={[4,4,0,0]}/>
            <Bar dataKey="actual"    fill="#f6dd8c"   radius={[4,4,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
        <div className="flex justify-between mt-2 pt-2 border-t border-[#1e1e1e]">
          <div>
            <p className="text-[9px] text-neutral-500">Acumulado</p>
            <p className="text-[15px] font-bold text-[#f6dd8c] font-mono-jet">${_earnWeek.toFixed(2)}</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] text-neutral-500">Proyección fin de semana</p>
            <p className="text-[15px] font-bold text-white font-mono-jet">${_projWeek.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* ── PROYECCIONES ── */}
      <div className="bg-[#101010] border border-[#1e1e1e] rounded-2xl p-4">
        <p className="text-[9px] tracking-[0.22em] text-neutral-500 font-bold uppercase mb-3">PROYECCIONES · A ESTE RITMO</p>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {([
            {label:'Fin Semana',val:_projWeek,  sub:new Date(_finMon.getTime()+6*86400000).toLocaleDateString('es',{month:'short',day:'numeric'})},
            {label:'Fin Mes',   val:_projMonth, sub:new Date(currentTime.getFullYear(),currentTime.getMonth()+1,0).toLocaleDateString('es',{month:'short',day:'numeric'})},
            {label:'Fin Año',   val:_projYear,  sub:'31 dic'},
          ] as {label:string,val:number,sub:string}[]).map(({label,val,sub})=>(
            <div key={label} className="bg-black border border-[#1e1e1e] rounded-xl p-2.5 text-center">
              <p className="text-[8px] text-neutral-500 uppercase tracking-widest leading-tight mb-1">{label}</p>
              <p className="text-[15px] font-bold text-[#f6dd8c] font-mono-jet leading-none">${(val/1000).toFixed(1)}k</p>
              <p className="text-[8px] text-neutral-600 mt-0.5">{sub}</p>
            </div>
          ))}
        </div>
        {/* Annual progress bar */}
        <div className="bg-black border border-[#1e1e1e] rounded-xl p-3">
          <div className="flex justify-between items-center mb-1.5">
            <p className="text-[9px] text-neutral-500">Meta anual · Super Plus</p>
            <p className="text-[9px] text-[#f6dd8c]">${(_annTarget/1000).toFixed(0)}k · {Math.round(_yearPct*100)}%</p>
          </div>
          <div className="h-2 bg-[#1e1e1e] rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700"
              style={{width:`${_yearPct*100}%`,background:'linear-gradient(to right,#d9b64f,#f6dd8c)'}}/>
          </div>
          <p className="text-[8px] text-neutral-600 mt-1.5">Basado en ${dailyGoal}/día · {workDays.length} día{workDays.length!==1?'s':''}/semana</p>
        </div>
      </div>

      {/* ── INGRESOS POR PLATAFORMA ── */}
      {_platRows.length>0 && (
        <div className="bg-[#101010] border border-[#1e1e1e] rounded-2xl p-4">
          <p className="text-[9px] tracking-[0.22em] text-neutral-500 font-bold uppercase mb-3">INGRESOS POR PLATAFORMA</p>
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-[8px] text-neutral-600 uppercase tracking-widest border-b border-[#1e1e1e]">
                <th className="text-left pb-2 font-semibold">Plataforma</th>
                <th className="text-right pb-2 font-semibold">Hoy</th>
                <th className="text-right pb-2 font-semibold">Semana</th>
                <th className="text-right pb-2 font-semibold">Mes</th>
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
                    <td className="py-2 text-right font-mono-jet text-neutral-500 text-[10px]">{d.today>0?`$${d.today.toFixed(0)}`:'—'}</td>
                    <td className="py-2 text-right font-mono-jet text-[#f6dd8c] font-semibold text-[10px]">${d.week.toFixed(0)}</td>
                    <td className="py-2 text-right font-mono-jet text-white text-[10px]">${d.month.toFixed(0)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── SALUD FINANCIERA ── */}
      <div className="bg-[#101010] border border-[#1e1e1e] rounded-2xl p-4">
        <p className="text-[9px] tracking-[0.22em] text-neutral-500 font-bold uppercase mb-3">
          SALUD FINANCIERA · {currentTime.toLocaleDateString('es',{month:'long'}).toUpperCase()}
        </p>
        <div className="space-y-2.5">
          {([
            {label:'Ingresos reales este mes',        val:_earnMonth,   color:'text-[#4ade80]'},
            {label:'Proyección fin de mes',            val:_projMonth,   color:'text-[#f6dd8c]'},
            {label:'Gastos reales este mes',           val:-_expMonth,   color:'text-red-400'},
            {label:'Gastos recurrentes proyectados',   val:-_monthFixed, color:'text-orange-400'},
          ] as {label:string,val:number,color:string}[]).map(({label,val,color})=>(
            <div key={label} className="flex justify-between items-center gap-2">
              <p className="text-[11px] text-neutral-400 leading-tight">{label}</p>
              <p className={`font-mono-jet text-[13px] font-bold flex-shrink-0 ${color}`}>
                {val<0?`-$${Math.abs(val).toFixed(2)}`:`$${val.toFixed(2)}`}
              </p>
            </div>
          ))}
          <div className="pt-2.5 border-t border-[#2a2a2a] flex justify-between items-center">
            <p className="text-[12px] font-bold text-white">NET PROYECTADO</p>
            <p className={`font-mono-jet text-[19px] font-bold ${_netProj>=0?'text-[#4ade80]':'text-red-400'}`}>
              {_netProj<0?`-$${Math.abs(_netProj).toFixed(2)}`:`$${_netProj.toFixed(2)}`}
            </p>
          </div>
        </div>
      </div>

      {/* ── CONFIGURAR METAS ── */}
      <div className="bg-[#101010] border border-[#1e1e1e] rounded-2xl p-4">
        <p className="text-[9px] tracking-[0.22em] text-neutral-500 font-bold uppercase mb-4">CONFIGURAR METAS</p>
        <div className="space-y-4">
          {/* Daily goal slider */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <p className="text-[12px] text-neutral-200">Meta diaria</p>
              <p className="text-[17px] font-bold text-[#f6dd8c] font-mono-jet">${dailyGoal.toLocaleString()}</p>
            </div>
            <input type="range" min={100} max={1500} step={25} value={dailyGoal}
              onChange={e=>setDailyGoal(parseInt(e.target.value))}
              className="w-full accent-[#f6dd8c]"/>
            <div className="flex justify-between text-[8px] text-neutral-600 mt-0.5"><span>$100</span><span>$1,500</span></div>
          </div>
          {/* Working days */}
          <div>
            <p className="text-[12px] text-neutral-200 mb-2">Días que trabajo</p>
            <div className="flex gap-1.5">
              {(['L','M','M','J','V','S','D'] as const).map((d,i)=>{
                const iso=i===6?7:i+1;
                const on=workDays.includes(iso);
                return (
                  <button key={d+i} onClick={()=>setWorkDays(prev=>on?prev.filter(x=>x!==iso):[...prev,iso].sort())}
                    className={`flex-1 h-9 rounded-lg text-[11px] font-bold transition-colors ${on?'bg-[#f6dd8c] text-black':'bg-[#1e1e1e] text-neutral-500 border border-[#2a2a2a] hover:text-white'}`}>
                    {d}
                  </button>
                );
              })}
            </div>
          </div>
          {/* Summary pill */}
          <div className="bg-black border border-[#1e1e1e] rounded-xl p-3 flex justify-between items-center">
            <p className="text-[10px] text-neutral-500">Meta semanal estimada</p>
            <p className="text-[15px] font-bold text-[#f6dd8c] font-mono-jet">${(dailyGoal*workDays.length).toLocaleString()}</p>
          </div>
          <div className="bg-black border border-[#1e1e1e] rounded-xl p-3 flex justify-between items-center">
            <p className="text-[10px] text-neutral-500">Meta anual estimada</p>
            <p className="text-[15px] font-bold text-[#f6dd8c] font-mono-jet">${(_annTarget/1000).toFixed(0)}k</p>
          </div>
        </div>
      </div>

    </div>
  );

  // ─── Render ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-black text-white selection:bg-[#d9b64f]/30">
      <div className="w-full max-w-[480px] mx-auto min-h-screen bg-black border-x border-[#121212] relative">

        {/* Header — paddingTop pushes content below the iOS/Android status bar */}
        <div className="sticky top-0 z-40 bg-black/95 backdrop-blur-xl border-b border-[#1a1a1a]"
          style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="px-4 h-[68px] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {/* Brand mark — bridge + skyline in gold circle */}
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
              style={{ background: "radial-gradient(circle at 40% 40%, #1a1500, #000)", border: "1px solid #d9b64f44" }}>
              <LogoIcon className="w-8 h-8" />
            </div>
            {/* Brand name */}
            <div className="flex flex-col leading-none">
              <span className="font-cinzel text-[22px] tracking-[0.04em] font-bold" style={goldGradientStyle}>
                ISLANDCITY
              </span>
              <span className="text-[7.5px] tracking-[0.38em] text-[#a07820] font-semibold mt-[3px] pl-[1px]">
                TRANSIT SERVICES
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono-jet text-[10px] text-neutral-500 hidden sm:block">{currentTime.toLocaleTimeString()}</span>
            <button onClick={() => { setShowSettings(true); setResetStep(0); }}
              className="w-8 h-8 rounded-full bg-[#141414] border border-[#222] flex items-center justify-center text-[12px] font-semibold text-[#f6dd8c] hover:border-[#d9b64f]/50 transition-colors">M</button>
          </div>
        </div>{/* end inner h-[68px] row */}
        </div>{/* end sticky header wrapper */}

        {/* Tab bar */}
        <div className="sticky z-30 bg-black border-b border-[#1a1a1a]"
          style={{ top: 'calc(68px + env(safe-area-inset-top))' }}>
          <div className="flex overflow-x-auto gold-scroll px-2 gap-1">
            {(["DASHBOARD", "FINANCES", "ENTRY", "REGISTER", "LEDGER", "EXPENSES", "REPORTS"] as Tab[]).map(tab => {
              const active = activeTab === tab;
              const badge = tab === "REGISTER" ? pendingTrips.length
                          : tab === "LEDGER"   ? postedTrips.length
                          : 0;
              return (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`whitespace-nowrap px-4 py-3.5 text-[11px] tracking-[0.14em] font-semibold transition-colors relative flex items-center gap-1.5 ${active ? "text-[#f6dd8c]" : "text-neutral-500 hover:text-neutral-300"}`}>
                  {tab}
                  {badge > 0 && (
                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold leading-none ${
                      tab === "LEDGER"
                        ? "bg-[#4ade80]/20 text-[#4ade80]"
                        : "bg-[#facc15]/20 text-[#f6dd8c]"
                    }`}>{badge > 99 ? "99+" : badge}</span>
                  )}
                  {active && <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-gradient-to-r from-[#f6dd8c] to-[#d9b64f] rounded-full" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="px-4 pb-28 pt-5">
          {activeTab === "DASHBOARD"  && DashboardContent}
          {activeTab === "FINANCES"   && FinancesContent}
          {activeTab === "ENTRY"      && EntryFormContent}
          {activeTab === "REGISTER"   && RegisterContent}
          {activeTab === "LEDGER"     && LedgerContent}
          {activeTab === "EXPENSES"   && ExpensesContent}
          {activeTab === "REPORTS"    && ReportsContent}
        </div>

        {/* Toast */}
        {toast && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full bg-[#facc15] text-black text-[12px] font-bold tracking-wide shadow-xl border border-black/10 max-w-[90%] text-center">
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
            <div className="relative bg-[#0e0e0e] border-t border-[#222] rounded-t-[28px] px-5 pt-5 pb-10 space-y-5 max-w-[480px] w-full mx-auto"
              onClick={e => e.stopPropagation()}>

              {/* Handle */}
              <div className="w-10 h-1 rounded-full bg-[#333] mx-auto mb-1" />

              {/* Title */}
              <div className="flex items-center justify-between">
                <h2 className="text-[14px] font-bold tracking-[0.1em]">Ajustes</h2>
                <button onClick={() => { setShowSettings(false); setResetStep(0); }}
                  className="text-neutral-500 text-[13px] hover:text-white transition-colors">✕ Cerrar</button>
              </div>

              {/* Profile row */}
              <div className="flex items-center gap-3 bg-[#141414] border border-[#222] rounded-2xl p-3.5">
                <div className="w-10 h-10 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-[15px] font-bold text-[#f6dd8c]">M</div>
                <div>
                  <p className="text-[13px] font-semibold">Miguel</p>
                  <p className="text-[10px] text-neutral-500 font-mono-jet">NYC TLC Driver · IslandCity</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-[10px] text-neutral-600 font-mono-jet">{trips.length} trips saved</p>
                  <p className="text-[10px] text-neutral-600 font-mono-jet">{expenses.length} expenses</p>
                </div>
              </div>

              {/* Storage info */}
              <div className="bg-[#141414] border border-[#222] rounded-2xl p-3.5 space-y-1.5">
                <p className="text-[9px] tracking-[0.16em] text-neutral-500 font-semibold uppercase">Almacenamiento</p>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-neutral-300">Trips guardados</span>
                  <span className="font-mono-jet text-[12px] text-[#f6dd8c]">{trips.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-neutral-300">Gastos guardados</span>
                  <span className="font-mono-jet text-[12px] text-[#f6dd8c]">{expenses.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-neutral-300">Días con horas</span>
                  <span className="font-mono-jet text-[12px] text-[#f6dd8c]">{hoursLog.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-neutral-300">Tamaño disco</span>
                  <span className="font-mono-jet text-[12px] text-neutral-400">{(storageBytes / 1024).toFixed(1)} KB</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-neutral-300">Último guardado</span>
                  <span className="font-mono-jet text-[10px] text-neutral-500 text-right max-w-[180px] truncate">{lastSavedAt === "—" ? "—" : new Date(lastSavedAt).toLocaleString()}</span>
                </div>
              </div>

              {/* Backup */}
              <div className="bg-[#141414] border border-[#222] rounded-2xl p-4 space-y-3">
                <p className="text-[9px] tracking-[0.16em] text-neutral-500 font-semibold uppercase">📦 Backup de datos</p>
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  Descarga un archivo <span className="font-mono-jet text-white">.json</span> con todos tus trips, gastos y horas. Guárdalo en tu teléfono, Google Drive o iCloud como respaldo.
                </p>
                <button onClick={handleExportBackup}
                  className="w-full h-11 rounded-full bg-[#facc15] text-black text-[12px] font-bold tracking-[0.1em] hover:bg-[#fde047] transition-colors">
                  ⬇ Descargar backup completo
                </button>
              </div>

              {/* Danger zone */}
              <div className="bg-[#120808] border border-[#3a1010] rounded-2xl p-4 space-y-3">
                <p className="text-[9px] tracking-[0.16em] text-[#ff6b6b]/70 font-semibold uppercase">⚠️ Zona de Peligro</p>
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  Borra <span className="text-white font-semibold">todos los trips, gastos y horas</span> guardados. Esta acción no se puede deshacer. El historial se perderá permanentemente.
                </p>

                {resetStep === 0 && (
                  <button onClick={() => setResetStep(1)}
                    className="w-full h-11 rounded-full border border-[#ff6b6b]/40 text-[#ff6b6b] text-[12px] font-bold tracking-[0.1em] hover:bg-[#ff6b6b]/10 transition-colors">
                    🗑 Resetear todos los datos
                  </button>
                )}

                {resetStep === 1 && (
                  <div className="space-y-2">
                    <p className="text-[11px] text-[#ff6b6b] font-semibold text-center">¿Estás seguro? Esta acción es irreversible.</p>
                    <div className="flex gap-2">
                      <button onClick={() => setResetStep(0)}
                        className="flex-1 h-11 rounded-full border border-[#333] text-neutral-400 text-[12px] font-bold hover:text-white transition-colors">
                        Cancelar
                      </button>
                      <button onClick={handleFactoryReset}
                        className="flex-1 h-11 rounded-full bg-[#ff6b6b] text-black text-[12px] font-bold tracking-[0.08em] hover:bg-[#ff4444] transition-colors">
                        Sí, borrar todo
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
