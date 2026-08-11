import "./_group.css";

// ── Semi-circle $/hr Speedometer + SuperPlus Board ──────────────────────────
// Color zones: Red($0-45) | Orange($45-58) | Yellow($58-68) | Green($68-80) | Blue($80-90+)

const ZONES = [
  { min: 0,  max: 45, color: "#ef4444", label: "Bajo" },
  { min: 45, max: 58, color: "#f97316", label: "OK" },
  { min: 58, max: 68, color: "#eab308", label: "Bueno" },
  { min: 68, max: 80, color: "#4ade80", label: "Gran" },
  { min: 80, max: 90, color: "#3b82f6", label: "Óptimo" },
];
const MAX_SPEED = 90;

function polarToXY(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const s = polarToXY(cx, cy, r, startDeg);
  const e = polarToXY(cx, cy, r, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
}

// Map value 0-90 to angle 180-360 (semi-circle left→right)
function valToAngle(val: number) {
  return 180 + Math.min(val / MAX_SPEED, 1) * 180;
}

function Gauge({ value }: { value: number }) {
  const CX = 120, CY = 105, R = 82, SW = 22;
  const totalStart = 180, totalEnd = 360;

  // Zone arcs
  const arcs = ZONES.map((z) => ({
    ...z,
    startDeg: valToAngle(z.min),
    endDeg: valToAngle(Math.min(z.max, MAX_SPEED)),
  }));

  // Needle
  const needleAngle = valToAngle(Math.min(value, MAX_SPEED));
  const needleTip = polarToXY(CX, CY, R - 4, needleAngle);
  const needleBase1 = polarToXY(CX, CY, 10, needleAngle + 90);
  const needleBase2 = polarToXY(CX, CY, 10, needleAngle - 90);

  // Current zone color
  const zone = ZONES.find((z) => value >= z.min && value < z.max) ?? ZONES[ZONES.length - 1];
  const needleColor = zone.color;

  return (
    <svg width="240" height="125" viewBox="0 0 240 125">
      {/* Track */}
      <path d={describeArc(CX, CY, R, totalStart, totalEnd)} fill="none" stroke="#1e1e1e" strokeWidth={SW} strokeLinecap="round" />
      {/* Zone arcs */}
      {arcs.map((z) => (
        <path key={z.label} d={describeArc(CX, CY, R, z.startDeg, z.endDeg)}
          fill="none" stroke={z.color} strokeWidth={SW - 2} strokeLinecap="butt" opacity="0.85" />
      ))}
      {/* Zone tick labels */}
      {[0, 45, 58, 68, 80, 90].map((v) => {
        const a = valToAngle(v);
        const p = polarToXY(CX, CY, R + 14, a);
        return (
          <text key={v} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle"
            fill="#6b7280" fontSize="7" fontFamily="JetBrains Mono, monospace">{v}</text>
        );
      })}
      {/* Needle */}
      <polygon
        points={`${needleTip.x},${needleTip.y} ${needleBase1.x},${needleBase1.y} ${needleBase2.x},${needleBase2.y}`}
        fill={needleColor} opacity="0.95" />
      {/* Center cap */}
      <circle cx={CX} cy={CY} r={8} fill="#1a1a1a" stroke={needleColor} strokeWidth="2" />
      {/* Value label */}
      <text x={CX} y={CY - 32} textAnchor="middle" fill={needleColor} fontSize="26" fontWeight="bold"
        fontFamily="JetBrains Mono, monospace">${value.toFixed(0)}</text>
      <text x={CX} y={CY - 15} textAnchor="middle" fill="#6b7280" fontSize="8"
        fontFamily="JetBrains Mono, monospace">por hora</text>
      {/* Zone label */}
      <text x={CX} y={CY + 22} textAnchor="middle" fill={needleColor} fontSize="9" fontWeight="bold"
        fontFamily="JetBrains Mono, monospace" letterSpacing="2">{zone.label.toUpperCase()}</text>
    </svg>
  );
}

const goldGrad = { background: "linear-gradient(90deg, #f6dd8c, #d9b64f)" };

export function Speedometer() {
  const perHour = 72.50;
  const netBalance = 1840.00;
  const totalIncome = 4320.00;
  const totalExpenses = 2480.00;

  return (
    <div className="min-h-screen w-full bg-black text-white overflow-y-auto" style={{ fontFamily: "Inter, sans-serif" }}>
      <div className="max-w-[390px] mx-auto bg-black min-h-screen">
        {/* Header */}
        <div className="px-4 pt-12 pb-3 flex items-center justify-between border-b border-[#1a1a1a]">
          <div>
            <p className="text-[10px] tracking-[0.3em] text-neutral-500 font-semibold uppercase">Financial Intelligence</p>
            <p className="font-['Cinzel'] text-[14px] tracking-[0.05em]" style={goldGrad as any}>ISLANDCITY</p>
          </div>
          <div className="bg-[#141414] border border-[#222] rounded-full w-8 h-8 flex items-center justify-center text-[#f6dd8c] text-[11px] font-bold">M</div>
        </div>

        <div className="px-3 py-3 space-y-3">

          {/* ── SuperPlus Board ── */}
          <div className="relative rounded-2xl overflow-hidden border border-[#d9b64f]/20 p-4"
            style={{ background: "linear-gradient(135deg, #0d0900 0%, #1a0f00 50%, #0d0900 100%)" }}>
            <div className="absolute inset-0 rounded-2xl pointer-events-none"
              style={{ boxShadow: "inset 0 0 40px #d9b64f0a, 0 0 20px #d9b64f08" }} />
            <p className="text-[8px] tracking-[0.3em] text-[#a07820] font-bold uppercase mb-1">SUPER PLUS · AGOSTO 2026</p>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[9px] text-neutral-500 mb-0.5">Balance neto</p>
                <p className="font-['JetBrains_Mono',monospace] text-[40px] font-bold leading-none"
                  style={{ background: "linear-gradient(135deg, #f6dd8c, #d9b64f)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  +${netBalance.toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[9px] text-[#4ade80] font-bold">↗ En camino</p>
                <p className="text-[10px] text-neutral-500">meta $5,200</p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-[#d9b64f]/15 grid grid-cols-2 gap-2">
              <div>
                <p className="text-[8px] text-neutral-600 uppercase tracking-widest">Ingresos</p>
                <p className="font-['JetBrains_Mono',monospace] text-[15px] font-bold text-[#4ade80]">${totalIncome.toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-[8px] text-neutral-600 uppercase tracking-widest">Gastos</p>
                <p className="font-['JetBrains_Mono',monospace] text-[15px] font-bold text-red-400">-${totalExpenses.toLocaleString()}</p>
              </div>
            </div>
            {/* Annual strip */}
            <div className="mt-3 bg-black/40 rounded-xl p-2.5">
              <div className="flex justify-between text-[8px] text-neutral-500 mb-1">
                <span>Proyección anual</span>
                <span className="text-[#f6dd8c]">$62.4k · 36%</span>
              </div>
              <div className="h-1.5 bg-[#1e1e1e] rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: "36%", background: "linear-gradient(to right, #d9b64f, #f6dd8c)" }} />
              </div>
            </div>
          </div>

          {/* ── Speedometer Card ── */}
          <div className="bg-[#101010] border border-[#1e1e1e] rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[9px] tracking-[0.22em] text-neutral-500 font-bold uppercase">$/HR AHORA</p>
              <span className="bg-[#4ade80]/10 text-[#4ade80] text-[8px] px-2 py-0.5 rounded-full border border-[#4ade80]/20">EN TURNO</span>
            </div>
            <div className="flex justify-center">
              <Gauge value={perHour} />
            </div>
            {/* Zone legend */}
            <div className="flex justify-center gap-2 mt-1 flex-wrap">
              {ZONES.map((z) => (
                <div key={z.label} className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ background: z.color }} />
                  <span className="text-[7px] text-neutral-600">{z.min}+</span>
                </div>
              ))}
            </div>
            {/* Stats row */}
            <div className="grid grid-cols-3 gap-2 mt-3">
              {[
                { label: "Este turno", val: "$285.00", color: "text-[#f6dd8c]" },
                { label: "Horas activas", val: "3.9h", color: "text-white" },
                { label: "Meta diaria", val: "72%", color: "text-[#4ade80]" },
              ].map((s) => (
                <div key={s.label} className="bg-black rounded-xl p-2 text-center">
                  <p className="text-[7px] text-neutral-600 uppercase tracking-widest leading-tight mb-1">{s.label}</p>
                  <p className={`font-['JetBrains_Mono',monospace] text-[13px] font-bold ${s.color}`}>{s.val}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── HOY Ring ── */}
          <div className="bg-[#101010] border border-[#1e1e1e] rounded-2xl p-4">
            <p className="text-[9px] tracking-[0.22em] text-neutral-500 font-bold uppercase mb-3">HOY — META DIARIA</p>
            <div className="flex items-center gap-4">
              <svg width="110" height="110" viewBox="0 0 110 110" className="flex-shrink-0">
                <circle cx="55" cy="55" r="44" fill="none" stroke="#1e1e1e" strokeWidth="9"/>
                <circle cx="55" cy="55" r="44" fill="none" stroke="#d9b64f" strokeWidth="9"
                  strokeLinecap="round" strokeDasharray={`${0.72 * 2 * Math.PI * 44} ${2 * Math.PI * 44}`}
                  transform="rotate(-90 55 55)"/>
                <text x="55" y="50" textAnchor="middle" fill="#f6dd8c" fontSize="16" fontWeight="bold" fontFamily="JetBrains Mono, monospace">72%</text>
                <text x="55" y="65" textAnchor="middle" fill="#6b7280" fontSize="7.5" fontFamily="JetBrains Mono, monospace">$285/$400</text>
              </svg>
              <div className="flex-1 space-y-2">
                <div>
                  <p className="text-[8px] text-neutral-500 uppercase tracking-widest">Ganado hoy</p>
                  <p className="font-['JetBrains_Mono',monospace] text-[22px] font-bold text-[#f6dd8c] leading-none">$285.00</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-black rounded-lg p-2">
                    <p className="text-[7px] text-neutral-600">Falta</p>
                    <p className="font-['JetBrains_Mono',monospace] text-[12px] font-bold text-white">$115</p>
                  </div>
                  <div className="bg-black rounded-lg p-2">
                    <p className="text-[7px] text-neutral-600">$/hora</p>
                    <p className="font-['JetBrains_Mono',monospace] text-[12px] font-bold text-white">$72.50</p>
                  </div>
                </div>
                <p className="text-[8px] text-[#4ade80]">✓ Meta ≈ 5:45 PM</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
