// ── IslandCity Tip Tracker · PHASE 1 ────────────────────────────────
// App shell: state, GPS + toll auto-detection (v8.0), shift, mileage
// tracking, and all PHASE-1 handlers. Source: SPEC-MASTER-tip-tracker.md

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Banknote, ClipboardList, Home, Receipt } from "lucide-react";
import {
  calcNet,
  draftNums,
  emptyEntryDraft,
  fmt,
  headerDateTime,
  nowLabel,
  todayStr,
  tripDate,
  uid,
  type AppState,
  type EntryDraft,
  type LedgerTx,
  type TollHit,
  type Trip,
} from "./lib/domain";
import { detectToll, haversineMiles, isPeak, tollAmount } from "./lib/tolls";
import { downloadTripAuditJson, loadState, saveState, wipeAll } from "./lib/storage";
import { fileToDataUrl, getPhoto, ocrReceipt, putPhoto } from "./lib/receipts";
import { useWakeLock } from "./hooks/useWakeLock";
import { CARD, INPUT_SM, LABEL, pillCls } from "./lib/ui";
import EntryScreen from "./screens/EntryScreen";
import QueueScreen, { type QuickState } from "./screens/QueueScreen";
import LedgerScreen from "./screens/LedgerScreen";
import DashboardScreen from "./screens/DashboardScreen";

type Tab = "ENTRY" | "QUEUE" | "LEDGER" | "DASH";
type GpsFix = { lat: number; lng: number; acc: number };

export default function App() {
  const [state, setState] = useState<AppState>(() => loadState());
  const stateRef = useRef(state);
  stateRef.current = state;

  const [tab, setTab] = useState<Tab>("ENTRY");
  const [clock, setClock] = useState(() => new Date());
  const [draft, setDraft] = useState<EntryDraft>(() => emptyEntryDraft());
  const [gpsFix, setGpsFix] = useState<GpsFix | null>(null);
  const [gpsStatus, setGpsStatus] = useState<"searching" | "active" | "error" | "off">("off");
  const [toast, setToast] = useState<string | null>(null);
  const [confirmBox, setConfirmBox] = useState<{ msg: string; label: string; action: () => void } | null>(null);
  const [quick, setQuick] = useState<QuickState | null>(null);
  const [editing, setEditing] = useState<Trip | null>(null);
  const [editForm, setEditForm] = useState<EntryDraft | null>(null);
  const [tracking, setTracking] = useState(false);
  const trackingRef = useRef(false);
  const lastGps = useRef<{ lat: number; lng: number } | null>(null);
  const milesRun = useRef(0);
  const [liveMiles, setLiveMiles] = useState("0.00");
  const toastTimer = useRef<number | null>(null);
  const wake = useWakeLock();

  const showToast = useCallback((msg: string, ms = 3200) => {
    setToast(msg);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), ms);
  }, []);

  const update = useCallback((fn: (s: AppState) => AppState) => {
    setState((s) => {
      const n = fn(s);
      saveState(n);
      return n;
    });
  }, []);

  // ── Derived ───────────────────────────────────────────────────────
  const today = todayStr(clock);
  const todayLabel = headerDateTime(clock);
  const todayTrips = useMemo(() => state.trips.filter((t) => tripDate(t) === today), [state.trips, today]);
  const grandToday = todayTrips.filter((t) => t.status === "posted").reduce((s, t) => s + t.net, 0);
  const pendingCount = state.trips.filter((t) => t.status !== "posted").length;
  const shiftOn = state.shiftStartedAt != null;
  const hoursWorked = shiftOn ? Math.max(0, (clock.getTime() - state.shiftStartedAt!) / 3600000) : 0;
  const rate = hoursWorked >= 1 / 60 && grandToday > 0 ? grandToday / hoursWorked : grandToday > 0 ? grandToday / Math.max(hoursWorked, 1 / 60) : null;

  const last7 = useMemo(() => {
    const days: { label: string; rate: number | null }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(clock);
      d.setDate(d.getDate() - i);
      const key = todayStr(d);
      const trips = state.trips.filter((t) => tripDate(t) === key && t.status === "posted");
      const sum = trips.reduce((s, t) => s + t.net, 0);
      days.push({ label: d.toLocaleDateString("en-US", { weekday: "narrow" }), rate: sum > 0 ? sum : null });
    }
    return days;
  }, [state.trips, clock]);

  const advisor = useMemo(() => {
    if (!shiftOn) return { text: "Start your shift to see real-time advisory recommendations.", rec: "" };
    if (rate == null || rate <= 0) return { text: "Log your first trip to start calculating.", rec: "" };
    if (rate >= state.goal) return { text: `Great! ${fmt(rate)}/h exceeds your goal of $${state.goal}/h.`, rec: "Stay in current zone. Doing great!" };
    return { text: `${fmt(rate)}/h — below $${state.goal}/h.`, rec: "Move to Manhattan · Activate Lyft for more demand." };
  }, [shiftOn, rate, state.goal]);

  // ── clock tick + autosave ─────────────────────────────────────────
  useEffect(() => {
    const id = window.setInterval(() => setClock(new Date()), 1000);
    const onSave = () => saveState(stateRef.current);
    const onVis = () => document.visibilityState === "hidden" && onSave();
    window.addEventListener("beforeunload", onSave);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("beforeunload", onSave);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  // ── GPS watch + toll detection (v8.0 offline) ─────────────────────
  const milesRef = useRef(0);
  const lastFix = useRef<GpsFix | null>(null);

  const handleFix = useCallback(
    (lat: number, lng: number, acc: number) => {
      setGpsFix({ lat, lng, acc });
      if (lastFix.current) {
        const d = haversineMiles(lastFix.current.lat, lastFix.current.lng, lat, lng);
        if (trackingRef.current && d > 0.005) {
          milesRef.current += d;
          setDraft((prev) => ({ ...prev, miles: milesRef.current.toFixed(1) }));
          setLiveMiles(milesRef.current.toFixed(1));
        }
      }
      lastFix.current = { lat, lng, acc };

      const s = stateRef.current;
      const toll = detectToll(lat, lng, s.lastTollTimes, new Date());
      if (toll) {
        const amount = tollAmount(toll, new Date());
        const hit: TollHit = {
          id: uid(),
          name: toll.name,
          amount,
          timestamp: Date.now(),
          date: todayStr(),
          displayTime: nowLabel(),
          lat,
          lng,
          peak: isPeak(),
        };
        update((st) => ({
          ...st,
          tollLog: [hit, ...st.tollLog].slice(0, 60),
          lastTollTimes: { ...st.lastTollTimes, [toll.name]: Date.now() },
        }));
        setDraft((prev) => ({ ...prev, tollReimb: ((parseFloat(prev.tollReimb) || 0) + amount).toFixed(2) }));
        if (navigator.vibrate) navigator.vibrate(120);
        showToast(`Toll detectado: ${toll.name} ${fmt(amount)} E-ZPass`);
      }
    },
    [showToast, update],
  );

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setGpsStatus("off");
      return;
    }
    setGpsStatus("searching");
    let cancelled = false;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => handleFix(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy),
      () => {
        if (!cancelled) setGpsStatus("error");
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 12000 },
    );
    return () => {
      cancelled = true;
      navigator.geolocation.clearWatch(watchId);
    };
  }, [handleFix]);

  const toggleTracking = useCallback(() => {
    if (!trackingRef.current) {
      trackingRef.current = true;
      milesRef.current = draftNums(draft).miles || 0;
      setTracking(true);
      showToast("▶ START TRACKING — tap before you start driving");
    } else {
      trackingRef.current = false;
      setTracking(false);
      showToast(`⏹ tracking detenido · ${milesRef.current.toFixed(1)} mi`);
    }
  }, [draft, showToast]);

  const capture = useCallback(
    (kind: "origin" | "destination") => {
      if (!gpsFix) {
        showToast("GPS no activo — espera a que se fije la posición");
        return;
      }
      const tag = `${gpsFix.lat.toFixed(4)}, ${gpsFix.lng.toFixed(4)}`;
      setDraft((prev) =>
        kind === "origin" ? { ...prev, origin: tag, originTag: `±${Math.round(gpsFix.acc)}m` } : { ...prev, destination: tag, destTag: `±${Math.round(gpsFix.acc)}m` },
      );
      showToast(`${kind === "origin" ? "Origen" : "Destino"} capturado · ${tag}`);
    },
    [gpsFix, showToast],
  );

  // ── shift ─────────────────────────────────────────────────────────
  const startShift = useCallback(() => {
    update((s) => ({ ...s, shiftStartedAt: Date.now() }));
    void wake.request();
    showToast("Shift started · Clock In");
  }, [showToast, update, wake]);

  const endShift = useCallback(() => {
    update((s) => ({ ...s, shiftStartedAt: null }));
    void wake.release();
    showToast("Shift ended");
  }, [showToast, update, wake]);

  // ── trip save ─────────────────────────────────────────────────────
  const saveTrip = useCallback(() => {
    if (stateRef.current.closedDays[todayStr()]) {
      showToast("🔒 Día cerrado — viajes bloqueados");
      return;
    }
    const n = draftNums(draft);
    if (n.gross <= 0) {
      showToast("Ingresa un monto de Gross Fare válido");
      return;
    }
    const trip: Trip = {
      id: uid(),
      ref: `IC-${String(stateRef.current.refCounter).padStart(4, "0")}`,
      fareType: draft.fareType,
      platform: draft.platform,
      gross: n.gross,
      tips: n.tips,
      cashRec: n.cashRec,
      tollReimb: n.tollReimb,
      comm: n.comm,
      net: calcNet(n.gross, n.tips, n.cashRec, n.tollReimb, n.comm),
      date: todayStr(),
      displayTime: nowLabel(),
      timestamp: Date.now(),
      origin: { text: draft.origin, lat: null, lng: null, acc: null },
      destination: { text: draft.destination, lat: null, lng: null, acc: null },
      tripMiles: n.miles,
      notes: draft.notes.trim(),
      receipts: [],
      status: "queued",
    };
    update((s) => ({ ...s, trips: [trip, ...s.trips], refCounter: s.refCounter + 1 }));
    if (stateRef.current.autoDownloadJson) downloadTripAuditJson(trip);
    milesRef.current = 0;
    setLiveMiles("0.00");
    setTracking(false);
    trackingRef.current = false;
    setDraft(emptyEntryDraft());
    showToast(`Grabado ${fmt(trip.net)} · ${trip.ref} · ${trip.platform}`);
  }, [draft, showToast, update]);

  // ── Queue handlers ────────────────────────────────────────────────
  const quickSave = useCallback(
    (id: string) => {
      if (!quick) return;
      const gross = parseFloat(quick.gross) || 0;
      const tips = parseFloat(quick.tips) || 0;
      const cashRec = parseFloat(quick.cashRec) || 0;
      const tollReimb = parseFloat(quick.tollReimb) || 0;
      const comm = parseFloat(quick.comm) || 0;
      update((s) => ({
        ...s,
        trips: s.trips.map((t) =>
          t.id === id
            ? { ...t, gross, tips, cashRec, tollReimb, comm, net: calcNet(gross, tips, cashRec, tollReimb, comm) }
            : t,
        ),
      }));
      setQuick(null);
      showToast("✓ Viaje actualizado");
    },
    [quick, showToast, update],
  );

  const openFullEdit = useCallback((t: Trip) => {
    setEditing(t);
    setEditForm({
      fareType: t.fareType,
      platform: t.platform,
      gross: String(t.gross),
      tips: String(t.tips),
      cashRec: String(t.cashRec),
      tollReimb: String(t.tollReimb),
      comm: String(t.comm),
      origin: t.origin.text,
      originTag: t.origin.acc != null ? String(t.origin.acc) : "",
      destination: t.destination.text,
      destTag: "",
      miles: String(t.tripMiles),
      notes: t.notes,
    });
  }, []);

  const saveFullEdit = useCallback(() => {
    if (!editing || !editForm) return;
    const n = draftNums(editForm);
    update((s) => ({
      ...s,
      trips: s.trips.map((t) =>
        t.id === editing.id
          ? {
              ...t,
              fareType: editForm.fareType,
              platform: editForm.platform,
              gross: n.gross,
              tips: n.tips,
              cashRec: n.cashRec,
              tollReimb: n.tollReimb,
              comm: n.comm,
              net: calcNet(n.gross, n.tips, n.cashRec, n.tollReimb, n.comm),
              origin: { ...t.origin, text: editForm.origin },
              destination: { ...t.destination, text: editForm.destination },
              tripMiles: n.miles,
              notes: editForm.notes.trim(),
            }
          : t,
      ),
    }));
    setEditing(null);
    setEditForm(null);
    showToast("✓ Full edit guardado");
  }, [editing, editForm, showToast, update]);

  const deleteTrip = useCallback(
    (id: string) => {
      const t = stateRef.current.trips.find((x) => x.id === id);
      if (t && stateRef.current.closedDays[tripDate(t)]) {
        showToast("🔒 Día cerrado — no se puede borrar");
        return;
      }
      setConfirmBox({
        msg: `¿Borrar viaje ${t?.ref ?? ""} (${t ? fmt(t.net) : ""})?`,
        label: "🗑 DELETE",
        action: () => {
          update((s) => ({ ...s, trips: s.trips.filter((x) => x.id !== id) }));
          showToast("Viaje eliminado");
        },
      });
    },
    [showToast, update],
  );

  const postTrip = useCallback(
    (id: string) => {
      update((s) => ({ ...s, trips: s.trips.map((t) => (t.id === id ? { ...t, status: "posted" } : t)) }));
      showToast("✓ POSTED — ya cuenta en Dashboard");
    },
    [showToast, update],
  );

  // ── Ledger handlers ───────────────────────────────────────────────
  const closeDay = useCallback(() => {
    const s = stateRef.current;
    const today = todayStr();
    const total = s.tollLog.filter((h) => h.date === today).reduce((acc, h) => acc + h.amount, 0);
    if (total <= 0) {
      showToast("No hay tolls GPS hoy para cerrar");
      return;
    }
    if (s.txs.some((t) => t.type === "EZPASS_DAILY" && t.sourceDate === today && t.status === "POR_PAGAR")) {
      showToast("Ya existe E-ZPass POR PAGAR para hoy");
      return;
    }
    const count = s.tollLog.filter((h) => h.date === today).length;
    const tx: LedgerTx = {
      id: uid(),
      type: "EZPASS_DAILY",
      title: "E-ZPass NY",
      amount: total,
      status: "POR_PAGAR",
      date: today,
      displayTime: nowLabel(),
      notes: `${count} peajes GPS`,
      sourceDate: today,
    };
    update((st) => ({ ...st, txs: [tx, ...st.txs], closedDays: { ...st.closedDays, [today]: true } }));
    showToast(`🔒 Día cerrado · E-ZPass POR PAGAR ${fmt(total)}`);
  }, [showToast, update]);

  const scanEzPass = useCallback(
    async (tx: LedgerTx, file: File) => {
      try {
        const dataUrl = await fileToDataUrl(file);
        const photoKey = `receipt-${tx.id}-${Date.now()}`;
        await putPhoto(photoKey, dataUrl);
        const ocr = await ocrReceipt(dataUrl);
        let amount = ocr?.amount;
        let notes = ocr?.vendor ? `OCR: ${ocr.vendor}` : "";
        if (amount == null) {
          const v = window.prompt("No se pudo leer el monto. Ingresa el total E-ZPass:");
          if (v == null) {
            showToast("Escaneo cancelado");
            return;
          }
          amount = parseFloat(v) || 0;
          notes += " (manual)";
        }
        update((s) => ({
          ...s,
          txs: s.txs.map((x) => (x.id === tx.id ? { ...x, status: "PAGADO", amount, notes, photoKey } : x)),
        }));
        showToast(`✓ E-ZPass PAGADO · ${fmt(amount)}`);
      } catch (e) {
        showToast("Error al procesar el recibo");
        console.warn(e);
      }
    },
    [showToast, update],
  );

  const addReceipt = useCallback(
    async (file: File) => {
      try {
        const dataUrl = await fileToDataUrl(file);
        const photoKey = `receipt-${uid()}-${Date.now()}`;
        await putPhoto(photoKey, dataUrl);
        const ocr = await ocrReceipt(dataUrl);
        let amount = ocr?.amount;
        let notes = ocr?.vendor ? `OCR: ${ocr.vendor}` : "";
        if (amount == null) {
          const v = window.prompt("Monto del recibo:");
          if (v == null) {
            showToast("Cancelado");
            return;
          }
          amount = parseFloat(v) || 0;
          notes += " (manual)";
        }
        const tx: LedgerTx = {
          id: uid(),
          type: "RECEIPT",
          title: ocr?.vendor || "Recibo",
          amount,
          status: "PAID",
          date: todayStr(),
          displayTime: nowLabel(),
          notes,
          photoKey,
        };
        update((s) => ({ ...s, txs: [tx, ...s.txs] }));
        showToast(`📎 Recibo agregado · ${fmt(amount)}`);
      } catch (e) {
        showToast("Error al procesar el recibo");
        console.warn(e);
      }
    },
    [showToast, update],
  );

  const nextRef = `IC-${String(state.refCounter).padStart(4, "0")}`;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white pb-24" style={{ maxWidth: 480, margin: "0 auto" }}>
      {toast && (
        <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-full border border-[#FFD70055] bg-[#1a1a1a] px-4 py-2 text-[12px] font-bold text-white">
          {toast}
        </div>
      )}

      <div className="px-3 pt-3">
        {tab === "ENTRY" && (
          <EntryScreen
            draft={draft}
            setDraft={setDraft}
            todayLabel={todayLabel}
            nextRef={nextRef}
            gpsFix={gpsFix}
            tracking={tracking}
            liveMiles={liveMiles}
            onToggleTracking={toggleTracking}
            onCapture={capture}
            onSave={saveTrip}
            dayClosed={!!state.closedDays[today]}
            shiftOn={shiftOn}
          />
        )}
        {tab === "QUEUE" && (
          <QueueScreen
            trips={state.trips}
            closedDays={state.closedDays}
            quick={quick}
            setQuick={setQuick}
            onQuickSave={quickSave}
            onFullEdit={openFullEdit}
            onDelete={deleteTrip}
            onPost={postTrip}
            pendingCount={pendingCount}
          />
        )}
        {tab === "LEDGER" && (
          <LedgerScreen
            txs={state.txs}
            tollLog={state.tollLog}
            today={today}
            getPhoto={getPhoto}
            onScanEzPass={scanEzPass}
            onAddReceipt={addReceipt}
            onCloseDay={closeDay}
          />
        )}
        {tab === "DASH" && (
          <DashboardScreen
            todayLabel={todayLabel}
            shiftOn={shiftOn}
            rate={rate}
            grandToday={grandToday}
            target={state.goal}
            hoursWorked={hoursWorked}
            last7={last7}
            advisor={advisor}
            onStartShift={startShift}
            onEndShift={endShift}
          />
        )}
      </div>

      {/* bottom nav */}
      <div className="fixed bottom-0 left-1/2 z-40 w-full max-w-[480px] -translate-x-1/2 border-t border-[#1c1c1c] bg-[#030303]">
        <div className="flex">
          {(
            [
              { key: "ENTRY", label: "ENTRY", Icon: Banknote },
              { key: "QUEUE", label: "QUEUE", Icon: ClipboardList },
              { key: "LEDGER", label: "LEDGER", Icon: Receipt },
              { key: "DASH", label: "DASH", Icon: Home },
            ] as const
          ).map(({ key, label, Icon }) => {
            const active = tab === key;
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                className="flex h-[62px] flex-1 flex-col items-center justify-center gap-[3px]"
                style={{ color: active ? "#FFD700" : "#525252" }}
              >
                <Icon size={active ? 20 : 18} strokeWidth={active ? 2 : 1.5} />
                <span className="text-[8px] font-black tracking-wider">{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* full edit modal */}
      {editing && editForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70">
          <div className="w-full max-w-[480px] rounded-t-2xl border-t border-[#FFD70055] bg-[#0e0e0e] p-4">
            <div className="flex items-center justify-between">
              <span className={LABEL}>FULL EDIT · {editing.ref}</span>
              <button onClick={() => { setEditing(null); setEditForm(null); }} className="text-[20px] text-[#8a8a8a]">✕</button>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {(
                [
                  ["gross", "GROSS"],
                  ["tips", "TIPS"],
                  ["cashRec", "CASH"],
                  ["tollReimb", "TOLL R."],
                  ["comm", "COMM"],
                  ["miles", "MILES"],
                ] as const
              ).map(([k, lbl]) => (
                <div key={k}>
                  <div className="text-[9px] font-black text-[#6f6f6f]">{lbl}</div>
                  <input
                    type="number"
                    step="0.01"
                    value={editForm[k]}
                    onChange={(e) => setEditForm({ ...editForm, [k]: e.target.value })}
                    className="w-full rounded-lg border border-[#2a2a2a] bg-black px-2 py-2 font-mono text-[15px] font-black text-white outline-none"
                  />
                </div>
              ))}
            </div>
            <div className="mt-2">
              <div className="text-[9px] font-black text-[#6f6f6f]">PLATFORM</div>
              <input
                value={editForm.platform}
                onChange={(e) => setEditForm({ ...editForm, platform: e.target.value })}
                className="w-full rounded-lg border border-[#2a2a2a] bg-black px-2 py-2 text-[14px] font-bold text-white outline-none"
              />
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div>
                <div className="text-[9px] font-black text-[#6f6f6f]">ORIGIN</div>
                <input
                  value={editForm.origin}
                  onChange={(e) => setEditForm({ ...editForm, origin: e.target.value })}
                  className="w-full rounded-lg border border-[#2a2a2a] bg-black px-2 py-2 text-[12px] text-white outline-none"
                />
              </div>
              <div>
                <div className="text-[9px] font-black text-[#6f6f6f]">DESTINATION</div>
                <input
                  value={editForm.destination}
                  onChange={(e) => setEditForm({ ...editForm, destination: e.target.value })}
                  className="w-full rounded-lg border border-[#2a2a2a] bg-black px-2 py-2 text-[12px] text-white outline-none"
                />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-[9px] font-black text-[#6f6f6f]">NOTES</div>
              <input
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                className="w-full rounded-lg border border-[#2a2a2a] bg-black px-2 py-2 text-[12px] text-white outline-none"
              />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button onClick={() => { setEditing(null); setEditForm(null); }} className="h-12 rounded-xl border border-[#2a2a2a] text-[12px] font-black text-[#8a8a8a]">
                CANCEL
              </button>
              <button onClick={saveFullEdit} className="h-12 rounded-xl bg-[#FFD700] text-[12px] font-black text-black">
                ✓ SAVE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* confirm box */}
      {confirmBox && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-6">
          <div className="w-full max-w-[400px] rounded-2xl border border-[#2a2a2a] bg-[#0e0e0e] p-5">
            <div className="text-[14px] font-bold text-white">{confirmBox.msg}</div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button onClick={() => setConfirmBox(null)} className="h-12 rounded-xl border border-[#2a2a2a] text-[12px] font-black text-[#8a8a8a]">
                CANCEL
              </button>
              <button
                onClick={() => {
                  confirmBox.action();
                  setConfirmBox(null);
                }}
                className="h-12 rounded-xl bg-[#f87171] text-[12px] font-black text-black"
              >
                {confirmBox.label}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}