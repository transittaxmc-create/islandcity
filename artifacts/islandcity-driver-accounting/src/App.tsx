import { useState, useMemo, useEffect, useRef } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Home, Banknote, ClipboardList, BarChart2, BookOpen } from "lucide-react";

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
type BankAdjEntry = { id: string; date: string; time: string; prevBalance: number; newBalance: number; note: string; };
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
  const [finPage, setFinPage] = useState(0);
  const finScrollRef = useRef<HTMLDivElement>(null);
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
  useEffect(() => { try { localStorage.setItem("ic-day-targets", JSON.stringify(dayTargets)); } catch {} }, [dayTargets]);
  useEffect(() => { try { localStorage.setItem("ic-bank-balance", String(bankBalance)); } catch {} }, [bankBalance]);
  useEffect(() => { try { localStorage.setItem("ic-bank-adj-history", JSON.stringify(bankAdjHistory)); } catch {} }, [bankAdjHistory]);

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
      return { emoji: "🍽", text: "Lunch surge — Midtown, FiDi, Brooklyn Heights. Quick short trips.", type: "warm" };
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
    const newEarnings = parseFloat(inlineForm.earnings) || 0;
    syncSaveTrips(trips.map(t => {
      if (t.id !== id) return t;
      return { ...t, pickup: inlineForm.pickup, dropoff: inlineForm.dropoff, earnings: newEarnings, reference: inlineForm.reference, grandTotal: newEarnings + t.tips + t.extra + t.toll - t.fee };
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

  const shiftStatusLabel = shiftActive ? (isOnBreak ? "ON BREAK" : "ON DUTY") : "OFF DUTY";
  const gpsStatusLabel   = gps.status === "active" ? "active" : gps.status === "searching" ? "searching" : "inactive";
  const greeting         = currentTime.getHours() < 6 ? "Good evening" : currentTime.getHours() < 12 ? "Good morning" : currentTime.getHours() < 19 ? "Good afternoon" : "Good evening";

  // ─── Nearest NYC demand zones (static reference — live API pending Task #7) ───
  const NYC_ZONES = [
    { name: "JFK Airport",           lat: 40.6413, lng: -73.7781 },
    { name: "LaGuardia Airport",      lat: 40.7769, lng: -73.8740 },
    { name: "Penn Station / MSG",     lat: 40.7506, lng: -73.9935 },
    { name: "Times Square",           lat: 40.7580, lng: -73.9855 },
    { name: "Grand Central",          lat: 40.7527, lng: -73.9772 },
    { name: "Midtown Manhattan",      lat: 40.7549, lng: -73.9840 },
    { name: "Lower Manhattan / FiDi", lat: 40.7074, lng: -74.0113 },
    { name: "Brooklyn Downtown",      lat: 40.6928, lng: -73.9903 },
    { name: "Upper East Side",        lat: 40.7739, lng: -73.9575 },
    { name: "Williamsburg",           lat: 40.7081, lng: -73.9571 },
    { name: "Astoria / Queens",       lat: 40.7721, lng: -73.9302 },
    { name: "Newark Airport (EWR)",   lat: 40.6895, lng: -74.1745 },
  ] as const;
  const haversineKm = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };
  const nearbyZones: { name: string; km: number }[] =
    gps.lat && gps.lng
      ? [...NYC_ZONES]
          .map(z => ({ name: z.name, km: haversineKm(gps.lat!, gps.lng!, z.lat, z.lng) }))
          .sort((a, b) => a.km - b.km)
          .slice(0, 3)
      : [];

  // ─── Dashboard ───────────────────────────────────────────────
  const DashboardContent = (
    <div className="space-y-5">
      <div>
        <h2 className="text-[24px] font-bold leading-tight">{greeting}, Miguel.</h2>
        <p className="font-mono-jet text-[11px] tracking-[0.18em] mt-1.5 uppercase" style={goldGradientStyle}>
          {currentTime.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).toUpperCase()}
        </p>
        <p className="font-mono-jet text-[10px] text-neutral-600 mt-1">
          {currentTime.toLocaleTimeString()} · Live · LocalStorage stamped
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
          <p className="font-mono-jet text-[11px] text-neutral-500">
            {gps.lat && gps.lng ? `${gps.lat.toFixed(4)}, ${gps.lng.toFixed(4)}` : "GPS inactive"}{gps.acc ? ` · ±${Math.round(gps.acc)}m` : ""}
          </p>
          {gpsAddress && <p className="text-[11px] text-neutral-300 mt-0.5 truncate">{gpsAddress}</p>}
          {gpsAirport && <p className="font-mono-jet text-[10px] text-[#f6dd8c] mt-0.5">✈ {gpsAirport}</p>}
        </div>
        <p className="font-mono-jet text-[32px] font-black mt-2 tracking-tight" style={goldGradientStyle}>${grossToday.toFixed(2)}</p>
        <p className="font-mono-jet text-[10px] text-neutral-500 mt-0.5">{todayTrips.length} {todayTrips.length === 1 ? "trip" : "trips"} · fare + tips + tolls</p>
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
            : "text-neutral-500"
          }`}>
            {shiftActive ? (isOnBreak ? "On break" : "On duty") : "Shift ended"}
          </span>
          <span className="ml-auto text-[9px] text-neutral-600 font-mono-jet flex items-center gap-1">
            <span className={`w-1 h-1 rounded-full ${gps.status === "active" ? "bg-[#4ade80]" : gps.status === "searching" ? "bg-yellow-400 animate-pulse" : "bg-neutral-600"}`} />
            GPS {gpsStatusLabel}
          </span>
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

      {/* Performance grid — DESGLOSE full-width · GASTOS | NET side by side */}
      <div>
        <p className="text-[10px] tracking-[0.22em] text-neutral-400 font-bold mb-2.5">SHIFT BREAKDOWN</p>
        <div className="grid grid-cols-2 gap-3">
          {/* DESGLOSE DEL DÍA — full width con bruto total a la derecha */}
          <div className="col-span-2 rounded-xl p-3.5 flex items-start justify-between gap-3"
            style={{ background: "#0d0d0d", border: "1px solid #1e1400" }}>
            <div className="flex-1">
              <p className="text-[9px] tracking-[0.18em] font-bold mb-2" style={{ color: "#d97706" }}>TODAY'S BREAKDOWN</p>
              <div className="space-y-1">
                {([
                  ["Fare",   todayTrips.reduce((a,b) => a + b.earnings, 0)],
                  ["Tips",   todayTrips.reduce((a,b) => a + b.tips + b.extra, 0)],
                  ["Tolls",  totalTollsToday],
                ] as [string,number][]).map(([label, val]) => (
                  <div key={label} className="flex items-center gap-4">
                    <span className="text-[10px] text-neutral-500 font-mono-jet w-14">{label}</span>
                    <span className="font-mono-jet text-[12px] font-semibold text-neutral-100">${val.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-[8px] text-neutral-600 tracking-widest uppercase mb-1">GROSS TODAY</p>
              <p className="font-mono-jet text-[22px] font-black text-[#f6dd8c] leading-none">${grossToday.toFixed(2)}</p>
              <p className="text-[9px] text-neutral-600 mt-0.5">{todayTrips.length} trip{todayTrips.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
          {/* GASTOS DEL DÍA */}
          <div className="rounded-xl p-3.5" style={{ background: "#0d0d0d", border: "1px solid #1e0a0a" }}>
            <p className="text-[9px] tracking-[0.18em] font-bold text-[#ef4444]">TODAY'S EXPENSES</p>
            <p className="font-mono-jet text-[22px] font-black text-[#ef4444] mt-2">
              {expensesToday > 0 ? `−$${expensesToday.toFixed(2)}` : "$0.00"}
            </p>
            <p className="text-[10px] text-neutral-600 mt-1 font-mono-jet">
              {expenses.filter(e => e.date === toYYYYMMDD(currentTime)).length} entries today
            </p>
          </div>
          {/* GANANCIA NETA HOY */}
          <div className="rounded-xl p-3.5" style={{ background: "#0d0d0d", border: `1px solid ${netToday >= 0 ? "#0a1e0a" : "#1e0a0a"}` }}>
            <p className={`text-[9px] tracking-[0.18em] font-bold ${netToday >= 0 ? "text-[#4ade80]" : "text-[#ef4444]"}`}>NET EARNINGS TODAY</p>
            <p className={`font-mono-jet text-[22px] font-black mt-2 ${netToday >= 0 ? "text-[#4ade80]" : "text-[#ef4444]"}`}>
              ${netToday.toFixed(2)}
            </p>
            <p className="text-[10px] text-neutral-600 mt-1 font-mono-jet">income − expenses · weekly ref. ${weeklyTotal.toFixed(0)}</p>
          </div>
        </div>
      </div>

      {/* Goal tracker */}
      <div className="rounded-[20px] p-4 space-y-4" style={{ background: "#0d0d0d", border: "1px solid #1e1e1e" }}>
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] tracking-[0.18em] font-bold" style={goldGradientStyle}>TODAY'S PERFORMANCE</h3>
          <span className={`font-mono-jet text-[11px] font-bold ${goalPct >= 100 ? "text-[#4ade80]" : goalPct >= 70 ? "text-[#f6dd8c]" : "text-neutral-500"}`}>
            {goalPct.toFixed(0)}% of goal
          </span>
        </div>

        {/* $/hr arc gauge — 5 color zones */}
        {(() => {
          const GCX=150,GCY=128,GR=104,GSW=18;
          const gA=(v:number)=>180+Math.min(v/100,1)*180;
          const gP=(r:number,deg:number)=>({x:GCX+r*Math.cos(deg*Math.PI/180),y:GCY+r*Math.sin(deg*Math.PI/180)});
          const gPath=(r:number,a1:number,a2:number)=>{const s=gP(r,a1),e=gP(r,a2);return `M${s.x.toFixed(1)} ${s.y.toFixed(1)} A${r} ${r} 0 ${a2-a1>=180?1:0} 1 ${e.x.toFixed(1)} ${e.y.toFixed(1)}`;};
          const zones=[{min:0,max:60,color:"#ef4444"},{min:60,max:70,color:"#fbbf24"},{min:70,max:90,color:"#4ade80"},{min:90,max:100,color:"#f6dd8c"}];
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
                  fill="none" stroke={z.color} strokeWidth={GSW-5} strokeLinecap="butt" opacity={0.82}/>
              ))}
              {/* Goal marker */}
              <line x1={gm1.x} y1={gm1.y} x2={gm2.x} y2={gm2.y} stroke="#f6dd8c" strokeWidth="3" opacity="0.9"/>
              {/* Zone separators */}
              {[60,70,90].map(v=>{const a=gA(v);const i=gP(GR-GSW/2+1,a),o=gP(GR+GSW/2-3,a);return <line key={v} x1={i.x} y1={i.y} x2={o.x} y2={o.y} stroke="#000" strokeWidth="2" opacity="0.5"/>;})}
              {/* Boundary labels */}
              {([{v:0,t:'$0'},{v:60,t:'$60'},{v:90,t:'$90'},{v:100,t:'$100'}] as {v:number,t:string}[]).map(({v,t})=>{
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

        {/* Daily goal — slim bar below gauge */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-neutral-500 font-mono-jet">DAILY GOAL ${todayGoal}</span>
            <span className={`font-mono-jet font-bold ${goalPct>=100?"text-[#4ade80]":goalPct>=70?"text-[#f6dd8c]":"text-neutral-400"}`}>{goalPct.toFixed(0)}%</span>
          </div>
          <div className="h-2 bg-[#1a1a1a] rounded-full overflow-hidden border border-[#2a2a2a]">
            <div className="h-full rounded-full transition-all duration-500"
              style={{width:`${goalPct}%`,background:goalPct>=100?"#4ade80":goalPct>=70?"linear-gradient(90deg,#f6dd8c,#d9b64f)":"linear-gradient(90deg,#374151,#f6dd8c)"}}/>
          </div>
          <div className="flex items-center justify-between text-[10px] font-mono-jet">
            <span className="text-neutral-500">
              {grossToday>=todayGoal?"🏆 Goal reached!":`$${remainingToGoal.toFixed(2)} short of goal`}
            </span>
            <span className="text-neutral-400">
              {projectedFinish?`Est. finish ~${projectedFinish.toLocaleTimeString([],{hour:"numeric",minute:"2-digit"})}`:grossToday>=todayGoal?"✓ Done":"—"}
            </span>
          </div>
        </div>

        {/* $/hr goal slider */}
        <div className="rounded-xl p-3.5" style={{ background: "#080808", border: "1px solid #1e1400" }}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-neutral-400">Gross hourly rate target</span>
            <span className="font-mono-jet text-[20px] font-black" style={goldGradientStyle}>${goal}/h</span>
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
            ["ACTUAL/HR",   perHourGross > 0 ? `$${perHourGross.toFixed(2)}` : "—",
              perHourGross >= goal ? "#4ade80" : perHourGross >= 60 ? "#f6dd8c" : "#ef4444"],
            ["GOAL/HR",     `$${goal.toFixed(0)}`, "#f6dd8c"],
            ["GAP",         perHourGross > 0 ? `${perHourGross >= goal ? "+" : ""}$${(perHourGross - goal).toFixed(0)}/hr` : "—",
              perHourGross >= goal ? "#4ade80" : "#ef4444"],
          ] as [string,string,string][]).map(([label, val, col]) => (
            <div key={label} className="rounded-xl p-3" style={{ background: "#080808", border: `1px solid ${col}22` }}>
              <p className="text-[9px] tracking-[0.14em] text-neutral-500">{label}</p>
              <p className="font-mono-jet text-[15px] font-black mt-1" style={{ color: col }}>{val}</p>
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
          {perHourGross > 0 && grossToday < todayGoal && (
            <p className="text-[10px] font-mono-jet text-neutral-500 mt-2">
              At this pace you need {perHourGross > 0 ? `${(remainingToGoal / perHourGross).toFixed(1)}h` : "—"} more to reach ${todayGoal}
            </p>
          )}
        </div>

        {/* Location zone advisor — color coupled to rate tier */}
        {(() => {
          // When rate is below $60, escalate zone advisor to red/orange alarm
          const zoneUrgent = perHourGross > 0 && perHourGross < 60;
          const zoneOk     = perHourGross >= 60 && perHourGross < 70;
          const zoneGood   = perHourGross >= 70;
          const zoneBg     = zoneUrgent ? "#120505" : zoneOk ? "#0d0d05" : "#060e08";
          const zoneBorder = zoneUrgent ? "#ef444433" : zoneOk ? "#fbbf2433" : "#1a2a1a";
          const zoneAccent = zoneUrgent ? "#ef4444"   : zoneOk ? "#fbbf24"   : "#4ade80";
          const zoneLabel  = zoneUrgent ? "REPOSITION — RATE LOW"
            : zoneOk  ? "NEARBY ZONES — KEEP PACE"
            : "HIGH DEMAND ZONES";
          return (
            <div className="rounded-xl p-3.5" style={{ background: zoneBg, border: `1px solid ${zoneBorder}`, borderLeft: `3px solid ${zoneAccent}` }}>
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-[14px]">{zoneUrgent ? "🚨" : "📍"}</span>
                  <span className="text-[9px] tracking-[0.18em] font-bold" style={{ color: zoneAccent }}>{zoneLabel}</span>
                </div>
                <span className="text-[8px] font-mono-jet text-neutral-600">static reference</span>
              </div>

              {gps.lat && gps.lng ? (
                <>
                  <p className="text-[10px] text-neutral-500 mb-2">
                    {zoneUrgent
                      ? "Rate is low — closest known NYC zones:"
                      : "Closest known NYC zones to your position:"}
                  </p>
                  <div className="space-y-2">
                    {nearbyZones.map((z, i) => (
                      <div key={z.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px]">{i === 0 ? (zoneUrgent ? "🎯" : "📍") : "→"}</span>
                          <span className="text-[11px] font-semibold" style={{ color: i === 0 ? zoneAccent : "#737373" }}>{z.name}</span>
                        </div>
                        <span className="font-mono-jet text-[10px] text-neutral-600">{z.km.toFixed(1)} km</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-2.5" style={{ borderTop: `1px solid ${zoneBorder}` }}>
                    <p className="text-[9px] text-neutral-600">
                      Live demand data not connected · Task #7 pending
                    </p>
                  </div>
                </>
              ) : (
                <div>
                  <p className="text-[11px] text-neutral-500">
                    Enable GPS to see nearby zones.
                  </p>
                  <p className="text-[9px] text-neutral-700 mt-1.5">
                    Live demand data: API connection pending · Task #7
                  </p>
                </div>
              )}
            </div>
          );
        })()}

        {/* Trip stats strip */}
        <div className="grid grid-cols-3 gap-0 bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl overflow-hidden">
          <div className="p-3 border-r border-[#1f1f1f] text-center">
            <p className="text-[9px] text-neutral-500 tracking-widest">TRIPS TODAY</p>
            <p className="font-mono-jet text-[13px] font-semibold mt-1 text-white">{todayTrips.length}</p>
          </div>
          <div className="p-3 border-r border-[#1f1f1f] text-center">
            <p className="text-[9px] text-neutral-500 tracking-widest">AVG/TRIP</p>
            <p className="font-mono-jet text-[13px] font-semibold mt-1 text-[#f6dd8c]">
              ${todayTrips.length ? (grossToday / todayTrips.length).toFixed(2) : "0.00"}
            </p>
          </div>
          <div className="p-3 text-center">
            <p className="text-[9px] text-neutral-500 tracking-widest">WEEK TOTAL</p>
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
              showToast("GPS coordinates saved (offline)");
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
              showToast("GPS coordinates saved (offline)");
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
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-[22px] font-bold text-white tracking-tight">Revenue Queue</h2>
          <p className="text-[10px] tracking-[0.12em] text-neutral-500 mt-0.5 uppercase font-semibold">Review &amp; audit before posting to Ledger</p>
        </div>
        <div className="flex items-center gap-2 mt-1">
          {selectedCount > 0 && (
            <span className="px-2.5 py-1 rounded-full bg-[#facc15]/20 border border-[#facc15]/40 text-[#f6dd8c] text-[10px] font-bold">
              {selectedCount} selected
            </span>
          )}
          <span className="font-mono-jet text-[12px] text-neutral-500">{pendingTrips.length} pending</span>
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
          <p className="text-[12px] text-neutral-500">Queue is clear — all revenue is in the Ledger</p>
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
      <div className="sticky z-20 -mx-4 px-4 pt-2 pb-3 bg-black/96 backdrop-blur-sm border-b border-[#1a1a1a]" style={{ top: 'calc(146px + env(safe-area-inset-top))' }}>
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
          <p className="text-[12px] text-neutral-500">Review and approve trips in the Revenue Queue first</p>
          <button onClick={() => setActiveTab("REGISTER")}
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
          {showExpenseForm && !editingExpenseId ? "✕ Close" : "+ New Expense"}
        </button>
      </div>

      {/* Entry / Edit form */}
      {showExpenseForm && (
        <div className="bg-[#101010] border border-[#2a2a2a] rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-bold tracking-[0.16em] text-white uppercase">
              {editingExpenseId ? "✏️ Edit Expense" : "New Expense"}
            </h3>
            {editingExpenseId && (
              <button onClick={() => { setEditingExpenseId(null); resetExpenseForm(); setShowExpenseForm(false); }}
                className="text-[10px] text-neutral-500 hover:text-white transition-colors">← Cancel</button>
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
                  {f === "none" ? "One-time" : f === "daily" ? "Daily" : f === "weekly" ? "Weekly" : "Monthly"}
                </button>
              ))}
            </div>
          </div>

          {/* Due date — only if recurring */}
          {expenseForm.frequency !== "none" && (
            <div>
              <label className="text-[9px] text-neutral-500 font-bold uppercase tracking-widest mb-1 block">Next due date</label>
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

      {/* Register */}
      <div>
        <p className="text-[10px] tracking-[0.22em] text-neutral-500 font-semibold mb-2.5">EXPENSE LOG</p>
        {expenses.length === 0 ? (
          <div className="bg-[#141414] border border-[#222] rounded-2xl p-10 text-center">
            <p className="text-[32px] mb-2">🧾</p>
            <p className="text-[14px] text-neutral-400">No expenses logged</p>
            <p className="text-[11px] text-neutral-600 mt-1">Tap "+ New Expense" to add one</p>
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
                        title={ex.verified ? "Mark as unverified" : "Mark as verified"}
                        className={`w-7 h-7 rounded-full border text-[11px] flex items-center justify-center transition-all ${ex.verified ? "bg-[#4ade80]/20 border-[#4ade80]/40 text-[#4ade80]" : "bg-[#1e1e1e] border-[#2a2a2a] text-neutral-500 hover:text-[#4ade80]"}`}>
                        ✓
                      </button>
                      {/* Edit */}
                      <button onClick={() => {
                        setEditingExpenseId(ex.id);
                        setExpenseForm({ name: ex.vendor, type: ex.type || "Other", category: ex.category, description: ex.note, amount: String(ex.amount), date: ex.date, frequency: ex.frequency || "none", dueDate: ex.dueDate || "" });
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
  const _tripNet = (t: Trip) => (t.earnings||0)+(t.tips||0)+(t.extra||0)+(t.toll||0);

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
  const _recurWk = expenses.reduce((s,e)=>{
    if(e.frequency==='monthly') return s+e.amount/4.33;
    if(e.frequency==='weekly')  return s+e.amount;
    if(e.frequency==='daily')   return s+e.amount*7;
    return s;
  },0);

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
      // Projected income: work days in this week that fall in the current month
      let projIncome=0, daysInMo=0;
      for(let di=0;di<7;di++){
        const dd=new Date(ws); dd.setDate(ws.getDate()+di);
        if(dd.getMonth()!==_mwMo){ws=new Date(ws);ws.setDate(ws.getDate()-di+di);continue;}
        daysInMo++;
        const iso=dd.getDay()===0?7:dd.getDay();
        if(workDays.includes(iso))projIncome+=(dayTargets[iso]??dailyGoal);
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

  const _finPageNames = ['This Week','Projections','Platforms','Financial Health'];

  const FinancesContent = (
    <div>
      {/* ── Header: page title + dot indicators ── */}
      <div className="flex items-start justify-between px-4 pt-4 pb-3">
        <div>
          <p className="text-[10px] tracking-[0.22em] text-neutral-500 font-semibold uppercase">Financial Intelligence</p>
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
          <div className="bg-[#101010] border border-[#1e1e1e] rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[9px] tracking-[0.22em] text-neutral-500 font-bold uppercase">THIS WEEK</p>
              <div className="flex gap-3 text-[8px] text-neutral-600">
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
            <div className="flex justify-between mt-2 pt-2 border-t border-[#1e1e1e]">
              <div>
                <p className="text-[9px] text-neutral-500">Earned so far</p>
                <p className="text-[15px] font-bold text-[#f6dd8c] font-mono-jet">${_earnWeek.toFixed(2)}</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] text-neutral-500">Week plan total</p>
                <p className="text-[15px] font-bold text-white font-mono-jet">${_projWeek.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* PLAN SEMANAL DE INGRESOS */}
          <div className="bg-[#101010] border border-[#1e1e1e] rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[9px] tracking-[0.22em] text-neutral-500 font-bold uppercase">WEEKLY INCOME PLAN</p>
              <span className="text-[9px] text-neutral-600">{workDays.length} active day{workDays.length!==1?'s':''}</span>
            </div>
            <div className="grid grid-cols-7 gap-1 mb-1.5">
              {([1,2,3,4,5,6,7] as const).map((iso,i)=>{
                const on=workDays.includes(iso);
                return (
                  <button key={iso}
                    onClick={()=>setWorkDays(prev=>on?prev.filter(x=>x!==iso):[...prev,iso].sort())}
                    className={`flex flex-col items-center py-2 rounded-lg border transition-all active:scale-95 ${on?'bg-black border-[#f6dd8c]/50':'bg-[#0a0a0a] border-[#1a1a1a]'}`}>
                    <span className={`text-[9px] font-bold leading-none mb-1.5 ${on?'text-[#f6dd8c]':'text-neutral-600'}`}>{['M','Tu','W','Th','F','Sa','Su'][i]}</span>
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
            <div className="pt-3 border-t border-[#1e1e1e]">
              <div className="flex items-baseline justify-between mb-0.5">
                <p className="text-[9px] text-neutral-500 uppercase tracking-[0.15em]">Weekly total</p>
                <p className="text-[22px] font-bold text-[#f6dd8c] font-mono-jet leading-none">
                  ${_weekPlanTotal.toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:0})}
                </p>
              </div>
              <p className="text-[8px] text-neutral-600 mb-3">avg ${_avgDayTarget.toFixed(0)}/day</p>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-black border border-[#1e1e1e] rounded-xl p-2.5 text-center">
                  <p className="text-[8px] text-neutral-600 uppercase tracking-widest mb-0.5">Est. monthly</p>
                  <p className="text-[13px] font-bold text-white font-mono-jet">${(_weekPlanTotal*4.33/1000).toFixed(1)}k</p>
                </div>
                <div className="bg-black border border-[#1e1e1e] rounded-xl p-2.5 text-center">
                  <p className="text-[8px] text-neutral-600 uppercase tracking-widest mb-0.5">Est. yearly</p>
                  <p className="text-[13px] font-bold text-white font-mono-jet">${(_annTarget/1000).toFixed(0)}k</p>
                </div>
              </div>
              <div className="bg-[#0f0a00] border border-[#d9b64f]/20 rounded-xl p-2.5 flex items-center gap-2">
                <span className="text-[#d9b64f] text-[12px]">💡</span>
                <p className="text-[9px] text-[#a07820]">Days without a custom target use <strong className="text-[#d9b64f]">${dailyGoal}/day</strong> as the default.</p>
              </div>
            </div>
          </div>

        </div>{/* end page 0 */}

        {/* ── PAGE 1 · Projections ── */}
        <div className="flex-shrink-0 w-full px-4 space-y-4 pb-6" style={{scrollSnapAlign:'start'}}>

          {/* 1 · Balance bancario editable */}
          <div className="bg-[#101010] border border-[#1e1e1e] rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[9px] tracking-[0.22em] text-neutral-500 font-bold uppercase">BANK BALANCE</p>
              {!bankEditing && (
                <button onClick={()=>{setBankEditVal(bankBalance.toFixed(2));setBankEditing(true);}}
                  className="text-[9px] text-[#f6dd8c] border border-[#f6dd8c]/30 px-2 py-0.5 rounded-full active:scale-95 transition-transform">
                  Edit
                </button>
              )}
            </div>
            {bankEditing ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-neutral-400 text-[16px] font-mono-jet">$</span>
                  <input type="number" value={bankEditVal}
                    onChange={e=>setBankEditVal(e.target.value)}
                    className="flex-1 bg-black border border-[#f6dd8c]/40 rounded-xl px-3 py-2 text-[#f6dd8c] font-mono-jet text-[18px] font-bold focus:outline-none focus:border-[#f6dd8c]"
                    autoFocus inputMode="decimal"/>
                </div>
                <input type="text" placeholder="Optional note (e.g. car repair −$270)" value={bankEditNote}
                  onChange={e=>setBankEditNote(e.target.value)}
                  className="w-full bg-black border border-[#1e1e1e] rounded-xl px-3 py-1.5 text-neutral-300 text-[11px] focus:outline-none focus:border-[#f6dd8c]/30"/>
                <div className="flex gap-2">
                  <button onClick={()=>{
                    const nv=parseFloat(bankEditVal);
                    if(!isNaN(nv)){
                      const adj:BankAdjEntry={
                        id:Date.now().toString(),
                        date:toYYYYMMDD(currentTime),
                        time:currentTime.toLocaleTimeString('es',{hour:'2-digit',minute:'2-digit'}),
                        prevBalance:bankBalance, newBalance:nv,
                        note:bankEditNote.trim()
                      };
                      setBankAdjHistory(prev=>[adj,...prev].slice(0,20));
                      setBankBalance(nv);
                    }
                    setBankEditing(false); setBankEditVal(""); setBankEditNote("");
                  }} className="flex-1 bg-[#f6dd8c] text-black text-[11px] font-bold py-2 rounded-xl active:scale-95 transition-transform">
                    Save
                  </button>
                  <button onClick={()=>{setBankEditing(false);setBankEditVal("");setBankEditNote("");}}
                    className="px-4 text-neutral-400 text-[11px] border border-[#2a2a2a] rounded-xl">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="font-mono-jet text-[28px] font-black text-[#f6dd8c] leading-none">
                ${bankBalance.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}
              </p>
            )}
            {/* Recent adjustment log */}
            {bankAdjHistory.length>0 && !bankEditing && (
              <div className="mt-3 pt-3 border-t border-[#1e1e1e] space-y-1.5">
                {bankAdjHistory.slice(0,3).map(adj=>(
                  <div key={adj.id} className="flex items-start gap-2">
                    <span className="text-[8px] text-neutral-600 mt-0.5 flex-shrink-0 font-mono-jet">{adj.date}</span>
                    <div className="flex-1 min-w-0">
                      <span className="font-mono-jet text-[9px] text-neutral-400">
                        ${adj.prevBalance.toFixed(0)} → ${adj.newBalance.toFixed(0)}{' '}
                        <span className={adj.newBalance>=adj.prevBalance?'text-[#4ade80]':'text-red-400'}>
                          ({adj.newBalance>=adj.prevBalance?'+':''}${(adj.newBalance-adj.prevBalance).toFixed(0)})
                        </span>
                      </span>
                      {adj.note && <p className="text-[8px] text-neutral-600 truncate">— {adj.note}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2 · Mes en semanas */}
          <div className="bg-[#101010] border border-[#1e1e1e] rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[9px] tracking-[0.22em] text-neutral-500 font-bold uppercase">
                {currentTime.toLocaleDateString('en-US',{month:'long',year:'numeric'}).toUpperCase()}
              </p>
              {_mwCurIdx>=0 && (
                <p className="text-[9px] text-neutral-500">Week {_mwCurIdx+1} of {_mwWeeks.length}</p>
              )}
            </div>

            {/* Monthly progress bar */}
            {_mwMonthGoal>0 && (
              <div className="mb-4">
                <div className="flex justify-between text-[9px] mb-1.5">
                  <span className="text-neutral-400 font-mono-jet">${_mwEarned.toFixed(0)} earned</span>
                  <span className="text-[#f6dd8c] font-mono-jet">Goal ${_mwMonthGoal.toLocaleString('en-US',{maximumFractionDigits:0})}</span>
                </div>
                <div className="h-2.5 bg-[#1a1a1a] rounded-full overflow-hidden border border-[#2a2a2a]">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{width:`${Math.min(_mwEarned/_mwMonthGoal*100,100)}%`,background:'linear-gradient(90deg,#d9b64f,#f6dd8c)'}}/>
                </div>
                <p className="text-[8px] text-neutral-600 mt-1">
                  {Math.round(_mwEarned/_mwMonthGoal*100)}% of your monthly goal
                </p>
              </div>
            )}

            {/* Week rows */}
            <div className="space-y-2">
              {_mwWeeks.map((w,i)=>{
                const bal=_mwBalances[i];
                const netActual=w.actualIncome-w.actualExp;
                const netProj=w.projIncome-w.projExp;
                const displayNet=w.isPast||w.isCurrent?netActual:netProj;
                const displayIncome=w.isPast||w.isCurrent?w.actualIncome:w.projIncome;
                const onPlan=w.projIncome>0?(w.actualIncome/w.projIncome)>=0.8:true;
                return (
                  <div key={w.wStr} className={`rounded-xl p-3 border ${
                    w.isCurrent?'border-[#f6dd8c]/40 bg-[#0f0a00]':
                    w.isPast?'border-[#1e1e1e] bg-black/40':
                    'border-[#181818] bg-black/10'
                  }`}>
                    {/* Row header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[7px] font-black px-1.5 py-0.5 rounded tracking-widest uppercase ${
                          w.isCurrent?'bg-[#f6dd8c]/20 text-[#f6dd8c]':
                          w.isPast?'bg-[#1e1e1e] text-neutral-500':
                          'bg-[#141414] text-neutral-600'
                        }`}>{w.isCurrent?'CURRENT':w.isPast?'CLOSED':'UPCOMING'}</span>
                        <span className="text-[10px] text-neutral-400">{w.label}</span>
                      </div>
                      {!isNaN(bal) && (
                        <span className={`font-mono-jet text-[10px] font-bold ${bal>=0?'text-[#4ade80]':'text-red-400'}`}>
                          ${bal.toFixed(0)}
                        </span>
                      )}
                    </div>
                    {/* Data grid */}
                    <div className="grid grid-cols-3 gap-1">
                      <div>
                        <p className="text-[7px] text-neutral-600 uppercase mb-0.5">Earned</p>
                        <p className={`font-mono-jet text-[11px] font-bold ${w.isCurrent?'text-[#f6dd8c]':w.isPast?'text-neutral-300':'text-neutral-500'}`}>
                          ${displayIncome.toFixed(0)}
                          {(w.isPast||w.isCurrent)&&w.projIncome>0&&(
                            <span className="text-neutral-600 text-[8px]">/{w.projIncome.toFixed(0)}</span>
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-[7px] text-neutral-600 uppercase mb-0.5">Expenses</p>
                        <p className="font-mono-jet text-[11px] font-bold text-red-400">
                          ${w.actualExp.toFixed(0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[7px] text-neutral-600 uppercase mb-0.5">Net</p>
                        <p className={`font-mono-jet text-[11px] font-bold ${displayNet>=0?'text-[#4ade80]':'text-red-400'}`}>
                          {displayNet>=0?'+':''}{displayNet.toFixed(0)}
                        </p>
                      </div>
                    </div>
                    {/* Past week variance note */}
                    {w.isPast && w.projIncome>0 && (
                      <p className={`text-[8px] mt-1.5 font-semibold ${onPlan?'text-[#4ade80]':'text-orange-400'}`}>
                        {onPlan?'↑ Above plan':'↓ Below plan'} · {Math.round(w.actualIncome/w.projIncome*100)}% of goal
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3 · Pagos programados */}
          {_mwPayments.length>0 && (
            <div className="bg-[#101010] border border-[#1e1e1e] rounded-2xl p-4">
              <p className="text-[9px] tracking-[0.22em] text-neutral-500 font-bold uppercase mb-3">SCHEDULED PAYMENTS</p>
              <div className="space-y-2">
                {_mwPayments.map(p=>(
                  <div key={p.dueStr} className={`rounded-xl p-3 border ${
                    p.covered?'border-[#4ade80]/25 bg-[#020f02]':'border-red-500/25 bg-[#0f0202]'
                  }`}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-semibold text-neutral-100 truncate">{p.name}</p>
                        <p className="text-[9px] text-neutral-500 mt-0.5">
                          {p.daysUntil<=0?'Due today':p.daysUntil===1?'Tomorrow':`In ${p.daysUntil} days`}
                          {' · '}{new Date(p.dueStr+'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'})}
                        </p>
                      </div>
                      <p className="font-mono-jet text-[14px] font-black text-neutral-100 flex-shrink-0">${p.amount.toFixed(0)}</p>
                    </div>
                    <div className={`text-[9px] font-semibold flex items-center gap-1 ${p.covered?'text-[#4ade80]':'text-red-400'}`}>
                      {p.covered
                        ? <>✓ Covered · <span className="font-mono-jet">${(p.projBal-p.amount).toFixed(0)}</span> to spare</>
                        : <>⚠ Short by <span className="font-mono-jet">${(p.amount-p.projBal).toFixed(0)}</span> to cover this payment</>
                      }
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4 · Panorama anual */}
          <div className="bg-[#101010] border border-[#1e1e1e] rounded-2xl p-4">
            <p className="text-[9px] tracking-[0.22em] text-neutral-500 font-bold uppercase mb-3">ANNUAL OUTLOOK</p>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {([
                {label:'End of Week', val:_projWeek},
                {label:'End of Month',val:_projMonth},
                {label:'End of Year', val:_projYear},
              ] as {label:string,val:number}[]).map(({label,val})=>(
                <div key={label} className="bg-black border border-[#1e1e1e] rounded-xl p-2.5 text-center">
                  <p className="text-[8px] text-neutral-500 uppercase tracking-widest leading-tight mb-1">{label}</p>
                  <p className="text-[13px] font-bold text-[#f6dd8c] font-mono-jet">${(val/1000).toFixed(1)}k</p>
                </div>
              ))}
            </div>
            <div className="bg-black border border-[#1e1e1e] rounded-xl p-3">
              <div className="flex justify-between items-center mb-1.5">
                <p className="text-[9px] text-neutral-500">Annual goal · Super Plus</p>
                <p className="text-[9px] text-[#f6dd8c]">${(_annTarget/1000).toFixed(0)}k · {Math.round(_yearPct*100)}%</p>
              </div>
              <div className="h-2 bg-[#1e1e1e] rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{width:`${_yearPct*100}%`,background:'linear-gradient(to right,#d9b64f,#f6dd8c)'}}/>
              </div>
              <p className="text-[8px] text-neutral-600 mt-1.5">Based on weekly plan · {workDays.length} day{workDays.length!==1?'s':''}/week</p>
            </div>
          </div>

        </div>{/* end page 1 */}

        {/* ── PAGE 2 · Platforms ── */}
        <div className="flex-shrink-0 w-full px-4 pb-6" style={{scrollSnapAlign:'start'}}>
          {_platRows.length>0 ? (
            <div className="bg-[#101010] border border-[#1e1e1e] rounded-2xl p-4">
              <p className="text-[9px] tracking-[0.22em] text-neutral-500 font-bold uppercase mb-3">INCOME BY PLATFORM</p>
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="text-[8px] text-neutral-600 uppercase tracking-widest border-b border-[#1e1e1e]">
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
                        <td className="py-2 text-right font-mono-jet text-neutral-500 text-[10px]">{d.today>0?`$${d.today.toFixed(0)}`:'—'}</td>
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
              <p className="text-[11px] text-neutral-600 leading-relaxed">Log your first trip to see<br/>your breakdown by platform here</p>
            </div>
          )}
        </div>{/* end page 2 */}

        {/* ── PAGE 3 · Financial Health ── */}
        <div className="flex-shrink-0 w-full px-4 space-y-4 pb-6" style={{scrollSnapAlign:'start'}}>
          <div className="bg-[#101010] border border-[#1e1e1e] rounded-2xl p-4">
            <p className="text-[9px] tracking-[0.22em] text-neutral-500 font-bold uppercase mb-3">
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
        </div>{/* end page 3 */}

      </div>{/* end horizontal scroll */}
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
        <div className="sticky z-30 bg-black" style={{ top: 'calc(68px + env(safe-area-inset-top))' }}>

          {/* ── Primary 5 tabs — icon + label, equal width, always visible ── */}
          <div className="flex border-b border-[#1a1a1a]">
            {([
              { key: "DASHBOARD", Icon: Home,          label: "DASH"    },
              { key: "ENTRY",     Icon: Banknote,      label: "REVENUE" },
              { key: "REGISTER",  Icon: ClipboardList, label: "QUEUE"   },
              { key: "FINANCES",  Icon: BarChart2,     label: "FINANCE" },
              { key: "LEDGER",    Icon: BookOpen,      label: "LEDGER"  },
            ] as { key: Tab; Icon: React.ElementType; label: string }[]).map(({ key, Icon, label }) => {
              const active = activeTab === key;
              const badge  = key === "REGISTER" ? pendingTrips.length
                           : key === "LEDGER"   ? postedTrips.length
                           : 0;
              return (
                <button key={key} onClick={() => setActiveTab(key)}
                  className={`flex-1 h-[52px] flex flex-col items-center justify-center gap-[3px] relative transition-colors ${
                    active ? "text-[#f6dd8c]" : "text-[#777] hover:text-neutral-400"
                  }`}>
                  {/* Icon with optional badge overlay */}
                  <div className="relative flex items-center justify-center">
                    <Icon size={17} strokeWidth={active ? 2 : 1.75} />
                    {badge > 0 && (
                      <span className={`absolute -top-[5px] -right-[7px] min-w-[13px] h-[13px] flex items-center justify-center rounded-full text-[7px] font-bold leading-none px-[3px] ${
                        key === "LEDGER"
                          ? "bg-[#4ade80]/25 text-[#4ade80]"
                          : "bg-[#facc15]/25 text-[#f6dd8c]"
                      }`}>{badge > 99 ? "99+" : badge}</span>
                    )}
                  </div>
                  {/* Short label */}
                  <span className="text-[7.5px] tracking-[0.12em] font-semibold">{label}</span>
                  {/* Active indicator */}
                  {active && (
                    <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-gradient-to-r from-[#f6dd8c] to-[#d9b64f] rounded-full" />
                  )}
                </button>
              );
            })}
          </div>

          {/* ── Secondary tabs — EXPENSES & REPORTS ── */}
          <div className="flex border-b border-[#111] bg-[#060606]">
            {(["EXPENSES", "REPORTS"] as Tab[]).map(tab => {
              const active = activeTab === tab;
              return (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`px-6 h-[26px] flex items-center text-[8.5px] tracking-[0.14em] font-semibold relative transition-colors ${
                    active ? "text-[#f6dd8c]" : "text-neutral-600 hover:text-neutral-400"
                  }`}>
                  {tab}
                  {active && (
                    <span className="absolute bottom-0 left-4 right-4 h-[1.5px] bg-gradient-to-r from-[#f6dd8c] to-[#d9b64f] rounded-full" />
                  )}
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
    </div>
  );
}
