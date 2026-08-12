import "./_group.css";

// ── FINANCES BOLD — Velocímetro dinámico + Meta diaria ─────────────────────
// Diseño: números gigantes, colores en bloque, mucho aire, legible a un vistazo

// $/hr zones — same as reference photos
const ZONES = [
  { min: 0,  max: 45, color: "#ef4444", label: "Bajo"   },
  { min: 45, max: 58, color: "#f97316", label: "OK"     },
  { min: 58, max: 68, color: "#eab308", label: "Bueno"  },
  { min: 68, max: 80, color: "#4ade80", label: "Gran"   },
  { min: 80, max: 90, color: "#3b82f6", label: "Óptimo" },
];
const MAX = 90;

function valToAngle(v: number) {
  return 180 + Math.min(v / MAX, 1) * 180;
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

function Speedometer({ value }: { value: number }) {
  const CX = 160, CY = 130, R = 110, SW = 28;

  const zone = ZONES.find(z => value >= z.min && value < z.max) ?? ZONES[ZONES.length - 1];
  const needleAngle = valToAngle(Math.min(value, MAX));
  const tip  = polar(CX, CY, R - 6, needleAngle);
  const b1   = polar(CX, CY, 12, needleAngle + 90);
  const b2   = polar(CX, CY, 12, needleAngle - 90);

  return (
    <svg width="320" height="155" viewBox="0 0 320 155">
      {/* Track */}
      <path d={arc(CX, CY, R, 180, 360)} fill="none" stroke="#161616" strokeWidth={SW} />
      {/* Color zones */}
      {ZONES.map(z => (
        <path key={z.label}
          d={arc(CX, CY, R, valToAngle(z.min), valToAngle(Math.min(z.max, MAX)))}
          fill="none" stroke={z.color} strokeWidth={SW - 4} strokeLinecap="butt" opacity="0.9" />
      ))}
      {/* Tick marks every 15 */}
      {[0, 15, 30, 45, 58, 68, 80, 90].map(v => {
        const a = valToAngle(v);
        const inner = polar(CX, CY, R - SW / 2 - 2, a);
        const outer = polar(CX, CY, R + SW / 2 - 2, a);
        return (
          <line key={v} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y}
            stroke="#000" strokeWidth="2" opacity="0.5" />
        );
      })}
      {/* Min/max labels */}
      <text x="52" y="148" fill="#555" fontSize="11" fontFamily="JetBrains Mono,monospace">$0</text>
      <text x="252" y="148" fill="#555" fontSize="11" fontFamily="JetBrains Mono,monospace">$90</text>
      {/* Needle */}
      <polygon points={`${tip.x},${tip.y} ${b1.x},${b1.y} ${b2.x},${b2.y}`}
        fill={zone.color} filter="url(#glow)" />
      {/* Glow filter */}
      <defs>
        <filter id="glow"><feGaussianBlur stdDeviation="3" result="blur" /><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      {/* Center hub */}
      <circle cx={CX} cy={CY} r="10" fill="#111" stroke={zone.color} strokeWidth="2.5" />
      {/* Value — big */}
      <text x={CX} y={CY - 44} textAnchor="middle" fill={zone.color} fontSize="38" fontWeight="900"
        fontFamily="JetBrains Mono,monospace">${value}</text>
      <text x={CX} y={CY - 22} textAnchor="middle" fill="#555" fontSize="11"
        fontFamily="JetBrains Mono,monospace">/hr AHORA</text>
      {/* Zone badge */}
      <rect x={CX - 28} y={CY + 14} width={56} height={18} rx="9"
        fill={zone.color} opacity="0.15" />
      <text x={CX} y={CY + 27} textAnchor="middle" fill={zone.color} fontSize="10" fontWeight="bold"
        fontFamily="JetBrains Mono,monospace" letterSpacing="2">{zone.label.toUpperCase()}</text>
    </svg>
  );
}

// ── Stat tile ──────────────────────────────────────────────────────────────
function Tile({
  label, value, sub, accent, wide
}: { label: string; value: string; sub?: string; accent: string; wide?: boolean }) {
  return (
    <div style={{
      flex: wide ? "2" : "1",
      background: "#0e0e0e",
      border: `1.5px solid ${accent}22`,
      borderRadius: "18px",
      padding: "14px 12px",
      display: "flex",
      flexDirection: "column",
      gap: "2px",
    }}>
      <p style={{ fontSize: "9px", color: "#555", textTransform: "uppercase", letterSpacing: "0.18em", margin: 0 }}>{label}</p>
      <p style={{ fontSize: "24px", fontWeight: 900, color: accent, fontFamily: "JetBrains Mono,monospace", margin: 0, lineHeight: 1.1 }}>{value}</p>
      {sub && <p style={{ fontSize: "10px", color: "#444", margin: 0 }}>{sub}</p>}
    </div>
  );
}

// ── Horizontal divider ─────────────────────────────────────────────────────
function HDivider() {
  return <div style={{ height: "1px", background: "#161616", margin: "0 0" }} />;
}

const gold: React.CSSProperties = {
  background: "linear-gradient(90deg, #f6dd8c, #d9b64f)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

export function FinancesBold() {
  // — Static demo values — (in app: computed live from shift state)
  const perHour    = 72;
  const grossToday = 285.00;
  const goalToday  = 400;
  const goalPct    = grossToday / goalToday;
  const hoursOn    = 3.9;
  const tripsToday = 6;
  const remaining  = Math.max(goalToday - grossToday, 0);

  // Ring geometry
  const R = 44, CX = 54, CY = 54, circ = 2 * Math.PI * R;
  const filled = Math.min(goalPct, 1) * circ;
  const ringColor = goalPct >= 1 ? "#4ade80" : "#d9b64f";

  return (
    <div style={{
      minHeight: "100vh", width: "100%", background: "#000", color: "#fff",
      fontFamily: "Inter, sans-serif", overflowY: "auto",
    }}>
      <div style={{ maxWidth: 390, margin: "0 auto", minHeight: "100vh", background: "#000" }}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div style={{ padding: "48px 18px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontSize: "9px", letterSpacing: "0.28em", color: "#555", textTransform: "uppercase", margin: 0 }}>Financial Intelligence</p>
            <p style={{ fontSize: "18px", fontFamily: "Cinzel,serif", fontWeight: 700, margin: "2px 0 0", ...gold as any }}>ISLANDCITY</p>
          </div>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <span style={{
              background: "#0f1f0f", border: "1px solid #4ade8033", borderRadius: 999,
              padding: "3px 10px", fontSize: 10, color: "#4ade80", display: "flex", alignItems: "center", gap: 5
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80", display: "inline-block", animation: "pulse 1s infinite" }} />
              EN TURNO
            </span>
            <div style={{
              width: 34, height: 34, borderRadius: "50%", background: "#111",
              border: "1px solid #222", display: "flex", alignItems: "center", justifyContent: "center",
              color: "#f6dd8c", fontSize: 12, fontWeight: 700
            }}>M</div>
          </div>
        </div>

        {/* ── Speedometer ────────────────────────────────────────────────── */}
        <div style={{
          background: "#080808", border: "1px solid #181818", borderRadius: 24,
          margin: "0 12px", padding: "20px 10px 10px",
        }}>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <Speedometer value={perHour} />
          </div>
          {/* Zone legend */}
          <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 6 }}>
            {ZONES.map(z => (
              <div key={z.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: z.color, display: "inline-block" }} />
                <span style={{ fontSize: 9, color: "#444" }}>${z.min}+</span>
              </div>
            ))}
          </div>
          {/* Shift clock */}
          <div style={{ marginTop: 12, padding: "10px 16px", background: "#0a0a0a", borderRadius: 14,
            display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ margin: 0, fontSize: 9, color: "#555", textTransform: "uppercase", letterSpacing: "0.18em" }}>Turno activo</p>
              <p style={{ margin: 0, fontSize: 20, fontWeight: 900, color: "#fff", fontFamily: "JetBrains Mono,monospace" }}>{hoursOn}h</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ margin: 0, fontSize: 9, color: "#555", textTransform: "uppercase", letterSpacing: "0.18em" }}>Viajes hoy</p>
              <p style={{ margin: 0, fontSize: 20, fontWeight: 900, color: "#fff", fontFamily: "JetBrains Mono,monospace" }}>{tripsToday}</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ margin: 0, fontSize: 9, color: "#555", textTransform: "uppercase", letterSpacing: "0.18em" }}>Clock in</p>
              <p style={{ margin: 0, fontSize: 20, fontWeight: 900, color: "#f6dd8c", fontFamily: "JetBrains Mono,monospace" }}>9:30 AM</p>
            </div>
          </div>
        </div>

        {/* ── HOY — Meta ─────────────────────────────────────────────────── */}
        <div style={{
          margin: "12px 12px 0",
          background: "#080808", border: "1px solid #181818", borderRadius: 24,
          padding: "18px",
        }}>
          <p style={{ margin: "0 0 12px", fontSize: 9, color: "#555", textTransform: "uppercase", letterSpacing: "0.24em" }}>HOY — META DIARIA</p>

          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            {/* Ring */}
            <svg width={108} height={108} style={{ flexShrink: 0 }}>
              <circle cx={CX} cy={CY} r={R} fill="none" stroke="#141414" strokeWidth={9} />
              <circle cx={CX} cy={CY} r={R} fill="none" stroke={ringColor} strokeWidth={9}
                strokeLinecap="round" strokeDasharray={`${filled} ${circ}`}
                transform={`rotate(-90 ${CX} ${CY})`} />
              <text x={CX} y={CY - 6} textAnchor="middle" fill={ringColor} fontSize="18" fontWeight="900"
                fontFamily="JetBrains Mono,monospace">{Math.round(goalPct * 100)}%</text>
              <text x={CX} y={CY + 10} textAnchor="middle" fill="#444" fontSize="8.5"
                fontFamily="JetBrains Mono,monospace">${grossToday.toFixed(0)}/${goalToday}</text>
            </svg>

            {/* Right col */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
              {/* Big earned number */}
              <div>
                <p style={{ margin: 0, fontSize: 9, color: "#555", textTransform: "uppercase", letterSpacing: "0.18em" }}>Ganado hoy</p>
                <p style={{ margin: 0, fontSize: 38, fontWeight: 900, color: "#f6dd8c",
                  fontFamily: "JetBrains Mono,monospace", lineHeight: 1 }}>${grossToday.toFixed(0)}</p>
              </div>
              {/* Remaining + projected */}
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ flex: 1, background: "#0d0d0d", borderRadius: 12, padding: "8px 10px" }}>
                  <p style={{ margin: 0, fontSize: 8, color: "#555" }}>Falta</p>
                  <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#fff",
                    fontFamily: "JetBrains Mono,monospace" }}>${remaining.toFixed(0)}</p>
                </div>
                <div style={{ flex: 1, background: "#0d0d0d", borderRadius: 12, padding: "8px 10px" }}>
                  <p style={{ margin: 0, fontSize: 8, color: "#555" }}>Meta ≈</p>
                  <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#4ade80",
                    fontFamily: "JetBrains Mono,monospace" }}>5:45 PM</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── SuperPlus Balance ───────────────────────────────────────────── */}
        <div style={{
          margin: "12px 12px 0",
          background: "linear-gradient(135deg, #0d0900, #1a0f00)",
          border: "1px solid #d9b64f22",
          borderRadius: 24, padding: "18px",
          boxShadow: "0 0 24px #d9b64f08",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <p style={{ margin: 0, fontSize: 9, color: "#a07820", textTransform: "uppercase", letterSpacing: "0.28em" }}>SUPER PLUS · AGO</p>
              <p style={{ margin: "6px 0 0", fontSize: 44, fontWeight: 900, lineHeight: 1, ...gold as any,
                fontFamily: "JetBrains Mono,monospace" }}>+$1,840</p>
              <p style={{ margin: "4px 0 0", fontSize: 10, color: "#666" }}>meta mensual $5,200</p>
            </div>
            <span style={{
              background: "#4ade8015", border: "1px solid #4ade8030",
              borderRadius: 999, padding: "4px 12px", fontSize: 10, color: "#4ade80", fontWeight: 700
            }}>↗ En camino</span>
          </div>

          {/* Income vs Expenses row */}
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <div style={{ flex: 1, background: "#00000040", borderRadius: 14, padding: "10px 12px" }}>
              <p style={{ margin: 0, fontSize: 8, color: "#4ade8080", textTransform: "uppercase", letterSpacing: "0.18em" }}>Ingresos</p>
              <p style={{ margin: "3px 0 0", fontSize: 22, fontWeight: 900, color: "#4ade80",
                fontFamily: "JetBrains Mono,monospace" }}>$4,320</p>
            </div>
            <div style={{ flex: 1, background: "#00000040", borderRadius: 14, padding: "10px 12px" }}>
              <p style={{ margin: 0, fontSize: 8, color: "#ef444480", textTransform: "uppercase", letterSpacing: "0.18em" }}>Gastos</p>
              <p style={{ margin: "3px 0 0", fontSize: 22, fontWeight: 900, color: "#ef4444",
                fontFamily: "JetBrains Mono,monospace" }}>$2,480</p>
            </div>
          </div>

          {/* Annual bar */}
          <div style={{ marginTop: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
              <p style={{ margin: 0, fontSize: 9, color: "#777" }}>Proyección anual</p>
              <p style={{ margin: 0, fontSize: 9, color: "#f6dd8c" }}>$62.4k · 36%</p>
            </div>
            <div style={{ height: 6, background: "#111", borderRadius: 999, overflow: "hidden" }}>
              <div style={{ height: "100%", width: "36%", background: "linear-gradient(to right,#d9b64f,#f6dd8c)", borderRadius: 999 }} />
            </div>
          </div>
        </div>

        {/* ── Stat row ────────────────────────────────────────────────────── */}
        <div style={{ margin: "12px 12px 0", display: "flex", gap: 8 }}>
          <Tile label="Semana actual" value="$1,420" sub="meta $1,670" accent="#f6dd8c" />
          <Tile label="Este mes" value="$4,320" sub="meta $6,800" accent="#4ade80" />
          <Tile label="$/hr prom" value="$68" sub="este turno" accent="#3b82f6" />
        </div>

        {/* ── Platforms ───────────────────────────────────────────────────── */}
        <div style={{
          margin: "12px 12px 24px",
          background: "#080808", border: "1px solid #181818", borderRadius: 24, padding: "18px",
        }}>
          <p style={{ margin: "0 0 14px", fontSize: 9, color: "#555", textTransform: "uppercase", letterSpacing: "0.24em" }}>INGRESOS POR PLATAFORMA</p>
          {[
            { name: "Uber",     color: "#4ade80", today: "$142", week: "$680" },
            { name: "Lyft",     color: "#ff00bf", today: "$95",  week: "$320" },
            { name: "EcoRide",  color: "#22c55e", today: "$48",  week: "$190" },
            { name: "Empower",  color: "#3b82f6", today: "—",    week: "$230" },
          ].map((p, i) => (
            <div key={p.name} style={{
              display: "flex", alignItems: "center", gap: 12,
              paddingTop: i === 0 ? 0 : 12,
              borderTop: i === 0 ? "none" : "1px solid #111",
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                background: p.color + "22", border: `1.5px solid ${p.color}44`,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: p.color, fontSize: 11, fontWeight: 800, flexShrink: 0,
              }}>{p.name[0]}</div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#ddd" }}>{p.name}</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ margin: 0, fontSize: 9, color: "#444" }}>HOY</p>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: p.color,
                  fontFamily: "JetBrains Mono,monospace" }}>{p.today}</p>
              </div>
              <div style={{ textAlign: "right", minWidth: 52 }}>
                <p style={{ margin: 0, fontSize: 9, color: "#444" }}>SEMANA</p>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#fff",
                  fontFamily: "JetBrains Mono,monospace" }}>{p.week}</p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
