// ── DASH cards: ZONES HOY + trip stats + E-ZPass tolls ────────────────
import type { DemandZone } from "../../lib/nycZones";

export function ZonesCard({ zones, clock, hasGps }: { zones: DemandZone[]; clock: Date; hasGps: boolean }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "#0d0d0d", border: "1px solid #2a2200", borderLeft: "3px solid #f6dd8c" }}>
      <div className="flex items-center justify-between px-3.5 pt-3 pb-2.5" style={{ borderBottom: "1px solid #2a2200" }}>
        <div className="flex items-center gap-2">
          <span className="text-[15px]">🗺</span>
          <div>
            <p className="text-[9px] tracking-[0.18em] font-bold" style={{ color: "#f6dd8c" }}>ZONES HOY</p>
            <p className="text-[8px] text-neutral-500 mt-0.5">
              {(clock.getDay() === 0 || clock.getDay() === 6) ? "Fin de semana" : "Día laboral"} · {clock.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[8px] text-neutral-500 font-mono-jet">NYC TLC data</p>
          <p className="text-[8px] text-neutral-600">2023–2025 avg</p>
        </div>
      </div>
      <div className="px-3.5 py-2.5 space-y-2.5">
        {zones.length === 0 ? (
          <p className="text-[11px] text-neutral-500 py-1">No hay datos para esta hora.</p>
        ) : (
          zones.map((z, i) => {
            const isTop = i === 0;
            const distLabel = z.km !== null ? (z.km < 1 ? `${(z.km * 1000).toFixed(0)} m` : `${z.km.toFixed(1)} km`) : null;
            return (
              <div key={z.id} className="flex items-center gap-2.5">
                <div className="flex flex-col items-center gap-0.5 w-5 flex-shrink-0">
                  <span className="text-[14px] leading-none">{z.heat === "hot" ? "🔥" : z.heat === "warm" ? "🟡" : "⚪"}</span>
                  <span className="text-[7px] font-mono-jet font-bold" style={{ color: z.heat === "hot" ? "#fb923c" : z.heat === "warm" ? "#fbbf24" : "#6b7280" }}>
                    {z.heat === "hot" ? "ALTA" : z.heat === "warm" ? "MEDIA" : "BAJA"}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-[12px] font-semibold leading-tight truncate ${isTop ? "text-white" : "text-neutral-300"}`}>{z.name}</p>
                  {isTop && (
                    <p className="text-[8px] font-mono-jet mt-0.5" style={{ color: z.heat === "hot" ? "#fb923c" : "#fbbf24" }}>
                      ↑ Mejor zona ahora
                    </p>
                  )}
                </div>
                <div className="flex-shrink-0 text-right">
                  {distLabel ? (
                    <span className="font-mono-jet text-[10px] text-neutral-400">{distLabel}</span>
                  ) : (
                    <span className="font-mono-jet text-[9px] text-neutral-600">GPS off</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
      <div className="px-3.5 pb-3 pt-1.5 flex items-center justify-between" style={{ borderTop: "1px solid #2a2200" }}>
        <div className="flex items-center gap-2">
          <span className="text-[10px]">🔥</span><span className="text-[8px] text-neutral-600">Alta</span>
          <span className="text-[10px] ml-1">🟡</span><span className="text-[8px] text-neutral-600">Media</span>
          <span className="text-[10px] ml-1">⚪</span><span className="text-[8px] text-neutral-600">Baja</span>
        </div>
        <span className="text-[8px] font-mono-jet text-neutral-600">{hasGps ? "± GPS activo" : "Activa GPS p/ distancia"}</span>
      </div>
    </div>
  );
}

export function TripStatsCard({ todayTripCount, grossToday, weeklyTotal }: { todayTripCount: number; grossToday: number; weeklyTotal: number }) {
  return (
    <div className="grid grid-cols-3 gap-0 bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl overflow-hidden">
      <div className="p-3 border-r border-[#1f1f1f] text-center">
        <p className="text-[9px] text-neutral-400 tracking-widest">TRIPS TODAY</p>
        <p className="font-mono-jet text-[13px] font-semibold mt-1 text-white">{todayTripCount}</p>
      </div>
      <div className="p-3 border-r border-[#1f1f1f] text-center">
        <p className="text-[9px] text-neutral-400 tracking-widest">AVG/TRIP</p>
        <p className="font-mono-jet text-[13px] font-semibold mt-1 text-[#f6dd8c]">
          ${todayTripCount ? (grossToday / todayTripCount).toFixed(2) : "0.00"}
        </p>
      </div>
      <div className="p-3 text-center">
        <p className="text-[9px] text-neutral-400 tracking-widest">WEEK TOTAL</p>
        <p className="font-mono-jet text-[13px] font-semibold mt-1 text-[#f5c518]">${weeklyTotal.toFixed(2)}</p>
      </div>
    </div>
  );
}

export function TollCard({ tollYear, totalTollsToday, tollsWeek, tollsMonth, tollsYear, shiftActive }: {
  tollYear: number;
  totalTollsToday: number;
  tollsWeek: number;
  tollsMonth: number;
  tollsYear: number;
  shiftActive: boolean;
}) {
  return (
    <div className="rounded-xl bg-[#1a1625] border border-[#2a2340] border-l-[3px] border-l-[#8b5cf6] p-3.5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6]" />
          <p className="text-[10px] tracking-[0.18em] font-bold text-[#a78bfa]">E-ZPASS {tollYear} · TOLLS PAID</p>
        </div>
        <span className="font-mono-jet text-[11px] font-bold text-[#c4b5fd]">${totalTollsToday.toFixed(2)} today</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {([["WEEK", tollsWeek], ["MONTH", tollsMonth], ["YEAR", tollsYear]] as [string, number][]).map(([label, val]) => (
          <div key={label} className="text-center">
            <p className="text-[8px] text-[#6d5a9c] tracking-widest">{label}</p>
            <p className="font-mono-jet text-[12px] font-semibold text-[#c4b5fd] mt-0.5">${val.toFixed(2)}</p>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-[#c4b5fd]/70 mt-2">
        {shiftActive ? "📡 Geofencing active — auto-detecting tolls" : "Start your shift for auto toll detection"}
      </p>
    </div>
  );
}