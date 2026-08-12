import "./_group.css";

// ── CASH FLOW BOLD v2 — Matching IMG_1498 financial dashboard layout ────────
// Layout: Daily Target ring (left) + stats (right) → Weekly bar chart
//         → Net Income area chart → Upcoming payments → Projections

const goldStyle: React.CSSProperties = {
  background: "linear-gradient(90deg,#f6dd8c,#d9b64f)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

// ── Weekly chart data ────────────────────────────────────────────────────────
const WEEK = [
  { day: "Lun", proj: 300, actual: 310  },
  { day: "Mar", proj: 320, actual: 285  },
  { day: "Mié", proj: 320, actual: 0    },
  { day: "Jue", proj: 350, actual: 0    },
  { day: "Vie", proj: 400, actual: 0    },
  { day: "Sáb", proj: 480, actual: 0    },
  { day: "Dom", proj: 0,   actual: 0    },
];
const WEEK_MAX = 520;
const CHART_H  = 100;
const ACTUAL_TOTAL = 595;
const PROJ_TOTAL   = 2170;

// ── Net income area chart data (cumulative, scaled 0-100) ────────────────────
const NET_POINTS = [0, 8, 18, 28, 38, 42, 52, 60, 70, 77, 85, 95, 100];
const DAYS_LABEL = ["1","5","10","15","20","25","31"];
function buildAreaPath(pts: number[], w: number, h: number) {
  const step = w / (pts.length - 1);
  const coords = pts.map((p, i) => ({ x: i * step, y: h - (p / 100) * (h - 10) }));
  const line = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
  const area = `${line} L${(pts.length - 1) * step},${h} L0,${h} Z`;
  return { line, area };
}

// ── Payment alerts ──────────────────────────────────────────────────────────
const PAYMENTS = [
  { name: "Car Payment",  amount: 919,  days: 2, balAfter: 2201 },
  { name: "Renta",        amount: 1500, days: 8, balAfter: 2491 },
];
function daysColor(d: number) {
  return d <= 3 ? "#ef4444" : d <= 6 ? "#f97316" : "#eab308";
}

export function CashFlowBold() {
  const grossToday = 285;
  const goalToday  = 400;
  const goalPct    = grossToday / goalToday;
  const R = 52, CX = 62, CY = 62, circ = 2 * Math.PI * R;
  const filled = Math.min(goalPct, 1) * circ;
  const ringColor = goalPct >= 1 ? "#4ade80" : "#d9b64f";

  const { line: netLine, area: netArea } = buildAreaPath(NET_POINTS, 320, 72);

  return (
    <div style={{ minHeight: "100vh", width: "100%", background: "#000", color: "#fff",
      fontFamily: "Inter,sans-serif", overflowY: "auto" }}>
      <div style={{ maxWidth: 390, margin: "0 auto" }}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div style={{
          background: "#0a0800", borderBottom: "1px solid #d9b64f22",
          padding: "44px 16px 14px", display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              background: "radial-gradient(circle at 40% 40%,#1a1500,#000)",
              border: "1.5px solid #d9b64f55",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15,
            }}>🌉</div>
            <div>
              <p style={{ margin: 0, fontFamily: "Cinzel,serif", fontWeight: 700, fontSize: 14,
                letterSpacing: "0.04em", ...goldStyle as any }}>ISLANDCITY</p>
              <p style={{ margin: 0, fontSize: 7, color: "#a07820", letterSpacing: "0.28em", textTransform: "uppercase" }}>
                FINANCIAL INTELLIGENCE
              </p>
            </div>
          </div>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#161616",
            border: "1px solid #222", display: "flex", alignItems: "center", justifyContent: "center",
            color: "#f6dd8c", fontSize: 11, fontWeight: 700 }}>M</div>
        </div>

        {/* ── Daily Target Completion — ring left, stats right ─────────── */}
        {/* Mirrors IMG_1498 "Daily Target Completion" card */}
        <div style={{ margin: "12px 12px 0",
          background: "#080808", border: "1px solid #1e1e1e", borderRadius: 22, padding: "16px" }}>
          <p style={{ margin: "0 0 12px", fontSize: 9, color: "#555",
            fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.22em" }}>
            DAILY TARGET COMPLETION
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            {/* Big ring */}
            <div style={{ position: "relative", flexShrink: 0 }}>
              <svg width={124} height={124}>
                <circle cx={CX} cy={CY} r={R} fill="none" stroke="#141414" strokeWidth={11} />
                <circle cx={CX} cy={CY} r={R} fill="none" stroke={ringColor} strokeWidth={11}
                  strokeLinecap="round" strokeDasharray={`${filled} ${circ}`}
                  transform={`rotate(-90 ${CX} ${CY})`} />
                <text x={CX} y={CY - 6} textAnchor="middle" fill={ringColor}
                  fontSize="22" fontWeight="900" fontFamily="JetBrains Mono,monospace">
                  {Math.round(goalPct * 100)}%
                </text>
                <text x={CX} y={CY + 14} textAnchor="middle" fill="#555" fontSize="9"
                  fontFamily="JetBrains Mono,monospace">${grossToday}</text>
                <text x={CX} y={CY + 26} textAnchor="middle" fill="#444" fontSize="8"
                  fontFamily="JetBrains Mono,monospace">Today</text>
              </svg>
            </div>
            {/* Right stats — exactly like IMG_1498 */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { label: "Today",      val: `$${grossToday}`,  color: "#fff"    },
                { label: "Daily Goal", val: `$${goalToday}`,   color: "#f6dd8c" },
                { label: "Remaining",  val: `$${goalToday - grossToday}`, color: "#4ade80" },
              ].map(r => (
                <div key={r.label} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  paddingBottom: 8, borderBottom: "1px solid #111",
                }}>
                  <p style={{ margin: 0, fontSize: 13, color: "#666" }}>{r.label}</p>
                  <p style={{ margin: 0, fontSize: 20, fontWeight: 900, color: r.color,
                    fontFamily: "JetBrains Mono,monospace" }}>{r.val}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Weekly Income vs Earnings — bar chart ───────────────────────── */}
        {/* Mirrors IMG_1498 "Weekly Income vs Earnings" */}
        <div style={{ margin: "10px 12px 0",
          background: "#080808", border: "1px solid #1e1e1e", borderRadius: 22, padding: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
            <p style={{ margin: 0, fontSize: 9, color: "#555",
              fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.22em" }}>
              WEEKLY INCOME VS EARNINGS
            </p>
            <div style={{ textAlign: "right" }}>
              <p style={{ margin: 0, fontSize: 8, color: "#555" }}>Total</p>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: "#f6dd8c",
                fontFamily: "JetBrains Mono,monospace" }}>${PROJ_TOTAL} vs ${ACTUAL_TOTAL}</p>
            </div>
          </div>
          {/* Legend */}
          <div style={{ display: "flex", gap: 14, marginBottom: 10 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 9, color: "#555" }}>
              <span style={{ width: 10, height: 10, background: "#d9b64f33", borderRadius: 2, display: "inline-block" }}/>
              Proyectado
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 9, color: "#555" }}>
              <span style={{ width: 10, height: 10, background: "#4ade80", borderRadius: 2, display: "inline-block" }}/>
              Real
            </span>
          </div>
          {/* Chart area */}
          <div style={{ display: "flex", gap: 4, height: `${CHART_H + 20}px`, alignItems: "flex-end" }}>
            {WEEK.map((d, i) => {
              const projH   = (d.proj   / WEEK_MAX) * CHART_H;
              const actualH = (d.actual / WEEK_MAX) * CHART_H;
              const isToday = i === 1;
              return (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column",
                  alignItems: "center", gap: 3 }}>
                  <div style={{ width: "100%", display: "flex", gap: 1.5,
                    alignItems: "flex-end", height: CHART_H }}>
                    {/* Projected */}
                    <div style={{ flex: 1, borderRadius: "3px 3px 0 0",
                      height: projH || 2, background: isToday ? "#d9b64f66" : "#d9b64f22",
                      minHeight: d.proj > 0 ? 3 : 0 }} />
                    {/* Actual */}
                    <div style={{ flex: 1, borderRadius: "3px 3px 0 0",
                      height: d.actual > 0 ? actualH : 0,
                      background: isToday ? "#4ade80" : d.actual > 0 ? "#4ade80cc" : "transparent" }} />
                  </div>
                  {/* Value labels on bars (for non-zero) */}
                  <p style={{ margin: 0, fontSize: 9, fontWeight: isToday ? 800 : 400,
                    color: isToday ? "#f6dd8c" : "#555" }}>{d.day}</p>
                </div>
              );
            })}
          </div>
          {/* Totals row */}
          <div style={{ display: "flex", gap: 8, marginTop: 12, paddingTop: 10, borderTop: "1px solid #111" }}>
            <div style={{ flex: 1, background: "#0a0a0a", borderRadius: 12, padding: "8px 10px" }}>
              <p style={{ margin: 0, fontSize: 8, color: "#555", textTransform: "uppercase", letterSpacing: "0.15em" }}>Acumulado</p>
              <p style={{ margin: "3px 0 0", fontSize: 20, fontWeight: 900, color: "#4ade80",
                fontFamily: "JetBrains Mono,monospace" }}>${ACTUAL_TOTAL}</p>
            </div>
            <div style={{ flex: 1, background: "#0a0a0a", borderRadius: 12, padding: "8px 10px" }}>
              <p style={{ margin: 0, fontSize: 8, color: "#555", textTransform: "uppercase", letterSpacing: "0.15em" }}>Proyección sem.</p>
              <p style={{ margin: "3px 0 0", fontSize: 20, fontWeight: 900, color: "#f6dd8c",
                fontFamily: "JetBrains Mono,monospace" }}>${PROJ_TOTAL.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* ── Net Income Increase — area chart ────────────────────────────── */}
        {/* Mirrors IMG_1498 "Net Income Increase (Week)" */}
        <div style={{ margin: "10px 12px 0",
          background: "#080808", border: "1px solid #1e1e1e", borderRadius: 22, padding: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
            <p style={{ margin: 0, fontSize: 9, color: "#555",
              fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.22em" }}>
              NET INCOME INCREASE
            </p>
            <div style={{ textAlign: "right" }}>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 900, color: "#4ade80",
                fontFamily: "JetBrains Mono,monospace" }}>$3,840</p>
              <p style={{ margin: 0, fontSize: 9, color: "#4ade80" }}>+18% este mes</p>
            </div>
          </div>
          {/* SVG area chart */}
          <svg width="100%" height="80" viewBox="0 0 320 80" preserveAspectRatio="none" style={{ overflow: "visible" }}>
            <defs>
              <linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4ade80" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#4ade80" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            <path d={netArea} fill="url(#netGrad)" />
            <path d={netLine} fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
            {/* Current point dot */}
            <circle cx={320} cy={0} r="4" fill="#4ade80" />
          </svg>
          {/* X labels */}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
            {DAYS_LABEL.map(l => (
              <span key={l} style={{ fontSize: 8, color: "#333" }}>{l}</span>
            ))}
          </div>
        </div>

        {/* ── Saldo banco + Pagos próximos ────────────────────────────────── */}
        <div style={{ margin: "10px 12px 0",
          background: "#080808", border: "1px solid #1e1e1e", borderRadius: 22, padding: "16px" }}>
          {/* Bank balance */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 14 }}>
            <div>
              <p style={{ margin: 0, fontSize: 9, color: "#555",
                textTransform: "uppercase", letterSpacing: "0.22em" }}>SALDO EN BANCO</p>
              <p style={{ margin: "4px 0 0", fontSize: 42, fontWeight: 900, lineHeight: 1,
                fontFamily: "JetBrains Mono,monospace", ...goldStyle as any }}>$2,450</p>
            </div>
            <button style={{ background: "#111", border: "1px solid #222", borderRadius: 12,
              padding: "8px 14px", color: "#777", fontSize: 11 }}>✏️ Editar</button>
          </div>
          {/* Payments */}
          <p style={{ margin: "0 0 10px", fontSize: 9, color: "#555",
            textTransform: "uppercase", letterSpacing: "0.22em", fontWeight: 700 }}>⚡ PAGOS PRÓXIMOS</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {PAYMENTS.map((p, i) => {
              const c = daysColor(p.days);
              return (
                <div key={i} style={{
                  background: c + "0c", border: `1.5px solid ${c}30`,
                  borderRadius: 16, padding: "12px 14px",
                  display: "flex", alignItems: "center", gap: 12,
                }}>
                  <div style={{
                    width: 46, height: 46, borderRadius: 13,
                    background: c + "18", border: `1.5px solid ${c}40`,
                    display: "flex", flexDirection: "column", alignItems: "center",
                    justifyContent: "center", flexShrink: 0,
                  }}>
                    <p style={{ margin: 0, fontSize: 20, fontWeight: 900, color: c,
                      fontFamily: "JetBrains Mono,monospace", lineHeight: 1 }}>{p.days}</p>
                    <p style={{ margin: 0, fontSize: 8, color: c + "99" }}>días</p>
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#eee" }}>{p.name}</p>
                    <p style={{ margin: "2px 0 0", fontSize: 10, color: "#555" }}>
                      Saldo después:{" "}
                      <span style={{ color: p.balAfter > 1200 ? "#4ade80" : "#f97316" }}>
                        ${p.balAfter.toLocaleString()}
                      </span>
                    </p>
                  </div>
                  <p style={{ margin: 0, fontSize: 20, fontWeight: 900, color: c,
                    fontFamily: "JetBrains Mono,monospace" }}>-${p.amount.toLocaleString()}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Proyecciones — 3 tiles ───────────────────────────────────────── */}
        <div style={{ margin: "10px 12px 24px", display: "flex", gap: 8 }}>
          {[
            { label: "Fin Semana", val: "$1,980", sub: "17 ago", color: "#f6dd8c" },
            { label: "Fin Mes",    val: "$6.1k",  sub: "31 ago", color: "#4ade80" },
            { label: "Fin Año",    val: "$62k",   sub: "31 dic", color: "#3b82f6" },
          ].map(p => (
            <div key={p.label} style={{
              flex: 1, background: "#080808", border: "1px solid #1e1e1e",
              borderRadius: 18, padding: "12px 8px", textAlign: "center",
            }}>
              <p style={{ margin: 0, fontSize: 8, color: "#444",
                textTransform: "uppercase", letterSpacing: "0.14em" }}>{p.label}</p>
              <p style={{ margin: "5px 0 2px", fontSize: 20, fontWeight: 900, color: p.color,
                fontFamily: "JetBrains Mono,monospace" }}>{p.val}</p>
              <p style={{ margin: 0, fontSize: 9, color: "#333" }}>{p.sub}</p>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
