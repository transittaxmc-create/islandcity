import { useState, useEffect, useMemo, useRef } from "react";
import { Home, Banknote, Receipt, BarChart2, FileText, Brain } from "lucide-react";

type Tab = "DASHBOARD" | "TRIPS" | "EXPENSES" | "FINANCES" | "REPORTS" | "AI";
type TripsTab = "ENTRY" | "REGISTER" | "LEDGER";

interface Trip {
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
  date: string;
  time: string;
  status: "pending" | "posted";
}

interface HoursEntry {
  date: string;
  hours: number;
  clockIn: string;
  clockOut: string;
  breakMs: number;
}

function toYYYYMMDD(d: Date) {
  return d.toISOString().slice(0, 10);
}

const PLATFORMS = ["Uber", "Lyft", "EcoRide", "Empower", "Gallant", "Aventus Ride", "Classic Ryde", "Aki Technology", "Street Hail", "Island City Transit", "Other"];

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("DASHBOARD");
  const [tripsTab, setTripsTab] = useState<TripsTab>("ENTRY");
  const [toast, setToast] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  const [goal, setGoal] = useState<number>(() => {
    try { return parseInt(localStorage.getItem("ic-hourly-goal") || "60") || 60; } catch { return 60; }
  });
  const [dailyGoal] = useState<number>(() => {
    try { return parseInt(localStorage.getItem("ic-daily-goal") || "400") || 400; } catch { return 400; }
  });

  const [trips, setTrips] = useState<Trip[]>(() => {
    try {
      const raw = localStorage.getItem("island-city-trips");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed.map((t: any) => ({ ...t, status: t.status ?? "pending" }));
      }
    } catch {}
    return [];
  });

  const [hoursLog, setHoursLog] = useState<HoursEntry[]>(() => {
    try {
      const raw = localStorage.getItem("island-city-hours");
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  });

  // Shift clock state (date-guarded so it resets each day)
  const today = toYYYYMMDD(new Date());
  const [shiftActive, setShiftActive] = useState<boolean>(() => {
    try {
      if (localStorage.getItem("ic-shift-date") !== today) return false;
      return localStorage.getItem("ic-shift-active") === "true";
    } catch { return false; }
  });
  const [isOnBreak, setIsOnBreak] = useState<boolean>(() => {
    try {
      if (localStorage.getItem("ic-shift-date") !== today) return false;
      return localStorage.getItem("ic-shift-on-break") === "true";
    } catch { return false; }
  });
  const [clockInTime, setClockInTime] = useState<Date | null>(() => {
    try {
      if (localStorage.getItem("ic-shift-date") !== today) return null;
      const ci = localStorage.getItem("ic-shift-clock-in");
      return ci ? new Date(ci) : null;
    } catch { return null; }
  });
  const [breakStart, setBreakStart] = useState<Date | null>(() => {
    try {
      if (localStorage.getItem("ic-shift-date") !== today) return null;
      const bs = localStorage.getItem("ic-shift-break-start");
      return bs ? new Date(bs) : null;
    } catch { return null; }
  });
  const [totalBreakMs, setTotalBreakMs] = useState<number>(() => {
    try {
      if (localStorage.getItem("ic-shift-date") !== today) return 0;
      return parseInt(localStorage.getItem("ic-shift-break-ms") || "0") || 0;
    } catch { return 0; }
  });

  const [gps, setGps] = useState<{ lat: number | null; lng: number | null; status: "inactive" | "searching" | "active" | "error" }>({ lat: null, lng: null, status: "inactive" });

  // Trip entry form
  const emptyForm = () => {
    const n = new Date();
    return {
      reference: "", earnings: "", tips: "", extra: "", toll: "", fee: "",
      platform: "Uber", pickup: "", dropoff: "", notes: "",
      date: toYYYYMMDD(n), time: n.toTimeString().slice(0, 5),
    };
  };
  const [tripForm, setTripForm] = useState(emptyForm());

  const tripsRef = useRef<Trip[]>(trips);
  useEffect(() => { tripsRef.current = trips; }, [trips]);

  // Live clock
  useEffect(() => {
    const id = window.setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Persist trips / hours
  useEffect(() => {
    try { localStorage.setItem("island-city-trips", JSON.stringify(trips)); } catch {}
  }, [trips]);
  useEffect(() => {
    try { localStorage.setItem("island-city-hours", JSON.stringify(hoursLog)); } catch {}
  }, [hoursLog]);

  // Persist shift state
  useEffect(() => {
    try {
      localStorage.setItem("ic-shift-date", today);
      localStorage.setItem("ic-shift-active", String(shiftActive));
      localStorage.setItem("ic-shift-on-break", String(isOnBreak));
      localStorage.setItem("ic-shift-break-ms", String(totalBreakMs));
      if (clockInTime) localStorage.setItem("ic-shift-clock-in", clockInTime.toISOString());
      else localStorage.removeItem("ic-shift-clock-in");
      if (breakStart) localStorage.setItem("ic-shift-break-start", breakStart.toISOString());
      else localStorage.removeItem("ic-shift-break-start");
    } catch {}
  }, [shiftActive, isOnBreak, clockInTime, breakStart, totalBreakMs, today]);

  // One-shot GPS on mount
  useEffect(() => {
    if (!navigator.geolocation) return;
    setGps((s) => ({ ...s, status: "searching" }));
    navigator.geolocation.getCurrentPosition(
      (pos) => setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude, status: "active" }),
      () => setGps((s) => ({ ...s, status: "error" })),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 12000 }
    );
  }, []);

  const showToast = (msg: string, ms = 2500) => {
    setToast(msg);
    setTimeout(() => setToast(null), ms);
  };

  const handleClockIn = () => {
    setClockInTime(new Date());
    setTotalBreakMs(0);
    setIsOnBreak(false);
    setBreakStart(null);
    setShiftActive(true);
    showToast("Clock In · " + new Date().toLocaleTimeString());
  };

  const handleBreakToggle = () => {
    if (!shiftActive || !clockInTime) return;
    const now = new Date();
    if (!isOnBreak) {
      setIsOnBreak(true);
      setBreakStart(now);
      showToast("Break started");
    } else if (breakStart) {
      setTotalBreakMs((p) => p + (now.getTime() - breakStart.getTime()));
      setIsOnBreak(false);
      setBreakStart(null);
      showToast("Back on route");
    }
  };

  const handleClockOut = () => {
    if (!shiftActive || !clockInTime) return;
    const now = new Date();
    let breakMs = totalBreakMs;
    if (isOnBreak && breakStart) breakMs += now.getTime() - breakStart.getTime();
    const activeMs = now.getTime() - clockInTime.getTime() - breakMs;
    const hours = Math.max(0, activeMs / 3600000);
    setHoursLog((p) => [{ date: today, hours, clockIn: clockInTime.toISOString(), clockOut: now.toISOString(), breakMs }, ...p].slice(0, 90));
    setShiftActive(false);
    setIsOnBreak(false);
    setBreakStart(null);
    setTotalBreakMs(0);
    setClockInTime(null);
    showToast("Clock Out · " + hours.toFixed(2) + "h saved");
  };

  const grandTotalLive = useMemo(() => {
    const e = parseFloat(tripForm.earnings) || 0;
    const t = parseFloat(tripForm.tips) || 0;
    const ex = parseFloat(tripForm.extra) || 0;
    const tl = parseFloat(tripForm.toll) || 0;
    const f = parseFloat(tripForm.fee) || 0;
    return e + t + ex + tl - f;
  }, [tripForm]);

  const handleSaveTrip = () => {
    if (!tripForm.earnings && !tripForm.tips) {
      showToast("Add at least an earnings or tip amount");
      return;
    }
    const newTrip: Trip = {
      id: Date.now().toString(),
      reference: tripForm.reference,
      earnings: parseFloat(tripForm.earnings) || 0,
      tips: parseFloat(tripForm.tips) || 0,
      extra: parseFloat(tripForm.extra) || 0,
      toll: parseFloat(tripForm.toll) || 0,
      fee: parseFloat(tripForm.fee) || 0,
      platform: tripForm.platform,
      pickup: tripForm.pickup,
      dropoff: tripForm.dropoff,
      notes: tripForm.notes,
      date: tripForm.date,
      time: tripForm.time,
      status: "pending",
    };
    setTrips((p) => [newTrip, ...p]);
    setTripForm(emptyForm());
    showToast("Trip saved to Register");
    setTripsTab("REGISTER");
  };

  const postTrip = (id: string) => {
    setTrips((p) => p.map((t) => (t.id === id ? { ...t, status: "posted" } : t)));
    showToast("Posted to Ledger");
  };

  const pendingTrips = trips.filter((t) => t.status === "pending");
  const postedTrips = trips.filter((t) => t.status === "posted");
  const todayTrips = trips.filter((t) => t.date === today);
  const grossToday = todayTrips.reduce((a, t) => a + t.earnings + t.tips + t.extra + t.toll, 0);
  const activeMsNow = clockInTime ? currentTime.getTime() - clockInTime.getTime() - totalBreakMs - (isOnBreak && breakStart ? currentTime.getTime() - breakStart.getTime() : 0) : 0;
  const activeHoursDecimal = Math.max(0, activeMsNow / 3600000);
  const perHourGross = activeHoursDecimal > 0 ? grossToday / activeHoursDecimal : 0;
  const goalPct = dailyGoal > 0 ? Math.min((grossToday / dailyGoal) * 100, 100) : 0;

  const shiftStatusLabel = shiftActive ? (isOnBreak ? "On break" : "On duty") : "Shift ended";

  const tripFormInput = (label: string, key: keyof typeof tripForm, placeholder = "0.00", isText = false) => (
    <div>
      <label className="text-[9px] text-neutral-500 uppercase tracking-wider block mb-1">{label}</label>
      <input
        type={isText ? "text" : "number"}
        value={tripForm[key]}
        onChange={(e) => setTripForm((s) => ({ ...s, [key]: e.target.value }))}
        placeholder={placeholder}
        className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2.5 font-mono text-[14px] text-white outline-none focus:border-[#d9b64f60]"
      />
    </div>
  );

  const DashboardContent = () => (
    <div className="space-y-5">
      <div>
        <h2 className="text-[24px] font-bold leading-tight">Hola, Miguel.</h2>
        <p className="text-[11px] tracking-[0.18em] mt-1.5 uppercase text-[#f6dd8c]">
          {currentTime.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).toUpperCase()}
        </p>
        <p className="text-[10px] text-neutral-400 mt-1">
          {currentTime.toLocaleTimeString()} {gps.status === "active" && gps.lat && gps.lng ? `· ${gps.lat.toFixed(4)}, ${gps.lng.toFixed(4)}` : gps.status === "searching" ? "· Locating…" : ""}
        </p>
      </div>

      <div className="rounded-[20px] px-4 pt-3.5 pb-3 relative" style={{ background: "#0d0d0d", border: "1px solid #1e1e1e" }}>
        <div className="flex items-center justify-between">
          <p className="font-mono text-[10px] text-neutral-400">
            {currentTime.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} · {currentTime.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
          </p>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[9px] font-bold" style={{
            background: shiftActive && !isOnBreak ? "#052e16" : shiftActive && isOnBreak ? "#1c0d00" : "#111",
            borderColor: shiftActive && !isOnBreak ? "#4ade8066" : shiftActive && isOnBreak ? "#f9731666" : "#2a2a2a",
            color: shiftActive && !isOnBreak ? "#4ade80" : shiftActive && isOnBreak ? "#f97316" : "#737373",
          }}>{shiftStatusLabel}</span>
        </div>
        <p className="font-mono text-[32px] font-black mt-2 tracking-tight text-[#f6dd8c]">${grossToday.toFixed(2)}</p>
        <p className="font-mono text-[10px] text-neutral-400 mt-0.5">{todayTrips.length} {todayTrips.length === 1 ? "trip" : "trips"} today</p>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {(["START", "BREAK", "END"] as const).map((s) => {
            const isActive = (s === "START" && shiftActive && !isOnBreak) || (s === "BREAK" && isOnBreak) || (s === "END" && !shiftActive);
            const disabled = s === "BREAK" && !shiftActive;
            return (
              <button key={s} disabled={disabled}
                onClick={() => (s === "START" ? (!shiftActive ? handleClockIn() : handleBreakToggle()) : s === "BREAK" ? handleBreakToggle() : handleClockOut())}
                className="h-[38px] rounded-full border text-[11px] tracking-[0.12em] font-bold transition-all disabled:cursor-not-allowed"
                style={disabled ? { background: "#0a0a0a", border: "1px solid #1a1a1a", color: "#444" }
                  : isActive ? { background: "linear-gradient(90deg,#f6dd8c,#d9b64f)", border: "1px solid #d9b64f", color: "#000" }
                  : { background: "transparent", border: "1px solid #d9b64f99", color: "#f6dd8c" }}>
                {s === "START" ? "START" : s === "BREAK" ? (isOnBreak ? "RESUME" : "BREAK") : "END SHIFT"}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-[20px] p-4 space-y-3" style={{ background: "#0d0d0d", border: "1px solid #1e1e1e" }}>
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] tracking-[0.18em] font-bold text-[#f6dd8c]">HOY · DAILY GOAL</h3>
          <span className="font-mono text-[13px] font-black text-[#f6dd8c]">{goalPct.toFixed(0)}%</span>
        </div>
        <div className="w-full h-2 rounded-full bg-[#1e1e1e] overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${goalPct}%`, background: goalPct >= 100 ? "#4ade80" : "#f6dd8c" }} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl p-3" style={{ background: "#080808", border: "1px solid #1e1e1e" }}>
            <p className="text-[9px] text-neutral-400 tracking-wider">EARNED</p>
            <p className="font-mono text-[15px] font-black mt-1 text-[#f6dd8c]">${grossToday.toFixed(2)}</p>
          </div>
          <div className="rounded-xl p-3" style={{ background: "#080808", border: "1px solid #1e1e1e" }}>
            <p className="text-[9px] text-neutral-400 tracking-wider">ACTIVE HRS</p>
            <p className="font-mono text-[15px] font-black mt-1 text-[#f6dd8c]">{activeHoursDecimal.toFixed(1)}h</p>
          </div>
          <div className="rounded-xl p-3" style={{ background: "#080808", border: "1px solid #1e1e1e" }}>
            <p className="text-[9px] text-neutral-400 tracking-wider">$/HOUR</p>
            <p className="font-mono text-[15px] font-black mt-1 text-[#f6dd8c]">{perHourGross > 0 ? `$${perHourGross.toFixed(2)}` : "—"}</p>
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-neutral-400">Gross hourly rate target</span>
            <span className="font-mono text-[18px] font-black text-[#f6dd8c]">${goal}/h</span>
          </div>
          <input type="range" min={30} max={100} step={1} value={goal} onChange={(e) => { setGoal(parseInt(e.target.value)); try { localStorage.setItem("ic-hourly-goal", e.target.value); } catch {} }} className="w-full mt-2" />
        </div>
      </div>
    </div>
  );

  const EntryFormContent = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {tripFormInput("Reference #", "reference", "e.g. 1234", true)}
        <div>
          <label className="text-[9px] text-neutral-500 uppercase tracking-wider block mb-1">Platform</label>
          <select value={tripForm.platform} onChange={(e) => setTripForm((s) => ({ ...s, platform: e.target.value }))}
            className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-[13px] text-white outline-none">
            {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>
      {tripFormInput("Pickup", "pickup", "Origin", true)}
      {tripFormInput("Dropoff", "dropoff", "Destination", true)}
      <div className="grid grid-cols-2 gap-3">
        {tripFormInput("Earnings", "earnings")}
        {tripFormInput("Tips", "tips")}
        {tripFormInput("Extra Cash", "extra")}
        {tripFormInput("Toll", "toll")}
        {tripFormInput("Platform Fee", "fee")}
        <div>
          <label className="text-[9px] text-neutral-500 uppercase tracking-wider block mb-1">Date</label>
          <input type="date" value={tripForm.date} onChange={(e) => setTripForm((s) => ({ ...s, date: e.target.value }))}
            className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-[13px] text-white outline-none" />
        </div>
      </div>
      <div>
        <label className="text-[9px] text-neutral-500 uppercase tracking-wider block mb-1">Notes</label>
        <textarea value={tripForm.notes} onChange={(e) => setTripForm((s) => ({ ...s, notes: e.target.value }))}
          className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-[13px] text-white outline-none" rows={2} />
      </div>
      <div className="rounded-xl p-4 text-center" style={{ background: "#0a0a0a", border: "1px solid #1e1e1e" }}>
        <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Net Trip Total</p>
        <p className="font-mono text-[28px] font-black mt-1" style={{ color: grandTotalLive > 0 ? "#facc15" : "#3a3a3a" }}>${grandTotalLive.toFixed(2)}</p>
      </div>
      <button onClick={handleSaveTrip} className="w-full h-12 rounded-full text-[13px] font-black tracking-wider text-black" style={{ background: "linear-gradient(90deg,#f6dd8c,#d9b64f)" }}>
        SAVE TRIP
      </button>
    </div>
  );

  const RegisterContent = () => (
    <div className="space-y-3">
      {pendingTrips.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-[13px] text-neutral-400">All trips posted ✓</p>
          <p className="text-[11px] text-neutral-600 mt-1">Queue is clear — all revenue is in the Ledger</p>
        </div>
      ) : pendingTrips.map((t) => (
        <div key={t.id} className="rounded-xl p-3.5" style={{ background: "#0a0a0a", border: "1px solid #1e1e1e" }}>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[12px] font-semibold text-white">{t.platform} · REF: {t.reference || "—"}</p>
              <p className="text-[11px] text-neutral-400 mt-0.5">{t.pickup || "—"} → {t.dropoff || "—"}</p>
              <p className="text-[10px] text-neutral-600 mt-0.5">{t.date} {t.time}</p>
            </div>
            <p className="font-mono text-[15px] font-bold text-[#f6dd8c]">${(t.earnings + t.tips + t.extra + t.toll - t.fee).toFixed(2)}</p>
          </div>
          <button onClick={() => postTrip(t.id)} className="w-full mt-2.5 h-9 rounded-full text-[11px] font-bold text-black" style={{ background: "#4ade80" }}>
            POST TO LEDGER
          </button>
        </div>
      ))}
    </div>
  );

  const LedgerContent = () => {
    const total = postedTrips.reduce((a, t) => a + t.earnings + t.tips + t.extra + t.toll - t.fee, 0);
    return (
      <div className="space-y-3">
        <div className="rounded-xl p-4 text-center" style={{ background: "#0a0a0a", border: "1px solid #1e1e1e" }}>
          <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Ledger Total</p>
          <p className="font-mono text-[26px] font-black text-[#4ade80]">${total.toFixed(2)}</p>
          <p className="text-[10px] text-neutral-600 mt-1">{postedTrips.length} posted trips</p>
        </div>
        {postedTrips.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-[13px] text-neutral-400">Ledger is empty</p>
            <p className="text-[11px] text-neutral-600 mt-1">Review and approve trips in the Register first</p>
          </div>
        ) : postedTrips.map((t) => (
          <div key={t.id} className="rounded-xl p-3.5" style={{ background: "#0a0a0a", border: "1px solid #1e1e1e" }}>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[12px] font-semibold text-white">{t.platform} · REF: {t.reference || "—"}</p>
                <p className="text-[11px] text-neutral-400 mt-0.5">{t.pickup || "—"} → {t.dropoff || "—"}</p>
                <p className="text-[10px] text-neutral-600 mt-0.5">{t.date} {t.time}</p>
              </div>
              <p className="font-mono text-[15px] font-bold text-[#4ade80]">${(t.earnings + t.tips + t.extra + t.toll - t.fee).toFixed(2)}</p>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const BlankTab = ({ label }: { label: string }) => (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <p className="text-[14px] font-bold text-neutral-400">{label}</p>
      <p className="text-[11px] text-neutral-600 mt-1">Próximamente — esta sección se construirá después</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white pb-20" style={{ maxWidth: 480, margin: "0 auto" }}>
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#1a1a1a] border border-[#333] rounded-full px-4 py-2 text-[12px]">
          {toast}
        </div>
      )}

      {activeTab === "TRIPS" && (
        <div className="sticky top-0 z-20 bg-black border-b border-[#181818] px-4 py-2.5">
          <div className="flex gap-2">
            {([
              { key: "ENTRY", label: "Daily Entry" },
              { key: "REGISTER", label: "Queue", badge: pendingTrips.length },
              { key: "LEDGER", label: "Ledger", badge: postedTrips.length },
            ] as const).map(({ key, label, badge }) => {
              const active = tripsTab === key;
              return (
                <button key={key} onClick={() => setTripsTab(key as TripsTab)}
                  className="flex-1 h-8 rounded-full text-[9px] font-bold tracking-[0.1em] border transition-all relative"
                  style={active ? { background: "#1a1200", borderColor: "#f6dd8c40", color: "#f6dd8c" } : { background: "transparent", borderColor: "#2a2a2a", color: "#737373" }}>
                  {label}{badge ? ` (${badge})` : ""}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="px-4 pb-6 pt-5">
        {activeTab === "DASHBOARD" && <DashboardContent />}
        {activeTab === "TRIPS" && tripsTab === "ENTRY" && <EntryFormContent />}
        {activeTab === "TRIPS" && tripsTab === "REGISTER" && <RegisterContent />}
        {activeTab === "TRIPS" && tripsTab === "LEDGER" && <LedgerContent />}
        {activeTab === "EXPENSES" && <BlankTab label="Expenses" />}
        {activeTab === "FINANCES" && <BlankTab label="Finances" />}
        {activeTab === "REPORTS" && <BlankTab label="Reports" />}
        {activeTab === "AI" && <BlankTab label="AI Assistant" />}
      </div>

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-40 bg-[#030303] border-t border-[#1c1c1c]">
        <div className="flex">
          {([
            { key: "DASHBOARD", Icon: Home, label: "DASH", color: "#f6dd8c" },
            { key: "TRIPS", Icon: Banknote, label: "TRIPS", color: "#fbbf24" },
            { key: "EXPENSES", Icon: Receipt, label: "EXPENSES", color: "#fb923c" },
            { key: "FINANCES", Icon: BarChart2, label: "FINANCE", color: "#60a5fa" },
            { key: "REPORTS", Icon: FileText, label: "REPORTS", color: "#a78bfa" },
            { key: "AI", Icon: Brain, label: "AI", color: "#4ade80" },
          ] as const).map(({ key, Icon, label, color }) => {
            const active = activeTab === key;
            return (
              <button key={key} onClick={() => setActiveTab(key as Tab)}
                className="flex-1 h-[62px] flex flex-col items-center justify-center gap-[3px] relative transition-all"
                style={{ color: active ? color : "#525252" }}>
                <Icon size={active ? 20 : 18} strokeWidth={active ? 2 : 1.5} />
                <span className="text-[8px] font-bold tracking-wider">{label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
