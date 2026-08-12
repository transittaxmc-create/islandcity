import "./_group.css";

// ── FINANCES BOLD v2 — Matching IMG_1495 reference layout ──────────────────
// Layout: IC brand header → Hourly Earnings Advisor (speedometer) →
//         Target vs Actual → Performance History → Advisor Panel → Daily Goal Ring

const ZONES = [
  { min: 0,  max: 45, color: "#ef4444", label: "Bajo"   },
  { min: 45, max: 58, color: "#f97316", label: "OK"     },
  { min: 58, max: 68, color: "#eab308", label: "Bueno"  },
  { min: 68, max: 80, color: "#4ade80", label: "Gran"   },
  { min: 80, max: 90, color: "#3b82f6", label: "Óptimo" },
];
const MAX_VAL = 90;

function valToAngle(v: number) {
  return 180 + Math.min(v / MAX_VAL, 1) * 180;
}
function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}
function arc(cx: number, cy: number, r: number, a1: number, a2: number) {
  const s = polar(cx, cy, r, a1);
  const e = polar(cx, cy, r, a2);
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${a2 - a1 > 180 ? 1 : 0} 1 ${e.x} ${e.y}`;
}

function Gauge({ value }: { value: number }) {
  const CX = 155, CY = 128, R = 108, SW = 26;
  const zone = ZONES.find(z => value >= z.min && value < z.max) ?? ZONES[ZONES.length - 1];
  const needleAngle = valToAngle(Math.min(value, MAX_VAL));
  const tip = polar(CX, CY, R - 8, needleAngle);
  const b1  = polar(CX, CY, 11, needleAngle + 90);
  const b2  = polar(CX, CY, 11, needleAngle - 90);
  return (
    <svg width="310" height="148" viewBox="0 0 310 148">
      {/* Track */}
      <path d={arc(CX, CY, R, 180, 360)} fill="none" stroke="#161616" strokeWidth={SW} />
      {/* Zone arcs */}
      {ZONES.map(z => (
        <path key={z.label}
          d={arc(CX, CY, R, valToAngle(z.min), valToAngle(Math.min(z.max, MAX_VAL)))}
          fill="none" stroke={z.color} strokeWidth={SW - 4} strokeLinecap="butt" opacity={0.88} />
      ))}
      {/* Zone dividers */}
      {[45, 58, 68, 80].map(v => {
        const a = valToAngle(v);
        const i2 = polar(CX, CY, R - SW / 2 + 1, a);
        const o2 = polar(CX, CY, R + SW / 2 - 3, a);
        return <line key={v} x1={i2.x} y1={i2.y} x2={o2.x} y2={o2.y} stroke="#000" strokeWidth="2.5" opacity="0.6" />;
      })}
      {/* $0 / $90 labels */}
      <text x="44" y="146" fill="#3a3a3a" fontSize="10" fontFamily="JetBrains Mono,monospace">$0</text>
      <text x="252" y="146" fill="#3a3a3a" fontSize="10" fontFamily="JetBrains Mono,monospace">$90</text>
      {/* Zone labels on arc */}
      {ZONES.map(z => {
        const midAngle = valToAngle((z.min + Math.min(z.max, MAX_VAL)) / 2);
        const p = polar(CX, CY, R - SW / 2 - 14, midAngle);
        return (
          <text key={z.label} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle"
            fill={z.color} fontSize="8" fontWeight="700" fontFamily="JetBrains Mono,monospace" opacity="0.7">
            {z.label}
          </text>
        );
      })}
      {/* Needle */}
      <defs>
        <filter id="needleGlow"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <polygon points={`${tip.x},${tip.y} ${b1.x},${b1.y} ${b2.x},${b2.y}`}
        fill={zone.color} filter="url(#needleGlow)" />
      {/* Hub */}
      <circle cx={CX} cy={CY} r="11" fill="#0e0e0e" stroke={zone.color} strokeWidth="2.5" />
      {/* Current rate — big label inside arc */}
      <text x={CX} y={CY - 50} textAnchor="middle" fill={zone.color}
        fontSize="36" fontWeight="900" fontFamily="JetBrains Mono,monospace">${value}.40</text>
      <text x={CX} y={CY - 30} textAnchor="middle" fill="#555"
        fontSize="10" fontFamily="JetBrains Mono,monospace">/hr AHORA</text>
    </svg>
  );
}

// Stat chip row (Target vs Actual)
function StatChip({ label, val, sub, color }: { label: string; val: string; sub?: string; color: string }) {
  return (
    <div style={{ flex: 1, background: "#0d0d0d", borderRadius: 14, padding: "10px 10px 8px" }}>
      <p style={{ margin: 0, fontSize: 8, color: "#444", textTransform: "uppercase", letterSpacing: "0.18em" }}>{label}</p>
      <p style={{ margin: "4px 0 2px", fontSize: 18, fontWeight: 900, color, fontFamily: "JetBrains Mono,monospace", lineHeight: 1 }}>{val}</p>
      {sub && <p style={{ margin: 0, fontSize: 9, color: "#444" }}>{sub}</p>}
    </div>
  );
}

// Mini bar (Performance History)
function HistoryBar({ h, color, label }: { h: number; color: string; label: string }) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <div style={{ width: "70%", height: 56, display: "flex", alignItems: "flex-end" }}>
        <div style={{ width: "100%", height: `${h}%`, background: color, borderRadius: "4px 4px 0 0", opacity: 0.85 }} />
      </div>
      <p style={{ margin: 0, fontSize: 9, color: "#444" }}>{label}</p>
    </div>
  );
}

const goldStyle: React.CSSProperties = {
  background: "linear-gradient(90deg,#f6dd8c,#d9b64f)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

export function FinancesBold() {
  const perHour   = 65;
  const grossToday = 285.00;
  const goalToday  = 400;
  const goalPct    = grossToday / goalToday;
  const R = 42, CX = 52, CY = 52, circ = 2 * Math.PI * R;
  const filled = Math.min(goalPct, 1) * circ;

  return (
    <div style={{ minHeight: "100vh", width: "100%", background: "#000", color: "#fff",
      fontFamily: "Inter,sans-serif", overflowY: "auto" }}>
      <div style={{ maxWidth: 390, margin: "0 auto" }}>

        {/* ── IC Brand header — matches IMG_1495 top bar ─────────────────── */}
        <div style={{
          background: "#0a0800",
          borderBottom: "1px solid #d9b64f22",
          padding: "44px 16px 14px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          {/* Logo + name */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 38, height: 38, borderRadius: "50%",
              background: "radial-gradient(circle at 40% 40%,#1a1500,#000)",
              border: "1.5px solid #d9b64f55",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16,
            }}>🌉</div>
            <div>
              <p style={{ margin: 0, fontFamily: "Cinzel,serif", fontWeight: 700, fontSize: 15,
                letterSpacing: "0.04em", ...goldStyle as any }}>ISLANDCITY</p>
              <p style={{ margin: 0, fontSize: 7, color: "#a07820", letterSpacing: "0.3em", textTransform: "uppercase" }}>
                TRANSIT SERVICES
              </p>
            </div>
          </div>
          {/* EN TURNO badge */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{
              background: "#0f1f0f", border: "1px solid #4ade8040",
              borderRadius: 999, padding: "4px 12px",
              fontSize: 10, color: "#4ade80", fontWeight: 700,
              display: "flex", alignItems: "center", gap: 5,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80", display: "inline-block" }}/>
              EN TURNO
            </span>
            <div style={{
              width: 32, height: 32, borderRadius: "50%", background: "#161616",
              border: "1px solid #222", display: "flex", alignItems: "center", justifyContent: "center",
              color: "#f6dd8c", fontSize: 11, fontWeight: 700,
            }}>M</div>
          </div>
        </div>

        {/* ── HOURLY EARNINGS ADVISOR card ───────────────────────────────── */}
        <div style={{ margin: "12px 12px 0",
          background: "#080808", border: "1px solid #1e1e1e", borderRadius: 22, overflow: "hidden" }}>
          {/* Card title */}
          <div style={{ padding: "14px 18px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#d9b64f",
              textTransform: "uppercase", letterSpacing: "0.18em" }}>HOURLY EARNINGS ADVISOR</p>
            <span style={{
              fontSize: 9, color: "#555", background: "#111",
              border: "1px solid #222", borderRadius: 999, padding: "3px 9px",
            }}>CURRENT HOURLY RATE</span>
          </div>

          {/* Gauge — centred */}
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 8 }}>
            <Gauge value={perHour} />
          </div>

          {/* Zone legend strip */}
          <div style={{
            display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap",
            padding: "0 16px 14px",
          }}>
            {ZONES.map(z => (
              <div key={z.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: z.color, display: "inline-block" }}/>
                <span style={{ fontSize: 9, color: "#555" }}>${z.min}–{z.max}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── TARGET VS. ACTUAL ───────────────────────────────────────────── */}
        <div style={{ margin: "10px 12px 0",
          background: "#080808", border: "1px solid #1e1e1e", borderRadius: 22, padding: "14px 16px" }}>
          <p style={{ margin: "0 0 10px", fontSize: 9, color: "#555",
            textTransform: "uppercase", letterSpacing: "0.22em", fontWeight: 700 }}>TARGET VS. ACTUAL</p>
          <div style={{ display: "flex", gap: 8 }}>
            <StatChip label="Weekly Reg."  val="$68/hr"  sub="meta semanal" color="#d9b64f" />
            <StatChip label="$/hr Actual"  val="$65/hr"  sub="este turno"   color="#4ade80" />
            <StatChip label="Last Hour"    val="$71/hr"  sub="12:00–1:00"   color="#3b82f6" />
          </div>
          {/* Shift row */}
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <StatChip label="Turno activo" val="3h 54m" color="#fff" />
            <StatChip label="Viajes"        val="6"     color="#fff" />
            <StatChip label="Clock in"      val="9:30A" color="#f6dd8c" />
          </div>
        </div>

        {/* ── PERFORMANCE HISTORY ─────────────────────────────────────────── */}
        <div style={{ margin: "10px 12px 0",
          background: "#080808", border: "1px solid #1e1e1e", borderRadius: 22, padding: "14px 16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
            <p style={{ margin: 0, fontSize: 9, color: "#555",
              textTransform: "uppercase", letterSpacing: "0.22em", fontWeight: 700 }}>PERFORMANCE HISTORY</p>
            <span style={{ fontSize: 9, color: "#3b82f6" }}>Last 8 hours</span>
          </div>
          <div style={{ display: "flex", gap: 2, alignItems: "flex-end", height: 68 }}>
            {[
              { h: 55, c: "#eab308", l: "9AM" },
              { h: 72, c: "#4ade80", l: "10A" },
              { h: 68, c: "#4ade80", l: "11A" },
              { h: 45, c: "#f97316", l: "12P" },
              { h: 80, c: "#3b82f6", l: "1PM" },
              { h: 88, c: "#3b82f6", l: "2PM" },
              { h: 72, c: "#4ade80", l: "3PM" },
              { h: 65, c: "#4ade80", l: "NOW" },
            ].map((b, i) => <HistoryBar key={i} h={b.h} color={b.c} label={b.l} />)}
          </div>
          {/* Y-axis hint */}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
            <span style={{ fontSize: 8, color: "#333" }}>$0</span>
            <span style={{ fontSize: 8, color: "#333" }}>$90/hr</span>
          </div>
        </div>

        {/* ── ADVISOR PANEL ───────────────────────────────────────────────── */}
        <div style={{ margin: "10px 12px 0",
          background: "linear-gradient(135deg,#0a0900,#120f00)",
          border: "1px solid #d9b64f22", borderRadius: 22, padding: "14px 16px" }}>
          <p style={{ margin: "0 0 10px", fontSize: 9, color: "#a07820",
            textTransform: "uppercase", letterSpacing: "0.22em", fontWeight: 700 }}>ADVISOR PANEL</p>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            {/* Avatar */}
            <div style={{
              width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
              background: "#d9b64f22", border: "1.5px solid #d9b64f44",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
            }}>🤖</div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: "0 0 5px", fontSize: 13, fontWeight: 700, color: "#f6dd8c" }}>Your performance is good!</p>
              <p style={{ margin: "0 0 6px", fontSize: 11, color: "#888", lineHeight: 1.5 }}>
                $65/hr está en la zona <span style={{ color: "#4ade80", fontWeight: 700 }}>GRAN</span>.
                Focus on high-demand zones or a slightly higher rate per mile to maintain target of $68–$70/hr.
                Avoid lower-paid jobs.
              </p>
              <div style={{ display: "flex", gap: 6 }}>
                {["Alta demanda →", "Evitar tráfico", "Meta: $70/hr"].map(tag => (
                  <span key={tag} style={{
                    fontSize: 8, color: "#d9b64f", background: "#d9b64f12",
                    border: "1px solid #d9b64f30", borderRadius: 999, padding: "3px 8px",
                  }}>{tag}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── HOY — Meta diaria (ring) ────────────────────────────────────── */}
        <div style={{ margin: "10px 12px 20px",
          background: "#080808", border: "1px solid #1e1e1e", borderRadius: 22, padding: "16px" }}>
          <p style={{ margin: "0 0 12px", fontSize: 9, color: "#555",
            textTransform: "uppercase", letterSpacing: "0.22em", fontWeight: 700 }}>HOY — META DIARIA</p>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            {/* Ring */}
            <svg width={104} height={104} style={{ flexShrink: 0 }}>
              <circle cx={CX} cy={CY} r={R} fill="none" stroke="#141414" strokeWidth={9} />
              <circle cx={CX} cy={CY} r={R} fill="none"
                stroke={goalPct >= 1 ? "#4ade80" : "#d9b64f"} strokeWidth={9}
                strokeLinecap="round" strokeDasharray={`${filled} ${circ}`}
                transform={`rotate(-90 ${CX} ${CY})`} />
              <text x={CX} y={CY - 4} textAnchor="middle" fill={goalPct >= 1 ? "#4ade80" : "#f6dd8c"}
                fontSize="17" fontWeight="900" fontFamily="JetBrains Mono,monospace">
                {Math.round(goalPct * 100)}%
              </text>
              <text x={CX} y={CY + 12} textAnchor="middle" fill="#444" fontSize="8"
                fontFamily="JetBrains Mono,monospace">$285/$400</text>
            </svg>
            {/* Stats list — matches IMG_1498 right-side layout */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { label: "Today",      val: `$${grossToday.toFixed(0)}`, color: "#fff"     },
                { label: "Daily Goal", val: `$${goalToday}`,             color: "#f6dd8c"  },
                { label: "Remaining",  val: `$${Math.max(goalToday - grossToday, 0).toFixed(0)}`, color: "#4ade80" },
                { label: "Meta ≈",     val: "5:45 PM",                   color: "#3b82f6"  },
              ].map(r => (
                <div key={r.label} style={{ display: "flex", justifyContent: "space-between" }}>
                  <p style={{ margin: 0, fontSize: 12, color: "#666" }}>{r.label}</p>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: r.color,
                    fontFamily: "JetBrains Mono,monospace" }}>{r.val}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
