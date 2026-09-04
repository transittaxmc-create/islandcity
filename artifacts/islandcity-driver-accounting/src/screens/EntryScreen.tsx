// ── Daily Entry · main income entry (spec DOC FINAL RESTRUCTURED) ─────
// Spec DOC: DAILY Entry + Queue + Mileage GPS + Break/Lunch logic
import { useEffect, useRef, useState, useCallback } from "react";
import { ChevronDown } from "lucide-react";
import { PLATFORMS, calcGross, calcNet, fmt, platformLogo, type EntryRecord, type PlatformType } from "../lib/domain";
import { useLocation } from "../hooks/useLocation";
import { getPlaceIcon } from "../lib/mileage";

interface Props {
  addEntry: (e: EntryRecord) => void;
  todayLabel: string;
  onCapture: (kind: "pickup" | "dropoff") => void;
  dayClosed: boolean;
  onBreakStart: () => void;
  onBreakEnd: () => void;
  isOnBreak: boolean;
  detectedToll: { toll: string; amount: number; details: { name: string; price: number }[] } | null;
}

const STORAGE_KEY = "islandcity:draft:entry";

interface DraftState {
  platform: string;
  earnings: string;
  extraCash: string;
  tips: string;
  toll: string;
  fee: string;
  pickup: string;
  dropoff: string;
  invoiceRef: string;
  notes: string;
  pickupTimestamp: string | null;
  dropoffTimestamp: string | null;
}

export default function EntryScreen({ addEntry, todayLabel, onCapture, dayClosed, onBreakStart, onBreakEnd, isOnBreak, detectedToll }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [platform, setPlatform] = useState("Uber");
  const [earnings, setEarnings] = useState("");
  const [extraCash, setExtraCash] = useState("");
  const [tips, setTips] = useState("");
  const [toll, setToll] = useState("");
  const [fee, setFee] = useState("");
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [invoiceRef, setInvoiceRef] = useState("");
  const [notes, setNotes] = useState("");
  const [tollDetails, setTollDetails] = useState<{ name: string; price: number }[]>([]);
  const [pickupTimestamp, setPickupTimestamp] = useState<string | null>(null);
  const [dropoffTimestamp, setDropoffTimestamp] = useState<string | null>(null);

  const { getCurrentLocation } = useLocation();

  // ── Restore draft from localStorage on mount ──
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const draft: DraftState = JSON.parse(raw);
        setPlatform(draft.platform || "Uber");
        setEarnings(draft.earnings || "");
        setExtraCash(draft.extraCash || "");
        setTips(draft.tips || "");
        setToll(draft.toll || "");
        setFee(draft.fee || "");
        setPickup(draft.pickup || "");
        setDropoff(draft.dropoff || "");
        setInvoiceRef(draft.invoiceRef || "");
        setNotes(draft.notes || "");
        setPickupTimestamp(draft.pickupTimestamp || null);
        setDropoffTimestamp(draft.dropoffTimestamp || null);
      }
    } catch {
      // corrupted draft — start fresh
    }
  }, []);

  // ── Auto-save draft to localStorage on every change ──
  const saveDraft = useCallback(() => {
    const draft: DraftState = {
      platform, earnings, extraCash, tips, toll, fee, pickup, dropoff, invoiceRef, notes, pickupTimestamp, dropoffTimestamp,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  }, [platform, earnings, extraCash, tips, toll, fee, pickup, dropoff, invoiceRef, notes, pickupTimestamp, dropoffTimestamp]);

  useEffect(() => { saveDraft(); }, [saveDraft]);

  // ── Close dropdown when clicking outside ──
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // ── Auto-fill toll from GPS detection ──
  useEffect(() => {
    if (!detectedToll) return;
    const currentToll = parseFloat(toll) || 0;
    const newTollAmount = currentToll + detectedToll.amount;
    setToll(newTollAmount.toFixed(2));
    setTollDetails((prev) => [...prev, ...detectedToll.details.filter((d) => !prev.some((p) => p.name === d.name))]);

    const allDetails = [...tollDetails, ...detectedToll.details.filter((d) => !tollDetails.some((p) => p.name === d.name))];
    const breakdown = allDetails.map((td) => `${td.name} $${td.price.toFixed(2)}`).join("\n");
    const notesText =
      allDetails.length > 1
        ? `TOLLS:\n${breakdown}\nTotal: $${allDetails.reduce((sum, td) => sum + td.price, 0).toFixed(2)}`
        : `TOLL: ${breakdown}`;
    setNotes(notesText);
  }, [detectedToll]);

  const platformType: PlatformType = PLATFORMS.find((p) => p.name === platform)?.type ?? "RIDESHARE";
  const showInvoice = platformType === "VOUCHER" || platformType === "ACCESS";
  const nEarnings = parseFloat(earnings) || 0;
  const nExtra = parseFloat(extraCash) || 0;
  const nTips = parseFloat(tips) || 0;
  const nToll = parseFloat(toll) || 0;
  const nFee = parseFloat(fee) || 0;
  const gross = calcGross(nEarnings, nExtra, nTips, nToll);
  const net = calcNet(gross, nFee);

  const captureLocation = async (kind: "pickup" | "dropoff") => {
    const now = new Date().toISOString();
    try {
      const gpsPoint = await getCurrentLocation();
      const placeIcon = getPlaceIcon(gpsPoint.placeType || "business");
      const locationString = `${placeIcon} ${gpsPoint.businessName || "Detected Location"}\n${gpsPoint.address || ""}`;

      if (kind === "pickup") {
        setPickup(locationString);
        setPickupTimestamp(now);
      } else {
        setDropoff(locationString);
        setDropoffTimestamp(now);
      }
      onCapture(kind);
    } catch {
      if (kind === "pickup") {
        setPickupTimestamp(now);
      } else {
        setDropoffTimestamp(now);
      }
      onCapture(kind);
    }
  };

  const submit = () => {
    if (!earnings || nEarnings <= 0 || dayClosed) return;

    const now = new Date().toISOString();
    const record: EntryRecord = {
      id: `e-${Date.now()}`,
      datetime: now,
      platform,
      platformType,
      earnings: nEarnings,
      extraCash: nExtra || null,
      tips: nTips || null,
      toll: nToll || null,
      tollDetails,
      platformFee: nFee || null,
      grossIncome: gross,
      netPayout: net,
      pickup: { address: pickup, businessName: "", lat: 0, lng: 0, type: "", icon: "", timestamp: pickupTimestamp || now },
      dropoff: { address: dropoff, businessName: "", lat: 0, lng: 0, type: "", icon: "", timestamp: dropoffTimestamp || now },
      invoiceRef: invoiceRef || undefined,
      notes,
      status: "open",
    };

    addEntry(record);
    localStorage.removeItem(STORAGE_KEY);

    setEarnings("");
    setExtraCash("");
    setTips("");
    setToll("");
    setFee("");
    setPickup("");
    setDropoff("");
    setInvoiceRef("");
    setNotes("");
    setTollDetails([]);
    setPickupTimestamp(null);
    setDropoffTimestamp(null);
  };

        const field = (label: string, value: string, setter: (v: string) => void, placeholder: string, colorClass: string = "#1E3A8A") => (
    <div>
      <label className={`text-[10px] font-black uppercase tracking-wider` + (colorClass ? ` text-[color:${colorClass}]` : ` text-neutral-400`)}> {label}</label>
      <input
        type="number"
        step="0.01"
        inputMode="decimal"
        value={value}
        onChange={(e) => setter(e.target.value)}
        placeholder={placeholder}
        className="mt-1 h-12 w-full rounded-xl border border-[#2a2a2a] bg-black px-3 text-[13px] text-white outline-none placeholder:text-neutral-500"
      />
    </div>
  );

  return (
        <div className="daily-entry-container overflow-y-auto pb-24">
      {/* ═══ BLOQUE 1: HEADER (Plataforma + Break/Lunch) ═══ */}
      <div className="section-header flex items-center justify-between rounded-2xl border border-[#1a1a1a] bg-[#0e0e0e] p-4">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">DAILY ENTRY</span>
          <span className="text-[11px] font-semibold text-[#8a8a8a]">{todayLabel}</span>
        </div>
        <div className="relative" ref={ref}>
          <button onClick={() => setOpen(!open)} className="flex h-10 items-center gap-2 rounded-lg border border-[#2a2a2a] bg-black px-3 text-[12px] text-white">
            {platformLogo(platform) && <img src={platformLogo(platform)!} alt="" className="h-5 w-5 rounded-full object-cover" />}
            <span className="font-semibold">{platform}</span>
            <ChevronDown className="h-3 w-3 text-neutral-400" />
          </button>
          {open && (
            <div className="absolute right-0 top-full z-50 mt-1 max-h-60 w-48 overflow-y-auto rounded-xl border border-[#2a2a2a] bg-[#0e0e0e] shadow-xl">
              {PLATFORMS.map((p) => (
                <button key={p.name} onClick={() => { setPlatform(p.name); setOpen(false); }} className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] hover:bg-[#1a1a1a] ${p.name === platform ? "bg-[#1a1a1a] text-white" : "text-neutral-300"}`}>
                  {p.logo && <img src={`${import.meta.env.BASE_URL}logos/${p.logo}`} alt="" className="h-5 w-5 rounded-full object-cover" />}
                  <span className="font-medium">{p.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Break/Lunch button */}
      {!dayClosed && (
        <div className="mt-2 flex gap-2">
          {!isOnBreak ? (
            <button onClick={onBreakStart} className="flex-1 h-10 rounded-lg border border-[#F59E0B] bg-[#F59E0B]/10 text-[11px] font-black text-[#F59E0B]">⏸️ BREAK/LUNCH</button>
          ) : (
            <button onClick={onBreakEnd} className="flex-1 h-10 rounded-lg bg-[#F59E0B] text-[11px] font-black text-black">▶️ END BREAK</button>
          )}
        </div>
      )}

      {/* ═══ BLOQUE 2: OPERACIÓN / ACCIÓN RÁPIDA ═══ */}
      <div className="section-operational rounded-2xl border border-[#1a1a1a] bg-[#0e0e0e] p-4">
        <div className="operational-grid">
          <div className="flex flex-col">
            <div className="text-[10px] font-black uppercase tracking-wider text-neutral-400">PICKUP</div>
            <input value={pickup} onChange={(e) => setPickup(e.target.value)} placeholder="Tap GPS or enter address" className="mt-1 h-12 w-full rounded-xl border border-[#2a2a2a] bg-black px-3 text-[13px] text-white outline-none placeholder:text-neutral-500" />
            <button onClick={() => captureLocation("pickup")} className="btn-pickup mt-2 flex h-10 w-full items-center justify-center rounded-lg">📍 PICKUP NOW</button>
          </div>
          <div className="flex flex-col">
            <div className="text-[10px] font-black uppercase tracking-wider text-neutral-400">DROPOFF</div>
            <input value={dropoff} onChange={(e) => setDropoff(e.target.value)} placeholder="Tap GPS or enter address" className="mt-1 h-12 w-full rounded-xl border border-[#2a2a2a] bg-black px-3 text-[13px] text-white outline-none placeholder:text-neutral-500" />
            <button onClick={() => captureLocation("dropoff")} className="btn-dropoff mt-2 flex h-10 w-full items-center justify-center rounded-lg">📍 DROPOFF NOW</button>
          </div>
        </div>
      </div>

      {/* ═══ BLOQUE 3: ENTRADAS FINANCIERAS MANUALES ═══ */}
      <div className="section-financial-inputs rounded-2xl border border-[#1a1a1a] bg-[#0e0e0e] p-4">
        <div className="grid grid-cols-2 gap-2">
          {field("EARNINGS", earnings, setEarnings, "$0.00", "#1E3A8A")}
          {field("EXTRA CASH", extraCash, setExtraCash, "$0.00", "#16A34A")}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {field("TIPS", tips, setTips, "$0.00", "#CA8A04")}
          {field("TOLL", toll, setToll, "$0.00", "#EA580C")}
        </div>
        <div className="mt-2">
          {field("PLATFORM FEE", fee, setFee, "$0.00", "#DC2626")}
        </div>
      </div>

      {/* ═══ BLOQUE 4: RESULTADOS CALCULADOS ═══ */}
      <div className="section-calculated-results grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-[#2a2a2a] bg-[#0e0e0e] p-3">
          <div className="text-[10px] font-black uppercase tracking-wider text-neutral-400">GROSS INCOME</div>
          <div className="font-mono text-[22px] font-black text-white">{fmt(gross)}</div>
        </div>
        <div className="net-payout-card">
          <div className="text-[10px] font-black uppercase tracking-wider text-neutral-500">NET PAYOUT</div>
          <div className="font-mono text-[22px] font-black" style={{ color: "#15803D" }}>{fmt(net)}</div>
        </div>
      </div>

      {/* ═══ BLOQUE 5: NOTAS ═══ */}
      <div className="section-notes rounded-2xl border border-[#1a1a1a] bg-[#0e0e0e] p-4">
        <div className="text-[10px] font-black uppercase tracking-wider text-neutral-400">NOTES</div>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Toll details auto-filled..." className="mt-1 h-12 w-full rounded-xl border border-[#2a2a2a] bg-black px-3 text-[13px] text-white outline-none placeholder:text-neutral-500" />
      </div>

      {/* ═══ SUBMIT ═══ */}
      <button onClick={submit} disabled={!earnings || nEarnings <= 0 || dayClosed} className="h-16 w-full rounded-2xl text-[16px] font-black tracking-wider text-black disabled:opacity-40" style={{ background: "linear-gradient(90deg,#FFD700,#d9b64f)" }}>
        + GRABAR EN DISCO
      </button>
    </div>
  );
}
