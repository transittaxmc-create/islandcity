// ── Dashboard · Hourly Advisor / Rueda Centrada v6.2 (spec) ─────────
import { fmt } from "../lib/domain";
import { CARD, LABEL, pillCls } from "../lib/ui";

interface Props {
  todayLabel: string;
  shiftOn: boolean;
  rate: number | null;
  grandToday: number;
  target: number;
  hoursWorked: number;
  last7: { label: string; rate: number | null }[];
  advisor: { text: string; rec: string };
  onStartShift: () => void;
  onEndShift: () => void;
}

export default function DashboardScreen({
  todayLabel,
  shiftOn,
  rate,
  grandToday,
  target,
  hoursWorked,
  last7,
  advisor,
  onStartShift,
  onEndShift,
}: Props) {
  const r = rate ?? 0;
  const pct = target > 0 ? Math.min(1, r / (target * 2)) : 0; // target = half sweep
  const above = rate != null && rate >= target;
  const R = 90;
  const C = 2 * Math.PI * R;
  const half = C / 2;

  return (
    <div className="space-y-3 pb-4">
      <div className={CARD}>
        <div className="flex items-center justify-between">
          <span className={LABEL}>HOURLY ADVISOR</span>
          <span className="text-[11px] font-semibold text-[#8a8a8a]">{todayLabel}</span>
        </div>

        {/* $/hr centered above wheel */}
        <div className="mt-2 text-center">
          <div className="text-[10px] font-black text-[#6f6f6f]">$/HR AHORA</div>
          <div className={`font-mono text-[42px] font-black leading-none ${above ? "text-[#00FF6A]" : "text-[#FF8C00]"}`}>
            {rate != null ? fmt(rate) : "--"}
          </div>
          <div className="text-[10px] font-bold text-[#6f6f6f]">
            Target ${target}/h · {hoursWorked.toFixed(1)}h trabajadas
          </div>
        </div>

        {/* wheel — pivot 150,140 centered */}
        <div className="mx-auto mt-2 flex max-w-[300px] justify-center">
          <svg viewBox="0 0 300 160" className="h-40 w-full">
            <circle
              cx="150"
              cy="140"
              r={R}
              fill="none"
              stroke="#1a1a1a"
              strokeWidth="14"
              strokeDasharray={`${half} ${C}`}
              transform="rotate(180 150 140)"
            />
            <circle
              cx="150"
              cy="140"
              r={R}
              fill="none"
              stroke={above ? "#00FF6A" : pct >= 0.5 ? "#FFD700" : "#FF8C00"}
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray={`${half * pct} ${C}`}
              transform="rotate(180 150 140)"
            />
            <circle cx="150" cy="140" r="6" fill="#FFD700" />
          </svg>
        </div>

        <div className="mt-1 text-center">
          <span className={pillCls(above ? "green" : "orange")}>
            {rate != null ? (above ? "✓ TARGET EXCEDIDO" : `FALTAN ${fmt(target - r)}/h`) : "inicia turno"}
          </span>
        </div>
      </div>

      {/* START / END */}
      <div className={CARD}>
        {shiftOn ? (
          <button
            onClick={onEndShift}
            className="h-16 w-full rounded-2xl bg-[#f87171] text-[16px] font-black text-black"
          >
            ⏹ END SHIFT
          </button>
        ) : (
          <button
            onClick={onStartShift}
            className="h-16 w-full animate-pulse rounded-2xl bg-[#00FF6A] text-[16px] font-black text-black"
          >
            ▶ START
          </button>
        )}
        <div className="mt-2 text-center font-mono text-[22px] font-black text-white">
          {fmt(grandToday)}
        </div>
        <div className="text-center text-[10px] font-black text-[#6f6f6f]">GRAND TOTAL · HOY</div>
      </div>

      {/* advisor panel */}
      <div className={CARD}>
        <div className={LABEL}>🤖 ADVISOR PANEL</div>
        <div className="mt-1 text-[13px] font-semibold text-white">{advisor.text}</div>
        {advisor.rec && <div className="mt-1 text-[12px] font-black text-[#FFD700]">→ {advisor.rec}</div>}
      </div>

      {/* performance history — last 7 days $/hr */}
      <div className={CARD}>
        <div className={LABEL}>PERFORMANCE HISTORY · ÚLTIMOS 7 DÍAS</div>
        <div className="mt-2 flex h-24 items-end gap-1.5">
          {last7.map((d, i) => {
            const h = d.rate != null ? Math.min(100, (d.rate / (target * 2)) * 100) : 0;
            const c = d.rate != null && d.rate >= target ? "#00FF6A" : d.rate != null ? "#FFD700" : "#1a1a1a";
            return (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <div className="w-full rounded-t" style={{ height: `${Math.max(4, h)}%`, background: c }} />
                <div className="text-[8px] font-black text-[#6f6f6f]">{d.label}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}