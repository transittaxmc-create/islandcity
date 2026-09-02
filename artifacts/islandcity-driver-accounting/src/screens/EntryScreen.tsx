// ── Daily Entry · main income entry (spec PAGE 1) ───────────────────
import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { FARE_TYPES, PLATFORMS, draftNums, fmt, platformLogo, platformPills, type EntryDraft } from "../lib/domain";
import { CARD, INPUT, INPUT_SM, LABEL, pillCls } from "../lib/ui";

interface Props {
  draft: EntryDraft;
  setDraft: (d: EntryDraft) => void;
  todayLabel: string;
  nextRef: string;
  gpsFix: { lat: number; lng: number; acc: number } | null;
  tracking: boolean;
  liveMiles: string;
  onToggleTracking: () => void;
  onCapture: (kind: "origin" | "destination") => void;
  onSave: () => void;
  dayClosed: boolean;
  shiftOn: boolean;
}

export default function EntryScreen({
  draft,
  setDraft,
  todayLabel,
  nextRef,
  gpsFix,
  tracking,
  liveMiles,
  onToggleTracking,
  onCapture,
  onSave,
  dayClosed,
  shiftOn,
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const { gross, tips, cashRec, tollReimb, comm } = draftNums(draft);
  const net = gross + tips + cashRec + tollReimb - comm;
  const set = (k: keyof EntryDraft, v: string) => setDraft({ ...draft, [k]: v });

  return (
    <div className="space-y-3 pb-4">
      {/* A) header */}
      <div className={CARD}>
        <div className="flex items-center justify-between">
          <span className={LABEL}>DAILY ENTRY</span>
          <span className="text-[11px] font-semibold text-[#8a8a8a]">{todayLabel}</span>
        </div>
        <div className="mt-1 font-mono text-[34px] font-black leading-none text-[#FFD700]">{fmt(net)}</div>
        <div className="mt-1 text-[9px] font-bold text-[#6f6f6f]">
          NET = GROSS + TOLLS + EXTRA CASH + TIPS − PLATFORM FEE
        </div>
      </div>

      {/* B) fare type */}
      <div className="flex gap-2">
        {FARE_TYPES.map((f) => {
          const active = draft.fareType === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setDraft({ ...draft, fareType: f.key })}
              className={`h-14 flex-1 rounded-xl border text-[12px] font-black transition-all ${
                active ? "border-[#FFD700] bg-[#332F1A] text-[#FFD700]" : "border-[#2a2a2a] bg-[#0e0e0e] text-white"
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>
      {/* C) revenue source dropdown with logos */}
      <div ref={ref} className="relative">
        <button
          onClick={() => setOpen((o) => !o)}
          className="h-16 w-full rounded-xl border-2 border-[#FFD700] bg-[#0e0e0e] px-3 text-left"
        >
          <span className="flex items-center gap-2">
            {platformLogo(draft.platform) ? (
              <img src={platformLogo(draft.platform)!} alt="" className="h-5 w-5 rounded object-contain" />
            ) : (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#332F1A] text-[9px] font-black text-[#FFD700]">
                {draft.platform.slice(0, 1)}
              </span>
            )}
            <span className="text-[14px] font-bold text-white">{draft.platform}</span>
            <span className="ml-auto flex gap-1">
              {platformPills(draft.platform).map((x) => (
                <span key={x} className={pillCls(x === "ACCESS-A-RIDE" ? "green" : "gold")}>
                  {x}
                </span>
              ))}
              <ChevronDown size={16} className="text-[#FFD700]" />
            </span>
          </span>
        </button>
        {open && (
          <div className="absolute left-0 right-0 z-30 mt-1 max-h-72 overflow-y-auto rounded-xl border border-[#2a2a2a] bg-[#0e0e0e] shadow-2xl">
            {PLATFORMS.map((p) => (
              <button
                key={p.name}
                onClick={() => {
                  setDraft({ ...draft, platform: p.name });
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-3 text-left active:bg-[#1c1c1c]"
              >
                {platformLogo(p.name) ? (
                  <img src={platformLogo(p.name)!} alt="" className="h-5 w-5 rounded object-contain" />
                ) : (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#332F1A] text-[9px] font-black text-[#FFD700]">
                    {p.name.slice(0, 1)}
                  </span>
                )}
                <span className="text-[13px] font-bold text-white">{p.name}</span>
                <span className="ml-auto flex gap-1">
                  {platformPills(p.name).map((x) => (
                    <span key={x} className={pillCls(x === "ACCESS-A-RIDE" ? "green" : "gold")}>
                      {x}
                    </span>
                  ))}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* D) gross fare */}
      <div className={CARD}>
        <div className={LABEL}>GROSS FARE / INGRESO ($) · REQUIRED</div>
        <input
          type="number"
          inputMode="decimal"
          step="0.01"
          value={draft.gross}
          onChange={(e) => set("gross", e.target.value)}
          placeholder="0.00"
          className={INPUT + " mt-1 border-[#FFD70033] font-mono"}
        />
      </div>
      {/* E) origin & destination */}
      <div className="grid grid-cols-2 gap-2">
        {(["origin", "destination"] as const).map((key) => {
          const isOrigin = key === "origin";
          const label = isOrigin ? "ORIGIN" : "DESTINATION";
          const ph = isOrigin ? "Pickup Location" : "Street, City";
          return (
            <div key={key} className={CARD}>
              <div className={LABEL}>{label}</div>
              <input
                value={isOrigin ? draft.origin : draft.destination}
                onChange={(e) => set(key, e.target.value)}
                placeholder={ph}
                className={INPUT_SM + " mt-1"}
              />
              <button
                onClick={() => onCapture(key)}
                className={`mt-1.5 h-10 w-full rounded-lg text-[10px] font-black text-black ${
                  isOrigin ? "bg-[#00FF6A]" : "bg-[#4a9eff]"
                }`}
              >
                📍 GPS CAPTURE
              </button>
              {(isOrigin ? draft.originTag : draft.destTag) ? (
                <div className="mt-1 text-[9px] font-bold text-[#00FF6A]">
                  📍 {(isOrigin ? draft.originTag : draft.destTag)} ✓ capturado
                </div>
              ) : (
                <div className="mt-1 text-[9px] font-bold text-[#6f6f6f]">📍 GPS tag automático</div>
              )}
            </div>
          );
        })}
      </div>

      {/* F) trip mileage */}
      <div className={CARD}>
        <div className={LABEL}>TRIP MILEAGE</div>
        <div className="mt-1 flex items-center gap-2">
          <button
            onClick={onToggleTracking}
            className={`h-12 flex-1 rounded-xl text-[12px] font-black ${
              tracking ? "bg-[#f87171] text-black" : "bg-[#4a9eff] text-black"
            }`}
          >
            {tracking ? "⏹ STOP TRACKING" : "▶ START TRACKING"}
          </button>
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            value={draft.miles}
            onChange={(e) => set("miles", e.target.value)}
            className={INPUT_SM + " w-24 font-mono"}
          />
          <span className="text-[12px] font-black text-white">mi</span>
        </div>
        <div className="mt-1 text-[9px] font-bold text-[#6f6f6f]">
          {tracking ? `⏱ corriendo… ${liveMiles} mi acumuladas` : "Tap before you start driving · ✏️ editable manual"}
        </div>
      </div>
      {/* G) additional income & deductions — 4 green boxes */}
      <div className="grid grid-cols-2 gap-2">
        {(
          [
            { key: "tips", label: "TIPS", sub: "GRATUITY" },
            { key: "cashRec", label: "OTHER CASH", sub: "CASH REC ($)" },
            { key: "tollReimb", label: "TOLL REIMB", sub: "GPS AUTO" },
            { key: "comm", label: "PLATFORM COMM", sub: "FEE ($)" },
          ] as const
        ).map(({ key, label, sub }) => {
          const auto = key === "tollReimb";
          return (
          <div key={key} className="rounded-xl border border-[#332F1A] bg-[#0A0A0A] p-3">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black text-white">{label}</span>
              {auto && (
                <span className="inline-flex items-center gap-1 rounded-full border border-[#00FF6A55] bg-[#00FF6A18] px-1.5 py-0.5 text-[8px] font-black text-[#00FF6A]">
                  GPS AUTO
                </span>
              )}
            </div>
            <div className="text-[9px] font-bold text-[#6f6f6f]">{sub}</div>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              value={draft[key]}
              onChange={(e) => set(key, e.target.value)}
              className="mt-1 w-full rounded-lg border border-[#2a2a2a] bg-black px-2 py-2 font-mono text-[16px] font-black text-[#00FF6A] outline-none focus:border-[#FFD700]"
            />
          </div>
          );
        })}
      </div>

      {/* H) footer — REF + NOTE + GRABAR */}
      <div className={CARD}>
        <div className="grid grid-cols-[auto_1fr] items-center gap-2">
          <span className={LABEL}>REF INVOICE</span>
          <div className="flex items-center gap-2">
            <span className="rounded-lg border border-[#FFD70055] bg-[#FFD70018] px-2 py-1 font-mono text-[14px] font-black text-[#FFD700]">
              {nextRef}
            </span>
            <span className="text-[11px] font-bold text-[#8a8a8a]">· AUTO</span>
          </div>
        </div>
        <div className="mt-2">
          <div className={LABEL}>NOTE</div>
          <input
            value={draft.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Surge, traffic…"
            className={INPUT_SM + " mt-1"}
          />
        </div>
        <button
          onClick={onSave}
          disabled={gross <= 0 || dayClosed}
          className="mt-3 text-[16px] font-black tracking-wider text-black"
          style={{ width: "100%", height: 64, borderRadius: 16, background: "linear-gradient(90deg,#FFD700,#d9b64f)" }}
        >
          + GRABAR EN DISCO
        </button>
        {dayClosed && (
          <div className="mt-1 text-center text-[10px] font-black text-[#FF8C00]">
            🔒 Día cerrado — viajes bloqueados hasta mañana
          </div>
        )}
      </div>


    </div>
  );
}