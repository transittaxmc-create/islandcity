import { useState } from "react";
import "./_group.css";

// ── INCOME PROJECTION MOCKUP ─────────────────────────────────────────────────
// Selector de días de trabajo + monto proyectado por día + total semanal
// Bank balance manual entry incluido

const DAYS = [
  { iso: 0, short: "Dom", long: "Domingo"   },
  { iso: 1, short: "Lun", long: "Lunes"     },
  { iso: 2, short: "Mar", long: "Martes"    },
  { iso: 3, short: "Mié", long: "Miércoles" },
  { iso: 4, short: "Jue", long: "Jueves"    },
  { iso: 5, short: "Vie", long: "Viernes"   },
  { iso: 6, short: "Sáb", long: "Sábado"    },
];

const gold: React.CSSProperties = {
  background: "linear-gradient(90deg,#f6dd8c,#d9b64f)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      margin: "0 14px",
      background: "#080808",
      border: "1px solid #1e1e1e",
      borderRadius: 22,
      padding: "18px 16px",
      ...style,
    }}>{children}</div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      margin: "0 0 14px",
      fontSize: 9, fontWeight: 700, color: "#d9b64f",
      textTransform: "uppercase", letterSpacing: "0.22em",
    }}>{children}</p>
  );
}

function NumberInput({
  value, onChange, placeholder, prefix = "$", large = false
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  prefix?: string;
  large?: boolean;
}) {
  return (
    <div style={{ position: "relative" }}>
      <span style={{
        position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
        color: "#d9b64f", fontFamily: "JetBrains Mono,monospace",
        fontSize: large ? 22 : 16, fontWeight: 700, pointerEvents: "none",
      }}>{prefix}</span>
      <input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder ?? "0"}
        style={{
          width: "100%", boxSizing: "border-box",
          background: "#0d0d0d",
          border: "1.5px solid #2a2a2a",
          borderRadius: 14,
          padding: large ? "14px 16px 14px 34px" : "11px 14px 11px 30px",
          color: "#fff",
          fontFamily: "JetBrains Mono,monospace",
          fontSize: large ? 26 : 18,
          fontWeight: 800,
          outline: "none",
          caretColor: "#d9b64f",
        }}
      />
    </div>
  );
}

export function IncomeProjection() {
  const [bankBalance, setBankBalance] = useState("");
  const [activeDays, setActiveDays] = useState<Set<number>>(new Set([1, 2, 3, 4, 5]));
  const [amounts, setAmounts] = useState<Record<number, string>>({
    1: "400", 2: "350", 3: "350", 4: "400", 5: "480",
  });

  const toggleDay = (iso: number) => {
    const next = new Set(activeDays);
    if (next.has(iso)) {
      next.delete(iso);
      const a = { ...amounts };
      delete a[iso];
      setAmounts(a);
    } else {
      next.add(iso);
      setAmounts(prev => ({ ...prev, [iso]: "" }));
    }
    setActiveDays(next);
  };

  const setAmount = (iso: number, val: string) => {
    setAmounts(prev => ({ ...prev, [iso]: val }));
  };

  const weeklyTotal = Array.from(activeDays)
    .reduce((sum, iso) => sum + (parseFloat(amounts[iso] || "0") || 0), 0);

  const activeDaysSorted = DAYS.filter(d => activeDays.has(d.iso));

  return (
    <div style={{
      minHeight: "100vh", width: "100%", background: "#000",
      color: "#fff", fontFamily: "Inter,sans-serif", overflowY: "auto",
    }}>
      <div style={{ maxWidth: 390, margin: "0 auto", paddingBottom: 40 }}>

        {/* ── Brand header ─────────────────────────────────────────────── */}
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
                letterSpacing: "0.04em", ...gold as any }}>ISLANDCITY</p>
              <p style={{ margin: 0, fontSize: 7, color: "#a07820", letterSpacing: "0.3em",
                textTransform: "uppercase" }}>PROYECCIÓN DE INGRESOS</p>
            </div>
          </div>
          <div style={{
            background: "#0f1a0f", border: "1px solid #4ade8030",
            borderRadius: 999, padding: "5px 12px",
            fontSize: 10, color: "#4ade80", fontWeight: 700,
          }}>Planificación</div>
        </div>

        <div style={{ height: 14 }} />

        {/* ── Saldo del banco ───────────────────────────────────────────── */}
        <Card style={{ background: "linear-gradient(135deg,#0d0900,#1a0f00)", border: "1px solid #d9b64f22" }}>
          <SectionLabel>SALDO DEL BANCO</SectionLabel>
          <p style={{ margin: "0 0 10px", fontSize: 12, color: "#777" }}>
            ¿Cuánto tienes en tu cuenta ahora mismo?
          </p>
          <NumberInput value={bankBalance} onChange={setBankBalance} placeholder="2,450" large />
          <p style={{ margin: "8px 0 0", fontSize: 10, color: "#444" }}>
            Actualiza esto cada vez que revises tu cuenta
          </p>
        </Card>

        <div style={{ height: 12 }} />

        {/* ── Selector de días de trabajo ───────────────────────────────── */}
        <Card>
          <SectionLabel>DÍAS QUE VAS A TRABAJAR</SectionLabel>
          <p style={{ margin: "0 0 14px", fontSize: 12, color: "#666" }}>
            Toca los días que planeas manejar esta semana
          </p>

          {/* Day toggle pills */}
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 20 }}>
            {DAYS.map(d => {
              const on = activeDays.has(d.iso);
              return (
                <button
                  key={d.iso}
                  onClick={() => toggleDay(d.iso)}
                  style={{
                    flex: "0 0 auto",
                    padding: "9px 14px",
                    borderRadius: 999,
                    border: on ? "1.5px solid #d9b64f" : "1.5px solid #1e1e1e",
                    background: on
                      ? "linear-gradient(135deg,#1a1200,#2a1e00)"
                      : "#0d0d0d",
                    color: on ? "#f6dd8c" : "#444",
                    fontFamily: "Inter,sans-serif",
                    fontWeight: on ? 700 : 400,
                    fontSize: 13,
                    cursor: "pointer",
                    transition: "all 0.15s",
                    boxShadow: on ? "0 0 10px #d9b64f22" : "none",
                  }}
                >{d.short}</button>
              );
            })}
          </div>

          {/* Active day income inputs */}
          {activeDays.size === 0 && (
            <p style={{ textAlign: "center", color: "#333", fontSize: 13, padding: "20px 0" }}>
              Toca un día para empezar
            </p>
          )}

          {activeDaysSorted.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {activeDaysSorted.map((d, i) => (
                <div key={d.iso} style={{
                  background: "#0d0d0d",
                  border: "1px solid #1e1e1e",
                  borderRadius: 16,
                  padding: "12px 14px",
                  display: "flex", alignItems: "center", gap: 12,
                }}>
                  {/* Day name */}
                  <div style={{ width: 56, flexShrink: 0 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#f6dd8c" }}>{d.short}</p>
                    <p style={{ margin: 0, fontSize: 9, color: "#555" }}>{d.long}</p>
                  </div>

                  {/* Divider */}
                  <div style={{ width: 1, height: 36, background: "#1e1e1e", flexShrink: 0 }} />

                  {/* Amount input */}
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: "0 0 5px", fontSize: 9, color: "#555",
                      textTransform: "uppercase", letterSpacing: "0.15em" }}>
                      Meta de ingresos
                    </p>
                    <div style={{ position: "relative" }}>
                      <span style={{
                        position: "absolute", left: 10, top: "50%",
                        transform: "translateY(-50%)",
                        color: "#d9b64f", fontFamily: "JetBrains Mono,monospace",
                        fontSize: 15, fontWeight: 700, pointerEvents: "none",
                      }}>$</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={amounts[d.iso] ?? ""}
                        onChange={e => setAmount(d.iso, e.target.value)}
                        placeholder="400"
                        style={{
                          width: "100%", boxSizing: "border-box",
                          background: "#000",
                          border: "1.5px solid #2a2a2a",
                          borderRadius: 10,
                          padding: "9px 10px 9px 26px",
                          color: "#fff",
                          fontFamily: "JetBrains Mono,monospace",
                          fontSize: 18, fontWeight: 800,
                          outline: "none",
                          caretColor: "#d9b64f",
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <div style={{ height: 12 }} />

        {/* ── Total semanal proyectado ───────────────────────────────────── */}
        <Card style={{
          background: "linear-gradient(135deg,#060f06,#0a1a0a)",
          border: "1px solid #4ade8025",
        }}>
          <SectionLabel>TOTAL PROYECTADO ESTA SEMANA</SectionLabel>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
            <div>
              <p style={{ margin: 0, fontSize: 11, color: "#555" }}>
                {activeDays.size} día{activeDays.size !== 1 ? "s" : ""} de trabajo
              </p>
              <p style={{
                margin: "4px 0 0",
                fontSize: 52, fontWeight: 900, lineHeight: 1,
                fontFamily: "JetBrains Mono,monospace",
                ...gold as any,
              }}>
                ${weeklyTotal.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </p>
            </div>
            {activeDays.size > 0 && (
              <div style={{ textAlign: "right" }}>
                <p style={{ margin: 0, fontSize: 9, color: "#444" }}>Promedio por día</p>
                <p style={{
                  margin: "3px 0 0", fontSize: 22, fontWeight: 800, color: "#d9b64f",
                  fontFamily: "JetBrains Mono,monospace",
                }}>
                  ${Math.round(weeklyTotal / activeDays.size).toLocaleString()}
                </p>
              </div>
            )}
          </div>

          {/* Breakdown bar */}
          {activeDays.size > 0 && weeklyTotal > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{
                display: "flex", height: 8, borderRadius: 999, overflow: "hidden", gap: 2,
              }}>
                {activeDaysSorted.map(d => {
                  const pct = ((parseFloat(amounts[d.iso] || "0") || 0) / weeklyTotal) * 100;
                  return (
                    <div key={d.iso} style={{
                      flex: pct, background: "#4ade80",
                      opacity: 0.3 + (pct / 100) * 0.7,
                      borderRadius: 999, minWidth: 2,
                    }} />
                  );
                })}
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
                {activeDaysSorted.map(d => {
                  const amt = parseFloat(amounts[d.iso] || "0") || 0;
                  if (!amt) return null;
                  const pct = Math.round((amt / weeklyTotal) * 100);
                  return (
                    <span key={d.iso} style={{ fontSize: 10, color: "#555" }}>
                      <span style={{ color: "#f6dd8c" }}>{d.short}</span> {pct}%
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </Card>

        <div style={{ height: 12 }} />

        {/* ── Guardar button ────────────────────────────────────────────── */}
        <div style={{ margin: "0 14px" }}>
          <button style={{
            width: "100%",
            background: "linear-gradient(135deg,#f6dd8c,#d9b64f)",
            border: "none", borderRadius: 18,
            padding: "17px 0",
            color: "#0a0800", fontSize: 15, fontWeight: 800,
            fontFamily: "Inter,sans-serif",
            cursor: "pointer", letterSpacing: "0.04em",
          }}>
            Guardar Plan de Ingresos
          </button>
        </div>

      </div>
    </div>
  );
}
