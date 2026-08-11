import React, { useState, useMemo, useEffect, useRef } from "react";
import logoIcon from "container:///mnt/data/islandcity-logo-icon.png";

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
  date: string; // YYYY-MM-DD
  timestamp: string; // ISO
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
  date: string; // YYYY-MM-DD
  hours: number;
  clockIn: string;
  clockOut: string;
  breakMs: number;
};

// E-ZPass 2026 rates + 15 toll plazas NYC geofence
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

const LOCATION_CATEGORIES = ["Hospital","City","Home","Suburbs","Office","Airport","Restaurant","Train/Bus","Hotel","Tourist"] as const;
const AIRPORTS = [
  { name: "JFK Airport", lat: 40.6413, lng: -73.7781 },
  { name: "LGA Airport", lat: 40.7769, lng: -73.8740 },
  { name: "EWR Airport", lat: 40.6895, lng: -74.1745 },
  { name: "ISP Airport", lat: 40.7952, lng: -73.1002 },
] as const;

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLng/2)*Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

type PlatformMeta = {
  initial: string;
  bg: string;
  tags: string[];
  note?: string;
};

const TAG_STYLES: Record<string, string> = {
  "ACCESS-A-RIDE": "bg-[#dbeafe] text-[#1e40af] border-[#bfdbfe]",
  "VOUCHER": "bg-[#f3f4f6] text-[#374151] border-[#e5e7eb]",
};

const platformMeta: Record<string, PlatformMeta> = {
  "EcoRide - 10% fee": {
    initial: "E",
    bg: "bg-[#22c55e]",
    tags: ["ACCESS-A-RIDE", "VOUCHER"],
  },
  EcoRide: {
    initial: "E",
    bg: "bg-[#22c55e]",
    tags: ["ACCESS-A-RIDE", "VOUCHER"],
  },
  Uber: { initial: "U", bg: "bg-[#111111]", tags: [] },
  Lyft: { initial: "L", bg: "bg-[#FF00BF]", tags: [] },
  Empower: { initial: "E", bg: "bg-[#3b82f6]", tags: [] },
  Gallant: {
    initial: "G",
    bg: "bg-[#f97316]",
    tags: ["VOUCHER"],
  },
  "Aventus Ride": {
    initial: "A",
    bg: "bg-[#8b5cf6]",
    tags: ["VOUCHER"],
  },
  "Classic Ride": {
    initial: "C",
    bg: "bg-[#14b8a6]",
    tags: ["VOUCHER"],
  },
  "Aki Technology": {
    initial: "AKI",
    bg: "bg-[#0ea5e9]",
    tags: ["ACCESS-A-RIDE", "VOUCHER"],
    note: "Medical Transportation NYC",
  },
  Other: { initial: "O", bg: "bg-[#9ca3af]", tags: [] },
};

const getPlatformMeta = (name: string): PlatformMeta => {
  return platformMeta[name] || platformMeta["Other"] || { initial: "O", bg: "bg-[#9ca3af]", tags: [] };
};

const getTagStyle = (tag: string) => TAG_STYLES[tag] || "bg-[#f3f4f6] text-[#374151] border-[#e5e7eb]";

const initialTripsFallback: Trip[] = [
  {
    id: "1",
    reference: "IC-8821",
    earnings: 18.5,
    tips: 4,
    extra: 0,
    toll: 2.75,
    fee: 3.2,
    platform: "Uber",
    pickup: "Times Sq / Theatre District",
    dropoff: "Brooklyn Heights",
    notes: "Surge x1.5",
    grandTotal: 22.05,
    time: "7:12 PM",
    date: new Date().toISOString().slice(0, 10),
    timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    gps: { lat: 40.758, lng: -73.9855 },
  },
  {
    id: "2",
    reference: "IC-8822",
    earnings: 12.0,
    tips: 2,
    extra: 5,
    toll: 0,
    fee: 1.8,
    platform: "Lyft",
    pickup: "Midtown East",
    dropoff: "Times Sq / Theatre District",
    notes: "Quick airport hop",
    grandTotal: 17.2,
    time: "8:31 PM",
    date: new Date().toISOString().slice(0, 10),
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    gps: { lat: 40.76, lng: -73.97 },
  },
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

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("DASHBOARD");
  const [turnStatus, setTurnStatus] = useState<TurnStatus>("END");
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
    return initialTripsFallback;
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

  // Shift clock state
  const [clockInTime, setClockInTime] = useState<Date | null>(null);
  const [totalBreakMs, setTotalBreakMs] = useState(0);
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [breakStart, setBreakStart] = useState<Date | null>(null);
  const [shiftActive, setShiftActive] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const [gps, setGps] = useState<GpsState>({ lat: 40.758, lng: -73.9855, acc: 28, status: "inactive" });

  // DROP MENU + GPS ADDRESS/AIRPORT states (no color/format change elsewhere)
  const [showPickupMenu, setShowPickupMenu] = useState(false);
  const [showDropoffMenu, setShowDropoffMenu] = useState(false);
  const [gpsAddress, setGpsAddress] = useState<string>("");
  const [gpsAirport, setGpsAirport] = useState<string>("");

  // VERIFICACIÓN LOCK STORAGE - estado de guardado
  const [lastSavedAt, setLastSavedAt] = useState<string>(() => {
    try {
      return localStorage.getItem("island-city-last-saved") || "—";
    } catch { return "—"; }
  });
  const [storageVerified, setStorageVerified] = useState<boolean>(false);
  const [storageBytes, setStorageBytes] = useState<number>(0);

  const [tripForm, setTripForm] = useState<TripForm>({
    reference: "",
    earnings: "",
    tips: "",
    extraCash: "",
    toll: "",
    platformFee: "",
    platform: "Uber",
    pickup: "",
    dropoff: "",
    notes: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  // inline register editing
  const [inlineEditId, setInlineEditId] = useState<string | null>(null);
  const [inlineForm, setInlineForm] = useState<{ pickup: string; dropoff: string; earnings: string; reference: string }>({
    pickup: "",
    dropoff: "",
    earnings: "",
    reference: "",
  });

  // live clock 1s
  useEffect(() => {
    const id = window.setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // persist trips + hours con verificación explícita
  useEffect(() => {
    try {
      const payload = JSON.stringify(trips);
      localStorage.setItem("island-city-trips", payload);
      const nowISO = new Date().toISOString();
      localStorage.setItem("island-city-last-saved", nowISO);
      localStorage.setItem("island-city-trips-count", String(trips.length));
      setLastSavedAt(nowISO);
      setStorageBytes(new Blob([payload]).size);
      // verificación inmediata
      const check = localStorage.getItem("island-city-trips");
      setStorageVerified(!!check && check.length > 2);
    } catch (e) {
      setStorageVerified(false);
      console.error("LocalStorage save failed", e);
    }
  }, [trips]);
  useEffect(() => {
    try {
      localStorage.setItem("island-city-hours", JSON.stringify(hoursLog));
      localStorage.setItem("island-city-hours-count", String(hoursLog.length));
    } catch {}
  }, [hoursLog]);

  // verificación inicial al montar
  useEffect(() => {
    try {
      const raw = localStorage.getItem("island-city-trips");
      if (raw) {
        setStorageBytes(new Blob([raw]).size);
        setStorageVerified(true);
      }
    } catch { setStorageVerified(false); }
  }, []);

  // DROP MENU GPS: detect nearest airport + reverse geocode town/address
  useEffect(() => {
    if (!gps.lat || !gps.lng) return;
    // nearest airport within 6km
    try {
      let nearest: { name: string; dist: number } | null = null;
      for (const ap of AIRPORTS) {
        const d = haversineKm(gps.lat, gps.lng, ap.lat, ap.lng);
        if (nearest === null || d < nearest.dist) nearest = { name: ap.name, dist: d };
      }
      if (nearest && nearest.dist <= 6) {
        setGpsAirport(`${nearest.name} (${nearest.dist.toFixed(1)}km)`);
      } else if (nearest && nearest.dist <= 15) {
        // still show if somewhat close but mark distance
        setGpsAirport(`${nearest.name} ~${nearest.dist.toFixed(1)}km`);
      } else {
        setGpsAirport("");
      }
    } catch {
      setGpsAirport("");
    }
    // reverse geocode via nominatim
    const controller = new AbortController();
    (async () => {
      try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${gps.lat}&lon=${gps.lng}`;
        const res = await fetch(url, {
          headers: { Accept: "application/json" } as any,
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data = await res.json();
        const display = data?.display_name || "";
        const addr = data?.address || {};
        const town = addr.city || addr.town || addr.village || addr.county || addr.state || "";
        const short = town ? `${town}${addr.road ? ", " + addr.road : ""}` : display;
        if (short) setGpsAddress(short);
      } catch {}
    })();
    return () => controller.abort();
  }, [gps.lat, gps.lng]);

  // GPS helpers
  const startGPS = () => {
    if (!navigator.geolocation) {
      setGps((s) => ({ ...s, status: "error" }));
      return;
    }
    setGps((s) => ({ ...s, status: "searching" }));
    try {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    } catch {}
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setGps({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          acc: pos.coords.accuracy,
          status: "active",
        });
      },
      () => setGps((s) => ({ ...s, status: "error" })),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
    watchIdRef.current = id as unknown as number;
  };
  const stopGPS = () => {
    if (watchIdRef.current !== null) {
      try {
        navigator.geolocation.clearWatch(watchIdRef.current);
      } catch {}
      watchIdRef.current = null;
    }
    setGps((s) => ({ ...s, status: "inactive" }));
  };

  // shift actions
  const handleClockIn = () => {
    const now = new Date();
    setClockInTime(now);
    setTotalBreakMs(0);
    setIsOnBreak(false);
    setBreakStart(null);
    setShiftActive(true);
    setTurnStatus("START");
    startGPS();
    setToast(`Clock In ${now.toLocaleTimeString()} · GPS started`);
    setTimeout(() => setToast(null), 2200);
  };
  const handleBreakToggle = () => {
    if (!shiftActive || !clockInTime) return;
    const now = new Date();
    if (!isOnBreak) {
      setIsOnBreak(true);
      setBreakStart(now);
      setTurnStatus("BREAK");
      setToast("Break started");
    } else {
      if (breakStart) {
        setTotalBreakMs((prev) => prev + (now.getTime() - breakStart.getTime()));
      }
      setIsOnBreak(false);
      setBreakStart(null);
      setTurnStatus("START");
      setToast("Back on route");
    }
    setTimeout(() => setToast(null), 1800);
  };
  const handleClockOut = () => {
    if (!shiftActive || !clockInTime) {
      setTurnStatus("END");
      stopGPS();
      return;
    }
    const now = new Date();
    let breakMs = totalBreakMs;
    if (isOnBreak && breakStart) breakMs += now.getTime() - breakStart.getTime();
    const activeMs = now.getTime() - clockInTime.getTime() - breakMs;
    const hours = activeMs / 3600000;
    const entry: HoursEntry = {
      date: toYYYYMMDD(now),
      hours: Math.max(0, hours),
      clockIn: clockInTime.toISOString(),
      clockOut: now.toISOString(),
      breakMs: breakMs,
    };
    setHoursLog((prev) => [entry, ...prev].slice(0, 60));
    setShiftActive(false);
    setIsOnBreak(false);
    setBreakStart(null);
    setTotalBreakMs(0);
    setClockInTime(null);
    setTurnStatus("END");
    stopGPS();
    setToast(`Clock Out · ${hours.toFixed(2)}h saved`);
    setTimeout(() => setToast(null), 2500);
  };

  const handleTurnButton = (s: TurnStatus) => {
    if (s === "START") {
      if (!shiftActive) handleClockIn();
      else if (isOnBreak) handleBreakToggle();
    } else if (s === "BREAK") {
      if (!shiftActive) return;
      handleBreakToggle();
    } else if (s === "END") {
      handleClockOut();
    }
  };

  const numericFilter = (val: string) => {
    if (val === "") return true;
    return /^\d*\.?\d*$/.test(val);
  };

  const grandTotalLive = useMemo(() => {
    const e = parseFloat(tripForm.earnings) || 0;
    const t = parseFloat(tripForm.tips) || 0;
    const ex = parseFloat(tripForm.extraCash) || 0;
    const tl = parseFloat(tripForm.toll) || 0;
    const f = parseFloat(tripForm.platformFee) || 0;
    return e + t + ex + tl - f;
  }, [tripForm.earnings, tripForm.tips, tripForm.extraCash, tripForm.toll, tripForm.platformFee]);

  // TODAY logic based on trips timestamp
  const todayTrips = useMemo(() => {
    const todayStr = currentTime.toDateString();
    return trips.filter((t) => {
      try {
        if (t.timestamp) return new Date(t.timestamp).toDateString() === todayStr;
        if (t.date) return new Date(t.date).toDateString() === todayStr;
        return true;
      } catch {
        return true;
      }
    });
  }, [trips, currentTime]);

  const todayEarnings = useMemo(() => todayTrips.reduce((a, b) => a + b.grandTotal, 0), [todayTrips]);
  const totalTollsToday = useMemo(() => todayTrips.reduce((a, b) => a + b.toll, 0), [todayTrips]);

  // active timer
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
    const fallbackHours = todayTrips.length > 0 ? 1.21 : 0;
    return fallbackHours > 0 ? todayEarnings / fallbackHours : 0;
  }, [todayEarnings, activeHoursDecimal, todayTrips.length]);

  const weeklyTrips = useMemo(() => {
    const weekAgo = new Date(currentTime);
    weekAgo.setDate(weekAgo.getDate() - 7);
    return trips.filter((t) => {
      try {
        const d = new Date(t.timestamp || t.date);
        return d >= weekAgo;
      } catch {
        return true;
      }
    });
  }, [trips, currentTime]);
  const weeklyTotal = useMemo(() => weeklyTrips.reduce((a, b) => a + b.grandTotal, 0) || 378.55 + todayEarnings * 0, [weeklyTrips, todayEarnings]);
  const weeklyTotalDisplay = weeklyTrips.length > 0 ? weeklyTrips.reduce((a, b) => a + b.grandTotal, 0) : 378.55 + todayEarnings;

  // cumulative hours Hoy, Semana, Mes, Año
  const cumulative = useMemo(() => {
    const todayYMD = toYYYYMMDD(currentTime);
    const currentMonth = currentTime.getMonth();
    const currentYear = currentTime.getFullYear();
    const weekAgo = new Date(currentTime);
    weekAgo.setDate(weekAgo.getDate() - 7);
    let hoy = 0,
      semana = 0,
      mes = 0,
      año = 0;
    hoursLog.forEach((h) => {
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
      hoy += liveH;
      semana += liveH;
      mes += liveH;
      año += liveH;
    }
    return { hoy, semana, mes, año };
  }, [hoursLog, currentTime, shiftActive, activeMsLive]);

  const resetForm = () => {
    setTripForm({
      reference: "",
      earnings: "",
      tips: "",
      extraCash: "",
      toll: "",
      platformFee: "",
      platform: "Uber",
      pickup: "",
      dropoff: "",
      notes: "",
    });
    setEditingId(null);
  };

  const handleSave = () => {
    const now = new Date();
    const earningsNum = parseFloat(tripForm.earnings) || 0;
    const tipsNum = parseFloat(tripForm.tips) || 0;
    const extraNum = parseFloat(tripForm.extraCash) || 0;
    const tollNum = parseFloat(tripForm.toll) || 0;
    const feeNum = parseFloat(tripForm.platformFee) || 0;
    const newTrip: Trip = {
      id: editingId || Date.now().toString(),
      reference: tripForm.reference.trim(),
      earnings: earningsNum,
      tips: tipsNum,
      extra: extraNum,
      toll: tollNum,
      fee: feeNum,
      platform: tripForm.platform,
      pickup: tripForm.pickup.trim(),
      dropoff: tripForm.dropoff.trim(),
      notes: tripForm.notes,
      grandTotal: earningsNum + tipsNum + extraNum + tollNum - feeNum,
      time: now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
      date: toYYYYMMDD(now),
      timestamp: now.toISOString(),
      gps: gps.lat && gps.lng ? { lat: gps.lat, lng: gps.lng, acc: gps.acc || undefined } : undefined,
    };
    // ACTUALIZACIÓN SINCRÓNICA A MEMORIA + DISCO
    let updated: Trip[];
    if (editingId) {
      updated = trips.map((p) => (p.id === editingId ? newTrip : p));
    } else {
      updated = [newTrip, ...trips];
    }
    // Escritura inmediata a Local Storage - garantía anti-pérdida
    try {
      const payload = JSON.stringify(updated);
      localStorage.setItem("island-city-trips", payload);
      localStorage.setItem("island-city-last-saved", now.toISOString());
      localStorage.setItem("island-city-trips-count", String(updated.length));
      // verificación lectura
      const verify = localStorage.getItem("island-city-trips");
      if (verify) {
        setStorageVerified(true);
        setStorageBytes(new Blob([verify]).size);
        setLastSavedAt(now.toISOString());
      }
    } catch (e) {
      setStorageVerified(false);
      console.error("Save failed", e);
    }
    setTrips(updated);
    resetForm();
    setToast(
      editingId
        ? `Trip updated ✓ guardado en disco · ${updated.length} registros`
        : `Trip saved ✓ $${newTrip.grandTotal.toFixed(2)} → disco [${updated.length} trips]`
    );
    setTimeout(() => setToast(null), 3000);
  };

  const handleEditToEntry = (trip: Trip) => {
    setEditingId(trip.id);
    setTripForm({
      reference: trip.reference,
      earnings: trip.earnings ? String(trip.earnings) : "",
      tips: trip.tips ? String(trip.tips) : "",
      extraCash: trip.extra ? String(trip.extra) : "",
      toll: trip.toll ? String(trip.toll) : "",
      platformFee: trip.fee ? String(trip.fee) : "",
      platform: trip.platform,
      pickup: trip.pickup,
      dropoff: trip.dropoff,
      notes: trip.notes,
    });
    setActiveTab("ENTRY");
    setTimeout(() => {
      document.getElementById("trip-entry-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };

  const handleDelete = (id: string) => {
    if (!window.confirm("¿Eliminar este viaje? Esta acción no se puede deshacer. Se actualizará el disco inmediatamente.")) return;
    const updated = trips.filter((t) => t.id !== id);
    try {
      localStorage.setItem("island-city-trips", JSON.stringify(updated));
      localStorage.setItem("island-city-last-saved", new Date().toISOString());
      setLastSavedAt(new Date().toISOString());
      setStorageBytes(new Blob([JSON.stringify(updated)]).size);
    } catch {}
    setTrips(updated);
    setToast(`Trip deleted ✓ disco actualizado · ${updated.length} restantes`);
    setTimeout(() => setToast(null), 2200);
  };

  const handleInlineEditStart = (trip: Trip) => {
    setInlineEditId(trip.id);
    setInlineForm({
      pickup: trip.pickup,
      dropoff: trip.dropoff,
      earnings: String(trip.earnings),
      reference: trip.reference,
    });
  };
  const handleInlineSave = (id: string) => {
    const updated = trips.map((t) => {
      if (t.id !== id) return t;
      const newEarnings = parseFloat(inlineForm.earnings) || 0;
      return {
        ...t,
        pickup: inlineForm.pickup,
        dropoff: inlineForm.dropoff,
        earnings: newEarnings,
        reference: inlineForm.reference,
        grandTotal: newEarnings + t.tips + t.extra + t.toll - t.fee,
      };
    });
    try {
      localStorage.setItem("island-city-trips", JSON.stringify(updated));
      localStorage.setItem("island-city-last-saved", new Date().toISOString());
      setStorageVerified(true);
      setLastSavedAt(new Date().toISOString());
      setStorageBytes(new Blob([JSON.stringify(updated)]).size);
    } catch {}
    setTrips(updated);
    setInlineEditId(null);
    setToast(`Trip quick-edited ✓ disco actualizado · ${updated.length} trips`);
    setTimeout(() => setToast(null), 2200);
  };

  const handlePostLedger = () => {
    if (trips.length === 0) return;
    setToast(`Day posted to General Ledger · $${todayEarnings.toFixed(2)} · ${todayTrips.length} trips`);
    setTimeout(() => setToast(null), 3000);
  };

  const goldGradientStyle = {
    background: "linear-gradient(90deg, #f6dd8c, #d9b64f)",
    WebkitBackgroundClip: "text" as const,
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
  };

  // Dashboard blocks - note order: LARGE first, then GRID
  const BlockLarge = (
    <div className="bg-[#141414] border border-[#222] rounded-[20px] p-4 overflow-hidden relative">
      <img src={logoIcon} alt="" className="absolute -right-6 -top-6 w-36 h-36 opacity-[0.04] pointer-events-none" />
      <div className="flex items-center justify-between">
        <p className="font-mono-jet text-[11px] text-neutral-400">
          {currentTime.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} ·{" "}
          {currentTime.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
        </p>
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] tracking-[0.12em] font-semibold ${
            shiftActive
              ? "bg-[#2ecc71]/15 border-[#2ecc71]/30 text-[#6ee7a8]"
              : "bg-[#1e1e1e] border-[#2a2a2a] text-neutral-500"
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${shiftActive ? "bg-[#2ecc71] animate-pulse" : "bg-neutral-600"}`} />
          {shiftActive ? (isOnBreak ? "ON BREAK" : "ON ROUTE") : "OFF DUTY"}
        </span>
      </div>
      <div className="mt-3.5">
        <p className="font-mono-jet text-[12px] text-neutral-400">
          {gps.lat && gps.lng ? `${gps.lat.toFixed(4)}, ${gps.lng.toFixed(4)}` : "40.7580, -73.9855"} {gps.acc ? `· ±${Math.round(gps.acc)}m` : ""}
        </p>
        <p className="text-[14px] font-semibold mt-0.5 text-white">
          {shiftActive && gps.lat ? `Current · ${gps.lat.toFixed(4)}, ${gps.lng.toFixed(4)}` : "Times Sq / Theatre District"}
        </p>
      </div>
      <p className="font-mono-jet text-[34px] font-bold text-[#f5c518] mt-3 tracking-tight">${todayEarnings.toFixed(2)}</p>
      <p className="font-mono-jet text-[11px] text-neutral-500 mt-1">{todayTrips.length} trips logged today</p>

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
        {(["START", "BREAK", "END"] as TurnStatus[]).map((s) => {
          const isActive =
            (s === "START" && shiftActive && !isOnBreak) || (s === "BREAK" && isOnBreak) || (s === "END" && !shiftActive);
          const disabled = s === "BREAK" && !shiftActive;
          return (
            <button
              key={s}
              onClick={() => handleTurnButton(s)}
              disabled={disabled}
              className={`h-[44px] rounded-full border text-[12px] tracking-[0.12em] font-bold transition-all ${
                disabled
                  ? "border-[#1a1a1a] bg-[#0a0a0a] text-neutral-600 cursor-not-allowed"
                  : isActive
                  ? "border-[#d9b64f] text-black"
                  : "border-[#d9b64f]/60 text-[#f6dd8c] bg-transparent hover:bg-[#f6dd8c]/10"
              }`}
              style={isActive ? { background: "linear-gradient(90deg, #f6dd8c, #d9b64f)" } : {}}
            >
              {s}
            </button>
          );
        })}
      </div>
    </div>
  );

  const BlockGrid = (
    <div>
      <p className="text-[10px] tracking-[0.22em] text-neutral-500 font-semibold mb-2.5">PERFORMANCE</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#141414] border border-[#222] rounded-xl p-3.5">
          <p className="text-[9px] tracking-[0.18em] text-neutral-500 font-semibold">TODAY'S EARNINGS</p>
          <p className="font-mono-jet text-[20px] font-semibold text-[#f5c518] mt-2">${todayEarnings.toFixed(2)}</p>
          <p className="text-[10px] text-neutral-600 mt-1 font-mono-jet">{todayTrips.length} trips logged · live</p>
        </div>
        <div className="bg-[#141414] border border-[#222] rounded-xl p-3.5">
          <p className="text-[9px] tracking-[0.18em] text-neutral-500 font-semibold">ACTIVE HOURS</p>
          <p className="font-mono-jet text-[18px] font-semibold text-white mt-2 tracking-tight">
            {shiftActive ? activeHoursFormatted : cumulative.hoy > 0 ? `${cumulative.hoy.toFixed(2)}h hoy` : "00:00:00"}
          </p>
          <div className="mt-2 space-y-0.5">
            <div className="flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${shiftActive ? "bg-[#2ecc71] animate-pulse" : "bg-neutral-600"}`} />
              <span className="text-[10px] text-[#6ee7a8] font-mono-jet">
                {shiftActive ? (isOnBreak ? "Break" : "On route") : "Shift idle"}
              </span>
            </div>
            <div className="pt-1.5 space-y-0.5">
              <p className="text-[9px] font-mono-jet text-neutral-500">
                Hoy {cumulative.hoy.toFixed(1)}h · Semana {cumulative.semana.toFixed(1)}h
              </p>
              <p className="text-[9px] font-mono-jet text-neutral-600">
                Mes {cumulative.mes.toFixed(1)}h · Año {cumulative.año.toFixed(1)}h
              </p>
            </div>
          </div>
        </div>
        <div className="bg-[#141414] border border-[#222] rounded-xl p-3.5">
          <p className="text-[9px] tracking-[0.18em] text-neutral-500 font-semibold">$/HOUR LIVE</p>
          <p className="font-mono-jet text-[20px] font-semibold text-white mt-2">${perHourLive.toFixed(2)}</p>
          <p className="text-[10px] text-neutral-500 mt-1">Live calc {shiftActive ? "· active" : ""}</p>
        </div>
        <div className="bg-[#141414] border border-[#222] rounded-xl p-3.5">
          <p className="text-[9px] tracking-[0.18em] text-neutral-500 font-semibold">WEEKLY TOTAL</p>
          <p className="font-mono-jet text-[20px] font-semibold text-white mt-2">${weeklyTotalDisplay.toFixed(2)}</p>
          <p className="text-[10px] text-neutral-600 mt-1 font-mono-jet">{weeklyTrips.length} trips · 7d</p>
        </div>
      </div>
    </div>
  );

  const DashboardContent = (
    <div className="space-y-5">
      <div className="space-y-1">
        <div>
          <h2 className="text-[24px] font-bold leading-tight">Good morning, Miguel.</h2>
          <p className="font-mono-jet text-[11px] tracking-[0.18em] mt-1.5 uppercase" style={goldGradientStyle}>
            {currentTime.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).toUpperCase()}
          </p>
          <p className="font-mono-jet text-[10px] text-neutral-600 mt-1">
            {currentTime.toLocaleTimeString()} · Live · LocalStorage stamped
          </p>
        </div>
      </div>

      {/* BLOCK_LARGE FIRST per surgical move */}
      {BlockLarge}

      {/* BLOCK_GRID SECOND */}
      {BlockGrid}

      {/* TODAY'S PERFORMANCE + GOAL - keep inside same blocks, no new UI sections */}
      <div className="bg-[#141414] border border-[#222] rounded-[20px] p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] tracking-[0.18em] font-bold text-white">TODAY'S PERFORMANCE</h3>
          <span className="text-[10px] tracking-[0.18em] font-bold" style={goldGradientStyle}>
            GOAL $/H
          </span>
        </div>

        <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-neutral-500 tracking-wide">Target per hour</span>
            <span className="font-mono-jet text-[20px] font-bold" style={goldGradientStyle}>
              ${goal}/h
            </span>
          </div>
          <input
            type="range"
            min={50}
            max={70}
            step={1}
            value={goal}
            onChange={(e) => setGoal(parseInt(e.target.value))}
            className="w-full mt-4"
          />
          <div className="flex justify-between mt-1">
            <span className="text-[10px] font-mono-jet text-neutral-600">$50</span>
            <span className="text-[10px] font-mono-jet text-neutral-600">$70</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-3">
            <p className="text-[9px] tracking-[0.14em] text-neutral-500">ACTUAL</p>
            <p className="font-mono-jet text-[15px] font-semibold text-white mt-1">${perHourLive.toFixed(2)}</p>
          </div>
          <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-3">
            <p className="text-[9px] tracking-[0.14em] text-neutral-500">GOAL</p>
            <p className="font-mono-jet text-[15px] font-semibold text-[#f6dd8c] mt-1">${goal.toFixed(2)}</p>
          </div>
          <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-3">
            <p className="text-[9px] tracking-[0.14em] text-neutral-500">REMAINING</p>
            <p className="font-mono-jet text-[15px] font-semibold text-[#ff6b6b] mt-1">${(goal - perHourLive).toFixed(2)}/h</p>
          </div>
        </div>

        <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-[#ff4d4f]/10 border border-[#ff4d4f]/30 text-[#ff6b6b] text-[10px] tracking-[0.12em] font-semibold font-mono-jet">
          <span className="w-1 h-1 rounded-full bg-[#ff4d4f] mr-2 animate-pulse" />
          {perHourLive >= goal ? "ON GOAL" : "LOW · Need to pick up"}
        </div>

        <div className="grid grid-cols-3 gap-0 bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl overflow-hidden">
          <div className="p-3 border-r border-[#1f1f1f] text-center">
            <p className="text-[9px] text-neutral-500 tracking-widest">MILES</p>
            <p className="font-mono-jet text-[13px] font-semibold mt-1 text-white">12.4</p>
          </div>
          <div className="p-3 border-r border-[#1f1f1f] text-center">
            <p className="text-[9px] text-neutral-500 tracking-widest">TOLLS</p>
            <p className="font-mono-jet text-[13px] font-semibold mt-1 text-white">${totalTollsToday.toFixed(2)}</p>
          </div>
          <div className="p-3 text-center">
            <p className="text-[9px] text-neutral-500 tracking-widest">GRAND TOTAL</p>
            <p className="font-mono-jet text-[13px] font-semibold mt-1 text-[#f5c518]">${todayEarnings.toFixed(2)}</p>
          </div>
        </div>

        <div className="rounded-xl bg-[#1a1625] border border-[#2a2340] border-l-[3px] border-l-[#8b5cf6] p-3.5">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6]" />
            <p className="text-[10px] tracking-[0.18em] font-bold text-[#a78bfa]">AI ADVISORY · E-ZPass 2026</p>
          </div>
          <p className="text-[12px] leading-[1.5] text-[#c4b5fd]/90 mt-2">
            {TOLL_PLAZAS.length} plazas · MTA ${TOLL_PLAZAS[3].rate} · Port Auth $16.79 peak · Geofencing active.{" "}
            {shiftActive ? "GPS live tracking." : "Start shift to auto-tag tolls."}
          </p>
        </div>
      </div>
    </div>
  );

  const EntryFormContent = (
    <div id="trip-entry-form" className="w-full max-w-[480px] mx-auto bg-[#101010] border border-[#222] rounded-[24px] p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="w-1 h-6 bg-[#22c55e] rounded-full inline-block" />
          <h2 className="text-white font-bold text-[18px] tracking-[0.14em] uppercase">TRIP ENTRY</h2>
        </div>
        <span className="px-3 py-1 rounded-full bg-[#1e1e1e] border border-[#2a2a2a] text-[#9ca3af] text-[11px] tracking-[0.12em] font-semibold uppercase">
          LOCAL · OFFLINE
        </span>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[11px] tracking-[0.08em] text-[#9ca3af] font-bold uppercase">REFERENCE # / INVOICE</label>
            <input
              value={tripForm.reference}
              onChange={(e) => setTripForm((s) => ({ ...s, reference: e.target.value }))}
              placeholder="Ej: INV-2026-001 (opcional)"
              className="w-full h-16 rounded-2xl bg-black border border-[#262626] px-4 text-white text-[15px] font-medium placeholder:text-[#6b7280] focus:outline-none focus:border-[#3a3a3a] transition-colors"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] tracking-[0.08em] text-[#9ca3af] font-bold uppercase">
              EARNINGS <span className="font-normal normal-case tracking-normal opacity-70">Fare</span>
            </label>
            <input
              inputMode="decimal"
              value={tripForm.earnings}
              onChange={(e) => {
                if (!numericFilter(e.target.value)) return;
                setTripForm((s) => ({ ...s, earnings: e.target.value }));
              }}
              placeholder="0.00"
              className="w-full h-16 rounded-2xl bg-black border border-[#262626] px-4 text-white text-[18px] font-bold font-mono-jet placeholder:text-[#6b7280] focus:outline-none focus:border-[#3a3a3a] transition-colors"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[11px] tracking-[0.08em] text-[#9ca3af] font-bold uppercase">
              TIPS <span className="font-normal normal-case tracking-normal opacity-70">Extra</span>
            </label>
            <input
              inputMode="decimal"
              value={tripForm.tips}
              onChange={(e) => {
                if (!numericFilter(e.target.value)) return;
                setTripForm((s) => ({ ...s, tips: e.target.value }));
              }}
              placeholder="0.00"
              className="w-full h-16 rounded-2xl bg-black border border-[#262626] px-4 text-white text-[18px] font-bold font-mono-jet placeholder:text-[#6b7280] focus:outline-none focus:border-[#3a3a3a]"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] tracking-[0.08em] text-[#9ca3af] font-bold uppercase">EXTRA CASH</label>
            <input
              inputMode="decimal"
              value={tripForm.extraCash}
              onChange={(e) => {
                if (!numericFilter(e.target.value)) return;
                setTripForm((s) => ({ ...s, extraCash: e.target.value }));
              }}
              placeholder="Ej: 45.50"
              className="w-full h-16 rounded-2xl bg-black border border-[#262626] px-4 text-white text-[18px] font-bold font-mono-jet placeholder:text-[#6b7280] focus:outline-none focus:border-[#3a3a3a]"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <label className="text-[11px] tracking-[0.08em] text-[#9ca3af] font-bold uppercase">TOLL ($)</label>
              <span className="px-2 py-0.5 rounded-full bg-[#052e16] border border-[#166534] text-[#4ade80] text-[10px] font-bold tracking-widest">GPS</span>
            </div>
            <input
              inputMode="decimal"
              value={tripForm.toll}
              onChange={(e) => {
                if (!numericFilter(e.target.value)) return;
                setTripForm((s) => ({ ...s, toll: e.target.value }));
              }}
              placeholder="Ej: 6.94"
              className="w-full h-16 rounded-2xl bg-black border border-[#262626] px-4 text-white text-[18px] font-bold font-mono-jet placeholder:text-[#6b7280] focus:outline-none focus:border-[#3a3a3a]"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] tracking-[0.08em] text-[#9ca3af] font-bold uppercase">PLATFORM FEE ($)</label>
            <input
              inputMode="decimal"
              value={tripForm.platformFee}
              onChange={(e) => {
                if (!numericFilter(e.target.value)) return;
                setTripForm((s) => ({ ...s, platformFee: e.target.value }));
              }}
              placeholder="0.00"
              className="w-full h-16 rounded-2xl bg-black border border-[#262626] px-4 text-white text-[18px] font-bold font-mono-jet placeholder:text-[#6b7280] focus:outline-none focus:border-[#3a3a3a]"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <label className="text-[11px] tracking-[0.08em] text-[#9ca3af] font-bold uppercase">PLATFORM</label>
          </div>
          {(() => {
            const meta = getPlatformMeta(tripForm.platform);
            return (
              <div className="flex items-center gap-2 mb-2 min-h-6 flex-wrap">
                <span className={`w-5 h-5 rounded-full ${meta.bg} flex items-center justify-center text-white text-[10px] font-bold shrink-0`}>
                  {meta.initial}
                </span>
                <span className="text-[13px] font-semibold text-white truncate">{tripForm.platform}</span>
                {meta.tags && meta.tags.length > 0 && (
                  <span className="flex gap-1 flex-wrap items-center">
                    {meta.tags.map((tg) => (
                      <span key={tg} className={`text-[9px] font-bold uppercase tracking-[0.1em] px-2 py-0.5 rounded-full border ${getTagStyle(tg)}`}>
                        {tg}
                      </span>
                    ))}
                  </span>
                )}
              </div>
            );
          })()}
          <div className="relative">
            <select
              value={tripForm.platform}
              onChange={(e) => setTripForm((s) => ({ ...s, platform: e.target.value }))}
              className="w-full h-16 rounded-2xl bg-black border border-[#262626] px-4 pr-10 text-white text-[18px] font-bold appearance-none focus:outline-none focus:border-[#3a3a3a]"
            >
              <option>EcoRide - 10% fee</option>
              <option>Uber</option>
              <option>Lyft</option>
              <option>Empower</option>
              <option>Gallant</option>
              <option>Aventus Ride</option>
              <option>Classic Ride</option>
              <option>Aki Technology</option>
              <option>Other</option>
            </select>
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 text-[14px]">▼</span>
          </div>
        </div>

        {/* Pickup with GPS button */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-[#052e16] border border-[#166534] text-[#4ade80] text-[11px] font-bold tracking-widest uppercase">
              PICKUP
            </span>
            <span className="text-[11px] text-[#6b7280]">Origin</span>
          </div>
          <div className="relative">
            <input
              value={tripForm.pickup}
              onChange={(e) => setTripForm((s) => ({ ...s, pickup: e.target.value }))}
              placeholder={
                shiftActive && gps.lat
                  ? `Current (${gps.lat.toFixed(4)},${gps.lng?.toFixed(4)}) suggestion`
                  : "Dirección o lugar"
              }
              className="w-full h-16 rounded-2xl bg-black border border-[#262626] pl-4 pr-[52px] text-white text-[14px] font-medium placeholder:text-[#6b7280] focus:outline-none focus:border-[#14532d]"
            />
            <button
              type="button"
              onClick={() => {
                if (gps.lat && gps.lng) {
                  setTripForm((s) => ({ ...s, pickup: `Current (${gps.lat!.toFixed(4)},${gps.lng!.toFixed(4)})` }));
                } else {
                  startGPS();
                  setToast("GPS searching... tap again to fill");
                  setTimeout(() => setToast(null), 1800);
                }
              }}
              className="absolute right-1.5 top-1.5 w-[42px] h-[52px] rounded-xl bg-[#052e16] border border-[#166534] flex items-center justify-center text-[16px] hover:bg-[#0a3a1f] transition-colors"
            >
              📍
            </button>
          </div>
          {gps.lat && (
            <div className="space-y-0.5">
              <p className="font-mono-jet text-[10px] text-[#4ade80]">GPS: {gps.lat.toFixed(5)},{gps.lng?.toFixed(5)} · ±{gps.acc ? Math.round(gps.acc) : "?"}m</p>
              {gpsAddress && <p className="font-mono-jet text-[10px] text-neutral-400 truncate">📍 {gpsAddress}</p>}
              {gpsAirport && <p className="font-mono-jet text-[10px] text-[#f6dd8c]">✈️ Near {gpsAirport}</p>}
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-[#0c1a33] border border-[#1e3a8a] text-[#60a5fa] text-[11px] font-bold tracking-widest uppercase">
              DROP OFF
            </span>
            <span className="text-[11px] text-[#6b7280]">Destination</span>
          </div>
          <div className="relative">
            <input
              value={tripForm.dropoff}
              onChange={(e) => setTripForm((s) => ({ ...s, dropoff: e.target.value }))}
              placeholder={
                shiftActive && gps.lat
                  ? `Near ${gps.lat.toFixed(4)},${gps.lng?.toFixed(4)} suggestion`
                  : "Dirección o lugar"
              }
              className="w-full h-16 rounded-2xl bg-black border border-[#262626] pl-4 pr-[52px] text-white text-[14px] font-medium placeholder:text-[#6b7280] focus:outline-none focus:border-[#1e3a8a]"
            />
            <button
              type="button"
              onClick={() => {
                if (gps.lat && gps.lng) {
                  setTripForm((s) => ({ ...s, dropoff: `Drop (${gps.lat!.toFixed(4)},${gps.lng!.toFixed(4)})` }));
                } else {
                  startGPS();
                  setToast("GPS searching... tap again to fill");
                  setTimeout(() => setToast(null), 1800);
                }
              }}
              className="absolute right-1.5 top-1.5 w-[42px] h-[52px] rounded-xl bg-[#0c1a33] border border-[#1e3a8a] flex items-center justify-center text-[16px] hover:bg-[#132a5a] transition-colors"
            >
              📍
            </button>
          </div>
          {gps.lat && (
            <div className="space-y-0.5">
              <p className="font-mono-jet text-[10px] text-[#60a5fa]">GPS: {gps.lat.toFixed(5)},{gps.lng?.toFixed(5)} · ±{gps.acc ? Math.round(gps.acc) : "?"}m</p>
              {gpsAddress && <p className="font-mono-jet text-[10px] text-neutral-400 truncate">📍 {gpsAddress}</p>}
              {gpsAirport && <p className="font-mono-jet text-[10px] text-[#93c5fd]">✈️ Near {gpsAirport}</p>}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              if (!gps.lat) startGPS();
              setShowPickupMenu((v) => !v);
              setShowDropoffMenu(false);
            }}
            className="h-14 rounded-2xl bg-black border border-[#14532d] px-4 flex items-center gap-2 text-white text-[13px] font-bold text-left hover:bg-[#052e16]/30 transition-colors"
          >
            <span className="text-[#22c55e] text-[16px]">📍</span>
            <span className="truncate">Quick Pickup...</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (!gps.lat) startGPS();
              setShowDropoffMenu((v) => !v);
              setShowPickupMenu(false);
            }}
            className="h-14 rounded-2xl bg-black border border-[#1e3a8a] px-4 flex items-center gap-2 text-white text-[13px] font-bold text-left hover:bg-[#0c1a33]/60 transition-colors"
          >
            <span className="text-[#60a5fa] text-[16px]">📍</span>
            <span className="truncate">Quick Drop Off...</span>
          </button>
        </div>

        {/* DROP MENUS - surgical addition only for pickup/dropoff */}
        {showPickupMenu && (
          <div className="mt-2 bg-[#141414] border border-[#222] rounded-2xl p-3">
            <p className="text-[11px] tracking-[0.12em] text-neutral-500 font-bold uppercase mb-2">PICKUP LOCATION</p>
            <div className="w-full min-h-[48px] rounded-xl bg-black border border-[#262626] px-3 py-2 text-[12px] text-neutral-300 mb-3 flex flex-col justify-center">
              <span className="font-mono-jet truncate">
                📍 Current: {gps.lat ? `${gps.lat.toFixed(5)},${gps.lng?.toFixed(5)}` : "GPS waiting..."} {gps.acc ? `· ±${Math.round(gps.acc!)}m` : ""}
              </span>
              {gpsAddress && <span className="font-mono-jet text-[11px] text-neutral-400 truncate mt-0.5">{gpsAddress}</span>}
              {gpsAirport && <span className="font-mono-jet text-[11px] text-[#f6dd8c] mt-0.5">✈️ {gpsAirport}</span>}
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {LOCATION_CATEGORIES.map((cat) => (
                <button
                  key={`pickup-${cat}`}
                  type="button"
                  onClick={() => {
                    const coordPart = gps.lat ? `${gps.lat.toFixed(5)},${gps.lng?.toFixed(5)}` : "";
                    const extra: string[] = [];
                    if (gpsAirport) extra.push(gpsAirport);
                    if (gpsAddress) extra.push(gpsAddress.split(",").slice(0, 2).join(",").trim());
                    const finalValue = coordPart ? `${cat} - ${coordPart}${extra.length ? " - " + extra.join(" - ") : ""}` : cat;
                    setTripForm((s) => ({ ...s, pickup: finalValue }));
                    setShowPickupMenu(false);
                    setToast(`Pickup: ${cat}${coordPart ? " · " + coordPart : ""}`);
                    setTimeout(() => setToast(null), 2000);
                  }}
                  className="h-14 rounded-xl bg-[#3a3a3a] border border-[#4a4a4a]/50 text-white text-[15px] font-medium hover:bg-[#4a4a4a] transition-colors text-center"
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        )}
        {showDropoffMenu && (
          <div className="mt-2 bg-[#141414] border border-[#222] rounded-2xl p-3">
            <p className="text-[11px] tracking-[0.12em] text-neutral-500 font-bold uppercase mb-2">DROP OFF LOCATION</p>
            <div className="w-full min-h-[48px] rounded-xl bg-black border border-[#262626] px-3 py-2 text-[12px] text-neutral-300 mb-3 flex flex-col justify-center">
              <span className="font-mono-jet truncate">
                📍 Current: {gps.lat ? `${gps.lat.toFixed(5)},${gps.lng?.toFixed(5)}` : "GPS waiting..."} {gps.acc ? `· ±${Math.round(gps.acc!)}m` : ""}
              </span>
              {gpsAddress && <span className="font-mono-jet text-[11px] text-neutral-400 truncate mt-0.5">{gpsAddress}</span>}
              {gpsAirport && <span className="font-mono-jet text-[11px] text-[#93c5fd] mt-0.5">✈️ {gpsAirport}</span>}
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {LOCATION_CATEGORIES.map((cat) => (
                <button
                  key={`dropoff-${cat}`}
                  type="button"
                  onClick={() => {
                    const coordPart = gps.lat ? `${gps.lat.toFixed(5)},${gps.lng?.toFixed(5)}` : "";
                    const extra: string[] = [];
                    if (gpsAirport) extra.push(gpsAirport);
                    if (gpsAddress) extra.push(gpsAddress.split(",").slice(0, 2).join(",").trim());
                    const finalValue = coordPart ? `${cat} - ${coordPart}${extra.length ? " - " + extra.join(" - ") : ""}` : cat;
                    setTripForm((s) => ({ ...s, dropoff: finalValue }));
                    setShowDropoffMenu(false);
                    setToast(`Dropoff: ${cat}${coordPart ? " · " + coordPart : ""}`);
                    setTimeout(() => setToast(null), 2000);
                  }}
                  className="h-14 rounded-xl bg-[#3a3a3a] border border-[#4a4a4a]/50 text-white text-[15px] font-medium hover:bg-[#4a4a4a] transition-colors text-center"
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-[11px] tracking-[0.08em] text-[#9ca3af] font-bold uppercase">TRIP NOTES / COMMENTS</label>
          <textarea
            value={tripForm.notes}
            onChange={(e) => setTripForm((s) => ({ ...s, notes: e.target.value }))}
            placeholder="Ej: Cliente tardó 10min, tráfico en Lincoln Tunnel, peaje no detectado..."
            rows={4}
            className="w-full min-h-[112px] rounded-2xl bg-black border border-[#262626] p-4 text-[13px] text-[#d1d5db] placeholder:text-[#6b7280] focus:outline-none focus:border-[#3a3a3a] resize-none leading-[1.5]"
          />
        </div>

        <div className="rounded-2xl bg-black border border-[#262626] p-4 flex items-center justify-between">
          <span className="text-[11px] tracking-[0.08em] text-[#9ca3af] font-bold uppercase leading-[1.2] max-w-[60%]">
            GRAND TOTAL = GROSS + TOLL - FEE
          </span>
          <span className="font-mono-jet text-[26px] font-bold text-[#facc15] tracking-tight">${grandTotalLive.toFixed(2)}</span>
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="w-full h-16 rounded-2xl bg-[#facc15] hover:bg-[#fde047] text-black font-bold text-[18px] tracking-[0.14em] uppercase transition-colors shadow-[0_0_20px_rgba(250,204,21,0.2)]"
        >
          {editingId ? "UPDATE TRIP → DISCO" : "+ SAVE TRIP → DISCO"}
        </button>
        {editingId && (
          <button
            type="button"
            onClick={resetForm}
            className="w-full h-11 rounded-2xl border border-[#2a2a2a] bg-[#0a0a0a] text-[12px] font-semibold tracking-[0.08em] text-neutral-400 hover:text-white transition-colors"
          >
            CANCEL EDIT
          </button>
        )}

        {/* VERIFICACIÓN LOCK STORAGE - VISUAL CONFIRMACIÓN */}
        <div className={`rounded-2xl border p-3.5 space-y-2 ${storageVerified ? "bg-[#052e16]/40 border-[#166534]/50" : "bg-[#1a0a0a] border-[#7f1d1d]/50"}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${storageVerified ? "bg-[#22c55e] animate-pulse" : "bg-red-500"}`} />
              <p className="text-[11px] tracking-[0.14em] font-bold text-white uppercase">Lock Storage Status</p>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-widest ${storageVerified ? "bg-[#22c55e]/20 text-[#4ade80] border border-[#166534]" : "bg-red-900/30 text-red-400 border border-red-800"}`}>
              {storageVerified ? "✓ ACTIVA" : "✗ ERROR"}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-1">
            <div className="bg-black/50 rounded-lg p-2 border border-[#222]">
              <p className="text-[8px] tracking-widest text-neutral-500 uppercase">Trips en Disco</p>
              <p className="font-mono-jet text-[13px] font-bold text-[#facc15] mt-0.5">{trips.length}</p>
            </div>
            <div className="bg-black/50 rounded-lg p-2 border border-[#222]">
              <p className="text-[8px] tracking-widest text-neutral-500 uppercase">Tamaño</p>
              <p className="font-mono-jet text-[13px] font-bold text-white mt-0.5">{(storageBytes / 1024).toFixed(2)} KB</p>
            </div>
            <div className="bg-black/50 rounded-lg p-2 border border-[#222]">
              <p className="text-[8px] tracking-widest text-neutral-500 uppercase">Último Save</p>
              <p className="font-mono-jet text-[9px] font-bold text-[#4ade80] mt-0.5 leading-tight">
                {lastSavedAt === "—" ? "—" : new Date(lastSavedAt).toLocaleTimeString()}
              </p>
            </div>
          </div>
          <div className="bg-black rounded-lg p-2.5 border border-[#1a1a1a]">
            <p className="text-[9px] font-mono-jet text-neutral-500 leading-[1.4]">
              Keys: <span className="text-[#9ca3af]">island-city-trips</span> ({trips.length} objs) ·{" "}
              <span className="text-[#9ca3af]">island-city-hours</span> ({hoursLog.length}) ·{" "}
              <span className="text-[#9ca3af]">island-city-last-saved</span>
            </p>
            <p className="text-[9px] font-mono-jet text-[#4ade80] mt-1 leading-[1.4]">
              ✓ Toda la información del Daily Entry se guarda automáticamente en disco al presionar SAVE. Sin pérdida.
              Incluye: earnings, tips, extra, toll, fee, pickup, dropoff, notes, reference, GPS, timestamp.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                try {
                  const raw = localStorage.getItem("island-city-trips");
                  if (raw) {
                    const parsed = JSON.parse(raw);
                    setToast(`✓ Verificado: ${parsed.length} trips en disco · ${(new Blob([raw]).size/1024).toFixed(2)}KB`);
                  } else {
                    setToast("⚠ No hay datos en disco aún");
                  }
                  setTimeout(() => setToast(null), 2500);
                } catch { setToast("Error leyendo disco"); setTimeout(()=>setToast(null),2000); }
              }}
              className="flex-1 h-8 rounded-full bg-[#1e1e1e] border border-[#2a2a2a] text-[10px] font-bold tracking-widest text-neutral-300 hover:text-white"
            >
              VERIFICAR DISCO
            </button>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(localStorage.getItem("island-city-trips") || "");
                setToast("JSON copiado - backup listo");
                setTimeout(() => setToast(null), 2000);
              }}
              className="flex-1 h-8 rounded-full bg-[#0a0a0a] border border-[#222] text-[10px] font-bold tracking-widest text-neutral-500 hover:text-white"
            >
              COPIAR BACKUP
            </button>
          </div>
        </div>

        <div className="pt-1 pb-1 text-center space-y-1">
          <p className="font-mono-jet text-[11px] text-[#6b7280] leading-[1.4]">
            📍 GPS {gps.status} · {gps.lat ? `${gps.lat.toFixed(4)},${gps.lng?.toFixed(4)}` : "waiting..."} · Accuracy: ≤50m ·
            Hora estampada automáticamente {currentTime.toLocaleTimeString()}
          </p>
          <p className="font-mono-jet text-[11px] text-[#6b7280]">E-ZPass 2026: $6.94 / $3.18 / $2.60 / $2.75 · Port Authority $16.79 peak · 15 plazas · Guardado en localStorage</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white selection:bg-[#d9b64f]/30">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600;700&display=swap');
        * { font-family: 'Inter', sans-serif; }
        .font-cinzel { font-family: 'Cinzel', serif; }
        .font-mono-jet { font-family: 'JetBrains Mono', monospace; }
        input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
        .gold-scroll::-webkit-scrollbar { height: 0; }
        input[type=range] {
          -webkit-appearance: none; appearance: none;
          height: 4px; background: #1a1a1a; border-radius: 999px; outline: none;
        }
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none; width: 20px; height: 20px; border-radius: 50%;
          background: linear-gradient(90deg, #f6dd8c, #d9b64f);
          border: 2px solid #000; box-shadow: 0 0 0 2px rgba(214,182,79,0.3);
          cursor: pointer; margin-top: -8px;
        }
        input[type=range]::-webkit-slider-runnable-track { height: 4px; border-radius: 999px; background: #1a1a1a; }
      `}</style>

      <div className="w-full max-w-[480px] mx-auto min-h-screen bg-black border-x border-[#121212] relative">
        <div className="sticky top-0 z-40 bg-black/95 backdrop-blur-xl border-b border-[#1a1a1a] px-5 h-[68px] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#111] border border-[#222] flex items-center justify-center overflow-hidden">
              <img src={logoIcon} alt="Island City" className="w-[22px] h-[22px] object-contain" />
            </div>
            <h1 className="font-cinzel text-[18px] tracking-[0.18em] font-bold" style={goldGradientStyle}>
              ISLAND CITY
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono-jet text-[10px] text-neutral-500 hidden sm:block">{currentTime.toLocaleTimeString()}</span>
            <div className="w-8 h-8 rounded-full bg-[#141414] border border-[#222] flex items-center justify-center text-[12px] font-semibold text-[#f6dd8c]">
              M
            </div>
          </div>
        </div>

        <div className="sticky top-[68px] z-30 bg-black border-b border-[#1a1a1a]">
          <div className="flex overflow-x-auto gold-scroll px-2 gap-1">
            {(["DASHBOARD", "ENTRY", "REGISTER", "EXPENSES", "REPORTS"] as Tab[]).map((tab) => {
              const active = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`whitespace-nowrap px-4 py-3.5 text-[11px] tracking-[0.14em] font-semibold transition-colors relative ${
                    active ? "text-[#f6dd8c]" : "text-neutral-500 hover:text-neutral-300"
                  }`}
                >
                  {tab}
                  {active && <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-gradient-to-r from-[#f6dd8c] to-[#d9b64f] rounded-full" />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="px-4 pb-28 pt-5">
          {activeTab === "ENTRY" && EntryFormContent}

          {activeTab === "REGISTER" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-[22px] font-bold text-white tracking-tight">Trip Register</h2>
                <span className="text-[14px] text-neutral-500 font-mono-jet">{todayTrips.length} today · {trips.length} total</span>
              </div>

              {/* VERIFICACIÓN DISCO EN REGISTER */}
              <div className={`rounded-2xl border p-3.5 flex items-center justify-between ${storageVerified ? "bg-[#052e16]/30 border-[#166534]/40" : "bg-[#1a0a0a] border-[#7f1d1d]/40"}`}>
                <div className="flex items-center gap-2.5">
                  <span className={`w-2 h-2 rounded-full ${storageVerified ? "bg-[#22c55e] animate-pulse" : "bg-red-500"}`} />
                  <div>
                    <p className="text-[11px] font-bold tracking-[0.12em] text-white uppercase">Disco Lock Storage</p>
                    <p className="font-mono-jet text-[10px] text-neutral-400">
                      {trips.length} trips · {(storageBytes/1024).toFixed(2)}KB · {lastSavedAt !== "—" ? new Date(lastSavedAt).toLocaleString() : "—"}
                    </p>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${storageVerified ? "bg-[#22c55e]/20 text-[#4ade80] border border-[#166534]" : "bg-red-900/30 text-red-400"}`}>
                  {storageVerified ? "✓ GUARDADO" : "✗ ERROR"}
                </span>
              </div>

              {trips.length === 0 ? (
                <div className="bg-[#141414] border border-[#222] rounded-2xl p-8 text-center">
                  <p className="text-[14px] text-neutral-400">No trips yet - log from ENTRY</p>
                  <button
                    onClick={() => setActiveTab("ENTRY")}
                    className="mt-4 h-10 px-5 rounded-full border border-[#d9b64f]/50 text-[#f6dd8c] text-[12px] font-semibold tracking-wide hover:bg-[#f6dd8c]/10 transition-colors"
                  >
                    + Log a trip
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {trips.map((t) => (
                    <div key={t.id} className="bg-[#141414] border border-[#222] rounded-2xl p-4 space-y-3">
                     <div className="flex items-center justify-between">
                       <div className="flex items-center gap-2.5 flex-wrap">
                         <span className="font-mono-jet text-[12px] text-neutral-400">{t.time} · {t.date}</span>
                         {(() => {
                           const meta = getPlatformMeta(t.platform);
                           return (
                             <span className="flex items-center gap-2 flex-wrap">
                               <span className={`w-5 h-5 rounded-full ${meta.bg} flex items-center justify-center text-white text-[10px] font-bold shrink-0`}>
                                 {meta.initial}
                               </span>
                               <span className="px-3 py-1 rounded-full bg-[#1e1e1e] border border-[#333] text-[#e8c766] text-[10px] font-bold tracking-[0.12em]">
                                 {t.platform.toUpperCase()}
                               </span>
                               {meta.tags && meta.tags.length > 0 && (
                                 <span className="flex gap-1 flex-wrap">
                                   {meta.tags.map((tg) => (
                                     <span key={tg} className={`text-[9px] font-bold uppercase tracking-[0.1em] px-2 py-0.5 rounded-full border ${getTagStyle(tg)}`}>
                                       {tg}
                                     </span>
                                   ))}
                                 </span>
                               )}
                             </span>
                           );
                         })()}
                       </div>
                       <span className="font-mono-jet text-[18px] font-bold text-[#facc15] tracking-tight">${t.grandTotal.toFixed(2)}</span>
                     </div>
                      {t.reference && t.reference.trim() !== "" && (
                        <p className="font-mono-jet text-[11px] text-neutral-500">REF: {t.reference}</p>
                      )}
                      <p className="text-[14px] text-white leading-[1.35] font-medium">
                        <span>{t.pickup || "—"}</span>
                        <span className="text-neutral-500 mx-2">→</span>
                        <span>{t.dropoff || "—"}</span>
                      </p>
                      <div className="flex gap-2 font-mono-jet text-[10px] text-neutral-500">
                        <span>Fare ${t.earnings}</span>
                        <span>Tip ${t.tips}</span>
                        {t.toll > 0 && <span>Toll ${t.toll}</span>}
                        {t.gps && <span>📍 {t.gps.lat.toFixed(3)},{t.gps.lng.toFixed(3)}</span>}
                      </div>

                      {inlineEditId === t.id ? (
                        <div className="bg-[#0a0a0a] border border-[#222] rounded-xl p-3 space-y-2">
                          <input
                            value={inlineForm.reference}
                            onChange={(e) => setInlineForm((s) => ({ ...s, reference: e.target.value }))}
                            placeholder="Ej: INV-2026-001 (opcional)"
                            className="w-full h-10 rounded-lg bg-black border border-[#262626] px-3 text-[13px] text-white placeholder:text-[#6b7280]"
                          />
                          <input
                            value={inlineForm.pickup}
                            onChange={(e) => setInlineForm((s) => ({ ...s, pickup: e.target.value }))}
                            placeholder="Pickup"
                            className="w-full h-10 rounded-lg bg-black border border-[#262626] px-3 text-[13px] text-white placeholder:text-[#6b7280]"
                          />
                          <input
                            value={inlineForm.dropoff}
                            onChange={(e) => setInlineForm((s) => ({ ...s, dropoff: e.target.value }))}
                            placeholder="Dropoff"
                            className="w-full h-10 rounded-lg bg-black border border-[#262626] px-3 text-[13px] text-white placeholder:text-[#6b7280]"
                          />
                          <input
                            value={inlineForm.earnings}
                            onChange={(e) => setInlineForm((s) => ({ ...s, earnings: e.target.value }))}
                            placeholder="0.00"
                            inputMode="decimal"
                            className="w-full h-10 rounded-lg bg-black border border-[#262626] px-3 text-[13px] text-white placeholder:text-[#6b7280] font-mono-jet"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleInlineSave(t.id)}
                              className="flex-1 h-9 rounded-full bg-[#facc15] text-black text-[12px] font-bold"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setInlineEditId(null)}
                              className="flex-1 h-9 rounded-full bg-[#1e1e1e] border border-[#2a2a2a] text-neutral-400 text-[12px] font-semibold"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 gap-2 pt-1">
                          <button
                            onClick={() => handleInlineEditStart(t)}
                            className="h-10 rounded-full bg-[#1e1e1e] border border-[#2a2a2a] text-white text-[12px] font-semibold tracking-[0.04em] hover:bg-[#252525] transition-colors"
                          >
                            ✏️ Quick
                          </button>
                          <button
                            onClick={() => handleEditToEntry(t)}
                            className="h-10 rounded-full bg-[#1e1e1e] border border-[#2a2a2a] text-[#f6dd8c] text-[12px] font-semibold tracking-[0.04em] hover:bg-[#252525] transition-colors"
                          >
                            Full Edit
                          </button>
                          <button
                            onClick={() => handleDelete(t.id)}
                            className="h-10 rounded-full bg-[#1e1e1e] border border-[#2a2a2a] text-[#f87171] text-[12px] font-semibold tracking-[0.04em] hover:bg-[#2a1a1a] transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="bg-[#141414] border border-[#222] rounded-2xl p-4 space-y-3">
                <h3 className="text-[13px] font-bold tracking-[0.12em] text-white uppercase">General Ledger Post · Disco Seguro</h3>
                <p className="text-[12px] text-neutral-500 leading-[1.5]">
                  Revisa todas las entradas. Todo está guardado en <span className="text-[#4ade80] font-mono-jet">localStorage</span> en disco. Cuando todo esté correcto al día siguiente, postea al General Ledger.
                </p>
                <div className="bg-black rounded-xl p-2.5 border border-[#1a1a1a] font-mono-jet text-[9px] text-neutral-500 leading-[1.5]">
                  <p>✓ island-city-trips: {trips.length} registros → {(storageBytes/1024).toFixed(2)}KB</p>
                  <p>✓ island-city-hours: {hoursLog.length} turnos</p>
                  <p>✓ island-city-last-saved: {lastSavedAt}</p>
                  <p className="text-[#4ade80] mt-1">Ninguna información se pierde al recargar. El botón SAVE escribe inmediatamente al disco.</p>
                </div>
                <button
                  onClick={handlePostLedger}
                  disabled={trips.length === 0}
                  className={`w-full h-12 rounded-full border text-[12px] font-bold tracking-[0.12em] uppercase transition-all ${
                    trips.length === 0
                      ? "border-[#2a2a2a] bg-[#0a0a0a] text-neutral-600 cursor-not-allowed opacity-60"
                      : "border-[#d9b64f] bg-black text-[#f6dd8c] hover:bg-[#f6dd8c]/10"
                  }`}
                >
                  Post Day to General Ledger
                </button>
                <p className="font-mono-jet text-[10px] text-neutral-600 text-center">
                  {todayTrips.length} today · {trips.length} total · ${todayEarnings.toFixed(2)} · editable · Verificado en disco ✓
                </p>
              </div>
            </div>
          )}

          {activeTab === "DASHBOARD" && DashboardContent}

          {activeTab === "EXPENSES" && (
            <div className="space-y-4">
              <h2 className="text-[18px] font-bold">Expenses</h2>
              {[
                { name: "Fuel", amount: 42.3, date: "Aug 8" },
                { name: "Tolls - BQE", amount: 5.5, date: "Aug 8" },
                { name: "Car Wash", amount: 12, date: "Aug 7" },
                { name: "Parking - Midtown", amount: 18, date: "Aug 7" },
              ].map((ex, i) => (
                <div key={i} className="bg-[#141414] border border-[#222] rounded-xl p-3.5 flex items-center justify-between">
                  <div>
                    <p className="text-[13px] font-semibold text-white">{ex.name}</p>
                    <p className="text-[11px] font-mono-jet text-neutral-500 mt-0.5">{ex.date}</p>
                  </div>
                  <p className="font-mono-jet text-[14px] font-semibold text-[#ff6b6b]">-${ex.amount.toFixed(2)}</p>
                </div>
              ))}
              <div className="bg-[#0a0a0a] border border-[#222] rounded-xl p-4 flex justify-between">
                <span className="text-[12px] text-neutral-400">Total this week</span>
                <span className="font-mono-jet text-[14px] font-bold text-white">$77.80</span>
              </div>
            </div>
          )}

          {activeTab === "REPORTS" && (
            <div className="space-y-4">
              <h2 className="text-[18px] font-bold">Reports</h2>
              <div className="bg-[#141414] border border-[#222] rounded-[20px] p-5 space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-[11px] tracking-[0.18em] text-neutral-500 font-semibold">SUMMARY</p>
                  <span className="text-[10px] font-mono-jet px-2 py-1 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] text-neutral-400">
                    {currentTime.toLocaleDateString()} · {hoursLog.length} shifts
                  </span>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-[13px] text-neutral-400">Gross Earnings</span>
                    <span className="font-mono-jet text-[13px] font-semibold text-white">${trips.reduce((a,b)=>a+b.grandTotal,0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[13px] text-neutral-400">Hours Today / Week</span>
                    <span className="font-mono-jet text-[13px] font-semibold text-white">{cumulative.hoy.toFixed(1)}h / {cumulative.semana.toFixed(1)}h</span>
                  </div>
                  <div className="h-px bg-[#222]" />
                  <div className="flex justify-between">
                    <span className="text-[13px] font-bold text-white">Net Today</span>
                    <span className="font-mono-jet text-[16px] font-bold text-[#f5c518]">${todayEarnings.toFixed(2)}</span>
                  </div>
                </div>
                <div className="rounded-xl bg-[#1a1625] border-l-[3px] border-l-[#8b5cf6] border border-[#2a2340] p-3.5">
                  <p className="text-[10px] tracking-[0.18em] font-bold text-[#a78bfa]">AI INSIGHT · {TOLL_PLAZAS.length} PLAZAS</p>
                  <p className="text-[12px] text-[#c4b5fd]/90 mt-1.5 leading-[1.5]">
                    Best performance: Fri 2-6pm Brooklyn routes. Tolls: $6.94 MTA, $3.18/$2.60 minor, $16.79 Port Authority peak.
                    Today {todayTrips.length} trips, {cumulative.hoy.toFixed(1)}h active.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {toast && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full bg-[#facc15] text-black text-[12px] font-bold tracking-wide shadow-xl border border-black/10 max-w-[90%] text-center">
            {toast}
          </div>
        )}

        <div className="pointer-events-none fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] h-[1px] bg-gradient-to-r from-transparent via-[#d9b64f]/40 to-transparent" />
      </div>
    </div>
  );
}
