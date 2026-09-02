// ── Daily Entry · main income entry (spec DOC FINAL) ────────────────
// Spec DOC: DAILY Entry + Queue + Mileage GPS + Break/Lunch logic
import { useEffect, useRef, useState } from "react";
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
  detectedToll: {toll: string; amount: number; details: {name: string; price: number}[]} | null;
}

export default function EntryScreen({ addEntry, todayLabel, onCapture, dayClosed, onBreakStart, onBreakEnd, isOnBreak }: Props) {
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
  const [tollDetails, setTollDetails] = useState<{name: string; price: number}[]>([]);
  
  const { getCurrentLocation } = useLocation();

    useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Auto-fill toll from GPS detection
  useEffect(() => {
    if (!detectedToll) return;
    const currentToll = parseFloat(toll) || 0;
    const newTollAmount = currentToll + detectedToll.amount;
    setToll(newTollAmount.toFixed(2));
    setTollDetails(prev => [...prev, ...detectedToll.details.filter(d => !prev.some(p => p.name === d.name))]);
    
    // Auto-fill notes with toll breakdown
    const allDetails = [...tollDetails, ...detectedToll.details.filter(d => !tollDetails.some(p => p.name === d.name))];
    const breakdown = allDetails.map(td => `${td.name} $${td.price.toFixed(2)}`).join('\n');
    const notesText = allDetails.length > 1
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
  const net = calcNet(gross, nFee);
  
  const captureLocation = async (kind: "pickup" | "dropoff") => {
    try {
      const gpsPoint = await getCurrentLocation();
      const placeIcon = getPlaceIcon(gpsPoint.placeType || 'business');
      const locationString = `${placeIcon} ${gpsPoint.businessName || 'Detected Location'}\n${gpsPoint.address || ''}`;
      
      if (kind === "pickup") {
        setPickup(locationString);
      } else {
        setDropoff(locationString);
      }
    } catch (err) {
      console.error("GPS error:", err);
    }
  };

  const autoFillToll = (tollName: string, amount: number) => {
    const newTollDetails = [...tollDetails, { name: tollName, price: amount }];
    setTollDetails(newTollDetails);
    setToll((nToll + amount).toFixed(2));
    
    const breakdown = newTollDetails.map(td => `${td.name} $${td.price.toFixed(2)}`).join('\n');
    const notesText = newTollDetails.length > 1 
      ? `TOLLS:\n${breakdown}\nTotal: $${newTollDetails.reduce((sum, td) => sum + td.price, 0).toFixed(2)}`
      : `TOLL: ${breakdown}`;
    setNotes(notesText);
  };

  const submit = () => {
    if (!earnings || nEarnings <= 0) return;
    addEntry({
      id: Math.random().toString(36).slice(2), datetime: new Date().toISOString(), platform, platformType,
      earnings: nEarnings, extraCash: nExtra, tips: nTips, toll: nToll, tollDetails, platformFee: nFee,
      grossIncome: gross, netPayout: net,
      pickup: { address: pickup, businessName: "", lat: 0, lng: 0, type: "", icon: "", timestamp: "" },
      dropoff: { address: dropoff, businessName: "", lat: 0, lng: 0, type: "", icon: "", timestamp: "" },
      invoiceRef: showInvoice ? invoiceRef : undefined, notes, status: "open",
    });
    setEarnings(""); setExtraCash(""); setTips(""); setToll(""); setFee(""); setPickup(""); setDropoff(""); setInvoiceRef(""); setNotes("");
    setTollDetails([]);
  };

  const field = (label: string, value: string, set: (v: string) => void, placeholder: string, color: string) => (
    <div>
      <div className="text-[10px] font-black uppercase tracking-wider text-neutral-400">{label}</div>
      <input type="number" inputMode="decimal" step="0.01" value={value} onChange={(e) => set(e.target.value)} placeholder={placeholder}
        className="mt-1 h-12 w-full rounded-xl border border-[#2a2a2a] bg-black px-3 font-mono text-[18px] font-bold outline-none" style={{ color }} />
    </div>
  );


  
  return (
    <div className="space-y-3 pb-4">
      <div className="rounded-2xl border border-[#1a1a1a] bg-[#0e0e0e] p-4">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">DAILY ENTRY</span>
          <span className="text-[11px] font-semibold text-[#8a8a8a]">{todayLabel}</span>
        </div>

        {/* Platform dropdown */}
        <div className="relative mt-3" ref={ref}>
          <button onClick={() => setOpen(!open)} className="flex h-12 w-full items-center gap-2 rounded-xl border border-[#2a2a2a] bg-black px-3 text-left">
            <img src={platformLogo(platform) || ""} alt={platform} className="h-5 w-5 object-contain" />
            <span className="font-medium">{platform}</span>
            <ChevronDown className="ml-auto h-4 w-4 text-neutral-500" />
          </button>
          {open && (
            <div className="absolute top-14 z-10 w-full rounded-xl border border-[#2a2a2a] bg-[#141414] py-1 shadow-xl">
              {PLATFORMS.map((p) => (
                <button key={p.name} onClick={() => { setPlatform(p.name); setOpen(false); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-[#1e1e1e]">
                  <img src={platformLogo(p.name) || ""} alt={p.name} className="h-5 w-5 object-contain" />
                  <span>{p.name}</span>
                  {p.type === "VOUCHER" && <span className="ml-auto text-[9px] font-black text-orange-500">VOUCHER</span>}
                  {p.type === "ACCESS" && <span className="ml-auto text-[9px] font-black text-blue-500">ACCESS</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Break/Lunch button - only show when not day closed */}
      {!dayClosed && (
        <div className="flex gap-2">
          {!isOnBreak ? (
            <button 
              onClick={onBreakStart} 
              className="flex-1 h-10 rounded-lg border border-[#F59E0B] bg-[#F59E0B]/10 text-[11px] font-black text-[#F59E0B]"
            >
              ⏸️ BREAK/LUNCH
            </button>
          ) : (
            <button 
              onClick={onBreakEnd} 
              className="flex-1 h-10 rounded-lg border border-[#00FF6A] bg-[#00FF6A]/10 text-[11px] font-black text-[#00FF6A]"
            >
              ▶️ RESUME WORKING
            </button>
          )}
        </div>
      )}

      {/* financial fields in spec order */}
      <div className="grid grid-cols-2 gap-2">
        {field("Earnings", earnings, setEarnings, "$0.00", "#1E3A8A")}
        {field("Extra Cash", extraCash, setExtraCash, "$0.00 cash cliente", "#16A34A")}
        {field("Tips", tips, setTips, "$0.00", "#CA8A04")}
        {field("Toll", toll, setToll, "$0.00 auto", "#EA580C")}
        {field("Platform Fee", fee, setFee, "$0.00 fee", "#DC2626")}
      </div>

      {/* gross + net */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-[#2a2a2a] bg-[#F3F4F6] p-3">
          <div className="text-[10px] font-black uppercase tracking-wider text-neutral-500">GROSS INCOME</div>
          <div className="font-mono text-[22px] font-black" style={{ color: "#111827" }}>{fmt(gross)}</div>
        </div>
        <div className="rounded-xl border border-[#2a2a2a] bg-[#0e0e0e] p-3">
          <div className="text-[10px] font-black uppercase tracking-wider text-neutral-400">NET PAYOUT</div>
          <div className="font-mono text-[22px] font-black" style={{ color: "#15803D" }}>{fmt(net)}</div>
        </div>
            </div>

      {/* pickup / dropoff */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <div className="text-[10px] font-black uppercase tracking-wider text-neutral-400">PICKUP</div>
          <input value={pickup} onChange={(e) => setPickup(e.target.value)} placeholder="Tap GPS or enter address" className="mt-1 h-12 w-full rounded-xl border border-[#2a2a2a] bg-black px-3 text-[13px] text-white outline-none" />
          <button onClick={() => onCapture("pickup")} className="mt-1 flex h-10 w-full items-center justify-center rounded-lg bg-[#00FF6A] text-[11px] font-black text-black">📍 PICKUP NOW</button>
        </div>
        <div>
          <div className="text-[10px] font-black uppercase tracking-wider text-neutral-400">DROPOFF</div>
          <input value={dropoff} onChange={(e) => setDropoff(e.target.value)} placeholder="Tap GPS or enter address" className="mt-1 h-12 w-full rounded-xl border border-[#2a2a2a] bg-black px-3 text-[13px] text-white outline-none" />
          <button onClick={() => onCapture("dropoff")} className="mt-1 flex h-10 w-full items-center justify-center rounded-lg bg-[#4a9eff] text-[11px] font-black text-black">📍 DROPOFF NOW</button>
        </div>
      </div>

      {/* invoice ref — only VOUCHER/ACCESS */}
      {showInvoice && (
        <div>
          <div className="text-[10px] font-black uppercase tracking-wider text-neutral-400">INVOICE / REFERENCE NUMBER</div>
          <input value={invoiceRef} onChange={(e) => setInvoiceRef(e.target.value)} placeholder="Ref # / Invoice #" className="mt-1 h-12 w-full rounded-xl border border-[#2a2a2a] bg-black px-3 text-[14px] text-white outline-none" />
        </div>
      )}

      {/* notes */}
      <div>
        <div className="text-[10px] font-black uppercase tracking-wider text-neutral-400">NOTES</div>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Toll details auto-filled..." className="mt-1 h-12 w-full rounded-xl border border-[#2a2a2a] bg-black px-3 text-[13px] text-white outline-none" />
      </div>

      {/* submit */}
      <button onClick={submit} disabled={!earnings || nEarnings <= 0 || dayClosed} className="h-16 w-full rounded-2xl text-[16px] font-black tracking-wider text-black disabled:opacity-40" style={{ background: "linear-gradient(90deg,#FFD700,#d9b64f)" }}>
        + GRABAR EN DISCO
      </button>
    </div>
  );
}

