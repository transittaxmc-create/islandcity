// ── IslandCity Tip Tracker · PHASE 1 ────────────────────────────────
import { useCallback, useEffect, useRef, useState } from "react";
import { ClipboardList, Gauge, Home } from "lucide-react";
import {
  emptyState,
  fmt,
  headerDateTime,
  todayStr,
  type AppState,
  type EntryRecord,
} from "./lib/domain";
import { detectToll, tollAmount } from "./lib/tolls";
import EntryScreen from "./screens/EntryScreen";
import QueueScreen from "./screens/QueueScreen";

type Tab = "ENTRY" | "QUEUE" | "DASH";

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

  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    let cancelled = false;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (cancelled) return;
        const { latitude: lat, longitude: lng, accuracy: acc } = pos.coords;
        setGps({ lat, lng, acc });
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
  const tabs: { key: Tab; label: string; Icon: typeof Home }[] = [
    { key: "ENTRY", label: "ENTRY", Icon: Home },
    { key: "QUEUE", label: "QUEUE", Icon: ClipboardList },
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
        {tab === "DASH" && (
          <div className="space-y-3 pb-4">
            <div className="rounded-2xl border border-[#1a1a1a] bg-[#0e0e0e] p-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">DASHBOARD</span>
                <span className="text-[11px] font-semibold text-[#8a8a8a]">{headerDateTime(clock)}</span>
              </div>
              <div className="mt-1 font-mono text-[34px] font-black leading-none" style={{ color: "#15803D" }}>{fmt(netToday)}</div>
              <div className="mt-1 text-[9px] font-bold text-[#6f6f6f]">NET TODAY · {todayPosted.length} trips posted</div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-black p-3 text-center">
                <div className="text-[8px] font-bold text-neutral-500">GROSS TODAY</div>
                <div className="font-mono text-[18px] font-black text-[#FFD700]">{fmt(grossToday)}</div>
              </div>
              <div className="rounded-xl bg-black p-3 text-center">
                <div className="text-[8px] font-bold text-neutral-500">NET TODAY</div>
                <div className="font-mono text-[18px] font-black text-[#00FF6A]">{fmt(netToday)}</div>
              </div>
            </div>
          </div>
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