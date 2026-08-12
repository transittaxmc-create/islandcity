import { useState } from "react";
import "./_group.css";

// ── EXPENSE PROJECTION MOCKUP ────────────────────────────────────────────────
// Proyección de gastos recurrentes con selector de frecuencia y días

const DAYS = [
  { iso: 0, short: "Dom" },
  { iso: 1, short: "Lun" },
  { iso: 2, short: "Mar" },
  { iso: 3, short: "Mié" },
  { iso: 4, short: "Jue" },
  { iso: 5, short: "Vie" },
  { iso: 6, short: "Sáb" },
];

const CATEGORIES = [
  "Gasolina", "Seguro", "Renta/Hipoteca", "Comida", "Teléfono",
  "Mantenimiento", "Peajes", "Plataformas", "Salud", "Otro",
];

type Frequency = "daily" | "weekly" | "biweekly" | "monthly" | "annual" | "one-time";

const FREQ_OPTIONS: { id: Frequency; label: string; sublabel: string }[] = [
  { id: "daily",    label: "Diario",      sublabel: "Cada día"         },
  { id: "weekly",   label: "Semanal",     sublabel: "Una vez a la sem." },
  { id: "biweekly", label: "Quincenal",   sublabel: "Cada 2 semanas"   },
  { id: "monthly",  label: "Mensual",     sublabel: "Una vez al mes"   },
  { id: "annual",   label: "Anual",       sublabel: "Una vez al año"   },
  { id: "one-time", label: "Inesperado",  sublabel: "Pago único"       },
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

function TextInput({
  label, value, onChange, placeholder, hint,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; hint?: string;
}) {
  return (
    <div>
      <p style={{ margin: "0 0 6px", fontSize: 11, color: "#666", fontWeight: 500 }}>{label}</p>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%", boxSizing: "border-box",
          background: "#0d0d0d", border: "1.5px solid #2a2a2a",
          borderRadius: 14, padding: "12px 14px",
          color: "#fff", fontFamily: "Inter,sans-serif",
          fontSize: 15, outline: "none", caretColor: "#d9b64f",
        }}
      />
      {hint && <p style={{ margin: "5px 0 0", fontSize: 10, color: "#333" }}>{hint}</p>}
    </div>
  );
}

function AmountInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <p style={{ margin: "0 0 6px", fontSize: 11, color: "#666", fontWeight: 500 }}>Monto</p>
      <div style={{ position: "relative" }}>
        <span style={{
          position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
          color: "#d9b64f", fontFamily: "JetBrains Mono,monospace",
          fontSize: 22, fontWeight: 700, pointerEvents: "none",
        }}>$</span>
        <input
          type="number"
          inputMode="decimal"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="0"
          style={{
            width: "100%", boxSizing: "border-box",
            background: "#0d0d0d", border: "1.5px solid #2a2a2a",
            borderRadius: 14, padding: "14px 14px 14px 36px",
            color: "#fff", fontFamily: "JetBrains Mono,monospace",
            fontSize: 26, fontWeight: 800,
            outline: "none", caretColor: "#d9b64f",
          }}
        />
      </div>
    </div>
  );
}

function DaySelector({
  selected, onToggle, multi = true,
}: {
  selected: Set<number>;
  onToggle: (iso: number) => void;
  multi?: boolean;
}) {
  return (
    <div>
      <p style={{ margin: "0 0 8px", fontSize: 11, color: "#666" }}>
        {multi ? "¿Qué día(s) de la semana?" : "¿Qué día de la semana?"}
      </p>
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
        {DAYS.map(d => {
          const on = selected.has(d.iso);
          return (
            <button
              key={d.iso}
              onClick={() => onToggle(d.iso)}
              style={{
                padding: "9px 14px", borderRadius: 999,
                border: on ? "1.5px solid #d9b64f" : "1.5px solid #1e1e1e",
                background: on ? "linear-gradient(135deg,#1a1200,#2a1e00)" : "#0d0d0d",
                color: on ? "#f6dd8c" : "#444",
                fontFamily: "Inter,sans-serif",
                fontWeight: on ? 700 : 400, fontSize: 13,
                cursor: "pointer", transition: "all 0.15s",
                boxShadow: on ? "0 0 10px #d9b64f22" : "none",
              }}
            >{d.short}</button>
          );
        })}
      </div>
    </div>
  );
}

// Monthly equivalent calculator
function toMonthly(amount: number, freq: Frequency): number {
  if (!amount) return 0;
  switch (freq) {
    case "daily":    return amount * 30;
    case "weekly":   return amount * 4.33;
    case "biweekly": return amount * 2.17;
    case "monthly":  return amount;
    case "annual":   return amount / 12;
    case "one-time": return amount;
  }
}

export function ExpenseProjection() {
  const [name, setName]       = useState("");
  const [amount, setAmount]   = useState("");
  const [category, setCategory] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("monthly");
  const [days, setDays]       = useState<Set<number>>(new Set());
  const [dueDate, setDueDate] = useState("");
  const [note, setNote]       = useState("");

  const showDayPicker = frequency === "weekly" || frequency === "biweekly";
  const showDueDate   = frequency === "monthly" || frequency === "annual" || frequency === "one-time";

  const toggleDay = (iso: number) => {
    const next = new Set(days);
    if (next.has(iso)) next.delete(iso);
    else next.add(iso);
    setDays(next);
  };

  const amt = parseFloat(amount || "0") || 0;
  const monthlyEq = toMonthly(amt, frequency);
  const freqLabel = FREQ_OPTIONS.find(f => f.id === frequency)?.label ?? "";

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
                textTransform: "uppercase" }}>PROYECCIÓN DE GASTOS</p>
            </div>
          </div>
          <div style={{
            background: "#1a0000", border: "1px solid #ef444430",
            borderRadius: 999, padding: "5px 12px",
            fontSize: 10, color: "#ef4444", fontWeight: 700,
          }}>Planificación</div>
        </div>

        <div style={{ height: 14 }} />

        {/* ── Gasto básico: nombre + monto ─────────────────────────────── */}
        <Card>
          <SectionLabel>DATOS DEL GASTO</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <TextInput
              label="Nombre del gasto"
              value={name}
              onChange={setName}
              placeholder="ej. Gasolina semanal, Renta, Seguro..."
            />
            <AmountInput value={amount} onChange={setAmount} />
          </div>
        </Card>

        <div style={{ height: 12 }} />

        {/* ── Categoría ─────────────────────────────────────────────────── */}
        <Card>
          <SectionLabel>CATEGORÍA</SectionLabel>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            {CATEGORIES.map(c => {
              const on = category === c;
              return (
                <button
                  key={c}
                  onClick={() => setCategory(on ? "" : c)}
                  style={{
                    padding: "8px 13px", borderRadius: 999,
                    border: on ? "1.5px solid #d9b64f" : "1.5px solid #1e1e1e",
                    background: on ? "linear-gradient(135deg,#1a1200,#2a1e00)" : "#0d0d0d",
                    color: on ? "#f6dd8c" : "#555",
                    fontFamily: "Inter,sans-serif",
                    fontWeight: on ? 700 : 400, fontSize: 12,
                    cursor: "pointer", transition: "all 0.15s",
                  }}
                >{c}</button>
              );
            })}
          </div>
        </Card>

        <div style={{ height: 12 }} />

        {/* ── Frecuencia ────────────────────────────────────────────────── */}
        <Card>
          <SectionLabel>FRECUENCIA</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {FREQ_OPTIONS.map(f => {
              const on = frequency === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => { setFrequency(f.id); setDays(new Set()); setDueDate(""); }}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "13px 16px", borderRadius: 16,
                    border: on ? "1.5px solid #d9b64f" : "1.5px solid #1e1e1e",
                    background: on ? "linear-gradient(135deg,#1a1200,#2a1e00)" : "#0d0d0d",
                    cursor: "pointer", transition: "all 0.15s",
                    textAlign: "left",
                  }}
                >
                  <div>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: on ? 700 : 400,
                      color: on ? "#f6dd8c" : "#aaa" }}>{f.label}</p>
                    <p style={{ margin: 0, fontSize: 10, color: on ? "#a07820" : "#444" }}>{f.sublabel}</p>
                  </div>
                  {on && (
                    <div style={{
                      width: 20, height: 20, borderRadius: "50%",
                      background: "#d9b64f",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, color: "#000", fontWeight: 900,
                    }}>✓</div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Day picker for weekly / biweekly */}
          {showDayPicker && (
            <div style={{
              marginTop: 16, paddingTop: 16,
              borderTop: "1px solid #1e1e1e",
            }}>
              <DaySelector
                selected={days}
                onToggle={toggleDay}
                multi={frequency === "biweekly"}
              />
            </div>
          )}

          {/* Due date for monthly / annual / one-time */}
          {showDueDate && (
            <div style={{
              marginTop: 16, paddingTop: 16,
              borderTop: "1px solid #1e1e1e",
            }}>
              <p style={{ margin: "0 0 8px", fontSize: 11, color: "#666" }}>
                {frequency === "monthly"  ? "¿Qué día del mes vence?" :
                 frequency === "annual"   ? "¿Qué fecha del año?" :
                                            "¿Cuándo es este pago?"}
              </p>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                style={{
                  background: "#0d0d0d", border: "1.5px solid #2a2a2a",
                  borderRadius: 14, padding: "12px 14px",
                  color: "#fff", fontFamily: "JetBrains Mono,monospace",
                  fontSize: 15, outline: "none",
                  width: "100%", boxSizing: "border-box",
                  colorScheme: "dark",
                }}
              />
            </div>
          )}
        </Card>

        <div style={{ height: 12 }} />

        {/* ── Nota opcional ─────────────────────────────────────────────── */}
        <Card>
          <SectionLabel>NOTA (OPCIONAL)</SectionLabel>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="ej. Pago el día 15 por Zelle a landlord..."
            rows={3}
            style={{
              width: "100%", boxSizing: "border-box",
              background: "#0d0d0d", border: "1.5px solid #2a2a2a",
              borderRadius: 14, padding: "12px 14px",
              color: "#fff", fontFamily: "Inter,sans-serif",
              fontSize: 14, resize: "none",
              outline: "none", caretColor: "#d9b64f",
            }}
          />
        </Card>

        <div style={{ height: 12 }} />

        {/* ── Equivalente mensual (preview) ─────────────────────────────── */}
        {amt > 0 && (
          <Card style={{
            background: "linear-gradient(135deg,#0a0000,#1a0000)",
            border: "1px solid #ef444425",
          }}>
            <SectionLabel>LO QUE ESTO CUESTA AL MES</SectionLabel>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <div>
                <p style={{ margin: 0, fontSize: 12, color: "#777" }}>
                  {freqLabel} de ${amt.toLocaleString()} equivale a:
                </p>
                <p style={{
                  margin: "4px 0 0",
                  fontSize: 44, fontWeight: 900, lineHeight: 1,
                  fontFamily: "JetBrains Mono,monospace",
                  color: "#ef4444",
                }}>
                  −${monthlyEq.toLocaleString("en-US", {
                    minimumFractionDigits: 0, maximumFractionDigits: 0,
                  })}
                </p>
                <p style={{ margin: "4px 0 0", fontSize: 10, color: "#555" }}>
                  por mes en tu presupuesto
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ margin: 0, fontSize: 9, color: "#444" }}>Al año</p>
                <p style={{ margin: "3px 0 0", fontSize: 18, fontWeight: 700,
                  color: "#7f1d1d", fontFamily: "JetBrains Mono,monospace" }}>
                  −${(monthlyEq * 12).toLocaleString("en-US", {
                    minimumFractionDigits: 0, maximumFractionDigits: 0,
                  })}
                </p>
              </div>
            </div>
          </Card>
        )}

        {amt > 0 && <div style={{ height: 12 }} />}

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
            Guardar Gasto Proyectado
          </button>
        </div>

      </div>
    </div>
  );
}
