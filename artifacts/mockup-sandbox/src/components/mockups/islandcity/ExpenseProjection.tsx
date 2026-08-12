import { useState, useRef, useEffect } from "react";

// ── EXPENSE PROJECTION — "Add Regular Expense" clone ─────────────────────────
// Layout mirrors the reference photo: Expense Name → Amount → Category (dropdown)
// → Vendor (dropdown) → Platform (dropdown) → Frequency pills → Due Date → Note

const PLATFORMS_RAW: { name: string; color: string; textColor?: string }[] = [
  { name: "Uber",           color: "#1a1a1a", textColor: "#fff"    },
  { name: "Lyft",           color: "#ff00bf", textColor: "#fff"    },
  { name: "EcoRide",        color: "#22c55e", textColor: "#fff"    },
  { name: "Empower",        color: "#3b82f6", textColor: "#fff"    },
  { name: "Gallant",        color: "#f97316", textColor: "#fff"    },
  { name: "Aventus Ride",   color: "#8b5cf6", textColor: "#fff"    },
  { name: "Classic Ryde",   color: "#14b8a6", textColor: "#fff"    },
  { name: "Aki Technology", color: "#0ea5e9", textColor: "#fff"    },
  { name: "Street Hail",    color: "#6b7280", textColor: "#fff"    },
  { name: "IC Transit",     color: "#d9b64f", textColor: "#0a0800" },
  { name: "Transit Tax",    color: "#374151", textColor: "#9ca3af" },
  { name: "EcoRide 10%",    color: "#15803d", textColor: "#fff"    },
  { name: "Other",          color: "#4b5563", textColor: "#d1d5db" },
];

const CATEGORIES_RAW: { name: string; icon: string; color: string }[] = [
  { name: "Gas",          icon: "⛽", color: "#f97316" },
  { name: "Insurance",    icon: "🛡️", color: "#3b82f6" },
  { name: "Rent",         icon: "🏠", color: "#8b5cf6" },
  { name: "Food",         icon: "🍔", color: "#f59e0b" },
  { name: "Phone",        icon: "📱", color: "#06b6d4" },
  { name: "Maintenance",  icon: "🔧", color: "#84cc16" },
  { name: "Tolls",        icon: "🛣️", color: "#ef4444" },
  { name: "Platforms",    icon: "📲", color: "#f6dd8c" },
  { name: "Health",       icon: "💊", color: "#4ade80" },
  { name: "Other",        icon: "📦", color: "#9ca3af" },
];

const VENDORS_RAW: { name: string; icon: string; color: string }[] = [
  { name: "BP",          icon: "⛽", color: "#22c55e" },
  { name: "Shell",       icon: "⛽", color: "#eab308" },
  { name: "Sunoco",      icon: "⛽", color: "#ef4444" },
  { name: "Costco Gas",  icon: "⛽", color: "#3b82f6" },
  { name: "Citgo",       icon: "⛽", color: "#f97316" },
  { name: "Gulf",        icon: "⛽", color: "#84cc16" },
  { name: "Progressive", icon: "🛡️", color: "#3b82f6" },
  { name: "State Farm",  icon: "🛡️", color: "#ef4444" },
  { name: "Geico",       icon: "🛡️", color: "#22c55e" },
  { name: "Sprint",      icon: "📱", color: "#f59e0b" },
  { name: "T-Mobile",    icon: "📱", color: "#e879f9" },
  { name: "Verizon",     icon: "📱", color: "#ef4444" },
];

type Freq = "daily" | "weekly" | "biweekly" | "monthly" | "annual" | "one-time";
const FREQ_OPTS: { id: Freq; label: string; color: string }[] = [
  { id: "daily",    label: "Daily",      color: "#f97316" },
  { id: "weekly",   label: "Weekly",     color: "#eab308" },
  { id: "biweekly", label: "Bi-Weekly",  color: "#84cc16" },
  { id: "monthly",  label: "Monthly",    color: "#3b82f6" },
  { id: "annual",   label: "Yearly",     color: "#8b5cf6" },
  { id: "one-time", label: "One-Time",   color: "#9ca3af" },
];

const GOLD    = "#f6dd8c";
const GOLD2   = "#d9b64f";
const BG      = "#0d0800";
const CARD    = "#160d00";
const BORD    = "#d9b64f44";
const RED     = "#ef4444";
const SANS    = "Inter,sans-serif";
const MONO    = "JetBrains Mono,monospace";

function initials(name: string) {
  const words = name.split(" ");
  if (words.length === 1) return name.slice(0, 2).toUpperCase();
  return words.map(w => w[0]).join("").slice(0, 3).toUpperCase();
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

// ── Generic Logo Dropdown ─────────────────────────────────────────────────────
type LogoItem = { name: string; icon?: string; color: string; textColor?: string };

function LogoDropdown({
  label,
  placeholder,
  items,
  value,
  onChange,
  onAdd,
  addLabel,
  accentColor,
}: {
  label: string;
  placeholder: string;
  items: LogoItem[];
  value: string;
  onChange: (v: string) => void;
  onAdd: (name: string) => void;
  addLabel: string;
  accentColor?: string;
}) {
  const [open, setOpen]     = useState(false);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft]   = useState("");
  const ref      = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const accent   = accentColor ?? GOLD;
  const selected = items.find(i => i.name === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false); setAdding(false); setDraft("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const confirmAdd = () => {
    const t = draft.trim();
    if (t) { onAdd(t); onChange(t); }
    setDraft(""); setAdding(false); setOpen(false);
  };

  return (
    <div>
      <label style={{ display: "block", fontSize: 12, fontWeight: 700,
        color: GOLD2, textTransform: "uppercase", letterSpacing: "0.15em",
        marginBottom: 6 }}>{label}</label>

      <div ref={ref} style={{ position: "relative" }}>
        {/* Trigger */}
        <button onClick={() => { setOpen(o => !o); setAdding(false); }} style={{
          width: "100%",
          background: "#0d0800",
          border: `1.5px solid ${open ? accent : "#3a2200"}`,
          borderRadius: 12, padding: "12px 14px", cursor: "pointer",
          display: "flex", alignItems: "center", gap: 10,
          transition: "border-color 0.15s",
          boxShadow: open ? `0 0 16px ${accent}22` : "none",
        }}>
          {selected ? (
            <>
              {/* Logo badge */}
              <span style={{
                width: 32, height: 32, borderRadius: selected.icon ? "50%" : "50%",
                flexShrink: 0,
                background: selected.color,
                color: selected.textColor ?? "#fff",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: selected.icon ? 16 : 9,
                fontWeight: 900,
              }}>
                {selected.icon ?? initials(selected.name)}
              </span>
              <span style={{ flex: 1, textAlign: "left", color: "#fff",
                fontFamily: SANS, fontSize: 15, fontWeight: 600 }}>
                {selected.name}
              </span>
            </>
          ) : (
            <span style={{ flex: 1, textAlign: "left", color: "#444",
              fontFamily: SANS, fontSize: 15 }}>{placeholder}</span>
          )}
          <span style={{ color: GOLD2, fontSize: 11, transition: "transform 0.15s",
            display: "inline-block", transform: open ? "rotate(180deg)" : "none" }}>▼</span>
        </button>

        {/* Dropdown */}
        {open && (
          <div style={{
            position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 100,
            background: "#1a0f00", border: `1.5px solid ${accent}55`,
            borderRadius: 14, overflow: "hidden",
            boxShadow: "0 16px 40px #00000099",
            maxHeight: 260, overflowY: "auto",
          }}>
            {items.map(item => {
              const on = value === item.name;
              return (
                <button key={item.name} onClick={() => { onChange(item.name); setOpen(false); }}
                  style={{
                    width: "100%",
                    background: on ? `${accent}18` : "transparent",
                    border: "none", borderBottom: "1px solid #2a1400",
                    padding: "10px 14px", cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 12,
                  }}>
                  <span style={{
                    width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                    background: item.color, color: item.textColor ?? "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: item.icon ? 16 : 9, fontWeight: 900,
                  }}>
                    {item.icon ?? initials(item.name)}
                  </span>
                  <span style={{
                    flex: 1, textAlign: "left", fontFamily: SANS, fontSize: 14,
                    fontWeight: on ? 700 : 400,
                    color: on ? accent : "#ccc",
                  }}>{item.name}</span>
                  {on && <span style={{ color: accent, fontSize: 16 }}>✓</span>}
                </button>
              );
            })}
            {/* + Añadir */}
            {!adding ? (
              <button onClick={() => { setAdding(true); setTimeout(() => inputRef.current?.focus(), 50); }}
                style={{
                  width: "100%", background: "transparent", border: "none",
                  borderTop: `1px dashed ${accent}44`, padding: "11px 14px",
                  cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
                  color: accent, fontFamily: SANS, fontSize: 14, fontWeight: 600,
                }}>
                <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> {addLabel}
              </button>
            ) : (
              <div style={{ padding: "10px 12px", borderTop: `1px dashed ${accent}44`,
                display: "flex", gap: 8, alignItems: "center" }}>
                <input ref={inputRef} type="text" value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={e => { if (e.key==="Enter") confirmAdd(); if (e.key==="Escape") { setAdding(false); setDraft(""); } }}
                  placeholder="Type name and press Enter…"
                  style={{
                    flex: 1, background: "#0d0800", border: `1.5px solid ${accent}66`,
                    borderRadius: 8, padding: "7px 10px", color: "#fff",
                    fontFamily: SANS, fontSize: 13, outline: "none",
                  }}
                />
                <button onClick={confirmAdd} style={{
                  background: accent, border: "none", borderRadius: 8,
                  padding: "6px 12px", color: "#0a0800",
                  fontWeight: 800, fontSize: 12, cursor: "pointer",
                }}>Add</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Field wrapper card ────────────────────────────────────────────────────────
function FieldCard({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: CARD, border: `1px solid ${BORD}`,
      borderRadius: 18, padding: "18px 16px",
      boxShadow: `0 2px 20px ${GOLD2}18`,
    }}>{children}</div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label style={{
      display: "block", fontSize: 12, fontWeight: 700,
      color: GOLD2, textTransform: "uppercase",
      letterSpacing: "0.15em", marginBottom: 8,
    }}>{children}</label>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function ExpenseProjection() {
  const [expenseName, setExpenseName] = useState("");
  const [amount, setAmount]           = useState("");
  const [category, setCategory]       = useState("");
  const [vendor, setVendor]           = useState("");
  const [platform, setPlatform]       = useState("");
  const [freq, setFreq]               = useState<Freq>("monthly");
  const [dueDate, setDueDate]         = useState("");
  const [note, setNote]               = useState("");

  const [categories, setCategories]   = useState([...CATEGORIES_RAW]);
  const [vendors, setVendors]         = useState([...VENDORS_RAW]);
  const [platforms, setPlatforms]     = useState([...PLATFORMS_RAW]);

  const addCategory = (name: string) => {
    if (!categories.find(c => c.name === name))
      setCategories(p => [...p, { name, icon: "📦", color: "#9ca3af" }]);
  };
  const addVendor = (name: string) => {
    if (!vendors.find(v => v.name === name))
      setVendors(p => [...p, { name, icon: "🏪", color: "#6b7280" }]);
  };
  const addPlatform = (name: string) => {
    if (!platforms.find(p => p.name === name))
      setPlatforms(p => [...p, { name, color: "#4b5563", textColor: "#fff" }]);
  };

  const amt     = parseFloat(amount || "0") || 0;
  const monthly = toMonthly(amt, freq);
  const selFreq = FREQ_OPTS.find(f => f.id === freq)!;

  return (
    <div style={{ minHeight: "100vh", background: BG, color: "#fff", fontFamily: SANS, overflowY: "auto" }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(160deg,#1f0008 0%,#0d0800 100%)",
        borderBottom: `1px solid ${RED}33`,
        padding: "44px 20px 16px",
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: "50%",
          background: "radial-gradient(circle at 40% 35%,#3a0010,#0d0800)",
          border: `2px solid ${RED}88`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 20, boxShadow: `0 0 16px ${RED}33`,
        }}>🌉</div>
        <div>
          <p style={{ margin: 0, fontFamily: "Cinzel,serif", fontWeight: 700,
            fontSize: 17, letterSpacing: "0.06em",
            background: `linear-gradient(90deg,${GOLD},${GOLD2})`,
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            ISLANDCITY
          </p>
          <p style={{ margin: 0, fontSize: 10, color: "#a07820",
            letterSpacing: "0.25em", textTransform: "uppercase" }}>
            Add Regular Expense
          </p>
        </div>
        <span style={{
          marginLeft: "auto",
          background: "#1a0000", border: `1px solid ${RED}40`,
          borderRadius: 999, padding: "5px 12px",
          fontSize: 10, color: RED, fontWeight: 700,
          display: "flex", alignItems: "center", gap: 5,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%",
            background: RED, display: "inline-block" }} />
          EXPENSES
        </span>
      </div>

      <div style={{ padding: "20px 18px", display: "flex", flexDirection: "column", gap: 14 }}>

        {/* Expense Name */}
        <FieldCard>
          <FieldLabel>Expense Name</FieldLabel>
          <input type="text" value={expenseName}
            onChange={e => setExpenseName(e.target.value)}
            placeholder="e.g. Gas, Insurance, Car Wash…"
            style={{
              width: "100%", boxSizing: "border-box",
              background: "#0d0800", border: "1.5px solid #3a2200",
              borderRadius: 12, padding: "13px 14px",
              color: "#fff", fontFamily: SANS, fontSize: 16,
              outline: "none", caretColor: GOLD,
            }}
          />
        </FieldCard>

        {/* Amount */}
        <FieldCard>
          <FieldLabel>Amount</FieldLabel>
          <div style={{ position: "relative" }}>
            <span style={{
              position: "absolute", left: 14, top: "50%",
              transform: "translateY(-50%)",
              fontFamily: MONO, fontSize: 26, fontWeight: 900,
              color: GOLD, pointerEvents: "none",
            }}>$</span>
            <input type="number" inputMode="decimal"
              value={amount} onChange={e => setAmount(e.target.value)}
              placeholder="0"
              style={{
                width: "100%", boxSizing: "border-box",
                background: "#0d0800", border: "1.5px solid #3a2200",
                borderRadius: 12, padding: "13px 14px 13px 42px",
                color: "#fff", fontFamily: MONO, fontSize: 32, fontWeight: 900,
                outline: "none", caretColor: GOLD,
              }}
            />
          </div>
        </FieldCard>

        {/* Category dropdown */}
        <FieldCard>
          <LogoDropdown
            label="Category"
            placeholder="Select a category…"
            items={categories}
            value={category}
            onChange={setCategory}
            onAdd={addCategory}
            addLabel="New category…"
            accentColor={category ? (categories.find(c => c.name === category)?.color ?? GOLD) : GOLD}
          />
        </FieldCard>

        {/* Vendor dropdown */}
        <FieldCard>
          <LogoDropdown
            label="Vendor / Provider"
            placeholder="Select a vendor…"
            items={vendors}
            value={vendor}
            onChange={setVendor}
            onAdd={addVendor}
            addLabel="New vendor…"
            accentColor="#06b6d4"
          />
        </FieldCard>

        {/* Platform dropdown */}
        <FieldCard>
          <LogoDropdown
            label="Related Platform"
            placeholder="Select a platform…"
            items={platforms.map(p => ({ ...p }))}
            value={platform}
            onChange={setPlatform}
            onAdd={addPlatform}
            addLabel="New platform…"
            accentColor={GOLD}
          />
        </FieldCard>

        {/* Frequency pills */}
        <FieldCard>
          <FieldLabel>How Often?</FieldLabel>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            {FREQ_OPTS.map(f => {
              const on = freq === f.id;
              return (
                <button key={f.id} onClick={() => setFreq(f.id)} style={{
                  padding: "12px 8px", borderRadius: 14, textAlign: "center",
                  border: on ? `2px solid ${f.color}` : "2px solid #2a1800",
                  background: on ? `${f.color}22` : "#0d0800",
                  cursor: "pointer", transition: "all 0.15s",
                  boxShadow: on ? `0 0 14px ${f.color}44` : "none",
                }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: on ? 800 : 500,
                    color: on ? f.color : "#666" }}>{f.label}</p>
                </button>
              );
            })}
          </div>
        </FieldCard>

        {/* Due Date — show for monthly, annual, one-time */}
        {(freq === "monthly" || freq === "annual" || freq === "one-time") && (
          <FieldCard>
            <FieldLabel>
              {freq === "monthly" ? "Due Day of Month" :
               freq === "annual"  ? "Due Date (Yearly)" :
               "Payment Date"}
            </FieldLabel>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
              style={{
                width: "100%", boxSizing: "border-box",
                background: "#0d0800", border: "1.5px solid #3a2200",
                borderRadius: 12, padding: "13px 14px",
                color: "#fff", fontFamily: MONO, fontSize: 16,
                outline: "none", colorScheme: "dark",
              }}
            />
          </FieldCard>
        )}

        {/* Monthly cost preview */}
        {amt > 0 && (
          <div style={{
            background: "linear-gradient(135deg,#1a0000,#2a0808)",
            border: `2px solid ${RED}33`, borderRadius: 18, padding: "16px",
            boxShadow: `0 0 20px ${RED}18`,
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <div>
              <p style={{ margin: 0, fontSize: 12, color: "#666" }}>
                {selFreq.label} ${amt.toLocaleString()} =
              </p>
              <p style={{ margin: "4px 0 0", fontFamily: MONO, fontSize: 32,
                fontWeight: 900, color: RED }}>
                −${monthly.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                <span style={{ fontSize: 14, color: "#666" }}>/mo</span>
              </p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ margin: 0, fontSize: 11, color: "#444" }}>Per year</p>
              <p style={{ margin: "3px 0 0", fontFamily: MONO, fontSize: 18,
                fontWeight: 700, color: "#7f1d1d" }}>
                −${(monthly * 12).toLocaleString("en-US", { maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>
        )}

        {/* Note */}
        <FieldCard>
          <FieldLabel>Note (optional)</FieldLabel>
          <textarea value={note} onChange={e => setNote(e.target.value)}
            placeholder="e.g. Pay by Zelle on the 15th…"
            rows={2}
            style={{
              width: "100%", boxSizing: "border-box",
              background: "#0d0800", border: "1.5px solid #3a2200",
              borderRadius: 12, padding: "12px 14px",
              color: "#fff", fontFamily: SANS, fontSize: 14,
              resize: "none", outline: "none", caretColor: GOLD,
            }}
          />
        </FieldCard>

        {/* Save button */}
        <button style={{
          width: "100%", padding: "16px",
          background: `linear-gradient(135deg,${RED},#b91c1c)`,
          border: "none", borderRadius: 18, fontSize: 16, fontWeight: 800,
          color: "#fff", cursor: "pointer",
          boxShadow: `0 4px 24px ${RED}55`,
          letterSpacing: "0.02em", marginBottom: 8,
        }}>
          Save Regular Expense
        </button>
      </div>
    </div>
  );
}
