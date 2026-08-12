import { useState, useRef, useEffect } from "react";

// ── EXPENSE PROJECTION — single red accent, #0e0e0e bg ───────────────────────
// Field order: Name → Amount → Category → Frequency → Due Date → Details → Note
// Matches FinancesBold visual family. Pills fully visible when inactive.

type Freq = "daily" | "weekly" | "biweekly" | "monthly" | "annual" | "one-time";

const FREQ_OPTS: { id: Freq; label: string; sub: string }[] = [
  { id: "daily",    label: "Daily",    sub: "Every day"   },
  { id: "weekly",   label: "Weekly",   sub: "Once/week"   },
  { id: "biweekly", label: "Bi-Wkly", sub: "Every 2 wks" },
  { id: "monthly",  label: "Monthly",  sub: "Once/month"  },
  { id: "annual",   label: "Yearly",   sub: "Once/year"   },
  { id: "one-time", label: "One-Time", sub: "Single pmt"  },
];

type CatItem  = { name: string; icon: string };
type VendItem = { name: string; icon: string };
type PlatItem = { name: string; bg: string; fg: string };

const CAT_DEFAULT: CatItem[] = [
  { name: "Gas",         icon: "⛽" },
  { name: "Insurance",   icon: "🛡️" },
  { name: "Rent",        icon: "🏠" },
  { name: "Food",        icon: "🍔" },
  { name: "Phone",       icon: "📱" },
  { name: "Maintenance", icon: "🔧" },
  { name: "Tolls",       icon: "🛣️" },
  { name: "Platforms",   icon: "📲" },
  { name: "Health",      icon: "💊" },
  { name: "Other",       icon: "📦" },
];

const VEND_DEFAULT: VendItem[] = [
  { name: "BP",          icon: "⛽" }, { name: "Shell",       icon: "⛽" },
  { name: "Sunoco",      icon: "⛽" }, { name: "Costco Gas",  icon: "⛽" },
  { name: "Citgo",       icon: "⛽" }, { name: "Gulf",        icon: "⛽" },
  { name: "Progressive", icon: "🛡️" }, { name: "State Farm",  icon: "🛡️" },
  { name: "Geico",       icon: "🛡️" }, { name: "Sprint",      icon: "📱" },
  { name: "T-Mobile",    icon: "📱" }, { name: "Verizon",     icon: "📱" },
];

const PLAT_DEFAULT: PlatItem[] = [
  { name: "Uber",           bg: "#232323", fg: "#ffffff" },
  { name: "Lyft",           bg: "#ff00bf", fg: "#ffffff" },
  { name: "EcoRide",        bg: "#16a34a", fg: "#ffffff" },
  { name: "Empower",        bg: "#2563eb", fg: "#ffffff" },
  { name: "Gallant",        bg: "#ea6600", fg: "#ffffff" },
  { name: "Aventus Ride",   bg: "#7c3aed", fg: "#ffffff" },
  { name: "Classic Ryde",   bg: "#0d9488", fg: "#ffffff" },
  { name: "Aki Technology", bg: "#0284c7", fg: "#ffffff" },
  { name: "Street Hail",    bg: "#475569", fg: "#ffffff" },
  { name: "IC Transit",     bg: "#b45309", fg: "#fef08a" },
  { name: "Transit Tax",    bg: "#1e293b", fg: "#94a3b8" },
  { name: "EcoRide 10%",    bg: "#166534", fg: "#bbf7d0" },
  { name: "Other",          bg: "#334155", fg: "#cbd5e1" },
];

// ── Single-accent palette matching FinancesBold ───────────────────────────────
const RED    = "#ef4444";   // primary accent — expense/cost
const REDD   = "#b91c1c";   // darker red
const GOLD   = "#f6dd8c";   // secondary: numbers ($ amounts look gold)
const GOLDD  = "#d97706";
const BG     = "#0e0e0e";
const CARD   = "#1a1a1a";
const MONO   = "JetBrains Mono,monospace";
const SANS   = "Inter,sans-serif";
const CINZEL = "Cinzel,serif";

function StepBadge({ n, label }: { n: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
      <span style={{
        width: 26, height: 26, borderRadius: "50%",
        background: RED, color: "#fff",
        fontFamily: MONO, fontSize: 13, fontWeight: 900,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>{n}</span>
      <span style={{ fontFamily: SANS, fontSize: 12, fontWeight: 800,
        color: RED, letterSpacing: "0.14em", textTransform: "uppercase" }}>{label}</span>
    </div>
  );
}

function initials(name: string) {
  const w = name.split(" ");
  return w.length === 1 ? name.slice(0, 2).toUpperCase()
    : w.map(x => x[0]).join("").slice(0, 3).toUpperCase();
}

function toMonthly(amt: number, freq: Freq) {
  switch (freq) {
    case "daily":    return amt * 30;
    case "weekly":   return amt * 4.33;
    case "biweekly": return amt * 2.17;
    case "monthly":  return amt;
    case "annual":   return amt / 12;
    case "one-time": return amt;
  }
}

// ── Generic logo dropdown ─────────────────────────────────────────────────────
type AnyItem = { name: string; icon?: string; bg?: string; fg?: string };

function LogoDropdown({
  label, placeholder, items, value, onChange, onAdd, addLabel,
}: {
  label: string; placeholder: string;
  items: AnyItem[]; value: string;
  onChange: (v: string) => void; onAdd: (name: string) => void;
  addLabel: string;
}) {
  const [open, setOpen]     = useState(false);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft]   = useState("");
  const ref      = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sel      = items.find(i => i.name === value);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        { setOpen(false); setAdding(false); setDraft(""); }
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
    <div ref={ref} style={{ position: "relative" }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 800,
        color: "#888", letterSpacing: "0.18em", textTransform: "uppercase",
        marginBottom: 8 }}>{label}</label>

      <button onClick={() => { setOpen(o => !o); setAdding(false); }} style={{
        width: "100%", background: "#111",
        border: `2px solid ${open ? RED : "#333"}`,
        borderRadius: 12, padding: "11px 14px", cursor: "pointer",
        display: "flex", alignItems: "center", gap: 10,
        transition: "border-color 0.15s",
        boxShadow: open ? `0 0 18px ${RED}22` : "none",
      }}>
        {sel ? (
          <>
            <span style={{
              width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
              background: sel.bg ?? "#333", color: sel.fg ?? "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: sel.icon ? 16 : 9, fontWeight: 900,
            }}>{sel.icon ?? initials(sel.name)}</span>
            <span style={{ flex: 1, textAlign: "left", color: "#fff",
              fontFamily: SANS, fontSize: 15, fontWeight: 700 }}>{sel.name}</span>
          </>
        ) : (
          <span style={{ flex: 1, textAlign: "left", color: "#555",
            fontFamily: SANS, fontSize: 15 }}>{placeholder}</span>
        )}
        <span style={{ color: "#555", fontSize: 11, display: "inline-block",
          transition: "transform 0.15s", transform: open ? "rotate(180deg)" : "none" }}>▼</span>
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 100,
          background: "#161616", border: `2px solid #333`,
          borderRadius: 12, boxShadow: "0 16px 40px #000000cc",
          maxHeight: 260, overflowY: "auto",
        }}>
          {items.map(item => {
            const on = value === item.name;
            return (
              <button key={item.name} onClick={() => { onChange(item.name); setOpen(false); }} style={{
                width: "100%", background: on ? "#2a1010" : "transparent",
                border: "none", borderBottom: "1px solid #222",
                padding: "10px 14px", cursor: "pointer",
                display: "flex", alignItems: "center", gap: 12,
              }}>
                <span style={{
                  width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
                  background: item.bg ?? "#333", color: item.fg ?? "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: item.icon ? 16 : 9, fontWeight: 900,
                }}>{item.icon ?? initials(item.name)}</span>
                <span style={{
                  flex: 1, textAlign: "left", fontFamily: SANS, fontSize: 14,
                  fontWeight: on ? 700 : 400, color: on ? RED : "#bbb",
                }}>{item.name}</span>
                {on && <span style={{ color: RED, fontSize: 16 }}>✓</span>}
              </button>
            );
          })}
          {!adding ? (
            <button onClick={() => { setAdding(true); setTimeout(() => inputRef.current?.focus(), 50); }}
              style={{
                width: "100%", background: "transparent", border: "none",
                borderTop: "1px dashed #333", padding: "11px 14px",
                cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
                color: RED, fontFamily: SANS, fontSize: 14, fontWeight: 700,
              }}>
              <span style={{ fontSize: 18 }}>+</span> {addLabel}
            </button>
          ) : (
            <div style={{ padding: "10px 12px", borderTop: "1px dashed #333",
              display: "flex", gap: 8, alignItems: "center" }}>
              <input ref={inputRef} type="text" value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => { if (e.key==="Enter") confirm(); if (e.key==="Escape") { setAdding(false); setDraft(""); } }}
                placeholder="Name and press Enter…"
                style={{
                  flex: 1, background: BG, border: `2px solid ${RED}`,
                  borderRadius: 8, padding: "7px 10px", color: "#fff",
                  fontFamily: SANS, fontSize: 13, outline: "none",
                }}
              />
              <button onClick={confirm} style={{
                background: RED, border: "none", borderRadius: 8,
                padding: "7px 14px", color: "#fff",
                fontWeight: 900, fontSize: 13, cursor: "pointer",
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
  const [category, setCat]  = useState("");
  const [freq, setFreq]     = useState<Freq>("monthly");
  const [dueDate, setDue]   = useState("");
  const [vendor, setVendor] = useState("");
  const [platform, setPlat] = useState("");
  const [note, setNote]     = useState("");

  const [cats,  setCats]  = useState([...CAT_DEFAULT]);
  const [vends, setVends] = useState([...VEND_DEFAULT]);
  const [plats, setPlats] = useState([...PLAT_DEFAULT]);

  const addCat  = (n: string) => { if (!cats.find(c=>c.name===n))  setCats(p=>[...p,{name:n,icon:"📦"}]); };
  const addVend = (n: string) => { if (!vends.find(v=>v.name===n)) setVends(p=>[...p,{name:n,icon:"🏪"}]); };
  const addPlat = (n: string) => { if (!plats.find(p=>p.name===n)) setPlats(p=>[...p,{name:n,bg:"#334155",fg:"#fff"}]); };

  const amt     = parseFloat(amount || "0") || 0;
  const monthly = toMonthly(amt, freq);
  const needDate = freq==="monthly" || freq==="annual" || freq==="one-time";

  return (
    <div style={{ minHeight: "100vh", background: BG,
      fontFamily: SANS, color: "#fff", overflowY: "auto" }}>

      {/* Header — mirrors FinancesBold style */}
      <div style={{
        background: "#111",
        borderBottom: `1px solid #2a2a2a`,
        padding: "44px 18px 16px",
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: "50%",
          background: "#1a0000",
          border: `2px solid ${RED}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 20, boxShadow: `0 0 16px ${RED}33`,
        }}>🌉</div>
        <div>
          <p style={{ margin: 0, fontFamily: CINZEL, fontWeight: 700,
            fontSize: 17, letterSpacing: "0.06em", color: GOLD }}>ISLANDCITY</p>
          <p style={{ margin: 0, fontSize: 9, color: RED,
            letterSpacing: "0.28em", textTransform: "uppercase", fontWeight: 700 }}>
            Add Regular Expense
          </p>
        </div>
        {amt > 0 && (
          <div style={{ marginLeft: "auto", textAlign: "right" }}>
            <p style={{ margin: 0, fontSize: 10, color: "#444",
              fontWeight: 600, letterSpacing: "0.1em" }}>PER MONTH</p>
            <p style={{ margin: 0, fontFamily: MONO, fontSize: 22,
              fontWeight: 900, color: RED }}>
              −${monthly.toLocaleString("en-US", { maximumFractionDigits: 0 })}
            </p>
          </div>
        )}
      </div>

      <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: 12 }}>

        {/* ── STEP 1: What & How Much ── */}
        <div style={{
          background: CARD, border: "1px solid #2a1010",
          borderRadius: 18, padding: "16px",
          boxShadow: `0 0 0 1px ${RED}14`,
        }}>
          <StepBadge n="1" label="What & How Much" />

          {/* Name */}
          <input type="text" value={name} onChange={e => setName(e.target.value)}
            placeholder="e.g. Gas, Insurance, Car Wash…"
            style={{
              width: "100%", boxSizing: "border-box",
              background: "#111",
              border: `2px solid ${name ? RED+"88" : "#333"}`,
              borderRadius: 10, padding: "11px 14px",
              color: "#fff", fontFamily: SANS, fontSize: 16, fontWeight: 600,
              outline: "none", caretColor: RED, marginBottom: 10,
              transition: "border-color 0.2s",
            }}
          />

          {/* Amount */}
          <div style={{ position: "relative" }}>
            <span style={{
              position: "absolute", left: 14, top: "50%",
              transform: "translateY(-50%)",
              fontFamily: MONO, fontSize: 28, fontWeight: 900,
              color: amt > 0 ? GOLD : "#333", pointerEvents: "none",
            }}>$</span>
            <input type="number" inputMode="decimal"
              value={amount} onChange={e => setAmount(e.target.value)} placeholder="0"
              style={{
                width: "100%", boxSizing: "border-box",
                background: "#111",
                border: `2px solid ${amt > 0 ? GOLDD : "#333"}`,
                borderRadius: 10, padding: "11px 14px 11px 44px",
                color: amt > 0 ? GOLD : "#444",
                fontFamily: MONO, fontSize: 34, fontWeight: 900,
                outline: "none", caretColor: GOLD,
                transition: "all 0.2s",
                boxShadow: amt > 0 ? `0 0 12px ${GOLD}18` : "none",
              }}
            />
          </div>
        </div>

        {/* ── STEP 2: Category — immediately after amount ── */}
        <div style={{
          background: CARD, border: "1px solid #2a1010",
          borderRadius: 18, padding: "16px",
          boxShadow: `0 0 0 1px ${RED}14`,
        }}>
          <StepBadge n="2" label="Category" />

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {cats.map(c => {
              const on = category === c.name;
              return (
                <button key={c.name} onClick={() => setCat(prev => prev===c.name ? "" : c.name)}
                  style={{
                    padding: "9px 14px", borderRadius: 999,
                    border: `2px solid ${on ? RED : "#444"}`,
                    background: on ? "#2a0808" : "#111",
                    color: on ? RED : "#aaa",             // inactive = #aaa, clearly readable
                    fontFamily: SANS, fontSize: 14, fontWeight: on ? 800 : 500,
                    cursor: "pointer", transition: "all 0.15s",
                    boxShadow: on ? `0 0 12px ${RED}33` : "none",
                    display: "flex", alignItems: "center", gap: 6,
                  }}>
                  <span style={{ fontSize: 16 }}>{c.icon}</span>
                  {c.name}
                </button>
              );
            })}

            {/* + New category */}
            <AddPill label="New category" onAdd={n => { addCat(n); setCat(n); }} accent={RED} />
          </div>
        </div>

        {/* ── STEP 3: Frequency ── */}
        <div style={{
          background: CARD, border: "1px solid #2a1010",
          borderRadius: 18, padding: "16px",
          boxShadow: `0 0 0 1px ${RED}14`,
        }}>
          <StepBadge n="3" label="How Often?" />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            {FREQ_OPTS.map(f => {
              const on = freq === f.id;
              return (
                <button key={f.id} onClick={() => setFreq(f.id)} style={{
                  padding: "12px 6px", borderRadius: 12, textAlign: "center",
                  // ── FIX: inactive pills are fully visible ──────────────────
                  border: `2px solid ${on ? RED : "#555"}`,    // #555 = legible border
                  background: on ? "#2a0808" : "#111",
                  cursor: "pointer", transition: "all 0.15s",
                  boxShadow: on ? `0 0 16px ${RED}44` : "none",
                }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: on ? 900 : 600,
                    color: on ? RED : "#aaa" }}>              {/* #aaa = clearly legible */}
                    {f.label}
                  </p>
                  <p style={{ margin: "2px 0 0", fontSize: 9,
                    color: on ? `${RED}bb` : "#555" }}>
                    {f.sub}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Monthly cost preview — appears right inside frequency card */}
          {amt > 0 && (
            <div style={{
              marginTop: 12, padding: "10px 14px",
              background: "#111", border: `1px solid #2a1010`,
              borderRadius: 10,
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <span style={{ fontFamily: SANS, fontSize: 12, color: "#666" }}>
                {FREQ_OPTS.find(f=>f.id===freq)?.label} ${amt.toLocaleString()} =
              </span>
              <span style={{ fontFamily: MONO, fontSize: 20, fontWeight: 900, color: RED }}>
                −${monthly.toLocaleString("en-US",{maximumFractionDigits:0})}
                <span style={{ fontSize: 12, color: "#444" }}>/mo</span>
              </span>
            </div>
          )}
        </div>

        {/* ── STEP 4: When (conditional) ── */}
        {needDate && (
          <div style={{
            background: CARD, border: "1px solid #2a1010",
            borderRadius: 18, padding: "16px",
            boxShadow: `0 0 0 1px ${RED}14`,
          }}>
            <StepBadge n="4" label={
              freq === "monthly" ? "Due Day of Month"
              : freq === "annual"  ? "Annual Due Date"
              : "Payment Date"
            } />
            <input type="date" value={dueDate} onChange={e => setDue(e.target.value)}
              style={{
                width: "100%", boxSizing: "border-box",
                background: "#111",
                border: `2px solid ${dueDate ? RED+"88" : "#333"}`,
                borderRadius: 10, padding: "12px 14px",
                color: dueDate ? "#fff" : "#555",
                fontFamily: MONO, fontSize: 16,
                outline: "none", colorScheme: "dark",
                transition: "border-color 0.2s",
              }}
            />
          </div>
        )}

        {/* ── Optional details: Vendor + Platform (collapsible feel, no step badge) ── */}
        <div style={{
          background: CARD, border: "1px solid #2a2a2a",
          borderRadius: 18, padding: "16px",
          display: "flex", flexDirection: "column", gap: 14,
        }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: "#555",
            letterSpacing: "0.18em", textTransform: "uppercase" }}>
            Optional Details
          </p>
          <LogoDropdown
            label="Vendor / Provider" placeholder="Select a vendor…"
            items={vends} value={vendor} onChange={setVendor} onAdd={addVend}
            addLabel="New vendor…"
          />
          <div style={{ height: 1, background: "#222" }} />
          <LogoDropdown
            label="Related Platform" placeholder="Select a platform…"
            items={plats} value={platform} onChange={setPlat} onAdd={addPlat}
            addLabel="New platform…"
          />
        </div>

        {/* Note */}
        <div style={{
          background: CARD, border: "1px solid #222",
          borderRadius: 16, padding: "14px 16px",
        }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 800,
            color: "#555", letterSpacing: "0.18em", textTransform: "uppercase",
            marginBottom: 8 }}>Note (optional)</label>
          <textarea value={note} onChange={e => setNote(e.target.value)}
            placeholder="e.g. Pay by Zelle on the 15th…"
            rows={2}
            style={{
              width: "100%", boxSizing: "border-box",
              background: "#111", border: "1px solid #333",
              borderRadius: 10, padding: "10px 12px",
              color: "#fff", fontFamily: SANS, fontSize: 14,
              resize: "none", outline: "none", caretColor: GOLD,
            }}
          />
        </div>

        {/* Save */}
        <button style={{
          width: "100%", padding: "16px",
          background: RED, border: "none",
          borderRadius: 16, fontSize: 16, fontWeight: 900,
          color: "#fff", cursor: "pointer", fontFamily: SANS,
          letterSpacing: "0.03em",
          boxShadow: `0 4px 24px ${RED}44`,
          marginBottom: 8,
        }}>
          Save Regular Expense
        </button>
      </div>
    </div>
  );
}

// ── Inline "add new" pill ─────────────────────────────────────────────────────
function AddPill({ label, onAdd, accent }: {
  label: string; onAdd: (v: string) => void; accent: string;
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft]   = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const confirm = () => {
    const t = draft.trim();
    if (t) onAdd(t);
    setDraft(""); setAdding(false);
  };

  if (!adding) {
    return (
      <button onClick={() => { setAdding(true); setTimeout(() => inputRef.current?.focus(), 50); }}
        style={{
          padding: "9px 14px", borderRadius: 999, fontSize: 14, fontWeight: 600,
          border: `2px dashed #444`, background: "transparent",
          color: "#888", cursor: "pointer",
          display: "flex", alignItems: "center", gap: 5,
        }}>
        <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> {label}
      </button>
    );
  }

  return (
    <div style={{
      display: "flex", gap: 8, alignItems: "center", width: "100%",
      background: "#111", border: `2px solid ${accent}`,
      borderRadius: 12, padding: "8px 12px",
    }}>
      <input ref={inputRef} type="text" value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => { if (e.key==="Enter") confirm(); if (e.key==="Escape") { setAdding(false); setDraft(""); } }}
        placeholder="Type and press Enter…"
        style={{
          flex: 1, background: "transparent", border: "none",
          color: "#fff", fontFamily: "Inter,sans-serif", fontSize: 14,
          outline: "none",
        }}
      />
      <button onClick={confirm} style={{
        background: accent, border: "none", borderRadius: 8,
        padding: "5px 12px", color: "#fff",
        fontWeight: 900, fontSize: 12, cursor: "pointer",
      }}>Add</button>
      <button onClick={() => { setAdding(false); setDraft(""); }} style={{
        background: "transparent", border: "none",
        color: "#555", fontSize: 18, cursor: "pointer", lineHeight: 1,
      }}>×</button>
    </div>
  );
}
