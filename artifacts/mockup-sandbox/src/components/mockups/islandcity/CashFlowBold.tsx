import "./_group.css";

// ── CASH FLOW BOLD — Proyección, plan semanal, alertas ─────────────────────
// Bold, mucho aire, legible al vuelo

const gold: React.CSSProperties = {
  background: "linear-gradient(90deg, #f6dd8c, #d9b64f)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

interface Payment {
  name: string;
  amount: number;
  daysLeft: number;
  balanceAfter: number;
}

const PAYMENTS: Payment[] = [
  { name: "Car Payment",  amount: 919,  daysLeft: 2, balanceAfter: 2201 },
  { name: "Renta",        amount: 1500, daysLeft: 8, balanceAfter: 2491 },
  { name: "Car Payment",  amount: 919,  daysLeft: 9, balanceAfter: 1922 },
];

function urgencyColor(days: number) {
  if (days <= 2) return "#ef4444";
  if (days <= 5) return "#f97316";
  if (days <= 8) return "#eab308";
  return "#4ade80";
}

interface DayBar {
  label: string;
  planned: number;
  actual: number;
  maxVal: number;
  isToday?: boolean;
  active: boolean;
}

const WEEK_DAYS: DayBar[] = [
  { label: "L",  planned: 300, actual: 310,  maxVal: 500, active: true  },
  { label: "M",  planned: 320, actual: 285,  maxVal: 500, isToday: true, active: true  },
  { label: "M",  planned: 320, actual: 0,    maxVal: 500, active: true  },
  { label: "J",  planned: 350, actual: 0,    maxVal: 500, active: true  },
  { label: "V",  planned: 400, actual: 0,    maxVal: 500, active: true  },
  { label: "S",  planned: 480, actual: 0,    maxVal: 500, active: true  },
  { label: "D",  planned: 0,   actual: 0,    maxVal: 500, active: false },
];

const WEEKLY_PLAN = 2170;
const WEEKLY_ACTUAL = 595;
const WEEKLY_PROJ  = 1980;

export function CashFlowBold() {
  return (
    <div style={{
      minHeight: "100vh", width: "100%", background: "#000", color: "#fff",
      fontFamily: "Inter, sans-serif", overflowY: "auto",
    }}>
      <div style={{ maxWidth: 390, margin: "0 auto", minHeight: "100vh" }}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div style={{ padding: "48px 18px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ margin: 0, fontSize: 9, letterSpacing: "0.28em", color: "#555", textTransform: "uppercase" }}>Flujo de Caja</p>
            <p style={{ margin: "2px 0 0", fontSize: 18, fontFamily: "Cinzel,serif", fontWeight: 700, ...gold as any }}>PROYECCIÓN</p>
          </div>
          <div style={{
            width: 34, height: 34, borderRadius: "50%", background: "#111",
            border: "1px solid #222", display: "flex", alignItems: "center", justifyContent: "center",
            color: "#f6dd8c", fontSize: 12, fontWeight: 700
          }}>M</div>
        </div>

        {/* ── Saldo banco — hero number ──────────────────────────────────── */}
        <div style={{
          margin: "0 12px 12px",
          background: "#080808", border: "1px solid #181818", borderRadius: 24, padding: "22px 20px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <p style={{ margin: 0, fontSize: 9, color: "#555", textTransform: "uppercase", letterSpacing: "0.22em" }}>SALDO EN BANCO</p>
            <p style={{ margin: "6px 0 0", fontSize: 48, fontWeight: 900, lineHeight: 1, ...gold as any,
              fontFamily: "JetBrains Mono,monospace" }}>$2,450</p>
            <p style={{ margin: "5px 0 0", fontSize: 10, color: "#555" }}>ago 11, 2026</p>
          </div>
          <button style={{
            background: "#111", border: "1px solid #222", borderRadius: 14,
            padding: "10px 14px", color: "#888", fontSize: 11, cursor: "pointer",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
          }}>
            <span style={{ fontSize: 16 }}>✏️</span>
            <span>Editar</span>
          </button>
        </div>

        {/* ── Pagos próximos — bold alert cards ─────────────────────────── */}
        <div style={{
          margin: "0 12px 12px",
          background: "#080808", border: "1px solid #181818", borderRadius: 24, padding: "18px 20px",
        }}>
          <p style={{ margin: "0 0 14px", fontSize: 9, color: "#555", textTransform: "uppercase", letterSpacing: "0.22em" }}>⚡ PAGOS PRÓXIMOS</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {PAYMENTS.map((p, i) => {
              const c = urgencyColor(p.daysLeft);
              return (
                <div key={i} style={{
                  background: c + "0c",
                  border: `1.5px solid ${c}30`,
                  borderRadius: 18, padding: "14px 16px",
                  display: "flex", alignItems: "center", gap: 14,
                }}>
                  {/* Days badge */}
                  <div style={{
                    width: 48, height: 48, borderRadius: 14,
                    background: c + "18", border: `1.5px solid ${c}40`,
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    <p style={{ margin: 0, fontSize: 20, fontWeight: 900, color: c, fontFamily: "JetBrains Mono,monospace", lineHeight: 1 }}>{p.daysLeft}</p>
                    <p style={{ margin: 0, fontSize: 8, color: c + "aa" }}>días</p>
                  </div>
                  {/* Name + balance after */}
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#eee" }}>{p.name}</p>
                    <p style={{ margin: "3px 0 0", fontSize: 10, color: "#555" }}>
                      Saldo después: <span style={{ color: p.balanceAfter > 1000 ? "#4ade80" : "#f97316" }}>${p.balanceAfter.toLocaleString()}</span>
                    </p>
                  </div>
                  {/* Amount */}
                  <p style={{ margin: 0, fontSize: 22, fontWeight: 900, color: c, fontFamily: "JetBrains Mono,monospace" }}>
                    -${p.amount.toLocaleString()}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Plan semanal — barras bold ─────────────────────────────────── */}
        <div style={{
          margin: "0 12px 12px",
          background: "#080808", border: "1px solid #181818", borderRadius: 24, padding: "18px 20px",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
            <p style={{ margin: 0, fontSize: 9, color: "#555", textTransform: "uppercase", letterSpacing: "0.22em" }}>PLAN SEMANAL</p>
            <div style={{ display: "flex", gap: 12, fontSize: 9, color: "#555" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: "#d9b64f33", display: "inline-block" }} />Plan
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: "#f6dd8c", display: "inline-block" }} />Real
              </span>
            </div>
          </div>

          {/* Bar chart */}
          <div style={{ display: "flex", gap: 6, height: 90, alignItems: "flex-end", marginBottom: 10 }}>
            {WEEK_DAYS.map((d, i) => {
              const planH  = d.active ? (d.planned / d.maxVal) * 80 : 0;
              const actH   = d.actual  > 0 ? (d.actual  / d.maxVal) * 80 : 0;
              return (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                  <div style={{ width: "100%", display: "flex", gap: 2, alignItems: "flex-end", height: 82 }}>
                    {/* Plan bar */}
                    <div style={{
                      flex: 1, height: planH, borderRadius: "4px 4px 0 0",
                      background: d.isToday ? "#d9b64f55" : "#d9b64f22",
                      minHeight: d.active ? 4 : 0,
                    }} />
                    {/* Actual bar */}
                    <div style={{
                      flex: 1, height: actH, borderRadius: "4px 4px 0 0",
                      background: d.isToday ? "#f6dd8c" : actH > 0 ? "#f6dd8ccc" : "transparent",
                      minHeight: 0,
                    }} />
                  </div>
                  <p style={{
                    margin: 0, fontSize: 10, fontWeight: d.isToday ? 800 : 400,
                    color: d.isToday ? "#f6dd8c" : d.active ? "#555" : "#333",
                  }}>{d.label}</p>
                </div>
              );
            })}
          </div>

          {/* Week totals */}
          <div style={{
            display: "flex", gap: 8, paddingTop: 12,
            borderTop: "1px solid #111",
          }}>
            <div style={{ flex: 1, background: "#0a0a0a", borderRadius: 14, padding: "10px 12px" }}>
              <p style={{ margin: 0, fontSize: 8, color: "#555", textTransform: "uppercase", letterSpacing: "0.18em" }}>Acumulado</p>
              <p style={{ margin: "3px 0 0", fontSize: 22, fontWeight: 900, color: "#f6dd8c",
                fontFamily: "JetBrains Mono,monospace" }}>${WEEKLY_ACTUAL}</p>
            </div>
            <div style={{ flex: 1, background: "#0a0a0a", borderRadius: 14, padding: "10px 12px" }}>
              <p style={{ margin: 0, fontSize: 8, color: "#555", textTransform: "uppercase", letterSpacing: "0.18em" }}>Proyección semana</p>
              <p style={{ margin: "3px 0 0", fontSize: 22, fontWeight: 900, color: "#fff",
                fontFamily: "JetBrains Mono,monospace" }}>${WEEKLY_PROJ}</p>
            </div>
            <div style={{ flex: 1, background: "#0a0a0a", borderRadius: 14, padding: "10px 12px" }}>
              <p style={{ margin: 0, fontSize: 8, color: "#555", textTransform: "uppercase", letterSpacing: "0.18em" }}>Meta semana</p>
              <p style={{ margin: "3px 0 0", fontSize: 22, fontWeight: 900, color: "#444",
                fontFamily: "JetBrains Mono,monospace" }}>${WEEKLY_PLAN.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* ── Proyecciones — 3 big tiles ────────────────────────────────── */}
        <div style={{ margin: "0 12px 12px", display: "flex", gap: 8 }}>
          {[
            { label: "Fin Semana",  val: "$1,980", sub: "17 ago",  color: "#f6dd8c" },
            { label: "Fin Mes",     val: "$6.1k",  sub: "31 ago",  color: "#4ade80" },
            { label: "Fin Año",     val: "$62k",   sub: "31 dic",  color: "#3b82f6" },
          ].map(p => (
            <div key={p.label} style={{
              flex: 1, background: "#080808", border: "1px solid #181818",
              borderRadius: 20, padding: "14px 10px", textAlign: "center",
            }}>
              <p style={{ margin: 0, fontSize: 8, color: "#444", textTransform: "uppercase", letterSpacing: "0.15em" }}>{p.label}</p>
              <p style={{ margin: "6px 0 2px", fontSize: 22, fontWeight: 900, color: p.color,
                fontFamily: "JetBrains Mono,monospace" }}>{p.val}</p>
              <p style={{ margin: 0, fontSize: 9, color: "#333" }}>{p.sub}</p>
            </div>
          ))}
        </div>

        {/* ── Salud financiera ─────────────────────────────────────────────── */}
        <div style={{
          margin: "0 12px 28px",
          background: "#080808", border: "1px solid #181818", borderRadius: 24, padding: "18px 20px",
        }}>
          <p style={{ margin: "0 0 14px", fontSize: 9, color: "#555", textTransform: "uppercase", letterSpacing: "0.22em" }}>SALUD FINANCIERA · AGO</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { label: "Ingresos reales",          val: "+$4,320", color: "#4ade80" },
              { label: "Proyección fin de mes",     val: "+$6,100", color: "#f6dd8c" },
              { label: "Gastos reales",             val: "-$2,480", color: "#ef4444" },
              { label: "Gastos recurrentes (proy)", val: "-$3,100", color: "#f97316" },
            ].map(r => (
              <div key={r.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <p style={{ margin: 0, fontSize: 12, color: "#888" }}>{r.label}</p>
                <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: r.color,
                  fontFamily: "JetBrains Mono,monospace" }}>{r.val}</p>
              </div>
            ))}
            <div style={{
              marginTop: 4, paddingTop: 14, borderTop: "1px solid #181818",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#fff" }}>NET PROYECTADO</p>
              <p style={{ margin: 0, fontSize: 28, fontWeight: 900, color: "#4ade80",
                fontFamily: "JetBrains Mono,monospace" }}>+$3,000</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
