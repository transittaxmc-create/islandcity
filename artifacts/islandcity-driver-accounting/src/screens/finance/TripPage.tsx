// ── TripPage · Compact Daily Entry (islandcity-v2 DNA) ───────────────
import { useMemo, useState } from "react";
import { tripNet, toYMD } from "./financeData";
import {
  fmt,
  platformLogo,
  platformTypeLabel,
  PLATFORMS,
  type EntryRecord,
} from "../../lib/domain";

export function TripPage(props: {
  clock: Date;
  entries: EntryRecord[];
  onAddEntry: (e: EntryRecord) => void;
  showToast: (m: string) => void;
}) {
  const { clock, entries, onAddEntry, showToast } = props;

  // ── Today's slice ────────────────────────────────────────────────
  const todayKey = toYMD(clock);
  const todayEntries = useMemo(
    () => entries.filter((e) => (e.datetime || "").slice(0, 10) === todayKey),
    [entries, todayKey]
  );

  // ── Form state ──────────────────────────────────────────────────
  const [platform, setPlatform] = useState<string>(PLATFORMS[0]?.name ?? "Uber");
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [earnings, setEarnings] = useState<string>("");
  const [tips, setTips] = useState<string>("");
  const [toll, setToll] = useState<string>("");
  const [notes, setNotes] = useState("");

  const reset = () => {
    setPickup("");
    setDropoff("");
    setEarnings("");
    setTips("");
    setToll("");
    setNotes("");
  };

  const handleSave = () => {
    const earn = parseFloat(earnings) || 0;
    const tip = parseFloat(tips) || 0;
    const tl = parseFloat(toll) || 0;
    if (earn <= 0 && tip <= 0 && tl <= 0) {
      showToast("⚠ Ingresa al menos un valor");
      return;
    }
    const pdef = PLATFORMS.find((p) => p.name === platform) ?? PLATFORMS[0];
    const gross = earn + tip + tl;
    const rec: EntryRecord = {
      id: Math.random().toString(36).slice(2),
      datetime: clock.toISOString(),
      platform,
      platformType: pdef.type,
      earnings: earn || null,
      extraCash: 0,
      tips: tip || null,
      toll: tl || null,
      tollDetails: [],
      platformFee: null,
      grossIncome: gross,
      netPayout: gross,
      pickup: {
        address: pickup,
        businessName: pickup,
        lat: 0,
        lng: 0,
        type: "unknown",
        icon: "📍",
        timestamp: clock.toISOString(),
        day: todayKey,
      },
      dropoff: {
        address: dropoff,
        businessName: dropoff,
        lat: 0,
        lng: 0,
        type: "unknown",
        icon: "🏁",
        timestamp: clock.toISOString(),
        day: todayKey,
      },
      notes,
      status: "open",
    };
    onAddEntry(rec);
    showToast("✓ Trip guardado");
    reset();
  };

  // ── Today's metrics ─────────────────────────────────────────────
  const todayTrips = todayEntries.length;
  const todayGross = todayEntries.reduce((a, t) => a + (t.grossIncome || 0), 0);
  const todayTips = todayEntries.reduce((a, t) => a + (t.tips || 0), 0);
  const todayToll = todayEntries.reduce((a, t) => a + (t.toll || 0), 0);
  const todayNet = todayEntries.reduce((a, t) => a + tripNet(t), 0);
  const todayAvg = todayTrips > 0 ? todayNet / todayTrips : 0;

  return (
    <section
      style={{
        scrollSnapAlign: "start",
        minWidth: "100%",
        width: "100%",
        flexShrink: 0,
        padding: "0 16px 24px",
        boxSizing: "border-box",
      }}
    >
      {/* Today's Performance */}
      <div className="rounded-2xl border border-[#1f1f1f] bg-[#0e0e0e] p-4 mb-4">
        <p className="text-[10px] tracking-[0.22em] text-neutral-400 font-semibold uppercase mb-2">
          Today's Performance
        </p>
        <div className="grid grid-cols-2 gap-2 text-[12px]">
          <Metric label="Trips" value={String(todayTrips)} />
          <Metric label="Gross" value={fmt(todayGross)} accent="#f6dd8c" />
          <Metric label="Tips" value={fmt(todayTips)} />
          <Metric label="Tolls" value={fmt(todayToll)} />
          <Metric label="Net" value={fmt(todayNet)} accent="#f6dd8c" />
          <Metric label="Avg / trip" value={fmt(todayAvg)} />
        </div>
      </div>

      {/* Quick Entry */}
      <div className="rounded-2xl border border-[#1f1f1f] bg-[#0e0e0e] p-4">
        <p className="text-[10px] tracking-[0.22em] text-neutral-400 font-semibold uppercase mb-3">
          Quick Trip Entry
        </p>

        {/* Platform selector */}
        <label className="block text-[10px] uppercase tracking-wider text-neutral-500 mb-1">
          Platform
        </label>
        <div className="flex items-center gap-2 mb-3">
          {(() => {
            const logo = platformLogo(platform);
            return logo ? (
              <img
                src={logo}
                alt={platform}
                className="h-7 w-7 rounded-full object-cover border border-[#222]"
                onError={(e) => ((e.currentTarget.style.display = "none"))}
              />
            ) : (
              <div className="h-7 w-7 rounded-full bg-[#1a1a1a] flex items-center justify-center text-[10px] text-neutral-400">
                {platform.slice(0, 2).toUpperCase()}
              </div>
            );
          })()}
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="flex-1 h-9 rounded-lg bg-[#161616] border border-[#222] text-[12px] text-neutral-200 px-2"
          >
            {PLATFORMS.map((p) => (
              <option key={p.name} value={p.name}>
                {p.name}
                {p.type !== "RIDESHARE" ? ` · ${platformTypeLabel(p.type)}` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Pickup / Dropoff */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <Field label="Pickup" value={pickup} onChange={setPickup} placeholder="Dirección pickup" />
          <Field label="Dropoff" value={dropoff} onChange={setDropoff} placeholder="Dirección dropoff" />
        </div>

        {/* Earnings / Tips / Toll */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <MoneyField label="Earnings" value={earnings} onChange={setEarnings} />
          <MoneyField label="Tips" value={tips} onChange={setTips} />
          <MoneyField label="Toll" value={toll} onChange={setToll} />
        </div>

        {/* Notes */}
        <label className="block text-[10px] uppercase tracking-wider text-neutral-500 mb-1">
          Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Notas opcionales…"
          className="w-full rounded-lg bg-[#161616] border border-[#222] text-[12px] text-neutral-200 p-2 mb-3 resize-none"
        />

        <button
          onClick={handleSave}
          className="h-11 w-full rounded-xl font-bold text-[12px] uppercase tracking-[0.18em]"
          style={{ background: "#f6dd8c", color: "#0a0a0a" }}
        >
          ✓ Guardar Trip
        </button>
      </div>
    </section>
  );
}

function Metric(props: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-lg bg-[#161616] border border-[#1f1f1f] p-2">
      <p className="text-[9px] uppercase tracking-wider text-neutral-500">{props.label}</p>
      <p
        className="text-[14px] font-bold mt-0.5"
        style={{ color: props.accent ?? "#e5e5e5" }}
      >
        {props.value}
      </p>
    </div>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-wider text-neutral-500 mb-1">
        {props.label}
      </label>
      <input
        type="text"
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder}
        className="w-full h-9 rounded-lg bg-[#161616] border border-[#222] text-[12px] text-neutral-200 px-2"
      />
    </div>
  );
}

function MoneyField(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-wider text-neutral-500 mb-1">
        {props.label}
      </label>
      <div className="relative">
        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[12px] text-neutral-500">
          $
        </span>
        <input
          type="number"
          inputMode="decimal"
          step="0.01"
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          placeholder="0.00"
          className="w-full h-9 rounded-lg bg-[#161616] border border-[#222] text-[12px] text-neutral-200 pl-5 pr-2"
        />
      </div>
    </div>
  );
}

