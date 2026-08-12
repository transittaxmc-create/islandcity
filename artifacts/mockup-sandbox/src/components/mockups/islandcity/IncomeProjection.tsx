import { useState, useRef } from "react";
import "./_group.css";

// ── INCOME PROJECTION v4 ─────────────────────────────────────────────────────
// + Añadir nuevo… on platform selector
// Tab 1: Días y Montos + platform selector with add-new
// Tab 2: Resumen

const DAYS = [
  { iso: 0, short: "Dom", long: "Domingo"   },
  { iso: 1, short: "Lun", long: "Lunes"     },
  { iso: 2, short: "Mar", long: "Martes"    },
  { iso: 3, short: "Mié", long: "Miércoles" },
  { iso: 4, short: "Jue", long: "Jueves"    },
  { iso: 5, short: "Vie", long: "Viernes"   },
  { iso: 6, short: "Sáb", long: "Sábado"    },
];

const DEFAULT_PLATFORMS = [
  { name: "Uber",           init: "U",   bg: "#1a1a1a", text: "#fff",    border: "#555"    },
  { name: "Lyft",           init: "L",   bg: "#ff00bf", text: "#fff",    border: "#ff00bf" },
  { name: "EcoRide",        init: "E",   bg: "#22c55e", text: "#fff",    border: "#22c55e" },
  { name: "Empower",        init: "E",   bg: "#3b82f6", text: "#fff",    border: "#3b82f6" },
  { name: "Gallant",        init: "G",   bg: "#f97316", text: "#fff",    border: "#f97316" },
  { name: "Aventus Ride",   init: "A",   bg: "#8b5cf6", text: "#fff",    border: "#8b5cf6" },
  { name: "Classic Ryde",   init: "CR",  bg: "#14b8a6", text: "#fff",    border: "#14b8a6" },
  { name: "Aki Technology", init: "AKI", bg: "#0ea5e9", text: "#fff",    border: "#0ea5e9" },
  { name: "Street Hail",    init: "SH",  bg: "#6b7280", text: "#fff",    border: "#6b7280" },
  { name: "IC Transit",     init: "ICT", bg: "#374151", text: "#f6dd8c", border: "#f6dd8c" },
  { name: "Transit Tax",    init: "TT",  bg: "#1f2937", text: "#9ca3af", border: "#374151" },
  { name: "EcoRide 10%",    init: "E",   bg: "#15803d", text: "#fff",    border: "#22c55e" },
  { name: "Other",          init: "O",   bg: "#1f1f1f", text: "#9ca3af", border: "#374151" },
];

const BG    = "#0d0800";
const CARD  = "#160d00";
const BORD  = "#d9b64f55";
const GOLD  = "#f6dd8c";
const GOLD2 = "#d9b64f";
const GREEN = "#4ade80";
const MONO  = "JetBrains Mono,monospace";
const SANS  = "Inter,sans-serif";

const goldGrad: React.CSSProperties = {
  background: `linear-gradient(90deg,${GOLD},${GOLD2})`,
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

// ── Reusable "expandable pill list with + Añadir" ────────────────────────────
function PillSelector({
  label,
  items,
  selected,
  onToggle,
  onAdd,
  addLabel,
  multiSelect = true,
  color,
}: {
  label: string;
  items: string[];
  selected: Set<string>;
  onToggle: (item: string) => void;
  onAdd: (item: string) => void;
  addLabel: string;
  multiSelect?: boolean;
  color?: string;
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft]   = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const accent   = color ?? GOLD;

  const confirmAdd = () => {
    const trimmed = draft.trim();
    if (trimmed) { onAdd(trimmed); onToggle(trimmed); }
    setDraft(""); setAdding(false);
  };

  return (
    <div style={{
      background: CARD, border: `1px solid ${BORD}`,
      borderRadius: 20, padding: "14px",
      boxShadow: `0 0 24px #d9b64f14`,
    }}>
      <p style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 700, color: GOLD2,
        textTransform: "uppercase", letterSpacing: "0.18em" }}>{label}</p>

      <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
        {items.map(item => {
          const on = selected.has(item);
          return (
            <button key={item} onClick={() => onToggle(item)} style={{
              padding: "8px 14px", borderRadius: 999, fontSize: 13,
              fontWeight: on ? 800 : 400,
              border: on ? `2px solid ${accent}` : "2px solid #2a1800",
              background: on ? `${accent}22` : "#0d0800",
              color: on ? accent : "#555",
              cursor: "pointer", transition: "all 0.15s",
              boxShadow: on ? `0 0 10px ${accent}33` : "none",
            }}>{item}</button>
          );
        })}

        {/* + Añadir pill */}
        {!adding && (
          <button onClick={() => { setAdding(true); setTimeout(() => inputRef.current?.focus(), 50); }}
            style={{
              padding: "8px 14px", borderRadius: 999, fontSize: 13, fontWeight: 600,
              border: `2px dashed #3a2200`,
              background: "transparent", color: GOLD2,
              cursor: "pointer", transition: "all 0.15s",
              display: "flex", alignItems: "center", gap: 5,
            }}>
            <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> {addLabel}
          </button>
        )}
      </div>

      {/* Inline text input for new item */}
      {adding && (
        <div style={{
          marginTop: 12, display: "flex", gap: 8, alignItems: "center",
          background: "#0d0800", border: `2px solid ${accent}66`,
          borderRadius: 14, padding: "8px 12px",
        }}>
          <input
            ref={inputRef}
            type="text"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") confirmAdd(); if (e.key === "Escape") { setAdding(false); setDraft(""); } }}
            placeholder={`Escribe y presiona Enter…`}
            style={{
              flex: 1, background: "transparent", border: "none",
              color: "#fff", fontFamily: SANS, fontSize: 14,
              outline: "none", caretColor: accent,
            }}
          />
          <button onClick={confirmAdd} style={{
            background: accent, border: "none", borderRadius: 8,
            padding: "5px 12px", color: "#0a0800",
            fontFamily: SANS, fontSize: 12, fontWeight: 800, cursor: "pointer",
          }}>Agregar</button>
          <button onClick={() => { setAdding(false); setDraft(""); }} style={{
            background: "transparent", border: "none",
            color: "#555", fontSize: 18, cursor: "pointer", lineHeight: 1, padding: "0 4px",
          }}>×</button>
        </div>
      )}
    </div>
  );
}

// ── Header ────────────────────────────────────────────────────────────────────
function Header() {
  return (
    <div style={{
      background: `linear-gradient(180deg,#1f1000,${BG})`,
      borderBottom: `1px solid ${BORD}`,
      padding: "40px 16px 12px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 42, height: 42, borderRadius: "50%",
          background: "radial-gradient(circle at 40% 35%,#3a2000,#0d0800)",
          border: `2px solid ${GOLD2}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18, boxShadow: `0 0 14px ${GOLD2}44`,
        }}>🌉</div>
        <div>
          <p style={{ margin: 0, fontFamily: "Cinzel,serif", fontWeight: 700,
            fontSize: 16, letterSpacing: "0.06em", ...goldGrad as any }}>ISLANDCITY</p>
          <p style={{ margin: 0, fontSize: 9, color: "#a07820",
            letterSpacing: "0.3em", textTransform: "uppercase" }}>PROYECCIÓN DE INGRESOS</p>
        </div>
      </div>
      <span style={{
        background: "#0f1a0f", border: `1px solid ${GREEN}40`,
        borderRadius: 999, padding: "5px 12px",
        fontSize: 10, color: GREEN, fontWeight: 700,
        display: "flex", alignItems: "center", gap: 5,
      }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: GREEN, display: "inline-block" }} />
        EN TURNO
      </span>
    </div>
  );
}

function TabNav({ tab, setTab }: { tab: number; setTab: (n: number) => void }) {
  return (
    <div style={{ display: "flex", background: "#0a0600", borderBottom: "1px solid #2a1a00" }}>
      {["① Días y Montos", "② Resumen"].map((label, i) => {
        const on = tab === i;
        return (
          <button key={i} onClick={() => setTab(i)} style={{
            flex: 1, padding: "12px 8px",
            background: "transparent", border: "none",
            borderBottom: on ? `3px solid ${GOLD}` : "3px solid transparent",
            color: on ? GOLD : "#555",
            fontFamily: SANS, fontSize: 13, fontWeight: on ? 700 : 400,
            cursor: "pointer", transition: "all 0.15s",
          }}>{label}</button>
        );
      })}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function IncomeProjection() {
  const [tab, setTab] = useState(0);

  // Platform selector state
  const [platforms, setPlatforms] = useState<string[]>(DEFAULT_PLATFORMS.map(p => p.name));
  const [activePlatforms, setActivePlatforms] = useState<Set<string>>(new Set(["Uber", "Lyft"]));

  // Days / amounts
  const [activeDays, setActiveDays] = useState<Set<number>>(new Set([1, 2, 3, 4, 5]));
  const [amounts, setAmounts] = useState<Record<number, string>>(
    { 1: "400", 2: "350", 3: "350", 4: "400", 5: "480" }
  );
  const [bankBalance, setBankBalance] = useState("2450");

  const togglePlatform = (name: string) => {
    const n = new Set(activePlatforms);
    n.has(name) ? n.delete(name) : n.add(name);
    setActivePlatforms(n);
  };

  const addPlatform = (name: string) => {
    if (!platforms.includes(name)) setPlatforms(prev => [...prev, name]);
  };

  const toggleDay = (iso: number) => {
    const next = new Set(activeDays);
    if (next.has(iso)) { next.delete(iso); const a = { ...amounts }; delete a[iso]; setAmounts(a); }
    else { next.add(iso); setAmounts(p => ({ ...p, [iso]: "" })); }
    setActiveDays(next);
  };

  const sorted    = DAYS.filter(d => activeDays.has(d.iso));
  const total     = sorted.reduce((s, d) => s + (parseFloat(amounts[d.iso] || "0") || 0), 0);
  const avgPerDay = sorted.length ? Math.round(total / sorted.length) : 0;
  const bank      = parseFloat(bankBalance || "0") || 0;
  const projected = bank + total;

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column",
      background: BG, color: "#fff", fontFamily: SANS, overflow: "hidden" }}>
      <Header />
      <TabNav tab={tab} setTab={setTab} />

      {/* TAB 1 */}
      {tab === 0 && (
        <div style={{ flex: 1, overflowY: "auto", padding: "14px 14px",
          display: "flex", flexDirection: "column", gap: 10 }}>

          {/* Platform selector */}
          <PillSelector
            label="PLATAFORMAS ESTA SEMANA"
            items={platforms}
            selected={activePlatforms}
            onToggle={togglePlatform}
            onAdd={addPlatform}
            addLabel="Nueva plataforma"
            color={GOLD}
          />

          {/* Day pills */}
          <div style={{
            background: CARD, border: `1px solid ${BORD}`,
            borderRadius: 20, padding: "14px",
            boxShadow: `0 0 24px #d9b64f18`,
          }}>
            <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 700, color: GOLD2,
              textTransform: "uppercase", letterSpacing: "0.18em" }}>DÍAS DE TRABAJO</p>
            <p style={{ margin: "0 0 12px", fontSize: 13, color: "#888" }}>
              Toca los días que planeas manejar
            </p>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              {DAYS.map(d => {
                const on = activeDays.has(d.iso);
                return (
                  <button key={d.iso} onClick={() => toggleDay(d.iso)} style={{
                    padding: "10px 14px", borderRadius: 999, fontSize: 14,
                    fontWeight: on ? 800 : 400,
                    border: on ? `2px solid ${GOLD}` : "2px solid #2a1800",
                    background: on ? "linear-gradient(135deg,#2a1800,#3d2300)" : "#110900",
                    color: on ? GOLD : "#444",
                    cursor: "pointer", transition: "all 0.15s",
                    boxShadow: on ? `0 0 12px ${GOLD2}44` : "none",
                  }}>{d.short}</button>
                );
              })}
            </div>
          </div>

          {/* Per-day inputs */}
          <div style={{
            background: CARD, border: `1px solid ${BORD}`,
            borderRadius: 20, padding: "14px",
            boxShadow: `0 0 24px #d9b64f18`,
          }}>
            <p style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 700, color: GOLD2,
              textTransform: "uppercase", letterSpacing: "0.18em" }}>META POR DÍA</p>
            {sorted.length === 0 && (
              <p style={{ textAlign: "center", color: "#333", fontSize: 14, padding: "16px 0" }}>
                Selecciona al menos un día ↑
              </p>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {sorted.map(d => (
                <div key={d.iso} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  background: "#0d0800", border: "1px solid #2a1800",
                  borderRadius: 14, padding: "10px 12px",
                }}>
                  <div style={{ width: 50, flexShrink: 0 }}>
                    <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: GOLD }}>{d.short}</p>
                    <p style={{ margin: 0, fontSize: 10, color: "#555" }}>{d.long}</p>
                  </div>
                  <div style={{ width: 1, height: 36, background: "#2a1800", flexShrink: 0 }} />
                  <div style={{ position: "relative", flex: 1 }}>
                    <span style={{
                      position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)",
                      color: GOLD2, fontFamily: MONO, fontSize: 16, fontWeight: 700, pointerEvents: "none",
                    }}>$</span>
                    <input type="number" inputMode="decimal"
                      value={amounts[d.iso] ?? ""} placeholder="400"
                      onChange={e => setAmounts(p => ({ ...p, [d.iso]: e.target.value }))}
                      style={{
                        width: "100%", boxSizing: "border-box",
                        background: "#0d0800", border: "1.5px solid #3a2200",
                        borderRadius: 12, padding: "10px 10px 10px 24px",
                        color: "#fff", fontFamily: MONO, fontSize: 20, fontWeight: 800,
                        outline: "none", caretColor: GOLD,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button onClick={() => setTab(1)} style={{
            width: "100%", padding: "15px",
            background: `linear-gradient(135deg,${GOLD},${GOLD2})`,
            border: "none", borderRadius: 16, fontSize: 15, fontWeight: 800,
            color: "#0a0800", cursor: "pointer",
            boxShadow: `0 4px 20px ${GOLD2}44`,
          }}>Ver Resumen →</button>
        </div>
      )}

      {/* TAB 2 */}
      {tab === 1 && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column",
          padding: "14px 14px", gap: 10, overflowY: "auto" }}>

          <div style={{
            background: `linear-gradient(135deg,#1a0f00,#2a1800)`,
            border: `2px solid ${BORD}`, borderRadius: 20, padding: "14px",
            boxShadow: `0 0 30px ${GOLD2}22`,
          }}>
            <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 700,
              color: GOLD2, textTransform: "uppercase", letterSpacing: "0.18em" }}>SALDO DEL BANCO</p>
            <p style={{ margin: "0 0 8px", fontSize: 13, color: "#888" }}>¿Cuánto tienes ahora mismo?</p>
            <div style={{ position: "relative" }}>
              <span style={{
                position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
                color: GOLD, fontFamily: MONO, fontSize: 26, fontWeight: 800, pointerEvents: "none",
              }}>$</span>
              <input type="number" inputMode="decimal"
                value={bankBalance} onChange={e => setBankBalance(e.target.value)} placeholder="0"
                style={{
                  width: "100%", boxSizing: "border-box",
                  background: "#110900", border: `2px solid #3a2200`,
                  borderRadius: 14, padding: "12px 14px 12px 40px",
                  color: GOLD, fontFamily: MONO, fontSize: 30, fontWeight: 900,
                  outline: "none", caretColor: GOLD,
                }}
              />
            </div>
          </div>

          <div style={{
            background: "linear-gradient(135deg,#0a1a0a,#0f2a0f)",
            border: `2px solid #4ade8044`, borderRadius: 20, padding: "16px",
            boxShadow: `0 0 30px #4ade8018`,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <p style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 700,
                  color: GREEN, textTransform: "uppercase", letterSpacing: "0.18em" }}>TOTAL SEMANAL</p>
                <p style={{ margin: "0 0 6px", fontSize: 12, color: "#555" }}>
                  {activeDays.size} días · prom. ${avgPerDay.toLocaleString()}/día
                </p>
                <p style={{ margin: 0, fontFamily: MONO, fontSize: 48, fontWeight: 900,
                  lineHeight: 1, ...goldGrad as any }}>${total.toLocaleString()}</p>
              </div>
              <div style={{
                background: "#4ade8015", border: "1px solid #4ade8030",
                borderRadius: 14, padding: "8px 12px", textAlign: "right",
              }}>
                <p style={{ margin: 0, fontSize: 11, color: "#4ade8088" }}>Con banco</p>
                <p style={{ margin: "3px 0 0", fontFamily: MONO, fontSize: 20,
                  fontWeight: 900, color: GREEN }}>${projected.toLocaleString()}</p>
              </div>
            </div>
            {total > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ display: "flex", height: 8, borderRadius: 999, overflow: "hidden", gap: 2 }}>
                  {sorted.map(d => {
                    const amt = parseFloat(amounts[d.iso] || "0") || 0;
                    const pct = total > 0 ? (amt / total) * 100 : 0;
                    return <div key={d.iso} style={{
                      flex: pct, background: GOLD,
                      opacity: 0.4 + (pct / 100) * 0.6,
                      borderRadius: 999, minWidth: 4,
                    }} />;
                  })}
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6 }}>
                  {sorted.map(d => {
                    const amt = parseFloat(amounts[d.iso] || "0") || 0;
                    if (!amt) return null;
                    return <span key={d.iso} style={{ fontSize: 12, color: "#666" }}>
                      <span style={{ color: GOLD, fontWeight: 700 }}>{d.short}</span> ${amt.toLocaleString()}
                    </span>;
                  })}
                </div>
              </div>
            )}
          </div>

          <div style={{
            background: CARD, border: `1px solid ${BORD}`,
            borderRadius: 20, padding: "12px 14px",
          }}>
            <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700, color: GOLD2,
              textTransform: "uppercase", letterSpacing: "0.18em" }}>DESGLOSE POR DÍA</p>
            {sorted.map(d => {
              const amt = parseFloat(amounts[d.iso] || "0") || 0;
              return <div key={d.iso} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "5px 0", borderBottom: "1px solid #1a0e00",
              }}>
                <span style={{ fontSize: 14, color: "#aaa" }}>{d.long}</span>
                <span style={{ fontFamily: MONO, fontSize: 16, fontWeight: 800,
                  color: amt > 0 ? GOLD : "#333" }}>{amt > 0 ? `$${amt.toLocaleString()}` : "—"}</span>
              </div>;
            })}
          </div>

          <button style={{
            width: "100%", padding: "16px", marginTop: "auto",
            background: `linear-gradient(135deg,${GOLD},${GOLD2})`,
            border: "none", borderRadius: 18, fontSize: 15, fontWeight: 800,
            color: "#0a0800", cursor: "pointer",
            boxShadow: `0 4px 24px ${GOLD2}55`,
          }}>Guardar Plan de Ingresos</button>
        </div>
      )}
    </div>
  );
}
