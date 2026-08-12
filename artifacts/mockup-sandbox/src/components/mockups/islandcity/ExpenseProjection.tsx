import { useState, useRef } from "react";
import "./_group.css";

// ── EXPENSE PROJECTION v4 ────────────────────────────────────────────────────
// + Añadir nuevo… on category, vendor, and platform selectors

const DAYS = [
  { iso: 0, short: "Dom" }, { iso: 1, short: "Lun" }, { iso: 2, short: "Mar" },
  { iso: 3, short: "Mié" }, { iso: 4, short: "Jue" }, { iso: 5, short: "Vie" },
  { iso: 6, short: "Sáb" },
];

const DEFAULT_PLATFORMS = [
  "Uber","Lyft","EcoRide","Empower","Gallant","Aventus Ride",
  "Classic Ryde","Aki Technology","Street Hail","IC Transit",
  "Transit Tax","EcoRide 10%","Other",
];

const DEFAULT_CATEGORIES = [
  "Gasolina","Seguro","Renta","Comida","Teléfono",
  "Mantenimiento","Peajes","Plataformas","Salud","Otro",
];

const DEFAULT_VENDORS = [
  "BP","Shell","Sunoco","Costco Gas","Citgo","Gulf",
  "Progressive","State Farm","Geico","Sprint","T-Mobile","Verizon",
];

const CAT_COLORS: Record<string, string> = {
  "Gasolina":"#f97316","Seguro":"#3b82f6","Renta":"#8b5cf6","Comida":"#f59e0b",
  "Teléfono":"#06b6d4","Mantenimiento":"#84cc16","Peajes":"#ef4444",
  "Plataformas":"#f6dd8c","Salud":"#4ade80","Otro":"#9ca3af",
};

type Freq = "daily"|"weekly"|"biweekly"|"monthly"|"annual"|"one-time";
const FREQ: { id: Freq; label: string; sub: string; color: string }[] = [
  { id:"daily",    label:"Diario",     sub:"Cada día",      color:"#f97316" },
  { id:"weekly",   label:"Semanal",    sub:"Una vez/sem.",  color:"#eab308" },
  { id:"biweekly", label:"Quincenal",  sub:"Cada 2 sem.",   color:"#84cc16" },
  { id:"monthly",  label:"Mensual",    sub:"Una vez/mes",   color:"#3b82f6" },
  { id:"annual",   label:"Anual",      sub:"Una vez/año",   color:"#8b5cf6" },
  { id:"one-time", label:"Inesperado", sub:"Pago único",    color:"#9ca3af" },
];

const BG    = "#0d0800";
const CARD  = "#160d00";
const BORD  = "#d9b64f55";
const GOLD  = "#f6dd8c";
const GOLD2 = "#d9b64f";
const RED   = "#ef4444";
const MONO  = "JetBrains Mono,monospace";
const SANS  = "Inter,sans-serif";

const goldGrad: React.CSSProperties = {
  background: `linear-gradient(90deg,${GOLD},${GOLD2})`,
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

function toMonthly(amt: number, freq: Freq) {
  if (!amt) return 0;
  switch (freq) {
    case "daily":    return amt * 30;
    case "weekly":   return amt * 4.33;
    case "biweekly": return amt * 2.17;
    case "monthly":  return amt;
    case "annual":   return amt / 12;
    case "one-time": return amt;
  }
}

// ── Generic pill selector with + Añadir nuevo ────────────────────────────────
function PillSelector({
  label, items, selected, onToggle, onAdd, addLabel, accent, multi = false,
}: {
  label: string; items: string[]; selected: string | Set<string>;
  onToggle: (v: string) => void; onAdd: (v: string) => void;
  addLabel: string; accent?: string; multi?: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft]   = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const color    = accent ?? GOLD;

  const isOn = (item: string) =>
    typeof selected === "string" ? selected === item : (selected as Set<string>).has(item);

  const confirmAdd = () => {
    const t = draft.trim();
    if (t) { onAdd(t); onToggle(t); }
    setDraft(""); setAdding(false);
  };

  return (
    <div>
      <p style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 700, color: GOLD2,
        textTransform: "uppercase", letterSpacing: "0.18em" }}>{label}</p>
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
        {items.map(item => {
          const on  = isOn(item);
          const col = CAT_COLORS[item] ?? color;
          return (
            <button key={item} onClick={() => onToggle(item)} style={{
              padding: "8px 13px", borderRadius: 999, fontSize: 13,
              fontWeight: on ? 800 : 400,
              border: on ? `2px solid ${col}` : "2px solid #2a1800",
              background: on ? `${col}22` : "#0d0800",
              color: on ? col : "#555",
              cursor: "pointer", transition: "all 0.15s",
              boxShadow: on ? `0 0 10px ${col}33` : "none",
            }}>{item}</button>
          );
        })}

        {/* + Añadir */}
        {!adding && (
          <button onClick={() => { setAdding(true); setTimeout(() => inputRef.current?.focus(), 50); }}
            style={{
              padding: "8px 13px", borderRadius: 999, fontSize: 13, fontWeight: 600,
              border: "2px dashed #3a2200", background: "transparent", color: GOLD2,
              cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
            }}>
            <span style={{ fontSize: 15, lineHeight: 1 }}>+</span> {addLabel}
          </button>
        )}
      </div>

      {adding && (
        <div style={{
          marginTop: 10, display: "flex", gap: 8, alignItems: "center",
          background: "#0d0800", border: `2px solid ${color}66`,
          borderRadius: 14, padding: "8px 12px",
        }}>
          <input ref={inputRef} type="text" value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key==="Enter") confirmAdd(); if (e.key==="Escape") { setAdding(false); setDraft(""); } }}
            placeholder="Escribe y presiona Enter…"
            style={{
              flex: 1, background: "transparent", border: "none",
              color: "#fff", fontFamily: SANS, fontSize: 14,
              outline: "none", caretColor: color,
            }}
          />
          <button onClick={confirmAdd} style={{
            background: color, border: "none", borderRadius: 8,
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
      background: `linear-gradient(180deg,#1f0008,${BG})`,
      borderBottom: `1px solid ${RED}33`,
      padding: "40px 16px 12px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 42, height: 42, borderRadius: "50%",
          background: "radial-gradient(circle at 40% 35%,#3a0010,#0d0800)",
          border: `2px solid ${RED}88`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18, boxShadow: `0 0 14px ${RED}33`,
        }}>🌉</div>
        <div>
          <p style={{ margin: 0, fontFamily: "Cinzel,serif", fontWeight: 700,
            fontSize: 16, letterSpacing: "0.06em", ...goldGrad as any }}>ISLANDCITY</p>
          <p style={{ margin: 0, fontSize: 9, color: "#a07820",
            letterSpacing: "0.3em", textTransform: "uppercase" }}>PROYECCIÓN DE GASTOS</p>
        </div>
      </div>
      <span style={{
        background: "#1a0000", border: `1px solid ${RED}40`,
        borderRadius: 999, padding: "5px 12px",
        fontSize: 10, color: RED, fontWeight: 700,
        display: "flex", alignItems: "center", gap: 5,
      }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: RED, display: "inline-block" }} />
        GASTOS
      </span>
    </div>
  );
}

function TabNav({ tab, setTab }: { tab: number; setTab: (n: number) => void }) {
  return (
    <div style={{ display: "flex", background: "#0a0600", borderBottom: `1px solid #2a0010` }}>
      {["① Datos del Gasto", "② Frecuencia"].map((label, i) => {
        const on = tab === i;
        return (
          <button key={i} onClick={() => setTab(i)} style={{
            flex: 1, padding: "12px 8px",
            background: "transparent", border: "none",
            borderBottom: on ? `3px solid ${RED}` : "3px solid transparent",
            color: on ? RED : "#555",
            fontFamily: SANS, fontSize: 13, fontWeight: on ? 700 : 400,
            cursor: "pointer", transition: "all 0.15s",
          }}>{label}</button>
        );
      })}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function ExpenseProjection() {
  const [tab, setTab]   = useState(0);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");

  // Extensible lists
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [vendors, setVendors]       = useState<string[]>(DEFAULT_VENDORS);
  const [platforms, setPlatforms]   = useState<string[]>(DEFAULT_PLATFORMS);

  // Selections
  const [category, setCategory]     = useState("");
  const [vendor, setVendor]         = useState("");
  const [selPlatforms, setSelPlatforms] = useState<Set<string>>(new Set(["Uber", "Lyft"]));

  // Frequency tab
  const [freq, setFreq]     = useState<Freq>("monthly");
  const [days, setDays]     = useState<Set<number>>(new Set());
  const [dueDate, setDue]   = useState("");
  const [note, setNote]     = useState("");

  const toggleDay      = (iso: number) => { const n=new Set(days); n.has(iso)?n.delete(iso):n.add(iso); setDays(n); };
  const toggleCategory = (v: string)   => setCategory(prev => prev===v ? "" : v);
  const toggleVendor   = (v: string)   => setVendor(prev => prev===v ? "" : v);
  const togglePlatform = (v: string)   => { const n=new Set(selPlatforms); n.has(v)?n.delete(v):n.add(v); setSelPlatforms(n); };

  const addCategory = (v: string) => { if (!categories.includes(v)) { setCategories(p=>[...p,v]); if (!CAT_COLORS[v]) CAT_COLORS[v] = GOLD; } };
  const addVendor   = (v: string) => { if (!vendors.includes(v))    setVendors(p=>[...p,v]); };
  const addPlatform = (v: string) => { if (!platforms.includes(v))  setPlatforms(p=>[...p,v]); };

  const amt     = parseFloat(amount || "0") || 0;
  const monthly = toMonthly(amt, freq);
  const annual  = monthly * 12;
  const showDays = freq==="weekly" || freq==="biweekly";
  const showDate = freq==="monthly" || freq==="annual" || freq==="one-time";
  const selFreq  = FREQ.find(f=>f.id===freq)!;

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column",
      background: BG, color: "#fff", fontFamily: SANS, overflow: "hidden" }}>
      <Header />
      <TabNav tab={tab} setTab={setTab} />

      {/* TAB 1 — Datos del Gasto */}
      {tab === 0 && (
        <div style={{ flex: 1, padding: "14px 14px", display: "flex",
          flexDirection: "column", gap: 10, overflowY: "auto" }}>

          {/* Name */}
          <div style={{ background: CARD, border:`1px solid ${BORD}`, borderRadius:20, padding:"14px" }}>
            <p style={{ margin:"0 0 6px", fontSize:13, fontWeight:700, color:GOLD2,
              textTransform:"uppercase", letterSpacing:"0.18em" }}>NOMBRE DEL GASTO</p>
            <input type="text" value={name} onChange={e=>setName(e.target.value)}
              placeholder="ej. Gasolina, Renta, Seguro…"
              style={{
                width:"100%", boxSizing:"border-box",
                background:"#0d0800", border:"1.5px solid #3a2200",
                borderRadius:14, padding:"12px 14px",
                color:"#fff", fontFamily:SANS, fontSize:16,
                outline:"none", caretColor:GOLD,
              }}
            />
          </div>

          {/* Amount */}
          <div style={{ background: CARD, border:`1px solid ${BORD}`, borderRadius:20, padding:"14px" }}>
            <p style={{ margin:"0 0 6px", fontSize:13, fontWeight:700, color:GOLD2,
              textTransform:"uppercase", letterSpacing:"0.18em" }}>MONTO</p>
            <div style={{ position:"relative" }}>
              <span style={{
                position:"absolute", left:14, top:"50%", transform:"translateY(-50%)",
                color:GOLD, fontFamily:MONO, fontSize:26, fontWeight:800, pointerEvents:"none",
              }}>$</span>
              <input type="number" inputMode="decimal"
                value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0"
                style={{
                  width:"100%", boxSizing:"border-box",
                  background:"#0d0800", border:"1.5px solid #3a2200",
                  borderRadius:14, padding:"12px 14px 12px 42px",
                  color:"#fff", fontFamily:MONO, fontSize:30, fontWeight:900,
                  outline:"none", caretColor:GOLD,
                }}
              />
            </div>
          </div>

          {/* Category */}
          <div style={{ background: CARD, border:`1px solid ${BORD}`, borderRadius:20, padding:"14px" }}>
            <PillSelector
              label="CATEGORÍA"
              items={categories}
              selected={category}
              onToggle={toggleCategory}
              onAdd={addCategory}
              addLabel="Nueva categoría"
            />
          </div>

          {/* Vendor */}
          <div style={{ background: CARD, border:`1px solid ${BORD}`, borderRadius:20, padding:"14px" }}>
            <PillSelector
              label="VENDEDOR / PROVEEDOR"
              items={vendors}
              selected={vendor}
              onToggle={toggleVendor}
              onAdd={addVendor}
              addLabel="Nuevo vendedor"
              accent="#06b6d4"
            />
          </div>

          {/* Platform */}
          <div style={{ background: CARD, border:`1px solid ${BORD}`, borderRadius:20, padding:"14px" }}>
            <PillSelector
              label="PLATAFORMA(S) RELACIONADA(S)"
              items={platforms}
              selected={selPlatforms}
              onToggle={togglePlatform}
              onAdd={addPlatform}
              addLabel="Nueva plataforma"
              accent={GOLD}
              multi
            />
          </div>

          <button onClick={() => setTab(1)} style={{
            width:"100%", padding:"15px",
            background:`linear-gradient(135deg,${RED},#b91c1c)`,
            border:"none", borderRadius:16, fontSize:15, fontWeight:800,
            color:"#fff", cursor:"pointer",
            boxShadow:`0 4px 20px ${RED}44`,
          }}>Definir Frecuencia →</button>
        </div>
      )}

      {/* TAB 2 — Frecuencia */}
      {tab === 1 && (
        <div style={{ flex: 1, padding:"14px 14px", display:"flex",
          flexDirection:"column", gap:10, overflowY:"auto" }}>

          <div style={{ background: CARD, border:`1px solid ${BORD}`, borderRadius:20, padding:"14px" }}>
            <p style={{ margin:"0 0 10px", fontSize:13, fontWeight:700, color:GOLD2,
              textTransform:"uppercase", letterSpacing:"0.18em" }}>¿CON QUÉ FRECUENCIA?</p>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              {FREQ.map(f => {
                const on = freq===f.id;
                return (
                  <button key={f.id} onClick={()=>{ setFreq(f.id); setDays(new Set()); setDue(""); }} style={{
                    padding:"11px 12px", borderRadius:14, textAlign:"left",
                    border: on?`2px solid ${f.color}`:"2px solid #2a1800",
                    background: on?`${f.color}18`:"#0d0800",
                    cursor:"pointer", transition:"all 0.15s",
                    boxShadow: on?`0 0 14px ${f.color}33`:"none",
                  }}>
                    <p style={{ margin:0, fontSize:15, fontWeight:on?800:500, color:on?f.color:"#777" }}>{f.label}</p>
                    <p style={{ margin:0, fontSize:11, color:on?`${f.color}99`:"#444" }}>{f.sub}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {showDays && (
            <div style={{ background: CARD, border:`1px solid ${BORD}`, borderRadius:20, padding:"12px 14px" }}>
              <p style={{ margin:"0 0 8px", fontSize:13, fontWeight:700, color:GOLD2,
                textTransform:"uppercase", letterSpacing:"0.18em" }}>¿QUÉ DÍA(S)?</p>
              <div style={{ display:"flex", gap:7, flexWrap:"wrap" }}>
                {DAYS.map(d => {
                  const on = days.has(d.iso);
                  return (
                    <button key={d.iso} onClick={()=>toggleDay(d.iso)} style={{
                      padding:"8px 13px", borderRadius:999, fontSize:14,
                      fontWeight:on?800:400,
                      border:on?`2px solid ${GOLD}`:"2px solid #2a1800",
                      background:on?"linear-gradient(135deg,#2a1800,#3d2300)":"#0d0800",
                      color:on?GOLD:"#444", cursor:"pointer", transition:"all 0.15s",
                      boxShadow:on?`0 0 10px ${GOLD2}44`:"none",
                    }}>{d.short}</button>
                  );
                })}
              </div>
            </div>
          )}

          {showDate && (
            <div style={{ background: CARD, border:`1px solid ${BORD}`, borderRadius:20, padding:"12px 14px" }}>
              <p style={{ margin:"0 0 8px", fontSize:13, fontWeight:700, color:GOLD2,
                textTransform:"uppercase", letterSpacing:"0.18em" }}>
                {freq==="monthly"?"¿QUÉ DÍA DEL MES?":freq==="annual"?"¿QUÉ FECHA DEL AÑO?":"¿CUÁNDO ES ESTE PAGO?"}
              </p>
              <input type="date" value={dueDate} onChange={e=>setDue(e.target.value)}
                style={{
                  width:"100%", boxSizing:"border-box",
                  background:"#0d0800", border:"1.5px solid #3a2200",
                  borderRadius:14, padding:"11px 14px",
                  color:"#fff", fontFamily:MONO, fontSize:16,
                  outline:"none", colorScheme:"dark",
                }}
              />
            </div>
          )}

          {amt > 0 && (
            <div style={{
              background:"linear-gradient(135deg,#1a0000,#2a0808)",
              border:`2px solid ${RED}33`, borderRadius:20, padding:"14px",
              boxShadow:`0 0 20px ${RED}18`,
            }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <p style={{ margin:0, fontSize:12, color:"#666" }}>
                    {selFreq.label} de ${amt.toLocaleString()} equivale a:
                  </p>
                  <p style={{ margin:"4px 0 0", fontFamily:MONO, fontSize:34,
                    fontWeight:900, color:RED }}>
                    −${monthly.toLocaleString("en-US",{maximumFractionDigits:0})}
                    <span style={{ fontSize:14, color:"#666" }}>/mes</span>
                  </p>
                </div>
                <div style={{ textAlign:"right" }}>
                  <p style={{ margin:0, fontSize:11, color:"#444" }}>Al año</p>
                  <p style={{ margin:"3px 0 0", fontFamily:MONO, fontSize:18,
                    fontWeight:700, color:"#7f1d1d" }}>
                    −${annual.toLocaleString("en-US",{maximumFractionDigits:0})}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div style={{ background:CARD, border:`1px solid ${BORD}`, borderRadius:18, padding:"12px 14px" }}>
            <p style={{ margin:"0 0 6px", fontSize:13, fontWeight:700, color:GOLD2,
              textTransform:"uppercase", letterSpacing:"0.18em" }}>NOTA (OPCIONAL)</p>
            <textarea value={note} onChange={e=>setNote(e.target.value)}
              placeholder="ej. Pago el día 15 por Zelle…"
              rows={2}
              style={{
                width:"100%", boxSizing:"border-box",
                background:"#0d0800", border:"1.5px solid #3a2200",
                borderRadius:12, padding:"10px 12px",
                color:"#fff", fontFamily:SANS, fontSize:14,
                resize:"none", outline:"none", caretColor:GOLD,
              }}
            />
          </div>

          <button style={{
            width:"100%", padding:"16px", marginTop:"auto",
            background:`linear-gradient(135deg,${RED},#b91c1c)`,
            border:"none", borderRadius:18, fontSize:15, fontWeight:800,
            color:"#fff", cursor:"pointer",
            boxShadow:`0 4px 24px ${RED}55`,
          }}>Guardar Gasto Proyectado</button>
        </div>
      )}
    </div>
  );
}
