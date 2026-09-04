// ── DASH gauges — ported 1:1 from EI Program $/hr arc + goal ring ─────
export const GOLD_GRADIENT = {
  background: "linear-gradient(90deg, #f6dd8c, #d9b64f)",
  WebkitBackgroundClip: "text" as const,
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
};

export function GaugeArc({ perHourGross, goal }: { perHourGross: number; goal: number }) {
  const GCX = 150, GCY = 128, GR = 104, GSW = 18;
  const gA = (v: number) => 180 + Math.min(v / 100, 1) * 180;
  const gP = (r: number, deg: number) => ({ x: GCX + r * Math.cos((deg * Math.PI) / 180), y: GCY + r * Math.sin((deg * Math.PI) / 180) });
  const gPath = (r: number, a1: number, a2: number) => {
    const s = gP(r, a1), e = gP(r, a2);
    return `M${s.x.toFixed(1)} ${s.y.toFixed(1)} A${r} ${r} 0 ${a2 - a1 >= 180 ? 1 : 0} 1 ${e.x.toFixed(1)} ${e.y.toFixed(1)}`;
  };
  const zones = [
    { min: 0, max: 60, color: "#ef4444" },
    { min: 60, max: 70, color: "#f97316" },
    { min: 70, max: 80, color: "#fbbf24" },
    { min: 80, max: 90, color: "#4ade80" },
    { min: 90, max: 100, color: "#3b82f6" },
  ];
  const activeZ = zones.find((z) => perHourGross >= z.min && (z.max >= 100 || perHourGross < z.max)) ?? zones[0];
  const zColor = perHourGross > 0 ? activeZ.color : "#374151";
  // Needle always drawn — resting at $0 (180°) in gray when no data, so the
  // gauge reads like a real speedometer on any device, shift or not.
  const needleA = gA(Math.min(Math.max(perHourGross, 0), 100));
  const tip = gP(GR - 14, needleA), b1 = gP(9, needleA + 90), b2 = gP(9, needleA - 90);
  const goalA = gA(Math.min(goal, 100));
  const gm1 = gP(GR - GSW / 2 + 1, goalA), gm2 = gP(GR + GSW / 2 - 3, goalA);
  return (
    <svg width="100%" height="136" viewBox="0 0 300 136" style={{ overflow: "visible" }}>
      <path d={gPath(GR, 180, 360)} fill="none" stroke="#1c1c1c" strokeWidth={GSW} />
      {zones.map((z) => (
        <path key={z.min} d={gPath(GR, gA(z.min), gA(Math.min(z.max, 100)))}
          fill="none" stroke={z.color} strokeWidth={GSW} strokeLinecap="butt" opacity={0.9} />
      ))}
      {/* Goal marker */}
      <line x1={gm1.x} y1={gm1.y} x2={gm2.x} y2={gm2.y} stroke="#f6dd8c" strokeWidth="3" opacity="0.9" />
      {/* Zone separators */}
      {[60, 70, 80, 90].map((v) => {
        const a = gA(v); const i = gP(GR - GSW / 2 + 1, a), o = gP(GR + GSW / 2 - 3, a);
        return <line key={v} x1={i.x} y1={i.y} x2={o.x} y2={o.y} stroke="#000" strokeWidth="2" opacity="0.6" />;
      })}
      {/* Boundary labels */}
      {([{ v: 0, t: "$0" }, { v: 60, t: "$60" }, { v: 70, t: "$70" }, { v: 80, t: "$80" }, { v: 90, t: "$90" }, { v: 100, t: "$100+" }] as { v: number; t: string }[]).map(({ v, t }) => {
        const a = gA(v); const p = gP(GR + GSW / 2 + 9, a);
        return <text key={v} x={p.x} y={p.y + 4} textAnchor={v <= 20 ? "end" : "start"} fill="#4b5563" fontSize="9" fontFamily="monospace">{t}</text>;
      })}
      {/* Needle — always visible (rests at $0 in gray, colored when live) */}
      <polygon points={`${tip.x},${tip.y} ${b1.x},${b1.y} ${b2.x},${b2.y}`} fill={zColor} opacity="0.92" />
      <circle cx={GCX} cy={GCY} r="9" fill="#0a0a0a" stroke={zColor} strokeWidth="2" />
      <text x={GCX} y={GCY - 26} textAnchor="middle" fill={zColor} fontSize="28" fontWeight="900" fontFamily="'JetBrains Mono',monospace">
        {perHourGross > 0 ? `$${perHourGross.toFixed(0)}` : "$0"}
      </text>
      <text x={GCX} y={GCY - 9} textAnchor="middle" fill="#6b7280" fontSize="9" fontFamily="monospace">/hr gross</text>
      {perHourGross > 0 && (
        <text x={GCX} y={GCY + 18} textAnchor="middle" fill={zColor} fontSize="8" fontWeight="bold" fontFamily="monospace" letterSpacing="2">
          {perHourGross >= 90 ? "EXCEPTIONAL" : perHourGross >= 70 ? "EXCELLENT" : perHourGross >= 60 ? "MINIMUM OK" : "⚠ BELOW $60"}
        </text>
      )}
    </svg>
  );
}

export function GoalRing({ grossToday, todayGoal, goalPct }: { grossToday: number; todayGoal: number; goalPct: number }) {
  const R = 36, SW = 9, CX = 44, CY = 44;
  const circ = 2 * Math.PI * R;
  const dash = circ * Math.min(goalPct / 100, 1);
  const rc = goalPct >= 100 ? "#4ade80" : goalPct >= 70 ? "#f6dd8c" : "#d9b64f";
  return (
    <svg width="88" height="88" viewBox="0 0 88 88" className="flex-shrink-0">
      <circle cx={CX} cy={CY} r={R} fill="none" stroke="#1e1e1e" strokeWidth={SW} />
      <circle cx={CX} cy={CY} r={R} fill="none" stroke={rc} strokeWidth={SW}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${CX} ${CY})`}
        style={{ transition: "stroke-dasharray 0.6s ease" }} />
      <text x={CX} y={CY + 1} textAnchor="middle" dominantBaseline="middle"
        fill={rc} fontSize="13" fontWeight="900" fontFamily="'JetBrains Mono',monospace">
        {goalPct.toFixed(0)}%
      </text>
      <text x={CX} y={CY + 16} textAnchor="middle" fill="#4b5563" fontSize="8" fontFamily="monospace">
        ${grossToday.toFixed(0)}/${todayGoal}
      </text>
    </svg>
  );
}