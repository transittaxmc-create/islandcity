// ── IslandCity Tip Tracker · PHASE 1 ────────────────────────────────
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ClipboardList, Gauge, Home, Receipt } from "lucide-react";
import {
  emptyState,
  fmt,
  headerDateTime,
  todayStr,
  type AppState,
  type EntryRecord,
} from "./lib/domain";
import { detectToll, tollAmount, type EzpTransaction } from "./lib/tolls";
import { type ReceiptRecord } from "./lib/receipts";
import { haversineKm } from "./lib/nycZones";
import { parseLegacyBackup, mergeById } from "./lib/legacyImport";
import { useWakeLock } from "./hooks/useWakeLock";
import DashScreen from "./screens/DashScreen";
import EntryScreen from "./screens/EntryScreen";
import QueueScreen from "./screens/QueueScreen";
import ExpensesScreen from "./screens/ExpensesScreen";

type Tab = "ENTRY" | "QUEUE" | "EXPENSES" | "DASH";

interface BreakRecord {
  id: string;
  type: 'BREAK' | 'LUNCH';
  start: string;
  end?: string;
  duration?: number;
  startPoint: { lat: number; lng: number; address: string };
  endPoint?: { lat: number; lng: number; address: string };
}

export default function App() {
  const [state, setState] = useState<AppState>(() => emptyState());
  const stateRef = useRef(state);
  stateRef.current = state;

  const [tab, setTab] = useState<Tab>("ENTRY");
  const [clock, setClock] = useState(() => new Date());
  const [gps, setGps] = useState<{ lat: number; lng: number; acc: number } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<EntryRecord | null>(null);
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [breaks, setBreaks] = useState<BreakRecord[]>([]);
  const [activeBreak, setActiveBreak] = useState<BreakRecord | null>(null);
  const [expenses, setExpenses] = useState<ReceiptRecord[]>(() => {
    try { return JSON.parse(localStorage.getItem("ic_expenses") || "[]") as ReceiptRecord[]; } catch { return []; }
  });
  const [transactions, setTransactions] = useState<EzpTransaction[]>(() => {
    try { return JSON.parse(localStorage.getItem("ic_ezp_transactions") || "[]") as EzpTransaction[]; } catch { return []; }
  });
  const toastTimer = useRef<number | null>(null);

  const showToast = useCallback((msg: string, ms = 3000) => {
    setToast(msg);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), ms);
  }, []);

  const update = useCallback((fn: (s: AppState) => AppState) => {
    setState((s) => {
      const n = fn(s);
      try { localStorage.setItem("ic_tip_tracker", JSON.stringify(n)); } catch {}
      return n;
    });
  }, []);

  // load
  useEffect(() => {
    try {
      const raw = localStorage.getItem("ic_tip_tracker");
      if (raw) setState(JSON.parse(raw));
    } catch {}
  }, []);

  // clock
  useEffect(() => {
    const id = window.setInterval(() => setClock(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  // GPS + toll detection
  const [lastTollTimes, setLastTollTimes] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem("ic_toll_cooldowns");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [detectedToll, setDetectedToll] = useState<{toll: string; amount: number; details: {name: string; price: number}[]} | null>(null);

  // ── Shift state (persisted, date-guarded — iOS Safari safe) ───────
  const todayISO = new Date().toISOString().slice(0, 10);
  const savedShift = (() => {
    try {
      const s = JSON.parse(localStorage.getItem("ic_shift") || "null") as
        { date?: string; active?: boolean; clockIn?: number | null; breakMs?: number; breakStart?: number | null; miles?: number; hourlyGoal?: number } | null;
      if (s && s.date === todayISO) return s;
    } catch {}
    return null;
  })();
  const [shiftActive, setShiftActive] = useState<boolean>(savedShift?.active ?? false);
  const [clockInTime, setClockInTime] = useState<number | null>(savedShift?.clockIn ?? null);
  const [totalBreakMs, setTotalBreakMs] = useState<number>(savedShift?.breakMs ?? 0);
  const [shiftBreakStart, setShiftBreakStart] = useState<number | null>(savedShift?.breakStart ?? null);
  const [shiftMiles, setShiftMiles] = useState<number>(savedShift?.miles ?? 0);
  const [hourlyGoal, setHourlyGoal] = useState<number>(savedShift?.hourlyGoal ?? 60);
  const prevGpsRef = useRef<{ lat: number; lng: number } | null>(null);
  const wakeLock = useWakeLock();

  useEffect(() => {
    try {
      localStorage.setItem("ic_shift", JSON.stringify({
        date: todayISO, active: shiftActive, clockIn: clockInTime, breakMs: totalBreakMs,
        breakStart: shiftBreakStart, miles: shiftMiles, hourlyGoal,
      }));
    } catch {}
  }, [todayISO, shiftActive, clockInTime, totalBreakMs, shiftBreakStart, shiftMiles, hourlyGoal]);

  const activeHoursDecimal = useMemo(() => {
    if (!shiftActive || !clockInTime) return 0;
    const nowMs = clock.getTime();
    const liveBreak = shiftBreakStart ? Math.max(nowMs - shiftBreakStart, 0) : 0;
    return Math.max((nowMs - clockInTime - totalBreakMs - liveBreak) / 3600000, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shiftActive, clockInTime, totalBreakMs, shiftBreakStart, clock]);

  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    let cancelled = false;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (cancelled) return;
        const { latitude: lat, longitude: lng, accuracy: acc } = pos.coords;
        setGps({ lat, lng, acc });
        // Odometer — haversine deltas with noise filters (acc<80m, 10m–1.5km jumps)
        const prev = prevGpsRef.current;
        prevGpsRef.current = { lat, lng };
        if (prev && acc < 80) {
          const km = haversineKm(prev.lat, prev.lng, lat, lng);
          if (km > 0.01 && km < 1.5) setShiftMiles((m) => m + km * 0.621371);
        }
        const toll = detectToll(lat, lng, lastTollTimes);
        if (toll) {
          const amount = tollAmount(toll, new Date());
          // Update cooldown
          const newLastTollTimes = { ...lastTollTimes, [toll.name]: Date.now() };
          setLastTollTimes(newLastTollTimes);
          try {
            localStorage.setItem("ic_toll_cooldowns", JSON.stringify(newLastTollTimes));
          } catch {}
          
          if (navigator.vibrate) navigator.vibrate(120);
          showToast(`Toll detectado: ${toll.name} $${amount.toFixed(2)} E-ZPass`);
          
          // Auto-fill for Daily Entry
          setDetectedToll({
            toll: toll.name,
            amount,
            details: [{ name: toll.name, price: amount }]
          });

          // Pending E-ZPass tx → reconciliation list (24h dedup guard)
          setTransactions((prev) => {
            const dup = prev.some(
              (x) => x.tollName === toll.name && Date.now() - new Date(x.timestamp).getTime() < 24 * 60 * 60 * 1000,
            );
            if (dup) return prev;
            const tx: EzpTransaction = {
              id: Math.random().toString(36).slice(2),
              tollName: toll.name,
              timestamp: new Date().toISOString(),
              detectedAmount: amount,
              status: "pending",
            };
            const n = [tx, ...prev];
            try { localStorage.setItem("ic_ezp_transactions", JSON.stringify(n)); } catch {}
            return n;
          });
        }
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 0, timeout: 12000 },
    );
    return () => { cancelled = true; navigator.geolocation.clearWatch(watchId); };
  }, [showToast, lastTollTimes]);

  // ── Handlers ──────────────────────────────────────────────────────
  const addEntry = useCallback((e: EntryRecord) => update((s) => ({ ...s, entries: [e, ...s.entries], refCounter: s.refCounter + 1 })), [update]);

  const editEntry = useCallback((e: EntryRecord) => {
    update((s) => ({ ...s, entries: s.entries.map((x) => (x.id === e.id ? e : x)) }));
    setEditTarget(null);
    showToast("✓ Editado");
  }, [showToast, update]);

  const deleteEntry = useCallback((id: string) => {
    update((s) => ({ ...s, entries: s.entries.filter((x) => x.id !== id) }));
    showToast("Eliminado");
  }, [showToast, update]);

  const postEntry = useCallback((id: string) => {
    update((s) => ({ ...s, entries: s.entries.map((x) => (x.id === id ? { ...x, status: "posted" } : x)) }));
    showToast("✓ POSTED → Ledger");
  }, [showToast, update]);

  const addExpense = useCallback((e: ReceiptRecord) => {
    setExpenses((prev) => {
      const n = [e, ...prev];
      try { localStorage.setItem("ic_expenses", JSON.stringify(n)); } catch {}
      return n;
    });
    showToast("✓ Expense guardado");
  }, [showToast]);

  const updateTransaction = useCallback((t: EzpTransaction) => {
    setTransactions((prev) => {
      const n = prev.map((x) => (x.id === t.id ? t : x));
      try { localStorage.setItem("ic_ezp_transactions", JSON.stringify(n)); } catch {}
      return n;
    });
  }, []);

  const startBreak = useCallback(() => {
    const now = new Date();
    const breakRecord: BreakRecord = {
      id: Math.random().toString(36).slice(2),
      type: 'BREAK',
      start: now.toISOString(),
      startPoint: gps ? { lat: gps.lat, lng: gps.lng, address: '' } : { lat: 0, lng: 0, address: '' }
    };
    setActiveBreak(breakRecord);
    setIsOnBreak(true);
    showToast("⏸️ Break/Lunch iniciado");
  }, [gps, showToast]);

  const endBreak = useCallback(() => {
    if (activeBreak) {
      const now = new Date();
      const startTime = new Date(activeBreak.start).getTime();
      const duration = Math.round((now.getTime() - startTime) / 60000); // minutes
      
      const completedBreak: BreakRecord = {
        ...activeBreak,
        end: now.toISOString(),
        duration,
        endPoint: gps ? { lat: gps.lat, lng: gps.lng, address: '' } : undefined
      };
      
      setBreaks(prev => [...prev, completedBreak]);
      setActiveBreak(null);
      setIsOnBreak(false);
      showToast(`✓ Break terminado (${duration} min)`);
    }
  }, [activeBreak, gps, showToast]);


  const captureGPS = useCallback((kind: "pickup" | "dropoff") => {
    if (!gps) { showToast("GPS no activo"); return; }
    showToast(`${kind === "pickup" ? "Pickup" : "Dropoff"} capturado: ${gps.lat.toFixed(4)}, ${gps.lng.toFixed(4)}`);
  }, [gps, showToast]);

  const today = todayStr(clock);
  const openEntries = state.entries.filter((e) => e.status === "open");
  const todayPosted = state.entries.filter((e) => e.datetime.slice(0, 10) === today && e.status === "posted");
  const grossToday = todayPosted.reduce((s, e) => s + e.grossIncome, 0);
  const netToday = todayPosted.reduce((s, e) => s + e.netPayout, 0);

  // ── DASH derived (todayTrips = open+posted of today, per memory rule) ──
  const todayTripsAll = state.entries.filter((e) => e.datetime.slice(0, 10) === today);
  const grossTodayAll = todayTripsAll.reduce((s, e) => s + e.grossIncome, 0);
  const weekStart = (() => { const d = new Date(clock); const dow = (d.getDay() + 6) % 7; d.setDate(d.getDate() - dow); return todayStr(d); })();
  const weeklyTotal = state.entries.filter((e) => e.datetime.slice(0, 10) >= weekStart && e.datetime.slice(0, 10) <= today)
    .reduce((s, e) => s + e.grossIncome, 0);
  const txTs = (t: EzpTransaction) => new Date(t.timestamp).getTime();
  const tollsToday = transactions.filter((t) => txTs(t) >= new Date(today).getTime()).reduce((s, t) => s + t.detectedAmount, 0);
  const tollsWeek = transactions.filter((t) => txTs(t) >= new Date(weekStart).getTime()).reduce((s, t) => s + t.detectedAmount, 0);
  const monthStart = today.slice(0, 8) + "01";
  const tollsMonth = transactions.filter((t) => txTs(t) >= new Date(monthStart).getTime()).reduce((s, t) => s + t.detectedAmount, 0);
  const tollsYear = transactions.filter((t) => new Date(t.timestamp).getFullYear() === clock.getFullYear()).reduce((s, t) => s + t.detectedAmount, 0);

  const startDashShift = useCallback(() => {
    setShiftActive(true); setClockInTime(Date.now()); setTotalBreakMs(0);
    setShiftBreakStart(null); setShiftMiles(0);
    void wakeLock.request();
    showToast("▶ Shift iniciado");
  }, [showToast, wakeLock]);

  const toggleDashBreak = useCallback(() => {
    if (shiftBreakStart) {
      setTotalBreakMs((b) => b + (Date.now() - shiftBreakStart));
      setShiftBreakStart(null);
      showToast("▶ Resumed");
    } else {
      setShiftBreakStart(Date.now());
      showToast("⏸️ Break iniciado");
    }
  }, [shiftBreakStart, showToast]);

  const endDashShift = useCallback(() => {
    if (shiftBreakStart) setTotalBreakMs((b) => b + (Date.now() - shiftBreakStart));
    setShiftBreakStart(null); setShiftActive(false); setClockInTime(null);
    void wakeLock.release();
    showToast("■ Shift terminado");
  }, [shiftBreakStart, showToast, wakeLock]);

  const refreshGps = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude, acc: pos.coords.accuracy ?? 0 }),
      () => showToast("GPS no disponible"),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 12000 },
    );
  }, [showToast]);

  const importLegacy = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const res = parseLegacyBackup(String(reader.result));
        update((s) => ({ ...s, entries: mergeById(s.entries, res.entries), goal: res.goal ?? s.goal }));
        setExpenses((prev) => { const n = mergeById(prev, res.receipts); try { localStorage.setItem("ic_expenses", JSON.stringify(n)); } catch {} return n; });
        setTransactions((prev) => { const n = mergeById(prev, res.transactions); try { localStorage.setItem("ic_ezp_transactions", JSON.stringify(n)); } catch {} return n; });
        showToast(`✓ Importado: ${res.summary.trips} trips · ${res.summary.expenses} expenses · ${res.summary.tolls} tolls`, 5000);
      } catch (err) {
        showToast(`✗ ${err instanceof Error ? err.message : "Import failed"}`, 5000);
      }
    };
    reader.readAsText(file);
  }, [showToast, update]);

  const tabs: { key: Tab; label: string; Icon: typeof Home }[] = [
    { key: "ENTRY", label: "ENTRY", Icon: Home },
    { key: "QUEUE", label: "QUEUE", Icon: ClipboardList },
    { key: "EXPENSES", label: "EXPENSES", Icon: Receipt },
    { key: "DASH", label: "DASH", Icon: Gauge },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white pb-24" style={{ maxWidth: 480, margin: "0 auto" }}>
      {toast && (
        <div className="fixed top-4 z-50 rounded-full border border-[#FFD70055] bg-[#1a1a1a] px-4 py-2 text-[12px] font-bold text-white" style={{ left: "50%", transform: "translateX(-50%)" }}>
          {toast}
        </div>
      )}
      <div className="px-3 pt-3">
        {tab === "ENTRY" && <EntryScreen addEntry={addEntry} todayLabel={headerDateTime(clock)} onCapture={captureGPS} dayClosed={false} onBreakStart={startBreak} onBreakEnd={endBreak} isOnBreak={isOnBreak} detectedToll={detectedToll} />}
        {tab === "QUEUE" && <QueueScreen entries={openEntries} onEdit={setEditTarget} onDelete={deleteEntry} onPost={postEntry} />}
        {tab === "EXPENSES" && <ExpensesScreen entries={state.entries} addExpense={addExpense} expenses={expenses} transactions={transactions} updateTransaction={updateTransaction} />}
        {tab === "DASH" && (
          <>
            <DashScreen
              clock={clock}
              gps={gps}
              todayTrips={todayTripsAll}
              grossToday={grossTodayAll}
              netToday={netToday}
              expenses={expenses}
              weeklyTotal={weeklyTotal}
              shiftActive={shiftActive}
              isOnBreak={!!shiftBreakStart}
              activeHoursDecimal={activeHoursDecimal}
              shiftMiles={shiftMiles}
              hourlyGoal={hourlyGoal}
              setHourlyGoal={setHourlyGoal}
              dailyGoal={state.goal}
              onStart={startDashShift}
              onBreak={toggleDashBreak}
              onEnd={endDashShift}
              onRefreshGps={refreshGps}
              tollsToday={tollsToday}
              tollsWeek={tollsWeek}
              tollsMonth={tollsMonth}
              tollsYear={tollsYear}
            />
            <div className="mt-5 rounded-2xl border border-[#1a1a1a] bg-[#0e0e0e] p-4 text-center">
              <p className="text-[9px] tracking-[0.18em] font-bold text-neutral-500 uppercase">Legacy import · EI Program</p>
              <input
                type="file"
                accept="application/json,.json"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) importLegacy(f); e.target.value = ""; }}
                className="mt-2 w-full text-[11px] text-neutral-400 file:mr-3 file:rounded-lg file:border-0 file:bg-[#FFD700] file:px-3 file:py-2 file:text-[11px] file:font-black file:text-black"
              />
            </div>
          </>
        )}
      </div>
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#1c1c1c] bg-[#030303]" style={{ maxWidth: 480, margin: "0 auto" }}>
        <div className="flex">
          {tabs.map(({ key, label, Icon }) => {
            const active = tab === key;
            return (
              <button key={key} onClick={() => setTab(key)} className="flex h-[62px] flex-1 flex-col items-center justify-center gap-[3px]" style={{ color: active ? "#FFD700" : "#525252" }}>
                <Icon size={active ? 20 : 18} strokeWidth={active ? 2 : 1.5} />
                <span className="text-[8px] font-black tracking-wider">{label}</span>
              </button>
            );
          })}
        </div>
      </div>
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70">
          <div className="w-full max-w-[480px] rounded-t-2xl border-t border-[#FFD70055] bg-[#0e0e0e] p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[12px] font-black text-white">✏️ EDIT · {editTarget.platform}</span>
              <button onClick={() => setEditTarget(null)} className="text-[18px] text-[#8a8a8a]">✕</button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(["earnings", "extraCash", "tips", "toll", "platformFee"] as const).map((k) => (
                <div key={k}>
                  <div className="text-[9px] font-black text-neutral-500">{k.toUpperCase()}</div>
                  <input type="number" step="0.01" value={editTarget[k] ?? ""} onChange={(e) => setEditTarget({ ...editTarget, [k]: parseFloat(e.target.value) || null })}
                    className="mt-1 h-10 w-full rounded-lg border border-[#2a2a2a] bg-black px-2 font-mono text-[14px] font-bold text-white outline-none" />
                </div>
              ))}
            </div>
            <button onClick={() => editEntry(editTarget)} className="mt-3 h-12 w-full rounded-xl bg-[#FFD700] text-[13px] font-black text-black">✓ SAVE</button>
          </div>
        </div>
      )}
    </div>
  );
}