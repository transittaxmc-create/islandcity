import { useState, useMemo, useEffect, useRef } from "react";

type TurnStatus = "START" | "BREAK" | "END";
type Tab = "ENTRY" | "REGISTER" | "DASHBOARD" | "EXPENSES" | "REPORTS";

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
  vendor: string;
  amount: number;
  note: string;
};

const TOLL_PLAZAS = [
  { name: "Lincoln Tunnel", lat: 40.7589, lng: -74.006, rate: 16.79, type: "Port Authority Peak" },
  { name: "Holland Tunnel", lat: 40.726, lng: -74.027, rate: 16.79, type: "Port Authority Peak" },
  { name: "GWB Upper", lat: 40.8517, lng: -73.9527, rate: 16.79, type: "Port Authority Peak" },
  { name: "Brooklyn Battery", lat: 40.6895, lng: -74.0449, rate: 6.94, type: "MTA 2026" },
  { name: "Queens Midtown", lat: 40.7434, lng: -73.9637, rate: 6.94, type: "MTA 2026" },
  { name: "Verrazzano E-ZPass", lat: 40.6066, lng: -74.0449, rate: 6.94, type: "MTA 2026" },
  { name: "RFK Bridge", lat: 40.78, lng: -73.95, rate: 6.94, type: "MTA 2026" },
  { name: "Whitestone", lat: 40.796, lng: -73.8305, rate: 6.94, type: "MTA 2026" },
  { name: "Throgs Neck", lat: 40.801, lng: -73.797, rate: 6.94, type: "MTA 2026" },
  { name: "Henry Hudson", lat: 40.876, lng: -73.93, rate: 3.18, type: "MTA 2026 Off" },
  { name: "Marine Parkway", lat: 40.58, lng: -73.89, rate: 2.60, type: "MTA 2026" },
  { name: "Cross Bay", lat: 40.596, lng: -73.84, rate: 2.60, type: "MTA 2026" },
  { name: "Goethals", lat: 40.64, lng: -74.19, rate: 16.79, type: "Port Authority" },
  { name: "Outerbridge", lat: 40.52, lng: -74.25, rate: 16.79, type: "Port Authority" },
  { name: "Bayonne", lat: 40.64, lng: -74.11, rate: 16.79, type: "Port Authority" },
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

const EXPENSE_CATEGORIES = ["Fuel", "Maintenance", "Supplies", "Insurance", "Parking", "Tolls", "Other"];

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
  VOUCHER: "bg-[#f3f4f6] text-[#374151] border-[#e5e7eb]",
};

const platformMeta: Record<string, PlatformMeta> = {
  "EcoRide - 10% fee": { initial: "E", bg: "bg-[#22c55e]", tags: ["ACCESS-A-RIDE", "VOUCHER"] },
  EcoRide: { initial: "E", bg: "bg-[#22c55e]", tags: ["ACCESS-A-RIDE", "VOUCHER"] },
  Uber: { initial: "U", bg: "bg-white", logoBg: "bg-white", tags: [], logo: "/logos/uber.png" },
  Lyft: { initial: "L", bg: "bg-[#FF00BF]", tags: [], logo: "/logos/lyft.png", logoBg: "bg-black" },
  Empower: { initial: "E", bg: "bg-[#3b82f6]", tags: [], logo: "/logos/empower.png", logoBg: "bg-white" },
  Gallant: { initial: "G", bg: "bg-[#f97316]", tags: ["VOUCHER"], logo: "/logos/gallant.png", logoBg: "bg-white" },
  "Aventus Ride": { initial: "A", bg: "bg-[#8b5cf6]", tags: ["VOUCHER"], logo: "/logos/aventus.png", logoBg: "bg-white" },
  "Classic Ryde": { initial: "CR", bg: "bg-[#14b8a6]", tags: ["VOUCHER"], logo: "/logos/classicryde.png", logoBg: "bg-white" },
  "Aki Technology": { initial: "AKI", bg: "bg-[#0ea5e9]", tags: ["ACCESS-A-RIDE", "VOUCHER"], note: "Medical Transportation NYC", logo: "/logos/aki.png", logoBg: "bg-white" },
  "Street Hail": { initial: "SH", bg: "bg-[#6b7280]", tags: [] },
  Other: { initial: "O", bg: "bg-[#9ca3af]", tags: [] },
};

const getPlatformMeta = (name: string): PlatformMeta =>
  platformMeta[name] || { initial: name[0]?.toUpperCase() || "O", bg: "bg-[#9ca3af]", tags: [] };

const getTagStyle = (tag: string) => TAG_STYLES[tag] || "bg-[#f3f4f6] text-[#374151] border-[#e5e7eb]";

const initialTrips: Trip[] = [
  {
    id: "1", reference: "IC-8821", earnings: 18.5, tips: 4, extra: 0, toll: 2.75, fee: 3.2,
    platform: "Uber", pickup: "Times Sq / Theatre District", dropoff: "Brooklyn Heights",
    notes: "Surge x1.5", grandTotal: 22.05,
    time: "7:12 PM", date: new Date().toISOString().slice(0, 10),
    timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    gps: { lat: 40.758, lng: -73.9855 },
  },
  {
    id: "2", reference: "IC-8822", earnings: 12.0, tips: 2, extra: 5, toll: 0, fee: 1.8,
    platform: "Lyft", pickup: "Midtown East", dropoff: "Times Sq / Theatre District",
    notes: "Quick hop", grandTotal: 17.2,
    time: "8:31 PM", date: new Date().toISOString().slice(0, 10),
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    gps: { lat: 40.76, lng: -73.97 },
  },
];

const initialExpenses: Expense[] = [
  { id: "e1", date: new Date().toISOString().slice(0, 10), category: "Fuel", vendor: "BP - Queens Blvd", amount: 42.3, note: "" },
  { id: "e2", date: new Date(Date.now() - 86400000).toISOString().slice(0, 10), category: "Tolls", vendor: "E-ZPass replenishment", amount: 30, note: "" },
  { id: "e3", date: new Date(Date.now() - 86400000 * 2).toISOString().slice(0, 10), category: "Supplies", vendor: "Car Wash - Main St", amount: 12, note: "" },
];

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
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M5 17h14M6 17l1.2-6.5A2 2 0 0 1 9.2 9h5.6a2 2 0 0 1 2 1.5L18 17M8 17v2m8-2v2M8 13h8M6.5 15h.01M17.5 15h.01" />
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
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
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
    return [
      { date: toYYYYMMDD(new Date(Date.now() - 86400000 * 2)), hours: 5.5, clockIn: "", clockOut: "", breakMs: 0 },
      { date: toYYYYMMDD(new Date(Date.now() - 86400000)), hours: 6.2, clockIn: "", clockOut: "", breakMs: 0 },
    ];
  });

  // Shift clock
  const [clockInTime, setClockInTime] = useState<Date | null>(null);
  const [totalBreakMs, setTotalBreakMs] = useState(0);
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [breakStart, setBreakStart] = useState<Date | null>(null);
  const [shiftActive, setShiftActive] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const [gps, setGps] = useState<GpsState>({ lat: null, lng: null, acc: null, status: "inactive" });
  const [gpsAddress, setGpsAddress] = useState("");
  const [gpsAirport, setGpsAirport] = useState("");

  const [showPickupMenu, setShowPickupMenu] = useState(false);
  const [showDropoffMenu, setShowDropoffMenu] = useState(false);

  // Storage state
  const [lastSavedAt, setLastSavedAt] = useState<string>(() => {
    try { return localStorage.getItem("island-city-last-saved") || "—"; } catch { return "—"; }
  });
  const [storageVerified, setStorageVerified] = useState(false);
  const [storageBytes, setStorageBytes] = useState(0);

  // Trip form
  const [tripForm, setTripForm] = useState<TripForm>({
    reference: "", earnings: "", tips: "", extraCash: "", toll: "",
    platformFee: "", platform: "Uber", pickup: "", dropoff: "", notes: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [inlineEditId, setInlineEditId] = useState<string | null>(null);
  const [inlineForm, setInlineForm] = useState({ pickup: "", dropoff: "", earnings: "", reference: "" });

  // Expense form
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ category: "Fuel", vendor: "", amount: "", note: "" });
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);

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

  // Persist hours
  useEffect(() => {
    try { localStorage.setItem("island-city-hours", JSON.stringify(hoursLog)); } catch {}
  }, [hoursLog]);

  // Initial storage check
  useEffect(() => {
    try {
      const raw = localStorage.getItem("island-city-trips");
      if (raw) { setStorageBytes(new Blob([raw]).size); setStorageVerified(true); }
    } catch { setStorageVerified(false); }
  }, []);

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
        const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${gps.lat}&lon=${gps.lng}`;
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) return;
        const data = await res.json();
        const addr = data?.address || {};
        const town = addr.city || addr.town || addr.village || addr.county || addr.state || "";
        const short = town ? `${town}${addr.road ? ", " + addr.road : ""}` : (data?.display_name || "");
        if (short) setGpsAddress(short);
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

  const handleClockIn = () => {
    const now = new Date();
    setClockInTime(now);
    setTotalBreakMs(0);
    setIsOnBreak(false);
    setBreakStart(null);
    setShiftActive(true);
    startGPS();
    showToast(`Clock In ${now.toLocaleTimeString()} · GPS started`);
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
    const todayStr = currentTime.toDateString();
    return trips.filter(t => {
      try { return new Date(t.timestamp || t.date).toDateString() === todayStr; } catch { return true; }
    });
  }, [trips, currentTime]);

  const todayEarnings = useMemo(() => todayTrips.reduce((a, b) => a + b.grandTotal, 0), [todayTrips]);
  const totalTollsToday = useMemo(() => todayTrips.reduce((a, b) => a + b.toll, 0), [todayTrips]);

  const activeMsLive = useMemo(() => {
    if (!shiftActive || !clockInTime) return 0;
    const nowMs = currentTime.getTime();
    let breakMs = totalBreakMs;
    if (isOnBreak && breakStart) breakMs += nowMs - breakStart.getTime();
    return nowMs - clockInTime.getTime() - breakMs;
  }, [shiftActive, clockInTime, currentTime, totalBreakMs, isOnBreak, breakStart]);

  const activeHoursFormatted = useMemo(() => formatHHMMSS(activeMsLive), [activeMsLive]);
  const activeHoursDecimal = activeMsLive / 3600000;

  const perHourLive = useMemo(() => {
    if (activeHoursDecimal > 0.05) return todayEarnings / activeHoursDecimal;
    return todayTrips.length > 0 ? todayEarnings / 1.21 : 0;
  }, [todayEarnings, activeHoursDecimal, todayTrips.length]);

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

  const resetForm = () => {
    setTripForm({ reference: "", earnings: "", tips: "", extraCash: "", toll: "", platformFee: "", platform: "Uber", pickup: "", dropoff: "", notes: "" });
    setEditingId(null);
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
    };
    const updated = editingId ? trips.map(p => p.id === editingId ? newTrip : p) : [newTrip, ...trips];
    setTrips(updated);
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

  const handleDelete = (id: string) => {
    if (!window.confirm("Delete this trip? This cannot be undone.")) return;
    setTrips(trips.filter(t => t.id !== id));
    showToast("Trip deleted");
  };

  const handleInlineEditStart = (trip: Trip) => {
    setInlineEditId(trip.id);
    setInlineForm({ pickup: trip.pickup, dropoff: trip.dropoff, earnings: String(trip.earnings), reference: trip.reference });
  };

  const handleInlineSave = (id: string) => {
    const updated = trips.map(t => {
      if (t.id !== id) return t;
      const newEarnings = parseFloat(inlineForm.earnings) || 0;
      return { ...t, pickup: inlineForm.pickup, dropoff: inlineForm.dropoff, earnings: newEarnings, reference: inlineForm.reference, grandTotal: newEarnings + t.tips + t.extra + t.toll - t.fee };
    });
    setTrips(updated);
    setInlineEditId(null);
    showToast("Trip updated ✓");
  };

  const handleSaveExpense = () => {
    if (!expenseForm.vendor || !expenseForm.amount) { showToast("Enter vendor and amount"); return; }
    const now = new Date();
    const newExpense: Expense = {
      id: editingExpenseId || Date.now().toString(),
      date: toYYYYMMDD(now),
      category: expenseForm.category,
      vendor: expenseForm.vendor.trim(),
      amount: parseFloat(expenseForm.amount) || 0,
      note: expenseForm.note.trim(),
    };
    if (editingExpenseId) {
      setExpenses(expenses.map(e => e.id === editingExpenseId ? newExpense : e));
    } else {
      setExpenses([newExpense, ...expenses]);
    }
    setExpenseForm({ category: "Fuel", vendor: "", amount: "", note: "" });
    setEditingExpenseId(null);
    setShowExpenseForm(false);
    showToast(`Expense saved ✓ $${newExpense.amount.toFixed(2)}`);
  };

  const handleDeleteExpense = (id: string) => {
    if (!window.confirm("Delete this expense?")) return;
    setExpenses(expenses.filter(e => e.id !== id));
    showToast("Expense deleted");
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
      <div className="bg-[#141414] border border-[#222] rounded-[20px] p-4 overflow-hidden relative">
        <div className="flex items-center justify-between">
          <p className="font-mono-jet text-[11px] text-neutral-400">
            {currentTime.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} ·{" "}
            {currentTime.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
          </p>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] tracking-[0.12em] font-semibold ${
            shiftActive ? "bg-[#2ecc71]/15 border-[#2ecc71]/30 text-[#6ee7a8]" : "bg-[#1e1e1e] border-[#2a2a2a] text-neutral-500"
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${shiftActive ? "bg-[#2ecc71] animate-pulse" : "bg-neutral-600"}`} />
            {shiftStatusLabel}
          </span>
        </div>
        <div className="mt-3.5">
          <p className="font-mono-jet text-[12px] text-neutral-400">
            {gps.lat && gps.lng ? `${gps.lat.toFixed(4)}, ${gps.lng.toFixed(4)}` : "GPS not active"}{gps.acc ? ` · ±${Math.round(gps.acc)}m` : ""}
          </p>
          {gpsAddress && <p className="text-[12px] text-neutral-300 mt-0.5 truncate">{gpsAddress}</p>}
          {gpsAirport && <p className="font-mono-jet text-[11px] text-[#f6dd8c] mt-0.5">✈ {gpsAirport}</p>}
        </div>
        <p className="font-mono-jet text-[34px] font-bold text-[#f5c518] mt-3 tracking-tight">${todayEarnings.toFixed(2)}</p>
        <p className="font-mono-jet text-[11px] text-neutral-500 mt-1">{todayTrips.length} trips today</p>
        <div className="mt-4 h-px bg-[#222]" />
        <div className="mt-3 flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${shiftActive ? "bg-[#2ecc71]" : "bg-neutral-700"}`} />
          <span className={`text-[11px] font-mono-jet ${shiftActive ? "text-[#6ee7a8]" : "text-neutral-500"}`}>
            {shiftActive ? (isOnBreak ? "On break" : "On track") : "Shift ended"}
          </span>
          <span className="ml-auto text-[10px] text-neutral-600 font-mono-jet flex items-center gap-1">
            <span className={`w-1 h-1 rounded-full ${gps.status === "active" ? "bg-[#2ecc71]" : gps.status === "searching" ? "bg-yellow-400 animate-pulse" : "bg-neutral-600"}`} />
            GPS {gps.status}
          </span>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {(["START", "BREAK", "END"] as TurnStatus[]).map(s => {
            const isActive = (s === "START" && shiftActive && !isOnBreak) || (s === "BREAK" && isOnBreak) || (s === "END" && !shiftActive);
            const disabled = s === "BREAK" && !shiftActive;
            return (
              <button key={s} onClick={() => handleTurnButton(s)} disabled={disabled}
                className={`h-[44px] rounded-full border text-[12px] tracking-[0.12em] font-bold transition-all ${
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
          <div className="bg-[#141414] border border-[#222] rounded-xl p-3.5">
            <p className="text-[9px] tracking-[0.18em] text-neutral-500 font-semibold">TODAY'S EARNINGS</p>
            <p className="font-mono-jet text-[20px] font-semibold text-[#f5c518] mt-2">${todayEarnings.toFixed(2)}</p>
            <p className="text-[10px] text-neutral-600 mt-1 font-mono-jet">{todayTrips.length} trips · live</p>
          </div>
          <div className="bg-[#141414] border border-[#222] rounded-xl p-3.5">
            <p className="text-[9px] tracking-[0.18em] text-neutral-500 font-semibold">ACTIVE HOURS</p>
            <p className="font-mono-jet text-[18px] font-semibold text-white mt-2 tracking-tight">
              {shiftActive ? activeHoursFormatted : cumulative.hoy > 0 ? `${cumulative.hoy.toFixed(2)}h today` : "00:00:00"}
            </p>
            <div className="mt-2 space-y-0.5">
              <div className="flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${shiftActive ? "bg-[#2ecc71] animate-pulse" : "bg-neutral-600"}`} />
                <span className="text-[10px] text-[#6ee7a8] font-mono-jet">{shiftActive ? (isOnBreak ? "Break" : "On route") : "Shift idle"}</span>
              </div>
              <p className="text-[9px] font-mono-jet text-neutral-500">Today {cumulative.hoy.toFixed(1)}h · Week {cumulative.semana.toFixed(1)}h</p>
              <p className="text-[9px] font-mono-jet text-neutral-600">Month {cumulative.mes.toFixed(1)}h · Year {cumulative.año.toFixed(1)}h</p>
            </div>
          </div>
          <div className="bg-[#141414] border border-[#222] rounded-xl p-3.5">
            <p className="text-[9px] tracking-[0.18em] text-neutral-500 font-semibold">$/HOUR LIVE</p>
            <p className="font-mono-jet text-[20px] font-semibold text-white mt-2">${perHourLive.toFixed(2)}</p>
            <p className="text-[10px] text-neutral-500 mt-1">Live calc{shiftActive ? " · active" : ""}</p>
          </div>
          <div className="bg-[#141414] border border-[#222] rounded-xl p-3.5">
            <p className="text-[9px] tracking-[0.18em] text-neutral-500 font-semibold">WEEKLY TOTAL</p>
            <p className="font-mono-jet text-[20px] font-semibold text-white mt-2">${weeklyTotal.toFixed(2)}</p>
            <p className="text-[10px] text-neutral-600 mt-1 font-mono-jet">{weeklyTrips.length} trips · 7 days</p>
          </div>
        </div>
      </div>

      {/* Goal tracker */}
      <div className="bg-[#141414] border border-[#222] rounded-[20px] p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] tracking-[0.18em] font-bold text-white">TODAY'S PERFORMANCE</h3>
          <span className="text-[10px] tracking-[0.18em] font-bold" style={goldGradientStyle}>GOAL $/H</span>
        </div>
        <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-neutral-500">Target per hour</span>
            <span className="font-mono-jet text-[20px] font-bold" style={goldGradientStyle}>${goal}/h</span>
          </div>
          <input type="range" min={50} max={100} step={1} value={goal}
            onChange={e => setGoal(parseInt(e.target.value))} className="w-full mt-4" />
          <div className="flex justify-between mt-1">
            <span className="text-[10px] font-mono-jet text-neutral-600">$50</span>
            <span className="text-[10px] font-mono-jet text-neutral-600">$100</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[["ACTUAL", `$${perHourLive.toFixed(2)}`, "text-white"], ["GOAL", `$${goal.toFixed(2)}`, "text-[#f6dd8c]"], ["DELTA", `${perHourLive >= goal ? "+" : ""}$${(perHourLive - goal).toFixed(2)}/h`, perHourLive >= goal ? "text-[#4ade80]" : "text-[#ff6b6b]"]].map(([label, val, cls]) => (
            <div key={label} className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-3">
              <p className="text-[9px] tracking-[0.14em] text-neutral-500">{label}</p>
              <p className={`font-mono-jet text-[15px] font-semibold ${cls} mt-1`}>{val}</p>
            </div>
          ))}
        </div>
        <span className={`inline-flex items-center px-3 py-1.5 rounded-full border text-[10px] tracking-[0.12em] font-semibold font-mono-jet ${
          perHourLive >= goal ? "bg-[#4ade80]/10 border-[#4ade80]/30 text-[#4ade80]" : "bg-[#ff4d4f]/10 border-[#ff4d4f]/30 text-[#ff6b6b]"
        }`}>
          <span className={`w-1 h-1 rounded-full mr-2 animate-pulse ${perHourLive >= goal ? "bg-[#4ade80]" : "bg-[#ff4d4f]"}`} />
          {perHourLive >= goal ? "ON GOAL" : "BELOW GOAL · Pick up pace"}
        </span>
        <div className="grid grid-cols-3 gap-0 bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl overflow-hidden">
          <div className="p-3 border-r border-[#1f1f1f] text-center">
            <p className="text-[9px] text-neutral-500 tracking-widest">TOLLS</p>
            <p className="font-mono-jet text-[13px] font-semibold mt-1 text-white">${totalTollsToday.toFixed(2)}</p>
          </div>
          <div className="p-3 border-r border-[#1f1f1f] text-center">
            <p className="text-[9px] text-neutral-500 tracking-widest">TRIPS</p>
            <p className="font-mono-jet text-[13px] font-semibold mt-1 text-white">{todayTrips.length}</p>
          </div>
          <div className="p-3 text-center">
            <p className="text-[9px] text-neutral-500 tracking-widest">NET TODAY</p>
            <p className="font-mono-jet text-[13px] font-semibold mt-1 text-[#f5c518]">${todayEarnings.toFixed(2)}</p>
          </div>
        </div>
        <div className="rounded-xl bg-[#1a1625] border border-[#2a2340] border-l-[3px] border-l-[#8b5cf6] p-3.5">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6]" />
            <p className="text-[10px] tracking-[0.18em] font-bold text-[#a78bfa]">E-ZPASS 2026 · {TOLL_PLAZAS.length} PLAZAS</p>
          </div>
          <p className="text-[12px] leading-[1.5] text-[#c4b5fd]/90 mt-2">
            MTA ${TOLL_PLAZAS[3].rate} · Port Authority $16.79 peak · Geofencing active.{" "}
            {shiftActive ? "GPS live tracking." : "Start shift to enable auto-tagging."}
          </p>
        </div>
      </div>
    </div>
  );

  // ─── Entry Form ───────────────────────────────────────────────
  const meta = getPlatformMeta(tripForm.platform);

  const EntryFormContent = (
    <div id="trip-entry-form" className="w-full max-w-[480px] mx-auto bg-[#101010] border border-[#222] rounded-[24px] p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="w-1 h-6 bg-[#22c55e] rounded-full inline-block" />
          <h2 className="text-white font-bold text-[18px] tracking-[0.14em] uppercase">TRIP ENTRY</h2>
        </div>
        <span className="px-3 py-1 rounded-full bg-[#1e1e1e] border border-[#2a2a2a] text-[#9ca3af] text-[11px] tracking-[0.12em] font-semibold uppercase">
          {editingId ? "EDITING" : "NEW TRIP"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-[11px] tracking-[0.08em] text-[#9ca3af] font-bold uppercase">REFERENCE / INVOICE</label>
          <input value={tripForm.reference}
            onChange={e => setTripForm(s => ({ ...s, reference: e.target.value }))}
            placeholder="e.g. INV-2026-001"
            className="w-full h-16 rounded-2xl bg-black border border-[#262626] px-4 text-white text-[15px] font-medium placeholder:text-[#6b7280] focus:outline-none focus:border-[#3a3a3a]" />
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] tracking-[0.08em] text-[#9ca3af] font-bold uppercase">EARNINGS <span className="font-normal normal-case opacity-70">Fare</span></label>
          <input inputMode="decimal" value={tripForm.earnings}
            onChange={e => { if (numericFilter(e.target.value)) setTripForm(s => ({ ...s, earnings: e.target.value })); }}
            placeholder="0.00"
            className="w-full h-16 rounded-2xl bg-black border border-[#262626] px-4 text-white text-[18px] font-bold font-mono-jet placeholder:text-[#6b7280] focus:outline-none focus:border-[#3a3a3a]" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-[11px] tracking-[0.08em] text-[#9ca3af] font-bold uppercase">TIPS</label>
          <input inputMode="decimal" value={tripForm.tips}
            onChange={e => { if (numericFilter(e.target.value)) setTripForm(s => ({ ...s, tips: e.target.value })); }}
            placeholder="0.00"
            className="w-full h-16 rounded-2xl bg-black border border-[#262626] px-4 text-white text-[18px] font-bold font-mono-jet placeholder:text-[#6b7280] focus:outline-none focus:border-[#3a3a3a]" />
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] tracking-[0.08em] text-[#9ca3af] font-bold uppercase">EXTRA CASH</label>
          <input inputMode="decimal" value={tripForm.extraCash}
            onChange={e => { if (numericFilter(e.target.value)) setTripForm(s => ({ ...s, extraCash: e.target.value })); }}
            placeholder="0.00"
            className="w-full h-16 rounded-2xl bg-black border border-[#262626] px-4 text-white text-[18px] font-bold font-mono-jet placeholder:text-[#6b7280] focus:outline-none focus:border-[#3a3a3a]" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <label className="text-[11px] tracking-[0.08em] text-[#9ca3af] font-bold uppercase">TOLL ($)</label>
            <span className="px-2 py-0.5 rounded-full bg-[#052e16] border border-[#166534] text-[#4ade80] text-[10px] font-bold tracking-widest">GPS</span>
          </div>
          <input inputMode="decimal" value={tripForm.toll}
            onChange={e => { if (numericFilter(e.target.value)) setTripForm(s => ({ ...s, toll: e.target.value })); }}
            placeholder="e.g. 6.94"
            className="w-full h-16 rounded-2xl bg-black border border-[#262626] px-4 text-white text-[18px] font-bold font-mono-jet placeholder:text-[#6b7280] focus:outline-none focus:border-[#3a3a3a]" />
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] tracking-[0.08em] text-[#9ca3af] font-bold uppercase">PLATFORM FEE ($)</label>
          <input inputMode="decimal" value={tripForm.platformFee}
            onChange={e => { if (numericFilter(e.target.value)) setTripForm(s => ({ ...s, platformFee: e.target.value })); }}
            placeholder="0.00"
            className="w-full h-16 rounded-2xl bg-black border border-[#262626] px-4 text-white text-[18px] font-bold font-mono-jet placeholder:text-[#6b7280] focus:outline-none focus:border-[#3a3a3a]" />
        </div>
      </div>

      {/* Platform selector */}
      <div className="space-y-1.5">
        <label className="text-[11px] tracking-[0.08em] text-[#9ca3af] font-bold uppercase">PLATFORM</label>
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <PlatformAvatar meta={meta} size="md" />
          <span className="text-[13px] font-semibold text-white truncate">{tripForm.platform}</span>
          {meta.tags.map(tg => (
            <span key={tg} className={`text-[9px] font-bold uppercase tracking-[0.1em] px-2 py-0.5 rounded-full border ${getTagStyle(tg)}`}>{tg}</span>
          ))}
          {meta.note && <span className="text-[10px] text-neutral-500">{meta.note}</span>}
        </div>
        <div className="relative">
          <select value={tripForm.platform} onChange={e => setTripForm(s => ({ ...s, platform: e.target.value }))}
            className="w-full h-16 rounded-2xl bg-black border border-[#262626] px-4 pr-10 text-white text-[18px] font-bold appearance-none focus:outline-none focus:border-[#3a3a3a]">
            <option>EcoRide - 10% fee</option>
            <option>Uber</option>
            <option>Lyft</option>
            <option>Empower</option>
            <option>Gallant</option>
            <option>Aventus Ride</option>
            <option>Classic Ryde</option>
            <option>Aki Technology</option>
            <option>Street Hail</option>
            <option>Other</option>
          </select>
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 text-[14px]">▼</span>
        </div>
      </div>

      {/* Pickup */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full bg-[#052e16] border border-[#166534] text-[#4ade80] text-[11px] font-bold tracking-widest uppercase">PICKUP</span>
          <span className="text-[11px] text-[#6b7280]">Origin</span>
        </div>
        <div className="relative">
          <input value={tripForm.pickup}
            onChange={e => setTripForm(s => ({ ...s, pickup: e.target.value }))}
            placeholder={gps.lat ? `GPS: ${gps.lat.toFixed(4)},${gps.lng?.toFixed(4)}` : "Address or place"}
            className="w-full h-16 rounded-2xl bg-black border border-[#262626] pl-4 pr-[52px] text-white text-[14px] font-medium placeholder:text-[#6b7280] focus:outline-none focus:border-[#14532d]" />
          <button type="button" onClick={() => {
            if (gps.lat && gps.lng) {
              setTripForm(s => ({ ...s, pickup: `GPS ${gps.lat!.toFixed(4)},${gps.lng!.toFixed(4)}` }));
              showToast("Pickup set from GPS");
            } else { startGPS(); showToast("GPS searching… tap again when ready"); }
          }} className="absolute right-1.5 top-1.5 w-[42px] h-[52px] rounded-xl bg-[#052e16] border border-[#166534] flex items-center justify-center text-[16px] hover:bg-[#0a3a1f] transition-colors">
            📍
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
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full bg-[#0c1a33] border border-[#1e3a8a] text-[#60a5fa] text-[11px] font-bold tracking-widest uppercase">DROP OFF</span>
          <span className="text-[11px] text-[#6b7280]">Destination</span>
        </div>
        <div className="relative">
          <input value={tripForm.dropoff}
            onChange={e => setTripForm(s => ({ ...s, dropoff: e.target.value }))}
            placeholder="Address or place"
            className="w-full h-16 rounded-2xl bg-black border border-[#262626] pl-4 pr-[52px] text-white text-[14px] font-medium placeholder:text-[#6b7280] focus:outline-none focus:border-[#1e3a8a]" />
          <button type="button" onClick={() => {
            if (gps.lat && gps.lng) {
              setTripForm(s => ({ ...s, dropoff: `GPS ${gps.lat!.toFixed(4)},${gps.lng!.toFixed(4)}` }));
              showToast("Drop-off set from GPS");
            } else { startGPS(); showToast("GPS searching… tap again when ready"); }
          }} className="absolute right-1.5 top-1.5 w-[42px] h-[52px] rounded-xl bg-[#0c1a33] border border-[#1e3a8a] flex items-center justify-center text-[16px] hover:bg-[#132a5a] transition-colors">
            📍
          </button>
        </div>
      </div>

      {/* Quick location menus */}
      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={() => { if (!gps.lat) startGPS(); setShowPickupMenu(v => !v); setShowDropoffMenu(false); }}
          className="h-14 rounded-2xl bg-black border border-[#14532d] px-4 flex items-center gap-2 text-white text-[13px] font-bold text-left hover:bg-[#052e16]/30 transition-colors">
          <span className="text-[#22c55e] text-[16px]">📍</span>
          <span className="truncate">Quick Pickup…</span>
        </button>
        <button type="button" onClick={() => { if (!gps.lat) startGPS(); setShowDropoffMenu(v => !v); setShowPickupMenu(false); }}
          className="h-14 rounded-2xl bg-black border border-[#1e3a8a] px-4 flex items-center gap-2 text-white text-[13px] font-bold text-left hover:bg-[#0c1a33]/60 transition-colors">
          <span className="text-[#60a5fa] text-[16px]">📍</span>
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

      <div className="space-y-1.5">
        <label className="text-[11px] tracking-[0.08em] text-[#9ca3af] font-bold uppercase">NOTES</label>
        <textarea value={tripForm.notes} onChange={e => setTripForm(s => ({ ...s, notes: e.target.value }))}
          placeholder="Surge, traffic, late toll, invoice details…" rows={3}
          className="w-full rounded-2xl bg-black border border-[#262626] p-4 text-[13px] text-[#d1d5db] placeholder:text-[#6b7280] focus:outline-none focus:border-[#3a3a3a] resize-none leading-[1.5]" />
      </div>

      {/* Grand total preview */}
      <div className="rounded-2xl bg-black border border-[#262626] p-4 flex items-center justify-between">
        <span className="text-[11px] tracking-[0.08em] text-[#9ca3af] font-bold uppercase">GRAND TOTAL</span>
        <span className="font-mono-jet text-[26px] font-bold text-[#facc15] tracking-tight">${grandTotalLive.toFixed(2)}</span>
      </div>

      <button type="button" onClick={handleSave}
        className="w-full h-16 rounded-2xl bg-[#facc15] hover:bg-[#fde047] text-black font-bold text-[18px] tracking-[0.14em] uppercase transition-colors shadow-[0_0_20px_rgba(250,204,21,0.2)]">
        {editingId ? "UPDATE TRIP" : "+ SAVE TRIP"}
      </button>
      {editingId && (
        <button type="button" onClick={resetForm}
          className="w-full h-11 rounded-2xl border border-[#2a2a2a] bg-[#0a0a0a] text-[12px] font-semibold tracking-[0.08em] text-neutral-400 hover:text-white transition-colors">
          CANCEL EDIT
        </button>
      )}

      {/* Storage status */}
      <div className={`rounded-2xl border p-3.5 space-y-2 ${storageVerified ? "bg-[#052e16]/40 border-[#166534]/50" : "bg-[#1a0a0a] border-[#7f1d1d]/50"}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${storageVerified ? "bg-[#22c55e] animate-pulse" : "bg-red-500"}`} />
            <p className="text-[11px] tracking-[0.14em] font-bold text-white uppercase">Storage Status</p>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-widest ${storageVerified ? "bg-[#22c55e]/20 text-[#4ade80] border border-[#166534]" : "bg-red-900/30 text-red-400 border border-red-800"}`}>
            {storageVerified ? "✓ ACTIVE" : "✗ ERROR"}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[["Trips on Disk", trips.length], ["Size", `${(storageBytes / 1024).toFixed(2)} KB`], ["Last Save", lastSavedAt === "—" ? "—" : new Date(lastSavedAt).toLocaleTimeString()]].map(([label, val]) => (
            <div key={String(label)} className="bg-black/50 rounded-lg p-2 border border-[#222]">
              <p className="text-[8px] tracking-widest text-neutral-500 uppercase">{label}</p>
              <p className="font-mono-jet text-[12px] font-bold text-[#facc15] mt-0.5">{val}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={() => {
            try {
              const raw = localStorage.getItem("island-city-trips");
              if (raw) showToast(`✓ Verified: ${JSON.parse(raw).length} trips · ${(new Blob([raw]).size / 1024).toFixed(2)}KB`);
              else showToast("No data on disk yet");
            } catch { showToast("Error reading storage"); }
          }} className="flex-1 h-8 rounded-full bg-[#1e1e1e] border border-[#2a2a2a] text-[10px] font-bold tracking-widest text-neutral-300 hover:text-white">
            VERIFY DISK
          </button>
          <button onClick={() => {
            navigator.clipboard?.writeText(localStorage.getItem("island-city-trips") || "");
            showToast("JSON copied — backup ready");
          }} className="flex-1 h-8 rounded-full bg-[#0a0a0a] border border-[#222] text-[10px] font-bold tracking-widest text-neutral-500 hover:text-white">
            COPY BACKUP
          </button>
        </div>
      </div>

      <p className="font-mono-jet text-[10px] text-[#6b7280] text-center">
        GPS {gps.status} · E-ZPass 2026: $6.94 MTA · $3.18/$2.60 minor · $16.79 Port Authority peak
      </p>
    </div>
  );

  // ─── Register ─────────────────────────────────────────────────
  const RegisterContent = (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-[22px] font-bold text-white tracking-tight">Trip Register</h2>
        <span className="text-[14px] text-neutral-500 font-mono-jet">{todayTrips.length} today · {trips.length} total</span>
      </div>

      <div className={`rounded-2xl border p-3.5 flex items-center justify-between ${storageVerified ? "bg-[#052e16]/30 border-[#166534]/40" : "bg-[#1a0a0a] border-[#7f1d1d]/40"}`}>
        <div className="flex items-center gap-2.5">
          <span className={`w-2 h-2 rounded-full ${storageVerified ? "bg-[#22c55e] animate-pulse" : "bg-red-500"}`} />
          <div>
            <p className="text-[11px] font-bold tracking-[0.12em] text-white uppercase">Local Storage</p>
            <p className="font-mono-jet text-[10px] text-neutral-400">
              {trips.length} trips · {(storageBytes / 1024).toFixed(2)}KB · {lastSavedAt !== "—" ? new Date(lastSavedAt).toLocaleTimeString() : "—"}
            </p>
          </div>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${storageVerified ? "bg-[#22c55e]/20 text-[#4ade80] border border-[#166534]" : "bg-red-900/30 text-red-400"}`}>
          {storageVerified ? "✓ SAVED" : "✗ ERROR"}
        </span>
      </div>

      {trips.length === 0 ? (
        <div className="bg-[#141414] border border-[#222] rounded-2xl p-8 text-center">
          <p className="text-[14px] text-neutral-400">No trips logged yet</p>
          <button onClick={() => setActiveTab("ENTRY")}
            className="mt-4 h-10 px-5 rounded-full border border-[#d9b64f]/50 text-[#f6dd8c] text-[12px] font-semibold hover:bg-[#f6dd8c]/10 transition-colors">
            + Log a trip
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {trips.map(t => {
            const pm = getPlatformMeta(t.platform);
            return (
              <div key={t.id} className="bg-[#141414] border border-[#222] rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono-jet text-[12px] text-neutral-400">{t.time} · {t.date}</span>
                    <PlatformAvatar meta={pm} size="sm" />
                    <span className="px-3 py-1 rounded-full bg-[#1e1e1e] border border-[#333] text-[#e8c766] text-[10px] font-bold tracking-[0.12em]">{t.platform.toUpperCase()}</span>
                    {pm.tags.map(tg => (
                      <span key={tg} className={`text-[9px] font-bold uppercase tracking-[0.1em] px-2 py-0.5 rounded-full border ${getTagStyle(tg)}`}>{tg}</span>
                    ))}
                  </div>
                  <span className="font-mono-jet text-[18px] font-bold text-[#facc15]">${t.grandTotal.toFixed(2)}</span>
                </div>
                {t.reference && <p className="font-mono-jet text-[11px] text-neutral-500">REF: {t.reference}</p>}
                <p className="text-[14px] text-white font-medium">
                  {t.pickup || "—"} <span className="text-neutral-500 mx-2">→</span> {t.dropoff || "—"}
                </p>
                <div className="flex gap-3 font-mono-jet text-[10px] text-neutral-500 flex-wrap">
                  <span>Fare ${t.earnings.toFixed(2)}</span>
                  <span>Tips ${t.tips.toFixed(2)}</span>
                  {t.toll > 0 && <span>Toll ${t.toll.toFixed(2)}</span>}
                  {t.fee > 0 && <span>Fee −${t.fee.toFixed(2)}</span>}
                  {t.gps && <span>📍 {t.gps.lat.toFixed(3)},{t.gps.lng.toFixed(3)}</span>}
                </div>
                {t.notes && <p className="text-[12px] text-neutral-400 leading-[1.4]">{t.notes}</p>}

                {inlineEditId === t.id ? (
                  <div className="bg-[#0a0a0a] border border-[#222] rounded-xl p-3 space-y-2">
                    {[["Reference", "reference"], ["Pickup", "pickup"], ["Drop-off", "dropoff"]].map(([ph, key]) => (
                      <input key={key} value={inlineForm[key as keyof typeof inlineForm]}
                        onChange={e => setInlineForm(s => ({ ...s, [key]: e.target.value }))}
                        placeholder={ph}
                        className="w-full h-10 rounded-lg bg-black border border-[#262626] px-3 text-[13px] text-white placeholder:text-[#6b7280] focus:outline-none" />
                    ))}
                    <input value={inlineForm.earnings} inputMode="decimal"
                      onChange={e => setInlineForm(s => ({ ...s, earnings: e.target.value }))}
                      placeholder="Earnings"
                      className="w-full h-10 rounded-lg bg-black border border-[#262626] px-3 text-[13px] text-white font-mono-jet placeholder:text-[#6b7280] focus:outline-none" />
                    <div className="flex gap-2">
                      <button onClick={() => handleInlineSave(t.id)} className="flex-1 h-9 rounded-full bg-[#facc15] text-black text-[12px] font-bold">Save</button>
                      <button onClick={() => setInlineEditId(null)} className="flex-1 h-9 rounded-full bg-[#1e1e1e] border border-[#2a2a2a] text-neutral-400 text-[12px]">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <button onClick={() => handleInlineEditStart(t)}
                      className="h-10 rounded-full bg-[#1e1e1e] border border-[#2a2a2a] text-white text-[12px] font-semibold hover:bg-[#252525] transition-colors">
                      ✏️ Quick
                    </button>
                    <button onClick={() => handleEditToEntry(t)}
                      className="h-10 rounded-full bg-[#1e1e1e] border border-[#2a2a2a] text-[#f6dd8c] text-[12px] font-semibold hover:bg-[#252525] transition-colors">
                      Full Edit
                    </button>
                    <button onClick={() => handleDelete(t.id)}
                      className="h-10 rounded-full bg-[#1e1e1e] border border-[#2a2a2a] text-[#f87171] text-[12px] font-semibold hover:bg-[#2a1a1a] transition-colors">
                      Delete
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {trips.length > 0 && (
        <div className="bg-[#141414] border border-[#222] rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[13px] font-bold tracking-[0.12em] text-white uppercase">Day Summary</h3>
            <span className="font-mono-jet text-[12px] text-[#4ade80]">✓ Auto-saved</span>
          </div>
          <div className="grid grid-cols-3 gap-0 bg-black border border-[#1a1a1a] rounded-xl overflow-hidden">
            {[["Trips", trips.length], ["Today", `$${todayEarnings.toFixed(2)}`], ["Total", `$${trips.reduce((a, b) => a + b.grandTotal, 0).toFixed(2)}`]].map(([label, val]) => (
              <div key={String(label)} className="p-3 border-r border-[#1a1a1a] last:border-0 text-center">
                <p className="text-[9px] text-neutral-500 tracking-widest">{label}</p>
                <p className="font-mono-jet text-[13px] font-semibold mt-1 text-[#f5c518]">{val}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // ─── Expenses ─────────────────────────────────────────────────
  const totalExpenses = expenses.reduce((a, e) => a + e.amount, 0);
  const todayExpenses = expenses.filter(e => e.date === toYYYYMMDD(currentTime));
  const todayExpenseTotal = todayExpenses.reduce((a, e) => a + e.amount, 0);

  const ExpensesContent = (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[22px] font-bold text-white">Expenses</h2>
        <button onClick={() => { setShowExpenseForm(v => !v); setEditingExpenseId(null); setExpenseForm({ category: "Fuel", vendor: "", amount: "", note: "" }); }}
          className="h-10 px-4 rounded-full bg-[#facc15] text-black text-[12px] font-bold tracking-wide hover:bg-[#fde047] transition-colors">
          + Add Expense
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[["All Time", `$${totalExpenses.toFixed(2)}`], ["Today", `$${todayExpenseTotal.toFixed(2)}`], ["Entries", expenses.length]].map(([label, val]) => (
          <div key={String(label)} className="bg-[#141414] border border-[#222] rounded-xl p-3 text-center">
            <p className="text-[9px] tracking-widest text-neutral-500">{label}</p>
            <p className="font-mono-jet text-[14px] font-bold text-white mt-1">{val}</p>
          </div>
        ))}
      </div>

      {showExpenseForm && (
        <div className="bg-[#101010] border border-[#222] rounded-2xl p-4 space-y-3">
          <h3 className="text-[13px] font-bold tracking-[0.12em] text-white uppercase">{editingExpenseId ? "Edit Expense" : "New Expense"}</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">Category</label>
              <div className="relative">
                <select value={expenseForm.category} onChange={e => setExpenseForm(s => ({ ...s, category: e.target.value }))}
                  className="w-full h-12 rounded-xl bg-black border border-[#262626] px-3 pr-8 text-white text-[14px] appearance-none focus:outline-none">
                  {EXPENSE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500">▼</span>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">Amount ($)</label>
              <input inputMode="decimal" value={expenseForm.amount} onChange={e => { if (numericFilter(e.target.value)) setExpenseForm(s => ({ ...s, amount: e.target.value })); }}
                placeholder="0.00" className="w-full h-12 rounded-xl bg-black border border-[#262626] px-3 text-white text-[16px] font-bold font-mono-jet placeholder:text-[#6b7280] focus:outline-none" />
            </div>
          </div>
          <input value={expenseForm.vendor} onChange={e => setExpenseForm(s => ({ ...s, vendor: e.target.value }))}
            placeholder="Vendor / Description" required
            className="w-full h-12 rounded-xl bg-black border border-[#262626] px-3 text-white text-[14px] placeholder:text-[#6b7280] focus:outline-none" />
          <input value={expenseForm.note} onChange={e => setExpenseForm(s => ({ ...s, note: e.target.value }))}
            placeholder="Note (optional)"
            className="w-full h-12 rounded-xl bg-black border border-[#262626] px-3 text-white text-[14px] placeholder:text-[#6b7280] focus:outline-none" />
          <div className="flex gap-2">
            <button onClick={handleSaveExpense} className="flex-1 h-12 rounded-full bg-[#facc15] text-black text-[13px] font-bold tracking-wide hover:bg-[#fde047]">{editingExpenseId ? "Update" : "Save Expense"}</button>
            <button onClick={() => { setShowExpenseForm(false); setEditingExpenseId(null); }} className="flex-1 h-12 rounded-full bg-[#1e1e1e] border border-[#2a2a2a] text-neutral-400 text-[13px] hover:text-white">Cancel</button>
          </div>
        </div>
      )}

      {expenses.length === 0 ? (
        <div className="bg-[#141414] border border-[#222] rounded-2xl p-8 text-center">
          <p className="text-[14px] text-neutral-400">No expenses recorded</p>
        </div>
      ) : (
        <div className="space-y-2">
          {expenses.map(ex => (
            <div key={ex.id} className="bg-[#141414] border border-[#222] rounded-xl p-3.5 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-bold text-white">{ex.category}</span>
                  <span className="text-[10px] text-neutral-500 font-mono-jet">{ex.date}</span>
                </div>
                <p className="text-[12px] text-neutral-400 mt-0.5">{ex.vendor}</p>
                {ex.note && <p className="text-[11px] text-neutral-600 mt-0.5">{ex.note}</p>}
              </div>
              <div className="flex items-center gap-2">
                <p className="font-mono-jet text-[15px] font-semibold text-[#ff6b6b]">−${ex.amount.toFixed(2)}</p>
                <div className="flex gap-1">
                  <button onClick={() => { setEditingExpenseId(ex.id); setExpenseForm({ category: ex.category, vendor: ex.vendor, amount: String(ex.amount), note: ex.note }); setShowExpenseForm(true); }}
                    className="w-8 h-8 rounded-full bg-[#1e1e1e] border border-[#2a2a2a] text-neutral-400 text-[11px] hover:text-white flex items-center justify-center">✏️</button>
                  <button onClick={() => handleDeleteExpense(ex.id)}
                    className="w-8 h-8 rounded-full bg-[#1e1e1e] border border-[#2a2a2a] text-[#f87171] text-[11px] hover:bg-[#2a1a1a] flex items-center justify-center">✕</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ─── Reports ──────────────────────────────────────────────────
  const grossAll = trips.reduce((a, b) => a + b.grandTotal, 0);
  const expensesAll = expenses.reduce((a, b) => a + b.amount, 0);
  const netAll = grossAll - expensesAll;

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
        <div className="space-y-3">
          {[["Gross Earnings", `$${grossAll.toFixed(2)}`, "text-white"], ["Operating Expenses", `−$${expensesAll.toFixed(2)}`, "text-[#ff6b6b]"], ["Hours Today / Week", `${cumulative.hoy.toFixed(1)}h / ${cumulative.semana.toFixed(1)}h`, "text-white"]].map(([label, val, cls]) => (
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

        {/* E-ZPass advisory */}
        <div className="rounded-xl bg-[#1a1625] border-l-[3px] border-l-[#8b5cf6] border border-[#2a2340] p-3.5">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6]" />
            <p className="text-[10px] tracking-[0.18em] font-bold text-[#a78bfa]">AI INSIGHT · E-ZPASS 2026 · {TOLL_PLAZAS.length} PLAZAS</p>
          </div>
          <p className="text-[12px] text-[#c4b5fd]/90 mt-1.5 leading-[1.5]">
            MTA $6.94 · Minor $3.18/$2.60 · Port Authority $16.79 peak.
            Today {todayTrips.length} trips · {cumulative.hoy.toFixed(1)}h active.
            Avg per trip: ${todayTrips.length ? (todayEarnings / todayTrips.length).toFixed(2) : "0.00"}.
          </p>
        </div>
      </div>
    </div>
  );

  // ─── Render ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-black text-white selection:bg-[#d9b64f]/30">
      <div className="w-full max-w-[480px] mx-auto min-h-screen bg-black border-x border-[#121212] relative">

        {/* Header */}
        <div className="sticky top-0 z-40 bg-black/95 backdrop-blur-xl border-b border-[#1a1a1a] px-5 h-[68px] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#111] border border-[#222] flex items-center justify-center text-[#f6dd8c]">
              <LogoIcon className="w-5 h-5" />
            </div>
            <h1 className="font-cinzel text-[18px] tracking-[0.18em] font-bold" style={goldGradientStyle}>
              ISLAND CITY
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono-jet text-[10px] text-neutral-500 hidden sm:block">{currentTime.toLocaleTimeString()}</span>
            <div className="w-8 h-8 rounded-full bg-[#141414] border border-[#222] flex items-center justify-center text-[12px] font-semibold text-[#f6dd8c]">M</div>
          </div>
        </div>

        {/* Tab bar */}
        <div className="sticky top-[68px] z-30 bg-black border-b border-[#1a1a1a]">
          <div className="flex overflow-x-auto gold-scroll px-2 gap-1">
            {(["DASHBOARD", "ENTRY", "REGISTER", "EXPENSES", "REPORTS"] as Tab[]).map(tab => {
              const active = activeTab === tab;
              return (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`whitespace-nowrap px-4 py-3.5 text-[11px] tracking-[0.14em] font-semibold transition-colors relative ${active ? "text-[#f6dd8c]" : "text-neutral-500 hover:text-neutral-300"}`}>
                  {tab}
                  {active && <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-gradient-to-r from-[#f6dd8c] to-[#d9b64f] rounded-full" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="px-4 pb-28 pt-5">
          {activeTab === "DASHBOARD" && DashboardContent}
          {activeTab === "ENTRY" && EntryFormContent}
          {activeTab === "REGISTER" && RegisterContent}
          {activeTab === "EXPENSES" && ExpensesContent}
          {activeTab === "REPORTS" && ReportsContent}
        </div>

        {/* Toast */}
        {toast && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full bg-[#facc15] text-black text-[12px] font-bold tracking-wide shadow-xl border border-black/10 max-w-[90%] text-center">
            {toast}
          </div>
        )}

        {/* Gold bottom line */}
        <div className="pointer-events-none fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] h-[1px] bg-gradient-to-r from-transparent via-[#d9b64f]/40 to-transparent" />
      </div>
    </div>
  );
}
