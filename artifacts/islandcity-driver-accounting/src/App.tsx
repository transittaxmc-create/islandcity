// ── IslandCity Tip Tracker · PHASE 1 ────────────────────────────────
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {ChartColumn, ClipboardList, Gauge, Home, Receipt, FileText, Sparkles, Boxes} from "lucide-react";
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
import { computeFinance } from "./screens/finance/financeData";
import type { BankAdjEntry, RecurringPlan, WeekOverrides } from "./screens/finance/financeData";
import { FinanceScreen } from "./screens/finance/FinanceScreen";
import ReportsScreen from "./screens/ReportsScreen";
import AiScreen from "./screens/AiScreen";
import DataScreen from "./screens/DataScreen";
import { GpsStatusBar } from "./components/GpsStatusBar";

type Tab = "ENTRY" | "QUEUE" | "EXPENSES" | "DASH" | "FINANCE" | "REPORTS" | "AI" | "DATA";

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
  const [workDays, setWorkDays] = useState<number[]>(() => {
    try { const v = JSON.parse(localStorage.getItem("ic-work-days") || "[1,2,3,4,5]"); return Array.isArray(v) ? v : [1,2,3,4,5]; } catch { return [1,2,3,4,5]; }
  });
  const [dayTargets, setDayTargets] = useState<Record<number, number>>(() => {
    try { return JSON.parse(localStorage.getItem("ic-day-targets") || "{}"); } catch { return {}; }
  });
  const [weekOverrides, setWeekOverrides] = useState<WeekOverrides>(() => {
    try { return JSON.parse(localStorage.getItem("ic-week-overrides") || "{}"); } catch { return {}; }
  });
  const [recurringPlan, setRecurringPlan] = useState<RecurringPlan>(() => {
    try { const v = JSON.parse(localStorage.getItem("ic-recurring-plan") || "null"); return v && typeof v === "object" ? v : { enabled: false, workDays: [1,2,3,4,5], dayTargets: {}, untilDate: "" }; } catch { return { enabled: false, workDays: [1,2,3,4,5], dayTargets: {}, untilDate: "" }; }
  });
  const [bankBalance, setBankBalance] = useState<number>(() => { const n = parseFloat(localStorage.getItem("ic-bank-balance") || "0"); return isNaN(n) ? 0 : n; });
  const [bankAdjHistory, setBankAdjHistory] = useState<BankAdjEntry[]>(() => {
    try { return JSON.parse(localStorage.getItem("ic-bank-adj-history") || "[]"); } catch { return []; }
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

  useEffect(() => { try { localStorage.setItem("ic-work-days", JSON.stringify(workDays)); } catch {} }, [workDays]);
  useEffect(() => { try { localStorage.setItem("ic-day-targets", JSON.stringify(dayTargets)); } catch {} }, [dayTargets]);
  useEffect(() => { try { localStorage.setItem("ic-week-overrides", JSON.stringify(weekOverrides)); } catch {} }, [weekOverrides]);
  useEffect(() => { try { localStorage.setItem("ic-recurring-plan", JSON.stringify(recurringPlan)); } catch {} }, [recurringPlan]);
  useEffect(() => { try { localStorage.setItem("ic-bank-balance", String(bankBalance)); } catch {} }, [bankBalance]);
  useEffect(() => { try { localStorage.setItem("ic-bank-adj-history", JSON.stringify(bankAdjHistory)); } catch {} }, [bankAdjHistory]);
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

    const shiftActiveRef = useRef(shiftActive);
  useEffect(() => { shiftActiveRef.current = shiftActive; }, [shiftActive]);
  const lastTollTimesRef = useRef(lastTollTimes);
  useEffect(() => { lastTollTimesRef.current = lastTollTimes; }, [lastTollTimes]);
  const gpsWatchId = useRef<number | null>(null);

  const onGpsFix = useCallback((lat: number, lng: number, acc: number) => {
    setGps({ lat, lng, acc });
    if (!shiftActiveRef.current) return;
    const prev = prevGpsRef.current;
    prevGpsRef.current = { lat, lng };
    if (prev && acc < 80) {
      const km = haversineKm(prev.lat, prev.lng, lat, lng);
      if (km > 0.01 && km < 1.5) setShiftMiles((m) => m + km * 0.621371);
    }
    const toll = detectToll(lat, lng, lastTollTimesRef.current);
    if (toll) {
      const amount = tollAmount(toll, new Date());
      const newLastTollTimes = { ...lastTollTimesRef.current, [toll.name]: Date.now() };
      setLastTollTimes(newLastTollTimes);
      try { localStorage.setItem("ic_toll_cooldowns", JSON.stringify(newLastTollTimes)); } catch {}
      if (navigator.vibrate) navigator.vibrate(120);
      showToast(`Toll detectado: ${toll.name} $${amount.toFixed(2)} E-ZPass`);
      setDetectedToll({ toll: toll.name, amount, details: [{ name: toll.name, price: amount }] });
      setTransactions((prev) => {
        const dup = prev.some((x) => x.tollName === toll.name && Date.now() - new Date(x.timestamp).getTime() < 24 * 60 * 60 * 1000);
        if (dup) return prev;
        const tx: EzpTransaction = { id: Math.random().toString(36).slice(2), tollName: toll.name, timestamp: new Date().toISOString(), detectedAmount: amount, status: "pending" };
        const n = [tx, ...prev];
        try { localStorage.setItem("ic_ezp_transactions", JSON.stringify(n)); } catch {}
        return n;
      });
    }
  }, [showToast]);

  const stopGpsWatch = useCallback(() => {
    if (gpsWatchId.current !== null) { navigator.geolocation.clearWatch(gpsWatchId.current); gpsWatchId.current = null; prevGpsRef.current = null; }
  }, []);

  const startGpsWatch = useCallback(() => {
    if (!("geolocation" in navigator) || gpsWatchId.current !== null) return;
    gpsWatchId.current = navigator.geolocation.watchPosition(
      (pos) => onGpsFix(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy),
      () => {},
      { enableHighAccuracy: true, maximumAge: 0, timeout: 12000 },
    );
  }, [onGpsFix]);

  useEffect(() => {
    if (shiftActiveRef.current) startGpsWatch();
    return () => stopGpsWatch();
  }, [startGpsWatch, stopGpsWatch]);


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
    try { localStorage.setItem("ic_shift_start", new Date().toISOString()); } catch {}
    void wakeLock.request();
    startGpsWatch();
    showToast("â–¶ Shift iniciado");
  }, [showToast, wakeLock, startGpsWatch]);

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
    const nowMs = Date.now();
    const brk = shiftBreakStart ? (nowMs - shiftBreakStart) : 0;
    const totalBreakFinal = totalBreakMs + brk;
    const workMs = Math.max((nowMs - (clockInTime ?? nowMs)) - totalBreakFinal, 0);
    setTotalBreakMs(totalBreakFinal);
    setShiftBreakStart(null); setShiftActive(false); setClockInTime(null);
    void wakeLock.release();
    stopGpsWatch();
    try {
      const shiftLog = {
        start: new Date(clockInTime ?? nowMs).toISOString(),
        end: new Date(nowMs).toISOString(),
        totalElapsedMs: Math.max(nowMs - (clockInTime ?? nowMs), 0),
        workingMs: workMs,
        breakMs: totalBreakFinal,
        miles: shiftMiles,
        tollsToday,
        sello: new Date().toISOString(),
      };
      const logs = JSON.parse(localStorage.getItem("ic_shift_logs") || "[]");
      logs.unshift(shiftLog);
      localStorage.setItem("ic_shift_logs", JSON.stringify(logs.slice(0, 50)));
    } catch {}
    showToast("â–  Shift terminado");
  }, [shiftBreakStart, clockInTime, totalBreakMs, shiftMiles, tollsToday, showToast, wakeLock, stopGpsWatch]);

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


  const exportBackup = useCallback(() => {
    try {
      const data: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith("ic_") || k.startsWith("ic-"))) data[k] = localStorage.getItem(k) ?? "";
      }
      const blob = new Blob([JSON.stringify({ app: "IslandCity Tip Tracker", version: 2, exportDate: new Date().toISOString(), data }, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const d = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      a.href = url;
      a.download = `IslandCity_Backup_${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("✓ Backup exportado — úsalo en el otro dispositivo con IMPORT", 5000);
    } catch {
      showToast("✗ No se pudo exportar el backup", 5000);
    }
  }, [showToast]);

  const importFullBackup = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as { app?: string; data?: Record<string, string> };
        if (parsed?.app !== "IslandCity Tip Tracker" || !parsed.data || typeof parsed.data !== "object") {
          throw new Error("No es un backup de IslandCity (usa Legacy import para EI Program)");
        }
        const keys = Object.entries(parsed.data).filter(([k]) => k.startsWith("ic_") || k.startsWith("ic-"));
        for (const [k, v] of keys) localStorage.setItem(k, v);
        showToast(`✓ Backup restaurado (${keys.length} claves) — recargando…`, 3000);
        setTimeout(() => location.reload(), 1200);
      } catch (err) {
        showToast(`✗ ${err instanceof Error ? err.message : "Import failed"}`, 5000);
      }
    };
    reader.readAsText(file);
  }, [showToast]);

  const F = useMemo(() => computeFinance({
    clock,
    entries: state.entries,
    expenses,
    dailyGoal: state.goal,
    workDays,
    dayTargets,
    weekOverrides,
    recurringPlan,
    bankBalance,
  }), [clock, state.entries, expenses, state.goal, workDays, dayTargets, weekOverrides, recurringPlan, bankBalance]);
  const tabs: { key: Tab; label: string; Icon: typeof Home }[] = [
    { key: "ENTRY", label: "ENTRY", Icon: Home },
    { key: "QUEUE", label: "QUEUE", Icon: ClipboardList },
    { key: "EXPENSES", label: "EXPENSES", Icon: Receipt },
    { key: "DASH", label: "DASH", Icon: Gauge },
    { key: "FINANCE", label: "FINANCE", Icon: ChartColumn },
    { key: "REPORTS", label: "REPORTS", Icon: FileText },
    { key: "AI", label: "AI", Icon: Sparkles },
    { key: "DATA", label: "DATA", Icon: Boxes },
  ];

  return (
    <div className="app-shell min-h-screen bg-[#0A0A0A] text-white pb-24" style={{ maxWidth: 480, margin: "0 auto" }}>
      {toast && (
        <div className="fixed top-4 z-50 rounded-full border border-[#FFD70055] bg-[#1a1a1a] px-4 py-2 text-[12px] font-bold text-white" style={{ left: "50%", transform: "translateX(-50%)" }}>
          {toast}
        </div>
      )}
      <div className="px-3 pt-3">
        <GpsStatusBar />
        {tab === "ENTRY" && <EntryScreen addEntry={addEntry} todayLabel={headerDateTime(clock)} onCapture={captureGPS} dayClosed={false} onBreakStart={startBreak} onBreakEnd={endBreak} isOnBreak={isOnBreak} detectedToll={detectedToll} />}
        {tab === "QUEUE" && <QueueScreen entries={openEntries} onEdit={setEditTarget} onEditEntry={editEntry} onDelete={deleteEntry} onPost={postEntry} />}
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
            <button
              onClick={() => setTab("DATA")}
              className="mt-5 h-12 w-full rounded-2xl border border-[#1a1a1a] bg-[#0e0e0e] text-[10px] font-black uppercase tracking-[0.18em] text-neutral-400"
            >
              📦 DATA · BACKUP / RESTORE →
            </button>
          </>
        )}
        {tab === "FINANCE" && (
          <FinanceScreen
            F={F}
            clock={clock}
            expenses={expenses}
            addExpense={addExpense}
            dailyGoal={state.goal}
            workDays={workDays}
            setWorkDays={setWorkDays}
            dayTargets={dayTargets}
            setDayTargets={setDayTargets}
            recurringPlan={recurringPlan}
            setRecurringPlan={setRecurringPlan}
            bankBalance={bankBalance}
            setBankBalance={setBankBalance}
            bankAdjHistory={bankAdjHistory}
            setBankAdjHistory={setBankAdjHistory}
            showToast={showToast}
          />
        )}
        {tab === "REPORTS" && <ReportsScreen entries={state.entries} expenses={expenses} showToast={showToast} />}
        {tab === "AI" && <AiScreen entries={state.entries} expenses={expenses} goal={state.goal} />}
        {tab === "DATA" && (
          <DataScreen
            entries={state.entries}
            expenses={expenses}
            transactions={transactions}
            exportBackup={exportBackup}
            importFullBackup={importFullBackup}
            importLegacy={importLegacy}
          />
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