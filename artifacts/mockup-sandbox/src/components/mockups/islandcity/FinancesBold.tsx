import "./_group.css";

// ── FINANCES BOLD v3 ────────────────────────────────────────────────────────
// Top: colorful speedometer (unchanged)
// Below: plain-language sections a driver understands at a glance
//   HOY (daily goal ring) · TURNO (shift stats) · ESTA SEMANA (bars) · SUPER PLUS

// ── Speedometer ─────────────────────────────────────────────────────────────
const ZONES = [
  { min: 0,  max: 45, color: "#ef4444", label: "Bajo"   },
  { min: 45, max: 58, color: "#f97316", label: "OK"     },
  { min: 58, max: 68, color: "#eab308", label: "Bueno"  },
  { min: 68, max: 80, color: "#4ade80", label: "Gran"   },
  { min: 80, max: 90, color: "#3b82f6", label: "Óptimo" },
];
const MAX_VAL = 90;

function valToAngle(v: number) { return 180 + Math.min(v / MAX_VAL, 1) * 180; }
function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}
function arc(cx: number, cy: number, r: number, a1: number, a2: number) {
  const s = polar(cx, cy, r, a1), e = polar(cx, cy, r, a2);
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${a2 - a1 > 180 ? 1 : 0} 1 ${e.x} ${e.y}`;
}

function Gauge({ value }: { value: number }) {
  const CX = 155, CY = 125, R = 108, SW = 26;
  const zone = ZONES.find(z => value >= z.min && value < z.max) ?? ZONES[ZONES.length - 1];
  const needleAngle = valToAngle(Math.min(value, MAX_VAL));
  const tip = polar(CX, CY, R - 8, needleAngle);
  const b1  = polar(CX, CY, 11, needleAngle + 90);
  const b2  = polar(CX, CY, 11, needleAngle - 90);
  return (
    <svg width="310" height="142" viewBox="0 0 310 142" style={{ overflow: "visible" }}>
      <defs>
        <filter id="glow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      {/* Track */}
      <path d={arc(CX, CY, R, 180, 360)} fill="none" stroke="#161616" strokeWidth={SW} />
      {/* Zones */}
      {ZONES.map(z => (
        <path key={z.label}
          d={arc(CX, CY, R, valToAngle(z.min), valToAngle(Math.min(z.max, MAX_VAL)))}
          fill="none" stroke={z.color} strokeWidth={SW - 4} strokeLinecap="butt" opacity={0.9} />
      ))}
      {/* Dividers between zones */}
      {[45, 58, 68, 80].map(v => {
        const a = valToAngle(v);
        const i2 = polar(CX, CY, R - SW/2 + 1, a), o2 = polar(CX, CY, R + SW/2 - 3, a);
        return <line key={v} x1={i2.x} y1={i2.y} x2={o2.x} y2={o2.y} stroke="#000" strokeWidth="2.5" opacity="0.55" />;
      })}
      {/* End labels */}
      <text x="42" y="140" fill="#3a3a3a" fontSize="10" fontFamily="JetBrains Mono,monospace">$0</text>
      <text x="252" y="140" fill="#3a3a3a" fontSize="10" fontFamily="JetBrains Mono,monospace">$90</text>
      {/* Zone name labels on arc */}
      {ZONES.map(z => {
        const mid = valToAngle((z.min + Math.min(z.max, MAX_VAL)) / 2);
        const p = polar(CX, CY, R - SW/2 - 13, mid);
        return <text key={z.label} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle"
          fill={z.color} fontSize="8" fontWeight="700" fontFamily="JetBrains Mono,monospace" opacity="0.75">{z.label}</text>;
      })}
      {/* Needle */}
      <polygon points={`${tip.x},${tip.y} ${b1.x},${b1.y} ${b2.x},${b2.y}`}
        fill={zone.color} filter="url(#glow)" />
      {/* Hub */}
      <circle cx={CX} cy={CY} r="11" fill="#0e0e0e" stroke={zone.color} strokeWidth="2.5" />
      {/* $ per hour — big, inside the arc */}
      <text x={CX} y={CY - 46} textAnchor="middle" fill={zone.color}
        fontSize="38" fontWeight="900" fontFamily="JetBrains Mono,monospace">${value}</text>
      <text x={CX} y={CY - 25} textAnchor="middle" fill="#555"
        fontSize="11" fontFamily="JetBrains Mono,monospace">dólares por hora</text>
    </svg>
  );
}

// ── Legend strip ─────────────────────────────────────────────────────────────
function Legend() {
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap", padding: "0 12px 12px" }}>
      {ZONES.map(z => (
        <div key={z.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 9, height: 9, borderRadius: "50%", background: z.color, display: "inline-block" }}/>
          <span style={{ fontSize: 9, color: "#555" }}>${z.min}–{z.max} {z.label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Gold gradient text style ──────────────────────────────────────────────────
const goldText: React.CSSProperties = {
  background: "linear-gradient(90deg,#f6dd8c,#d9b64f)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

// ── Card wrapper ──────────────────────────────────────────────────────────────
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      margin: "0 12px",
      background: "#080808",
      border: "1px solid #1e1e1e",
      borderRadius: 22,
      padding: "16px",
      ...style,
    }}>{children}</div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ margin: "0 0 12px", fontSize: 9, fontWeight: 700, color: "#555",
      textTransform: "uppercase", letterSpacing: "0.24em" }}>{children}</p>
  );
}

// ── Weekly bar chart data ─────────────────────────────────────────────────────
const WEEK = [
  { day: "Lun", plan: 300, real: 310 },
  { day: "Mar", plan: 320, real: 285 },  // today
  { day: "Mié", plan: 320, real: 0   },
  { day: "Jue", plan: 350, real: 0   },
  { day: "Vie", plan: 400, real: 0   },
  { day: "Sáb", plan: 480, real: 0   },
  { day: "Dom", plan: 0,   real: 0   },
];
const WEEK_MAX = 520;

export function FinancesBold() {
  // ── Demo values (in real app: live from state) ────────────────────────────
  const perHour    = 65;
  const earnedToday = 285;
  const goalToday   = 400;
  const pct         = earnedToday / goalToday;
  const remaining   = Math.max(goalToday - earnedToday, 0);

  // Ring geometry
  const R = 46, CX = 56, CY = 56;
  const circ  = 2 * Math.PI * R;
  const filled = Math.min(pct, 1) * circ;
  const ringColor = pct >= 1 ? "#4ade80" : "#d9b64f";

  return (
    <div style={{ minHeight: "100vh", width: "100%", background: "#000", color: "#fff",
      fontFamily: "Inter,sans-serif", overflowY: "auto" }}>
      <div style={{ maxWidth: 390, margin: "0 auto" }}>

        {/* ── Brand header ───────────────────────────────────────────────── */}
        <div style={{
          background: "#0a0800", borderBottom: "1px solid #d9b64f22",
          padding: "44px 16px 14px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 38, height: 38, borderRadius: "50%",
              background: "radial-gradient(circle at 40% 40%,#1a1500,#000)",
              border: "1.5px solid #d9b64f55",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
            }}>🌉</div>
            <div>
              <p style={{ margin: 0, fontFamily: "Cinzel,serif", fontWeight: 700, fontSize: 15,
                letterSpacing: "0.04em", ...goldText as any }}>ISLANDCITY</p>
              <p style={{ margin: 0, fontSize: 7, color: "#a07820", letterSpacing: "0.3em", textTransform: "uppercase" }}>
                TRANSIT SERVICES
              </p>
            </div>
          </div>
          <span style={{
            background: "#0f1f0f", border: "1px solid #4ade8040",
            borderRadius: 999, padding: "5px 13px",
            fontSize: 10, color: "#4ade80", fontWeight: 700,
            display: "flex", alignItems: "center", gap: 5,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80", display: "inline-block" }}/>
            EN TURNO
          </span>
        </div>

        {/* ── Speedometer card ───────────────────────────────────────────── */}
        <div style={{ margin: "12px 12px 0", background: "#080808",
          border: "1px solid #1e1e1e", borderRadius: 22, paddingTop: 16 }}>
          <p style={{ margin: "0 0 8px 16px", fontSize: 10, fontWeight: 700, color: "#d9b64f",
            textTransform: "uppercase", letterSpacing: "0.18em" }}>GANANDO AHORA</p>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <Gauge value={perHour} />
          </div>
          <Legend />
        </div>

        <div style={{ height: 10 }} />

        {/* ── HOY — Meta del día ─────────────────────────────────────────── */}
        {/*    Ring on the left, 4 clear stats on the right (como IMG_1498)  */}
        <Card>
          <Label>HOY — Meta del día</Label>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>

            {/* Progress ring */}
            <svg width={112} height={112} style={{ flexShrink: 0 }}>
              <circle cx={CX} cy={CY} r={R} fill="none" stroke="#141414" strokeWidth={10} />
              <circle cx={CX} cy={CY} r={R} fill="none" stroke={ringColor} strokeWidth={10}
                strokeLinecap="round" strokeDasharray={`${filled} ${circ}`}
                transform={`rotate(-90 ${CX} ${CY})`} />
              <text x={CX} y={CY - 5} textAnchor="middle" fill={ringColor}
                fontSize="20" fontWeight="900" fontFamily="JetBrains Mono,monospace">
                {Math.round(pct * 100)}%
              </text>
              <text x={CX} y={CY + 13} textAnchor="middle" fill="#555" fontSize="9"
                fontFamily="JetBrains Mono,monospace">de tu meta</text>
            </svg>

            {/* Stats list — plain language */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 9 }}>
              {[
                { label: "Ganado hoy",      val: `$${earnedToday}`, color: "#fff"    },
                { label: "Meta del día",     val: `$${goalToday}`,   color: "#f6dd8c" },
                { label: "Falta para meta",  val: `$${remaining}`,   color: "#4ade80" },
                { label: "Terminas aprox.",  val: "5:45 PM",         color: "#3b82f6" },
              ].map(r => (
                <div key={r.label} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  paddingBottom: 7, borderBottom: "1px solid #111",
                }}>
                  <p style={{ margin: 0, fontSize: 12, color: "#666" }}>{r.label}</p>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: r.color,
                    fontFamily: "JetBrains Mono,monospace" }}>{r.val}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <div style={{ height: 10 }} />

        {/* ── TURNO — Info del shift ─────────────────────────────────────── */}
        {/*    3 datos simples: tiempo activo / viajes / hora de entrada      */}
        <Card>
          <Label>TURNO ACTIVO</Label>
          <div style={{ display: "flex", gap: 8 }}>
            {[
              { label: "Tiempo manejando", val: "3h 54m", color: "#fff"    },
              { label: "Viajes",            val: "6",      color: "#f6dd8c" },
              { label: "Entraste",          val: "9:30 AM",color: "#4ade80" },
            ].map(s => (
              <div key={s.label} style={{
                flex: 1, background: "#0d0d0d", borderRadius: 14,
                padding: "10px 8px", textAlign: "center",
              }}>
                <p style={{ margin: 0, fontSize: 8, color: "#444",
                  textTransform: "uppercase", letterSpacing: "0.12em",
                  lineHeight: 1.4, minHeight: 22 }}>{s.label}</p>
                <p style={{ margin: "6px 0 0", fontSize: 20, fontWeight: 900, color: s.color,
                  fontFamily: "JetBrains Mono,monospace" }}>{s.val}</p>
              </div>
            ))}
          </div>
        </Card>

        <div style={{ height: 10 }} />

        {/* ── ESTA SEMANA — Plan vs lo que llevas ───────────────────────── */}
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <Label>ESTA SEMANA</Label>
            <div style={{ marginBottom: 12, display: "flex", gap: 12, fontSize: 9, color: "#555" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 8, height: 8, background: "#d9b64f33",
                  border: "1px solid #d9b64f44", borderRadius: 2, display: "inline-block" }}/>
                Planeado
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 8, height: 8, background: "#f6dd8c", borderRadius: 2, display: "inline-block" }}/>
                Real
              </span>
            </div>
          </div>

          {/* Bar chart */}
          <div style={{ display: "flex", gap: 5, height: 80, alignItems: "flex-end", marginBottom: 8 }}>
            {WEEK.map((d, i) => {
              const planH  = (d.plan / WEEK_MAX) * 74;
              const realH  = (d.real / WEEK_MAX) * 74;
              const isToday = i === 1;
              return (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                  <div style={{ width: "100%", display: "flex", gap: 2, alignItems: "flex-end", height: 74 }}>
                    <div style={{ flex: 1, height: planH || 2, borderRadius: "3px 3px 0 0",
                      background: isToday ? "#d9b64f55" : "#d9b64f22", minHeight: d.plan > 0 ? 3 : 0 }} />
                    <div style={{ flex: 1, height: d.real > 0 ? realH : 0, borderRadius: "3px 3px 0 0",
                      background: isToday ? "#f6dd8c" : d.real > 0 ? "#f6dd8cbb" : "transparent" }} />
                  </div>
                  <p style={{ margin: 0, fontSize: 10, fontWeight: isToday ? 800 : 400,
                    color: isToday ? "#f6dd8c" : d.plan > 0 ? "#555" : "#333" }}>{d.day}</p>
                </div>
              );
            })}
          </div>

          {/* Totals */}
          <div style={{ display: "flex", gap: 8, paddingTop: 10, borderTop: "1px solid #111" }}>
            <div style={{ flex: 1, background: "#0d0d0d", borderRadius: 14, padding: "9px 10px" }}>
              <p style={{ margin: 0, fontSize: 8, color: "#555" }}>Lo que llevas</p>
              <p style={{ margin: "3px 0 0", fontSize: 20, fontWeight: 900, color: "#f6dd8c",
                fontFamily: "JetBrains Mono,monospace" }}>$595</p>
            </div>
            <div style={{ flex: 1, background: "#0d0d0d", borderRadius: 14, padding: "9px 10px" }}>
              <p style={{ margin: 0, fontSize: 8, color: "#555" }}>Meta de la semana</p>
              <p style={{ margin: "3px 0 0", fontSize: 20, fontWeight: 900, color: "#444",
                fontFamily: "JetBrains Mono,monospace" }}>$2,170</p>
            </div>
          </div>
        </Card>

        <div style={{ height: 10 }} />

        {/* ── SUPER PLUS — Tu balance neto del mes ──────────────────────── */}
        <Card style={{
          background: "linear-gradient(135deg,#0d0900,#1a0f00)",
          border: "1px solid #d9b64f22",
          marginBottom: 24,
        }}>
          <Label>SUPER PLUS — Balance del mes</Label>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <p style={{ margin: 0, fontSize: 9, color: "#777" }}>Lo que te queda después de gastos</p>
              <p style={{ margin: "6px 0 0", fontSize: 44, fontWeight: 900, lineHeight: 1,
                fontFamily: "JetBrains Mono,monospace", ...goldText as any }}>+$1,840</p>
            </div>
            <span style={{
              background: "#4ade8015", border: "1px solid #4ade8030",
              borderRadius: 999, padding: "4px 12px", fontSize: 10, color: "#4ade80", fontWeight: 700,
            }}>↗ En camino</span>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <div style={{ flex: 1, background: "#00000040", borderRadius: 14, padding: "10px 12px" }}>
              <p style={{ margin: 0, fontSize: 8, color: "#4ade8080", textTransform: "uppercase" }}>Ingresos</p>
              <p style={{ margin: "3px 0 0", fontSize: 20, fontWeight: 900, color: "#4ade80",
                fontFamily: "JetBrains Mono,monospace" }}>$4,320</p>
            </div>
            <div style={{ flex: 1, background: "#00000040", borderRadius: 14, padding: "10px 12px" }}>
              <p style={{ margin: 0, fontSize: 8, color: "#ef444480", textTransform: "uppercase" }}>Gastos</p>
              <p style={{ margin: "3px 0 0", fontSize: 20, fontWeight: 900, color: "#ef4444",
                fontFamily: "JetBrains Mono,monospace" }}>$2,480</p>
            </div>
          </div>
        </Card>

      </div>
    </div>
  );
}
