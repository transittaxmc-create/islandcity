import { useState, useRef, useEffect } from "react";

// ── INCOME PROJECTION — "Set Weekly Income Target" clone ─────────────────────
// Layout mirrors the reference photo: weekly target input → day toggles (Mon-Sun)
// → per-day goal rows. Dropdowns with platform logos + "+ Añadir nuevo…".

const DAYS = [
  { iso: 1, abbr: "Mon", full: "Monday"    },
  { iso: 2, abbr: "Tue", full: "Tuesday"   },
  { iso: 3, abbr: "Wed", full: "Wednesday" },
  { iso: 4, abbr: "Thu", full: "Thursday"  },
  { iso: 5, abbr: "Fri", full: "Friday"    },
  { iso: 6, abbr: "Sat", full: "Saturday"  },
  { iso: 0, abbr: "Sun", full: "Sunday"    },
];

const PLATFORMS: { name: string; color: string; textColor?: string; emoji?: string }[] = [
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

const GOLD   = "#f6dd8c";
const GOLD2  = "#d9b64f";
const BG     = "#0d0800";
const CARD   = "#160d00";
const BORD   = "#d9b64f44";
const GREEN  = "#4ade80";
const MONO   = "JetBrains Mono,monospace";
const SANS   = "Inter,sans-serif";

function platformInitials(name: string) {
  const words = name.split(" ");
  if (words.length === 1) return name.slice(0, 2).toUpperCase();
  return words.map(w => w[0]).join("").slice(0, 3).toUpperCase();
}

// ── Custom logo dropdown ──────────────────────────────────────────────────────
function PlatformDropdown({
  label,
  platforms,
  value,
  onChange,
  onAdd,
}: {
  label: string;
  platforms: typeof PLATFORMS;
  value: string;
  onChange: (v: string) => void;
  onAdd: (name: string) => void;
}) {
  const [open, setOpen]     = useState(false);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft]   = useState("");
  const ref     = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const selected = platforms.find(p => p.name === value);

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
    <div ref={ref} style={{ position: "relative" }}>
      <label style={{ display: "block", fontSize: 12, fontWeight: 700,
        color: GOLD2, textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 6 }}>
        {label}
      </label>
      {/* Trigger */}
      <button onClick={() => { setOpen(o => !o); setAdding(false); }} style={{
        width: "100%", background: "#0d0800", border: `1.5px solid ${open ? GOLD : "#3a2200"}`,
        borderRadius: 12, padding: "12px 14px", cursor: "pointer",
        display: "flex", alignItems: "center", gap: 10,
        transition: "border-color 0.15s",
        boxShadow: open ? `0 0 14px ${GOLD}22` : "none",
      }}>
        {selected ? (
          <>
            <span style={{
              width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
              background: selected.color, color: selected.textColor ?? "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 9, fontWeight: 900, letterSpacing: "-0.02em",
            }}>{platformInitials(selected.name)}</span>
            <span style={{ flex: 1, textAlign: "left", color: "#fff",
              fontFamily: SANS, fontSize: 15, fontWeight: 600 }}>{selected.name}</span>
          </>
        ) : (
          <span style={{ flex: 1, textAlign: "left", color: "#444",
            fontFamily: SANS, fontSize: 15 }}>Choose platform…</span>
        )}
        <span style={{ color: GOLD2, fontSize: 12, transition: "transform 0.15s",
          transform: open ? "rotate(180deg)" : "none" }}>▼</span>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 50,
          background: "#1a0f00", border: `1.5px solid ${GOLD2}66`,
          borderRadius: 14, overflow: "hidden",
          boxShadow: "0 12px 32px #00000088",
          maxHeight: 280, overflowY: "auto",
        }}>
          {platforms.map(p => (
            <button key={p.name} onClick={() => { onChange(p.name); setOpen(false); }} style={{
              width: "100%", background: value === p.name ? `${GOLD}14` : "transparent",
              border: "none", borderBottom: "1px solid #2a1800",
              padding: "10px 14px", cursor: "pointer",
              display: "flex", alignItems: "center", gap: 10,
            }}>
              <span style={{
                width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
                background: p.color, color: p.textColor ?? "#fff",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 9, fontWeight: 900,
              }}>{platformInitials(p.name)}</span>
              <span style={{
                flex: 1, textAlign: "left", fontFamily: SANS, fontSize: 14,
                fontWeight: value === p.name ? 700 : 400,
                color: value === p.name ? GOLD : "#ccc",
              }}>{p.name}</span>
              {value === p.name && <span style={{ color: GOLD, fontSize: 14 }}>✓</span>}
            </button>
          ))}

          {/* + Añadir nueva plataforma */}
          {!adding ? (
            <button onClick={() => { setAdding(true); setTimeout(() => inputRef.current?.focus(), 50); }}
              style={{
                width: "100%", background: "transparent", border: "none",
                borderTop: `1px dashed ${GOLD2}44`, padding: "11px 14px",
                cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
                color: GOLD2, fontFamily: SANS, fontSize: 14, fontWeight: 600,
              }}>
              <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Nueva plataforma…
            </button>
          ) : (
            <div style={{ padding: "10px 12px", borderTop: `1px dashed ${GOLD2}44`,
              display: "flex", gap: 8, alignItems: "center" }}>
              <input ref={inputRef} type="text" value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") confirmAdd(); if (e.key === "Escape") { setAdding(false); setDraft(""); } }}
                placeholder="Nombre de la plataforma…"
                style={{
                  flex: 1, background: "#0d0800", border: `1.5px solid ${GOLD}66`,
                  borderRadius: 8, padding: "7px 10px", color: "#fff",
                  fontFamily: SANS, fontSize: 13, outline: "none",
                }}
              />
              <button onClick={confirmAdd} style={{
                background: GOLD, border: "none", borderRadius: 8,
                padding: "6px 12px", color: "#0a0800",
                fontWeight: 800, fontSize: 12, cursor: "pointer",
              }}>OK</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function IncomeProjection() {
  const [weeklyGoal, setWeeklyGoal] = useState("1980");
  const [activeDays, setActiveDays] = useState<Set<number>>(new Set([1, 2, 3, 4, 5]));
  const [dayGoals, setDayGoals]     = useState<Record<number, string>>({
    1: "400", 2: "350", 3: "350", 4: "400", 5: "480",
  });
  const [platform, setPlatform]   = useState("Uber");
  const [platforms, setPlatforms] = useState([...PLATFORMS]);

  const addPlatform = (name: string) => {
    if (!platforms.find(p => p.name === name)) {
      setPlatforms(prev => [...prev, { name, color: "#4b5563", textColor: "#fff" }]);
    }
  };

  const toggleDay = (iso: number) => {
    const n = new Set(activeDays);
    if (n.has(iso)) { n.delete(iso); const g = { ...dayGoals }; delete g[iso]; setDayGoals(g); }
    else { n.add(iso); setDayGoals(p => ({ ...p, [iso]: "" })); }
    setActiveDays(n);
  };

  const orderedActive = DAYS.filter(d => activeDays.has(d.iso));
  const total = orderedActive.reduce((s, d) => s + (parseFloat(dayGoals[d.iso] || "0") || 0), 0);

  return (
    <div style={{
      minHeight: "100vh", background: BG, color: "#fff",
      fontFamily: SANS, overflowY: "auto",
    }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(160deg,#1f1000 0%,#0d0800 100%)",
        borderBottom: `1px solid ${BORD}`,
        padding: "44px 20px 16px",
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: "50%",
          background: "radial-gradient(circle at 40% 35%,#3a2000,#0d0800)",
          border: `2px solid ${GOLD2}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 20, boxShadow: `0 0 16px ${GOLD2}44`,
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
            Set Weekly Income Target
          </p>
        </div>
      </div>

      <div style={{ padding: "20px 18px", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Weekly Income Goal */}
        <div style={{ background: CARD, border: `1px solid ${BORD}`,
          borderRadius: 18, padding: "18px 16px",
          boxShadow: `0 2px 20px ${GOLD2}18` }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 700,
            color: GOLD2, textTransform: "uppercase", letterSpacing: "0.15em",
            marginBottom: 8 }}>Weekly Income Goal</label>
          <div style={{ position: "relative" }}>
            <span style={{
              position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
              fontFamily: MONO, fontSize: 28, fontWeight: 900, color: GOLD,
              pointerEvents: "none",
            }}>$</span>
            <input type="number" inputMode="decimal" value={weeklyGoal}
              onChange={e => setWeeklyGoal(e.target.value)} placeholder="0"
              style={{
                width: "100%", boxSizing: "border-box",
                background: "#0d0800", border: `2px solid #3a2200`,
                borderRadius: 14, padding: "14px 14px 14px 44px",
                color: GOLD, fontFamily: MONO, fontSize: 36, fontWeight: 900,
                outline: "none", caretColor: GOLD,
              }}
            />
          </div>
          <p style={{ margin: "8px 0 0", fontSize: 12, color: "#555" }}>
            Total projected this week across all platforms
          </p>
        </div>

        {/* Primary Platform dropdown */}
        <div style={{ background: CARD, border: `1px solid ${BORD}`,
          borderRadius: 18, padding: "18px 16px",
          boxShadow: `0 2px 20px ${GOLD2}18` }}>
          <PlatformDropdown
            label="Primary Platform"
            platforms={platforms}
            value={platform}
            onChange={setPlatform}
            onAdd={addPlatform}
          />
        </div>

        {/* Work Days this week */}
        <div style={{ background: CARD, border: `1px solid ${BORD}`,
          borderRadius: 18, padding: "18px 16px",
          boxShadow: `0 2px 20px ${GOLD2}18` }}>
          <p style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 700,
            color: GOLD2, textTransform: "uppercase", letterSpacing: "0.15em" }}>
            Work Days This Week
          </p>
          <p style={{ margin: "0 0 14px", fontSize: 13, color: "#666" }}>
            Tap to toggle the days you plan to drive
          </p>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 4 }}>
            {DAYS.map(d => {
              const on = activeDays.has(d.iso);
              return (
                <button key={d.iso} onClick={() => toggleDay(d.iso)} style={{
                  flex: 1, padding: "10px 0",
                  borderRadius: 14,
                  border: on ? `2px solid ${GOLD}` : "2px solid #2a1800",
                  background: on
                    ? `linear-gradient(160deg,#3d2200,#2a1400)`
                    : "#110900",
                  color: on ? GOLD : "#444",
                  fontFamily: SANS, fontSize: 11, fontWeight: on ? 800 : 500,
                  cursor: "pointer", transition: "all 0.15s",
                  boxShadow: on ? `0 0 12px ${GOLD2}44` : "none",
                  display: "flex", flexDirection: "column",
                  alignItems: "center", gap: 2,
                }}>
                  <span style={{ fontSize: 10 }}>{d.abbr.slice(0,1)}</span>
                  {on && <span style={{ width: 5, height: 5, borderRadius: "50%",
                    background: GOLD, display: "block" }} />}
                </button>
              );
            })}
          </div>
          {/* Day labels below */}
          <div style={{ display: "flex", justifyContent: "space-between", gap: 4, marginTop: 4 }}>
            {DAYS.map(d => (
              <div key={d.iso} style={{ flex: 1, textAlign: "center",
                fontSize: 8, color: activeDays.has(d.iso) ? GOLD2 : "#333",
                fontWeight: activeDays.has(d.iso) ? 700 : 400 }}>
                {d.abbr}
              </div>
            ))}
          </div>
        </div>

        {/* Daily Goal per day */}
        {orderedActive.length > 0 && (
          <div style={{ background: CARD, border: `1px solid ${BORD}`,
            borderRadius: 18, padding: "18px 16px",
            boxShadow: `0 2px 20px ${GOLD2}18` }}>
            <p style={{ margin: "0 0 14px", fontSize: 12, fontWeight: 700,
              color: GOLD2, textTransform: "uppercase", letterSpacing: "0.15em" }}>
              Daily Goal
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {orderedActive.map(d => (
                <div key={d.iso} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  background: "#0d0800", border: "1px solid #2a1800",
                  borderRadius: 14, padding: "10px 14px",
                }}>
                  {/* Day label */}
                  <div style={{ width: 80, flexShrink: 0 }}>
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 800,
                      color: GOLD }}>{d.full.slice(0, 3)}</p>
                    <p style={{ margin: 0, fontSize: 11, color: "#555" }}>{d.full}</p>
                  </div>
                  <div style={{ flex: 1, position: "relative" }}>
                    <span style={{
                      position: "absolute", left: 12, top: "50%",
                      transform: "translateY(-50%)",
                      fontFamily: MONO, fontSize: 18, fontWeight: 800,
                      color: GOLD2, pointerEvents: "none",
                    }}>$</span>
                    <input type="number" inputMode="decimal"
                      value={dayGoals[d.iso] ?? ""} placeholder="0"
                      onChange={e => setDayGoals(p => ({ ...p, [d.iso]: e.target.value }))}
                      style={{
                        width: "100%", boxSizing: "border-box",
                        background: "transparent",
                        border: "1.5px solid #3a2200",
                        borderRadius: 11, padding: "10px 10px 10px 30px",
                        color: "#fff", fontFamily: MONO, fontSize: 22, fontWeight: 800,
                        outline: "none", caretColor: GOLD,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Running total */}
            <div style={{
              marginTop: 14, padding: "12px 14px",
              background: total > 0 ? "#0a1a0a" : "#0d0800",
              border: total > 0 ? `1.5px solid ${GREEN}44` : "1.5px solid #2a1800",
              borderRadius: 14,
              display: "flex", justifyContent: "space-between", alignItems: "center",
              transition: "all 0.3s",
            }}>
              <span style={{ fontSize: 13, color: "#666" }}>Total this week</span>
              <span style={{ fontFamily: MONO, fontSize: 22, fontWeight: 900,
                color: total > 0 ? GREEN : "#333" }}>
                ${total.toLocaleString()}
              </span>
            </div>
          </div>
        )}

        {/* Save button */}
        <button style={{
          width: "100%", padding: "16px",
          background: `linear-gradient(135deg,${GOLD},${GOLD2})`,
          border: "none", borderRadius: 18, fontSize: 16, fontWeight: 800,
          color: "#0a0800", cursor: "pointer",
          boxShadow: `0 4px 24px ${GOLD2}55`, letterSpacing: "0.02em",
        }}>
          Save Income Plan
        </button>
      </div>
    </div>
  );
}
