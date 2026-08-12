import { useState, useRef, useEffect } from "react";

// ── EXPENSE PROJECTION — VIBRANT REDESIGN ────────────────────────────────────
// Flow: STEP 1 · What is it + How much → STEP 2 · How often? → STEP 3 · When?
//       STEP 4 · Details (category / vendor / platform)
// Full-saturation colors, zero grey, no fading.

type Freq = "daily" | "weekly" | "biweekly" | "monthly" | "annual" | "one-time";

const FREQ_OPTS: { id: Freq; label: string; sub: string; color: string }[] = [
  { id:"daily",    label:"Daily",     sub:"Every day",     color:"#ef4444" },
  { id:"weekly",   label:"Weekly",    sub:"Once / week",   color:"#f97316" },
  { id:"biweekly", label:"Bi-Wkly",  sub:"Every 2 wks",   color:"#eab308" },
  { id:"monthly",  label:"Monthly",  sub:"Once / month",  color:"#3b82f6" },
  { id:"annual",   label:"Yearly",   sub:"Once / year",   color:"#8b5cf6" },
  { id:"one-time", label:"One-Time", sub:"Single pmt",    color:"#9ca3af" },
];

type CatItem    = { name: string; icon: string; color: string };
type VendorItem = { name: string; icon: string; color: string };
type PlatItem   = { name: string; bg: string; fg: string };

const CAT_DEFAULT: CatItem[] = [
  { name:"Gas",         icon:"⛽", color:"#f97316" },
  { name:"Insurance",   icon:"🛡️", color:"#3b82f6" },
  { name:"Rent",        icon:"🏠", color:"#8b5cf6" },
  { name:"Food",        icon:"🍔", color:"#f59e0b" },
  { name:"Phone",       icon:"📱", color:"#06b6d4" },
  { name:"Maintenance", icon:"🔧", color:"#84cc16" },
  { name:"Tolls",       icon:"🛣️", color:"#ef4444" },
  { name:"Platforms",   icon:"📲", color:"#f6dd8c" },
  { name:"Health",      icon:"💊", color:"#4ade80" },
  { name:"Other",       icon:"📦", color:"#94a3b8" },
];

const VENDOR_DEFAULT: VendorItem[] = [
  { name:"BP",          icon:"⛽", color:"#16a34a" },
  { name:"Shell",       icon:"⛽", color:"#ca8a04" },
  { name:"Sunoco",      icon:"⛽", color:"#dc2626" },
  { name:"Costco Gas",  icon:"⛽", color:"#1d4ed8" },
  { name:"Citgo",       icon:"⛽", color:"#ea580c" },
  { name:"Gulf",        icon:"⛽", color:"#65a30d" },
  { name:"Progressive", icon:"🛡️", color:"#1d4ed8" },
  { name:"State Farm",  icon:"🛡️", color:"#dc2626" },
  { name:"Geico",       icon:"🛡️", color:"#16a34a" },
  { name:"Sprint",      icon:"📱", color:"#ca8a04" },
  { name:"T-Mobile",    icon:"📱", color:"#c026d3" },
  { name:"Verizon",     icon:"📱", color:"#dc2626" },
];

const PLAT_DEFAULT: PlatItem[] = [
  { name:"Uber",           bg:"#232323", fg:"#ffffff" },
  { name:"Lyft",           bg:"#ff00bf", fg:"#ffffff" },
  { name:"EcoRide",        bg:"#16a34a", fg:"#ffffff" },
  { name:"Empower",        bg:"#2563eb", fg:"#ffffff" },
  { name:"Gallant",        bg:"#ea6600", fg:"#ffffff" },
  { name:"Aventus Ride",   bg:"#7c3aed", fg:"#ffffff" },
  { name:"Classic Ryde",   bg:"#0d9488", fg:"#ffffff" },
  { name:"Aki Technology", bg:"#0284c7", fg:"#ffffff" },
  { name:"Street Hail",    bg:"#475569", fg:"#ffffff" },
  { name:"IC Transit",     bg:"#b45309", fg:"#fef08a" },
  { name:"Transit Tax",    bg:"#1e293b", fg:"#94a3b8" },
  { name:"EcoRide 10%",    bg:"#166534", fg:"#bbf7d0" },
  { name:"Other",          bg:"#334155", fg:"#cbd5e1" },
];

// Palette
const GOLD    = "#f6dd8c";
const GOLDB   = "#d97706";
const GREEN   = "#4ade80";
const RED     = "#ef4444";
const ORANGE  = "#f97316";
const BLUE    = "#3b82f6";
const BG      = "#0b0007";
const MONO    = "JetBrains Mono,monospace";
const SANS    = "Inter,sans-serif";
const CINZEL  = "Cinzel,serif";

const STEPS = [
  { num:"1", color: RED,    label:"WHAT & HOW MUCH"   },
  { num:"2", color: ORANGE, label:"HOW OFTEN?"        },
  { num:"3", color: BLUE,   label:"WHEN EXACTLY?"     },
  { num:"4", color: GREEN,  label:"DETAILS"           },
];

function StepHeader({ step }: { step: typeof STEPS[0] }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
      <span style={{
        width:28, height:28, borderRadius:"50%",
        background:step.color, color:"#0b0700",
        fontFamily:MONO, fontSize:14, fontWeight:900,
        display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
      }}>{step.num}</span>
      <span style={{ fontFamily:SANS, fontSize:13, fontWeight:800,
        color:step.color, letterSpacing:"0.12em" }}>{step.label}</span>
    </div>
  );
}

function initials(name: string) {
  const w = name.split(" ");
  return w.length === 1 ? name.slice(0,2).toUpperCase() : w.map(x=>x[0]).join("").slice(0,3).toUpperCase();
}

function toMonthly(amt: number, freq: Freq) {
  switch(freq) {
    case"daily":    return amt*30;
    case"weekly":   return amt*4.33;
    case"biweekly": return amt*2.17;
    case"monthly":  return amt;
    case"annual":   return amt/12;
    case"one-time": return amt;
  }
}

// ── Generic logo dropdown ─────────────────────────────────────────────────────
type AnyItem = { name: string; icon?: string; bg?: string; fg?: string; color?: string };

function LogoDropdown({
  label, placeholder, items, value, onChange, onAdd, addLabel, accent,
}: {
  label: string; placeholder: string;
  items: AnyItem[]; value: string;
  onChange: (v: string) => void; onAdd: (name: string) => void;
  addLabel: string; accent: string;
}) {
  const [open, setOpen]     = useState(false);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft]   = useState("");
  const ref      = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sel      = items.find(i => i.name === value);
  const selBg    = sel?.bg ?? sel?.color ?? "#374151";
  const selFg    = sel?.fg ?? "#fff";

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false); setAdding(false); setDraft("");
      }
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const confirm = () => {
    const t = draft.trim();
    if (t) { onAdd(t); onChange(t); }
    setDraft(""); setAdding(false); setOpen(false);
  };

  return (
    <div ref={ref} style={{ position:"relative" }}>
      <label style={{ display:"block", fontSize:11, fontWeight:800,
        color:accent, letterSpacing:"0.18em", textTransform:"uppercase", marginBottom:8 }}>
        {label}
      </label>
      <button onClick={() => { setOpen(o => !o); setAdding(false); }} style={{
        width:"100%",
        background: open ? "#140b00" : "#0e0800",
        border: `2px solid ${open ? accent : accent+"55"}`,
        borderRadius:14, padding:"12px 14px", cursor:"pointer",
        display:"flex", alignItems:"center", gap:10,
        transition:"all 0.15s",
        boxShadow: open ? `0 0 20px ${accent}33` : "none",
      }}>
        {sel ? (
          <>
            <span style={{
              width:32, height:32, borderRadius:"50%", flexShrink:0,
              background:selBg, color:selFg,
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize: sel.icon ? 17 : 9, fontWeight:900,
            }}>{sel.icon ?? initials(sel.name)}</span>
            <span style={{ flex:1, textAlign:"left", color:"#fff",
              fontFamily:SANS, fontSize:16, fontWeight:700 }}>{sel.name}</span>
          </>
        ) : (
          <span style={{ flex:1, textAlign:"left", color:`${accent}55`,
            fontFamily:SANS, fontSize:15 }}>{placeholder}</span>
        )}
        <span style={{ color:accent, fontSize:12, display:"inline-block",
          transition:"transform 0.15s", transform:open?"rotate(180deg)":"none" }}>▼</span>
      </button>

      {open && (
        <div style={{
          position:"absolute", top:"calc(100% + 6px)", left:0, right:0, zIndex:100,
          background:"#100800", border:`2px solid ${accent}88`,
          borderRadius:14, boxShadow:`0 16px 40px #000000cc`,
          maxHeight:260, overflowY:"auto",
        }}>
          {items.map(item => {
            const on = value === item.name;
            const iBg = item.bg ?? item.color ?? "#374151";
            const iFg = item.fg ?? "#fff";
            return (
              <button key={item.name} onClick={() => { onChange(item.name); setOpen(false); }} style={{
                width:"100%", background:on?`${accent}18`:"transparent",
                border:"none", borderBottom:"1px solid #1e1200",
                padding:"10px 14px", cursor:"pointer",
                display:"flex", alignItems:"center", gap:12,
              }}>
                <span style={{
                  width:32, height:32, borderRadius:"50%", flexShrink:0,
                  background:iBg, color:iFg,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:item.icon?17:9, fontWeight:900,
                }}>{item.icon ?? initials(item.name)}</span>
                <span style={{
                  flex:1, textAlign:"left", fontFamily:SANS, fontSize:14,
                  fontWeight:on?800:400, color:on?accent:"#c0a060",
                }}>{item.name}</span>
                {on && <span style={{ color:GREEN, fontSize:18 }}>✓</span>}
              </button>
            );
          })}
          {!adding ? (
            <button onClick={() => { setAdding(true); setTimeout(() => inputRef.current?.focus(),50); }}
              style={{
                width:"100%", background:"transparent", border:"none",
                borderTop:`2px dashed ${accent}44`, padding:"11px 14px",
                cursor:"pointer", display:"flex", alignItems:"center", gap:8,
                color:accent, fontFamily:SANS, fontSize:14, fontWeight:700,
              }}>
              <span style={{ fontSize:20, lineHeight:1 }}>+</span> {addLabel}
            </button>
          ) : (
            <div style={{ padding:"10px 12px", borderTop:`2px dashed ${accent}44`,
              display:"flex", gap:8, alignItems:"center" }}>
              <input ref={inputRef} type="text" value={draft}
                onChange={e=>setDraft(e.target.value)}
                onKeyDown={e=>{ if(e.key==="Enter") confirm(); if(e.key==="Escape"){setAdding(false);setDraft("");} }}
                placeholder="Name and press Enter…"
                style={{
                  flex:1, background:"#0b0700", border:`2px solid ${accent}`,
                  borderRadius:8, padding:"7px 10px", color:"#fff",
                  fontFamily:SANS, fontSize:13, outline:"none",
                }}
              />
              <button onClick={confirm} style={{
                background:accent, border:"none", borderRadius:8,
                padding:"7px 14px", color:"#0b0700",
                fontWeight:900, fontSize:13, cursor:"pointer",
              }}>Add</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function ExpenseProjection() {
  const [name, setName]     = useState("");
  const [amount, setAmount] = useState("");
  const [freq, setFreq]     = useState<Freq>("monthly");
  const [dueDate, setDue]   = useState("");
  const [category, setCat]  = useState("");
  const [vendor, setVendor] = useState("");
  const [platform, setPlat] = useState("");
  const [note, setNote]     = useState("");

  const [categories, setCats]   = useState([...CAT_DEFAULT]);
  const [vendors, setVendors]   = useState([...VENDOR_DEFAULT]);
  const [platforms, setPlats]   = useState([...PLAT_DEFAULT]);

  const addCat  = (n: string) => { if (!categories.find(c=>c.name===n)) setCats(p=>[...p,{name:n,icon:"📦",color:"#94a3b8"}]); };
  const addVend = (n: string) => { if (!vendors.find(v=>v.name===n))    setVendors(p=>[...p,{name:n,icon:"🏪",color:"#475569"}]); };
  const addPlat = (n: string) => { if (!platforms.find(p=>p.name===n))  setPlats(p=>[...p,{name:n,bg:"#334155",fg:"#fff"}]); };

  const amt     = parseFloat(amount || "0") || 0;
  const monthly = toMonthly(amt, freq);
  const selFreq = FREQ_OPTS.find(f => f.id === freq)!;
  const needDate = freq==="monthly"||freq==="annual"||freq==="one-time";

  return (
    <div style={{ minHeight:"100vh", background:BG, fontFamily:SANS, color:"#fff", overflowY:"auto" }}>

      {/* ── Header ── */}
      <div style={{
        background:`linear-gradient(160deg,#1a0010,${BG})`,
        borderBottom:`3px solid ${RED}`,
        padding:"44px 18px 16px",
        display:"flex", alignItems:"center", gap:12,
      }}>
        <div style={{
          width:46, height:46, borderRadius:"50%",
          background:"#1a0010",
          border:`2.5px solid ${RED}`,
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:22, boxShadow:`0 0 20px ${RED}55`,
        }}>🌉</div>
        <div>
          <p style={{ margin:0, fontFamily:CINZEL, fontWeight:700,
            fontSize:18, letterSpacing:"0.06em", color:GOLD }}>ISLANDCITY</p>
          <p style={{ margin:0, fontSize:10, color:RED,
            letterSpacing:"0.28em", textTransform:"uppercase", fontWeight:700 }}>
            Add Regular Expense
          </p>
        </div>
        {amt > 0 && (
          <div style={{ marginLeft:"auto", textAlign:"right" }}>
            <p style={{ margin:0, fontSize:10, color:"#5a2020", fontWeight:600 }}>PER MONTH</p>
            <p style={{ margin:0, fontFamily:MONO, fontSize:20, fontWeight:900, color:RED }}>
              −${monthly.toLocaleString("en-US",{maximumFractionDigits:0})}
            </p>
          </div>
        )}
      </div>

      <div style={{ padding:"20px 16px", display:"flex", flexDirection:"column", gap:14 }}>

        {/* ── STEP 1: What + How Much ── */}
        <div style={{
          background:"#1a0006",
          border:`2px solid ${RED}`,
          borderRadius:20, padding:"16px",
          boxShadow:`0 0 28px ${RED}22`,
        }}>
          <StepHeader step={STEPS[0]} />

          {/* Expense name */}
          <input type="text" value={name} onChange={e=>setName(e.target.value)}
            placeholder="e.g. Gas, Insurance, Car payment…"
            style={{
              width:"100%", boxSizing:"border-box",
              background:"#0e0005",
              border:`2px solid ${name ? RED+"88" : "#3a0015"}`,
              borderRadius:12, padding:"12px 14px",
              color:"#fff", fontFamily:SANS, fontSize:16, fontWeight:600,
              outline:"none", caretColor:RED, marginBottom:10,
              transition:"border-color 0.2s",
            }}
          />

          {/* Amount */}
          <div style={{ position:"relative" }}>
            <span style={{
              position:"absolute", left:14, top:"50%", transform:"translateY(-50%)",
              fontFamily:MONO, fontSize:28, fontWeight:900,
              color: amt>0 ? GOLD : "#3a2800", pointerEvents:"none",
            }}>$</span>
            <input type="number" inputMode="decimal"
              value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0"
              style={{
                width:"100%", boxSizing:"border-box",
                background:"#0e0005",
                border:`2px solid ${amt>0 ? GOLD : "#3a0015"}`,
                borderRadius:12, padding:"12px 14px 12px 44px",
                color: amt>0 ? GOLD : "#4a3010",
                fontFamily:MONO, fontSize:36, fontWeight:900,
                outline:"none", caretColor:GOLD,
                transition:"all 0.2s",
                boxShadow: amt>0 ? `0 0 16px ${GOLD}22` : "none",
              }}
            />
          </div>
        </div>

        {/* ── STEP 2: Frequency ── */}
        <div style={{
          background:"#0e0c00",
          border:`2px solid ${ORANGE}`,
          borderRadius:20, padding:"16px",
          boxShadow:`0 0 28px ${ORANGE}22`,
        }}>
          <StepHeader step={STEPS[1]} />

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
            {FREQ_OPTS.map(f => {
              const on = freq===f.id;
              return (
                <button key={f.id} onClick={()=>setFreq(f.id)} style={{
                  padding:"12px 6px", borderRadius:14, textAlign:"center",
                  border:`2px solid ${on ? f.color : f.color+"33"}`,
                  background: on ? `${f.color}28` : "#0b0800",
                  cursor:"pointer", transition:"all 0.15s",
                  boxShadow: on ? `0 0 18px ${f.color}44` : "none",
                }}>
                  <p style={{ margin:0, fontSize:13, fontWeight:on?900:500,
                    color:on?f.color:`${f.color}66` }}>{f.label}</p>
                  <p style={{ margin:"2px 0 0", fontSize:9,
                    color:on?`${f.color}cc`:`${f.color}33` }}>{f.sub}</p>
                </button>
              );
            })}
          </div>

          {/* Monthly cost preview strip */}
          {amt > 0 && (
            <div style={{
              marginTop:12, padding:"10px 14px",
              background:"#0b0a00",
              border:`1.5px solid ${selFreq.color}66`,
              borderRadius:12,
              display:"flex", justifyContent:"space-between", alignItems:"center",
            }}>
              <span style={{ fontFamily:SANS, fontSize:12, color:`${selFreq.color}99` }}>
                {selFreq.label} ${amt.toLocaleString()} =
              </span>
              <span style={{ fontFamily:MONO, fontSize:20, fontWeight:900, color:RED }}>
                −${monthly.toLocaleString("en-US",{maximumFractionDigits:0})}<span style={{ fontSize:12, color:"#5a2020" }}>/mo</span>
              </span>
            </div>
          )}
        </div>

        {/* ── STEP 3: When — conditional ── */}
        {needDate && (
          <div style={{
            background:"#00091a",
            border:`2px solid ${BLUE}`,
            borderRadius:20, padding:"16px",
            boxShadow:`0 0 28px ${BLUE}22`,
          }}>
            <StepHeader step={STEPS[2]} />
            <p style={{ margin:"0 0 10px", fontSize:13, color:`${BLUE}88`, fontWeight:500 }}>
              {freq==="monthly" ? "Which day of the month is this due?"
               : freq==="annual"  ? "What date each year?"
               : "When is this one-time payment?"}
            </p>
            <input type="date" value={dueDate} onChange={e=>setDue(e.target.value)}
              style={{
                width:"100%", boxSizing:"border-box",
                background:"#000d1a",
                border:`2px solid ${dueDate ? BLUE : BLUE+"44"}`,
                borderRadius:12, padding:"13px 14px",
                color: dueDate ? "#fff" : `${BLUE}55`,
                fontFamily:MONO, fontSize:16,
                outline:"none", colorScheme:"dark",
                boxShadow: dueDate ? `0 0 16px ${BLUE}22` : "none",
                transition:"all 0.2s",
              }}
            />
          </div>
        )}

        {/* ── STEP 4: Details (Category / Vendor / Platform) ── */}
        <div style={{
          background:"#001409",
          border:`2px solid ${GREEN}`,
          borderRadius:20, padding:"16px",
          boxShadow:`0 0 28px ${GREEN}22`,
          display:"flex", flexDirection:"column", gap:14,
        }}>
          <StepHeader step={STEPS[3]} />

          <LogoDropdown
            label="Category" placeholder="Pick a category…"
            items={categories} value={category} onChange={setCat} onAdd={addCat}
            addLabel="New category…" accent={category ? (categories.find(c=>c.name===category)?.color ?? GREEN) : GREEN}
          />
          <div style={{ height:1, background:"#003010" }} />
          <LogoDropdown
            label="Vendor / Provider" placeholder="Pick a vendor…"
            items={vendors} value={vendor} onChange={setVendor} onAdd={addVend}
            addLabel="New vendor…" accent="#06b6d4"
          />
          <div style={{ height:1, background:"#003010" }} />
          <LogoDropdown
            label="Related Platform" placeholder="Pick a platform…"
            items={platforms} value={platform} onChange={setPlat} onAdd={addPlat}
            addLabel="New platform…" accent={GOLD}
          />
        </div>

        {/* Note */}
        <div style={{
          background:"#0d0d00",
          border:`2px solid ${GOLDB}66`,
          borderRadius:18, padding:"14px 16px",
        }}>
          <label style={{ display:"block", fontSize:11, fontWeight:800,
            color:GOLDB, letterSpacing:"0.18em", textTransform:"uppercase", marginBottom:8 }}>
            NOTE (optional)
          </label>
          <textarea value={note} onChange={e=>setNote(e.target.value)}
            placeholder="e.g. Pay by Zelle on the 15th…"
            rows={2}
            style={{
              width:"100%", boxSizing:"border-box",
              background:"#080700", border:`1.5px solid ${GOLDB}44`,
              borderRadius:10, padding:"10px 12px",
              color:"#fff", fontFamily:SANS, fontSize:14,
              resize:"none", outline:"none", caretColor:GOLD,
            }}
          />
        </div>

        {/* ── Save ── */}
        <button style={{
          width:"100%", padding:"17px",
          background:RED,
          border:"none", borderRadius:18,
          fontSize:16, fontWeight:900,
          color:"#fff", cursor:"pointer",
          fontFamily:SANS, letterSpacing:"0.04em",
          boxShadow:`0 4px 28px ${RED}55`,
          marginBottom:8,
        }}>
          Save Regular Expense
        </button>
      </div>
    </div>
  );
}
