// â”€â”€ Daily Entry Â· main income entry (spec DOC FINAL RESTRUCTURED) â”€â”€â”€â”€â”€
// Spec DOC: DAILY Entry + Queue + Mileage GPS + Break/Lunch logic
import { useEffect, useRef, useState, useCallback } from "react";
import { ChevronDown } from "lucide-react";
import { PLATFORMS, calcGross, calcNet, fmt, platformLogo, type EntryRecord, type PlatformType } from "../lib/domain";
import { useLocation } from "../hooks/useLocation";
import { useGpsLocationLabel } from "../hooks/useGpsLocationLabel";
import { getPlaceIcon, reverseGeocode } from "../lib/mileage";

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

type LocationMeta = {
  placeType: string;
  businessName: string;
  address: string;
  street: string;
  city: string;
  zip: string;
  lat: number;
  lng: number;
  accuracy: number;
  time: string;
  day: string;
  resolving?: boolean;
};

const STORAGE_KEY = "islandcity:draft:entry";

// Rich GPS display card (mockup C: type uppercase + name + full address + coords)
const PLACE_ICONS: Record<string, string> = {
  residence: "\u{1F3E0}", business: "\u{1F3E2}", airport: "\u{2708}\u{FE0F}", hospital: "\u{1F3E5}", commercial: "\u{1F3EA}", other: "\u{1F4CD}"
};
Object.assign(PLACE_ICONS, {
  residence: "\u{1F3E0}", business: "\u{1F3E2}", airport: "\u{2708}\u{FE0F}",
  hospital: "\u{1F3E5}", commercial: "\u{1F3EA}", other: "\u{1F4CD}",
});
const PLACE_LABELS: Record<string, string> = {
  residence: "RESIDENCE", business: "BUSINESS", airport: "AIRPORT", hospital: "HOSPITAL", commercial: "COMMERCIAL", other: "PLACE"
};
// Human-readable short name per place type (Spanish, used in compact card line 1)
const PLACE_DISPLAY_NAME: Record<string, string> = {
  residence: "Residencia",
  business: "Negocio",
  airport: "Aeropuerto",
  hospital: "Hospital",
  commercial: "Comercial",
  other: "Lugar",
};

// â”€â”€ EntryGpsIndicator: live GPS status pill for the Entry screen header â”€â”€
// Reflects the REAL GPS state, not just isTracking:
//  - "CONECTADO"  (green)  when we have a fix and a recent position
//  - "BUSCANDO..." (amber) while we wait for the first position after start
//  - "NO CONECTADO" (red)  only when permission was denied or watchPosition errored
//  - "APAGADO" (gray)      when tracking has not been started
function EntryGpsIndicator() {
  const { isActive, hasFix, error, accuracy, street, city } = useGpsLocationLabel();

  if (!isActive && !hasFix && !error) {
    return (
      <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#1a1a1a] px-2.5 py-1 text-[10px] font-black tracking-wider text-neutral-500">
        <span className="h-1.5 w-1.5 rounded-full bg-neutral-500" />
        GPS - BUSCANDO...
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#1a0a0a] px-2.5 py-1 text-[10px] font-black tracking-wider text-[#f87171]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#f87171]" />
        NO CONECTADO
      </div>
    );
  }
  if (!hasFix) {
    return (
      <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#1a1500] px-2.5 py-1 text-[10px] font-black tracking-wider text-[#F5D78E]">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#F5D78E]" />
        BUSCANDO...
      </div>
    );
  }
  if (hasFix) {
    return (
      <div className="flex min-w-0 max-w-full shrink-0 items-center gap-1.5 rounded-full bg-[#0F3A1D] px-2.5 py-1 text-[10px] font-black tracking-wider text-[#22FF88]">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#22FF88]" />
        <span className="truncate">GPS ACTIVO{street || city ? ` · ${street || city}` : ""}{accuracy != null ? ` · ±${Math.round(accuracy)}m` : ""}</span>
      </div>
    );
  }
  return null;
}
function GpsPlaceCard(props: {
  kind: "pickup" | "dropoff";
  value: string;
  onChange: (v: string) => void;
  meta: LocationMeta | null;
  onCapture: () => void;
  onClear: () => void;
}) {
  const btnCls = props.kind === "pickup" ? "btn-pickup" : "btn-dropoff";
  const headerLabel = props.kind === "pickup" ? "PICKUP" : "DROPOFF";
  const safeBtnLabel = props.kind === "pickup" ? "\u{1F4CD} PICKUP NOW" : "\u{1F4CD} DROPOFF NOW";

  // Compact, fixed-size 2-line display card.
  // - When meta is empty: show input + capture button (no GPS data yet).
  // - When meta is present (coords saved immediately, may still be resolving
  //   the address via reverse geocoding): show icon+name on line 1, time
  //   (+ short address fragment if it fits) on line 2. Full address, coords,
  //   and day are kept in `props.meta` and persisted on submit, even though
  //   they are not all rendered here.
  const pt = props.meta?.placeType || "other";
  const icon = PLACE_ICONS[pt] || PLACE_ICONS.other;
  // Build the line-1 title: BUSINESS shows the real business name; non-business
  // types (RESIDENCE, HOSPITAL, AIRPORT, etc.) show a human-readable label.
  const isResidence = pt === "residence";
  const hasBusinessName = !isResidence && (props.meta?.businessName || "").trim().length > 0;
  const line1Name = hasBusinessName
    ? (props.meta?.businessName as string)
    : (PLACE_DISPLAY_NAME[pt] || "Lugar");
  const time = props.meta?.time
    ? new Date(props.meta.time).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })
    : "";
  const shortCity = props.meta?.city || (props.meta?.address || "").split(",")[1]?.trim() || "";
  const resolving = !!props.meta?.resolving;

  return (
    // Outer container has FIXED height/min-height. The card never grows or
    // shrinks based on content length, which guarantees a stable layout.
    <div className="flex h-[152px] min-h-[152px] max-h-[152px] shrink-0 flex-col">
      {/* Line 1: header + GPS pill */}
      <div className="flex shrink-0 items-center justify-between">
        <div className="text-[10px] font-black uppercase tracking-wider text-neutral-400">{headerLabel}</div>
        <div className="flex items-center gap-1 rounded-full bg-[#0F3A1D] px-2 py-0.5 text-[9px] font-black tracking-wider text-[#22FF88]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#22FF88]" />
          GPS
        </div>
      </div>

      {/* Card body: fixed height, exactly 2 lines of content. Anything that
          doesn't fit is truncated (overflow-hidden + truncate). */}
      <div className="mt-1 flex h-[68px] min-h-[68px] max-h-[68px] shrink-0 flex-col justify-center overflow-hidden rounded-xl border border-[#1f3a1f] bg-[#0a1a0a] px-2 py-1.5">
        {props.meta ? (
          <>
            {/* LINE 1: icon + display name (truncate, never wrap) */}
            <div className="flex w-full items-center gap-1.5 overflow-hidden">
              <span className="shrink-0 text-[11px] leading-none">{icon}</span>
              <span className="truncate text-[12px] font-black text-white">{line1Name}</span>
            </div>
            {/* LINE 2: time (always visible) + short address fragment (truncate) */}
            <div className="mt-0.5 flex w-full items-center gap-1.5 overflow-hidden">
              {time && (
                <span className="shrink-0 font-mono text-[10px] font-black text-[#F5D78E]">{time}</span>
              )}
              {shortCity && !resolving && (
                <>
                  <span className="shrink-0 text-[10px] text-neutral-600">Â·</span>
                  <span className="truncate text-[10px] text-neutral-400">{shortCity}</span>
                </>
              )}
              {resolving && (
                <span className="truncate text-[10px] italic text-neutral-500">Obteniendo direcciÃ³n...</span>
              )}
            </div>
          </>
        ) : (
          /* Empty state inside the card (preserves fixed size) */
          <div className="flex h-full w-full flex-col items-center justify-center text-center">
            <span className="text-[10px] font-black uppercase tracking-wider text-neutral-500">{icon} {headerLabel}</span>
            <span className="mt-0.5 text-[9px] text-neutral-600">{props.kind === "dropoff" ? "Pendiente · toca dropoff" : "Toca pickup"}</span>
          </div>
        )}
      </div>

      {/* Capture button + clear button: fixed row, no reflow */}
      <div className="mt-1.5 flex shrink-0 gap-1.5">
        <button
          onClick={props.onCapture}
          disabled={resolving}
          className={btnCls + " flex h-9 flex-1 items-center justify-center rounded-lg text-[12px] disabled:opacity-60"}
        >
          {resolving ? "..." : safeBtnLabel}
        </button>
        <button
          onClick={props.onClear}
          disabled={!props.meta}
          className="flex h-9 items-center justify-center rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] px-2 text-[11px] font-black text-neutral-400 disabled:opacity-40"
        >{"\u{270F}\u{FE0F}"}</button>
      </div>
    </div>
  );
}
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
  // Full GPS capture state. All fields are populated immediately on capture
  // and stored regardless of what is shown in the compact card on screen.
  const [pickupMeta, setPickupMeta] = useState<LocationMeta | null>(null);
  const [dropoffMeta, setDropoffMeta] = useState<LocationMeta | null>(null);
  const [invoiceRef, setInvoiceRef] = useState("");
  const [notes, setNotes] = useState("");
  const [tollDetails, setTollDetails] = useState<{ name: string; price: number }[]>([]);
  const [pickupTimestamp, setPickupTimestamp] = useState<string | null>(null);
  const [dropoffTimestamp, setDropoffTimestamp] = useState<string | null>(null);

  const { state: locationState, getCurrentLocation } = useLocation();

  // â”€â”€ Restore draft from localStorage on mount â”€â”€
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
      // corrupted draft â€” start fresh
    }
  }, []);

  // â”€â”€ Auto-save draft to localStorage on every change â”€â”€
  const saveDraft = useCallback(() => {
    const draft: DraftState = {
      platform, earnings, extraCash, tips, toll, fee, pickup, dropoff, invoiceRef, notes, pickupTimestamp, dropoffTimestamp,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  }, [platform, earnings, extraCash, tips, toll, fee, pickup, dropoff, invoiceRef, notes, pickupTimestamp, dropoffTimestamp]);

  useEffect(() => { saveDraft(); }, [saveDraft]);

  // â”€â”€ Close dropdown when clicking outside â”€â”€
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // â”€â”€ Auto-fill toll from GPS detection â”€â”€
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
  const hourNow = new Date().getHours();
  const greeting = hourNow < 12 ? "Good morning" : hourNow < 18 ? "Good afternoon" : "Good evening";
  const showInvoice = platformType === "VOUCHER" || platformType === "ACCESS";
  const nEarnings = parseFloat(earnings) || 0;
  const nExtra = parseFloat(extraCash) || 0;
  const nTips = parseFloat(tips) || 0;
  const nToll = parseFloat(toll) || 0;
  const nFee = parseFloat(fee) || 0;
  const gross = calcGross(nEarnings, nExtra, nTips, nToll);
  const net = calcNet(gross, nFee);

  // captureLocation: GPS -> address flow
  // 1) Capture raw GPS coords immediately (don't lose the data even if
  //    reverse geocoding fails or takes time).
  // 2) Persist a "resolving" meta so the card can show "Obteniendo dirección..."
  // 3) Run reverseGeocode asynchronously; when it resolves, merge the result
  //    (address, placeType, businessName) into the same meta object.
  // 4) All fields (coords, place type, icon, name, address, day, time) are
  //    always kept on the meta object even if the card only renders 2 lines.
  const captureLocation = async (kind: "pickup" | "dropoff") => {
    const nowDate = new Date();
    const nowIso = nowDate.toISOString();
    const day = nowIso.split("T")[0];
    const setTimestamp = kind === "pickup" ? setPickupTimestamp : setDropoffTimestamp;
    setTimestamp(nowIso);

    // Optimistic meta with raw coords; address/placeType/businessName are
    // filled in once the reverse geocode resolves. The resolving flag tells
    // the UI to show "Obteniendo dirección..." while we wait.
    const current = locationState.currentPosition;
    const initialMeta = {
      placeType: "other" as const,
      businessName: "",
      address: "",
      street: "",
      city: "",
      zip: "",
      lat: current?.coords.latitude ?? 0,
      lng: current?.coords.longitude ?? 0,
      accuracy: current?.coords.accuracy ?? 0,
      time: nowIso,
      day,
      resolving: true,
    };
    if (kind === "pickup") {
      setPickupMeta(initialMeta);
      setPickup("");
    } else {
      setDropoffMeta(initialMeta);
      setDropoff("");
    }
    onCapture(kind);

    // Capture raw coordinates first. Reverse geocoding is a separate step so
    // a slow or unavailable network cannot lose the GPS data.
    (async () => {
      try {
        const gpsPoint = await getCurrentLocation();
        const rawMeta = {
          placeType: "other" as const,
          businessName: "",
          address: gpsPoint.address || `${gpsPoint.lat.toFixed(5)}, ${gpsPoint.lng.toFixed(5)}`,
          street: "",
          city: "",
          zip: "",
          lat: gpsPoint.lat,
          lng: gpsPoint.lng,
          accuracy: gpsPoint.accuracy,
          time: nowIso,
          day,
          resolving: true,
        };
        if (kind === "pickup") setPickupMeta(rawMeta);
        else setDropoffMeta(rawMeta);

        const geoData = await reverseGeocode(gpsPoint.lat, gpsPoint.lng);
        const placeType = geoData.placeType || "other";
        const finalBusinessName = placeType === "residence" ? "" : (geoData.businessName || "").trim();
        const fullMeta = {
          ...rawMeta,
          placeType,
          businessName: finalBusinessName,
          address: geoData.address || rawMeta.address,
          street: geoData.street || "",
          city: geoData.city || "",
          zip: geoData.zip || "",
          resolving: false,
        };
        if (kind === "pickup") setPickupMeta(fullMeta);
        else setDropoffMeta(fullMeta);
      } catch {
        // GPS / reverse geocode failed: keep what we have and clear the
        // "resolving" state so the card stops showing the spinner.
        const fallback = "Ubicación no disponible";
        if (kind === "pickup") {
          setPickupMeta((prev) => prev ? { ...prev, resolving: false, address: prev.address || fallback } : null);
        } else {
          setDropoffMeta((prev) => prev ? { ...prev, resolving: false, address: prev.address || fallback } : null);
        }
      }
    })();
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
      pickup: { address: pickupMeta?.address ?? pickup, businessName: pickupMeta?.businessName ?? "", lat: pickupMeta?.lat ?? 0, lng: pickupMeta?.lng ?? 0, type: pickupMeta?.placeType ?? "", icon: getPlaceIcon(pickupMeta?.placeType || "business"), timestamp: pickupTimestamp || now, day: pickupMeta?.day ?? now.split("T")[0], accuracy: pickupMeta?.accuracy ?? 0, street: pickupMeta?.street ?? "", city: pickupMeta?.city ?? "", zip: pickupMeta?.zip ?? "" },
      dropoff: { address: dropoffMeta?.address ?? dropoff, businessName: dropoffMeta?.businessName ?? "", lat: dropoffMeta?.lat ?? 0, lng: dropoffMeta?.lng ?? 0, type: dropoffMeta?.placeType ?? "", icon: getPlaceIcon(dropoffMeta?.placeType || "business"), timestamp: dropoffTimestamp || now, day: dropoffMeta?.day ?? now.split("T")[0], accuracy: dropoffMeta?.accuracy ?? 0, street: dropoffMeta?.street ?? "", city: dropoffMeta?.city ?? "", zip: dropoffMeta?.zip ?? "" },
      invoiceRef: invoiceRef || undefined,
      notes,
      status: "open",
      reconciliation: { status: "pending" },
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
    setPickupMeta(null);
    setDropoffTimestamp(null);
    setDropoffMeta(null);
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
        <div className="daily-entry-container h-[calc(100dvh-62px)] overflow-y-auto pb-24">
        <div className="flex h-12 shrink-0 items-center justify-between gap-2 px-1">
          <div className="min-w-0">
            <div className="truncate text-[14px] font-black text-white">{greeting}, Driver</div>
            <div className="truncate text-[10px] text-neutral-500">{todayLabel}</div>
          </div>
          <EntryGpsIndicator />
        </div>
      {dayClosed && (
        <div className="mb-2 rounded-xl border border-[#f8717155] bg-[#f8717115] px-3 py-2 text-[11px] font-black text-[#f87171]">
          🔒 Día cerrado — reabre en REGISTER para seguir grabando
        </div>
      )}
      {/* PLATFORM header (left) + BREAK/LUNCH toggle (right) - mockup C */}
      <div className="section-header flex items-center justify-between gap-3 rounded-2xl border border-[#1a1a1a] bg-[#0e0e0e] p-4">
        <div className="relative" ref={ref}>
          <button onClick={() => setOpen(!open)} className="flex h-10 items-center gap-2 rounded-lg border border-[#2a2a2a] bg-black px-3 text-[12px] text-white">
            {platformLogo(platform) && <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/95 ring-1 ring-[#2a2a2a]"><img src={platformLogo(platform)!} alt="" className="h-5 w-5 rounded-full object-contain" /></span>}
            <span className="font-semibold">{platform}</span>
            <ChevronDown className="h-3 w-3 text-neutral-400" />
          </button>
          {open && (
            <div className="absolute left-0 top-full z-50 mt-1 max-h-60 w-48 overflow-y-auto rounded-xl border border-[#2a2a2a] bg-[#0e0e0e] shadow-xl">
              {PLATFORMS.map((p) => (
                <button key={p.name} onClick={() => { setPlatform(p.name); setOpen(false); }} className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] hover:bg-[#1a1a1a] ${p.name === platform ? "bg-[#1a1a1a] text-white" : "text-neutral-300"}`}>
                  {p.logo && <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/95 ring-1 ring-[#2a2a2a]"><img src={`${import.meta.env.BASE_URL}logos/${p.logo}`} alt="" className="h-6 w-6 rounded-full object-contain" /></span>}
                  <span className="font-medium">{p.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {!dayClosed && (
          !isOnBreak ? (
            <button onClick={onBreakStart} className="flex h-10 items-center gap-2 rounded-full border border-[#F59E0B] bg-[#F59E0B]/10 px-3 text-[11px] font-black text-[#F59E0B]">
              <span className="h-2 w-2 rounded-full bg-[#F59E0B]" />
              BREAK/LUNCH
            </button>
          ) : (
            <button onClick={onBreakEnd} className="flex h-10 items-center gap-2 rounded-full bg-[#F59E0B] px-3 text-[11px] font-black text-black">
              <span className="h-2 w-2 rounded-full bg-black" />
              END BREAK
            </button>
          )
        )}
      </div>
      <div className="section-fare grid grid-cols-2 gap-2 rounded-2xl border border-[#1a1a1a] bg-[#0e0e0e] p-3">
        {field("EARNINGS", earnings, setEarnings, "$0.00", "#1E3A8A")}
        {field("EXTRA CASH", extraCash, setExtraCash, "$0.00", "#16A34A")}
      </div>

      {/* â•â•â• BLOQUE 2: OPERACIÃ“N / ACCIÃ“N RÃPIDA â•â•â• */}
      <div className="section-operational rounded-2xl border border-[#1a1a1a] bg-[#0e0e0e] p-3">
        <div className="operational-grid grid grid-cols-2 gap-2">
          <GpsPlaceCard
            kind="pickup"
            value={pickup}
            onChange={setPickup}
            meta={pickupMeta}
            onCapture={() => captureLocation("pickup")}
            onClear={() => { setPickup(""); setPickupMeta(null); }}
          />
          <GpsPlaceCard
            kind="dropoff"
            value={dropoff}
            onChange={setDropoff}
            meta={dropoffMeta}
            onCapture={() => captureLocation("dropoff")}
            onClear={() => { setDropoff(""); setDropoffMeta(null); }}
          />
        </div>
      </div>

      {/* Financial inputs stay compact and fixed after the location cards. */}
      <div className="section-financial-inputs rounded-2xl border border-[#1a1a1a] bg-[#0e0e0e] p-4">
        <div className="grid grid-cols-3 gap-2">
          {field("TIPS", tips, setTips, "$0.00", "#CA8A04")}
          {field("TOLL", toll, setToll, "$0.00", "#EA580C")}
          {field("PLATFORM FEE", fee, setFee, "$0.00", "#DC2626")}
        </div>
        <div className="mt-2">
          <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400">REF / INVOICE</label>
          <input value={invoiceRef} onChange={(e) => setInvoiceRef(e.target.value)} placeholder="Reference" className="mt-1 h-12 w-full rounded-xl border border-[#2a2a2a] bg-black px-3 text-[13px] text-white outline-none placeholder:text-neutral-500" />
        </div>
      </div>

      {/* â•â•â• BLOQUE 4: RESULTADOS CALCULADOS â•â•â• */}
      <div className="section-calculated-results grid grid-cols-2 gap-2">
        <div className="net-payout-card">
          <div className="text-[10px] font-black uppercase tracking-wider text-neutral-500">NET PAYOUT</div>
          <div className="font-mono text-[26px] font-black" style={{ color: "#15803D" }}>{fmt(net)}</div>
        </div>
        <div className="rounded-xl border border-[#2a2a2a] bg-white p-3">
          <div className="text-[10px] font-black uppercase tracking-wider text-neutral-500">GROSS INCOME</div>
          <div className="font-mono text-[26px] font-black text-black">{fmt(gross)}</div>
        </div>
      </div>

      {/* â•â•â• BLOQUE 5: NOTAS â•â•â• */}
      <div className="section-notes rounded-2xl border border-[#1a1a1a] bg-[#0e0e0e] p-4">
        <div className="text-[10px] font-black uppercase tracking-wider text-neutral-400">NOTES</div>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Toll details auto-filled..." className="mt-1 h-12 w-full rounded-xl border border-[#2a2a2a] bg-black px-3 text-[13px] text-white outline-none placeholder:text-neutral-500" />
      </div>

      {/* â•â•â• SUBMIT â•â•â• */}
      <button onClick={submit} disabled={!earnings || nEarnings <= 0 || dayClosed} className="h-16 w-full rounded-2xl text-[16px] font-black tracking-wider text-black disabled:opacity-40" style={{ background: "linear-gradient(90deg,#FFD700,#d9b64f)" }}>
        + GRABAR EN DISCO
      </button>
    </div>
  );
}
