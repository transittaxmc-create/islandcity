import { useState, useRef, useEffect } from "react";

// ── INCOME PROJECTION — single gold/green accent, #0e0e0e bg ─────────────────
// Matches FinancesBold visual family: one accent color, dark cards, disciplined.

const DAYS = [
  { iso: 1, abbr: "MON", full: "Monday"    },
  { iso: 2, abbr: "TUE", full: "Tuesday"   },
  { iso: 3, abbr: "WED", full: "Wednesday" },
  { iso: 4, abbr: "THU", full: "Thursday"  },
  { iso: 5, abbr: "FRI", full: "Friday"    },
  { iso: 6, abbr: "SAT", full: "Saturday"  },
  { iso: 0, abbr: "SUN", full: "Sunday"    },
];

const PLATFORMS: { name: string; bg: string; fg: string }[] = [
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
const GOLD   = "#f6dd8c";   // primary accent — income/positive
const GOLDD  = "#d97706";   // darker gold for secondary text
const GREEN  = "#4ade80";   // total/result — positive outcome
const BG     = "#0e0e0e";   // matches FinancesBold exactly
const CARD   = "#1a1a1a";   // matches FinancesBold card bg
const BORD   = "#2a2a2a";   // subtle card border like FinancesBold
const MONO   = "JetBrains Mono,monospace";
const SANS   = "Inter,sans-serif";
const CINZEL = "Cinzel,serif";

// Step badge — single gold color throughout (income screen)
function StepBadge({ n, label, right }: { n: string; label: string; right?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center",
      justifyContent: "space-between", marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{
          width: 26, height: 26, borderRadius: "50%",
          background: GOLD, color: BG,
          fontFamily: MONO, fontSize: 13, fontWeight: 900,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>{n}</span>
        <span style={{ fontFamily: SANS, fontSize: 12, fontWeight: 800,
          color: GOLD, letterSpacing: "0.14em", textTransform: "uppercase" }}>
          {label}
        </span>
      </div>
      {right}
    </div>
  );
}

function initials(name: string) {
  const w = name.split(" ");
  return w.length === 1 ? name.slice(0, 2).toUpperCase()
    : w.map(x => x[0]).join("").slice(0, 3).toUpperCase();
}

// ── Platform Dropdown ─────────────────────────────────────────────────────────
function PlatformDropdown({
  platforms, value, onChange, onAdd,
}: {
  platforms: typeof PLATFORMS;
  value: string; onChange: (v: string) => void; onAdd: (name: string) => void;
}) {
  const [open, setOpen]     = useState(false);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft]   = useState("");
  const ref      = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sel      = platforms.find(p => p.name === value);

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
        color: GOLDD, letterSpacing: "0.18em", textTransform: "uppercase",
        marginBottom: 8 }}>Primary Platform</label>

      <button onClick={() => { setOpen(o => !o); setAdding(false); }} style={{
        width: "100%", background: "#111",
        border: `2px solid ${open ? GOLD : "#333"}`,
        borderRadius: 12, padding: "11px 14px", cursor: "pointer",
        display: "flex", alignItems: "center", gap: 10,
        transition: "border-color 0.15s",
        boxShadow: open ? `0 0 18px ${GOLD}22` : "none",
      }}>
        {sel ? (
          <>
            <span style={{
              width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
              background: sel.bg, color: sel.fg,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 9, fontWeight: 900,
            }}>{initials(sel.name)}</span>
            <span style={{ flex: 1, textAlign: "left", color: "#fff",
              fontFamily: SANS, fontSize: 15, fontWeight: 700 }}>{sel.name}</span>
          </>
        ) : (
          <span style={{ flex: 1, textAlign: "left", color: "#555",
            fontFamily: SANS, fontSize: 15 }}>Choose platform…</span>
        )}
        <span style={{ color: GOLDD, fontSize: 11, display: "inline-block",
          transition: "transform 0.15s", transform: open ? "rotate(180deg)" : "none" }}>▼</span>
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 99,
          background: "#161616", border: `2px solid #333`,
          borderRadius: 12, boxShadow: "0 16px 40px #000000cc",
          maxHeight: 260, overflowY: "auto",
        }}>
          {platforms.map(p => {
            const on = value === p.name;
            return (
              <button key={p.name} onClick={() => { onChange(p.name); setOpen(false); }} style={{
                width: "100%", background: on ? "#2a2a1a" : "transparent",
                border: "none", borderBottom: "1px solid #222",
                padding: "10px 14px", cursor: "pointer",
                display: "flex", alignItems: "center", gap: 10,
              }}>
                <span style={{
                  width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                  background: p.bg, color: p.fg,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 9, fontWeight: 900,
                }}>{initials(p.name)}</span>
                <span style={{
                  flex: 1, textAlign: "left", fontFamily: SANS, fontSize: 14,
                  fontWeight: on ? 700 : 400,
                  color: on ? GOLD : "#bbb",
                }}>{p.name}</span>
                {on && <span style={{ color: GREEN, fontSize: 16 }}>✓</span>}
              </button>
            );
          })}
          {!adding ? (
            <button onClick={() => { setAdding(true); setTimeout(() => inputRef.current?.focus(), 50); }}
              style={{
                width: "100%", background: "transparent", border: "none",
                borderTop: `1px dashed #333`, padding: "11px 14px",
                cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
                color: GOLD, fontFamily: SANS, fontSize: 14, fontWeight: 700,
              }}>
              <span style={{ fontSize: 18 }}>+</span> Nueva plataforma…
            </button>
          ) : (
            <div style={{ padding: "10px 12px", borderTop: "1px dashed #333",
              display: "flex", gap: 8, alignItems: "center" }}>
              <input ref={inputRef} type="text" value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => { if (e.key==="Enter") confirm(); if (e.key==="Escape") { setAdding(false); setDraft(""); } }}
                placeholder="Platform name…"
                style={{
                  flex: 1, background: "#0e0e0e", border: `2px solid ${GOLD}`,
                  borderRadius: 8, padding: "7px 10px", color: "#fff",
                  fontFamily: SANS, fontSize: 13, outline: "none",
                }}
              />
              <button onClick={confirm} style={{
                background: GOLD, border: "none", borderRadius: 8,
                padding: "7px 14px", color: BG,
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
export function IncomeProjection() {
  const [activeDays, setActiveDays] = useState<Set<number>>(new Set([1, 2, 3, 4, 5]));
  const [dayGoals, setDayGoals]     = useState<Record<number, string>>({
    1: "400", 2: "350", 3: "350", 4: "400", 5: "480",
  });
  const [platform, setPlatform]   = useState("Uber");
  const [platforms, setPlatforms] = useState([...PLATFORMS]);

  const addPlatform = (name: string) => {
    if (!platforms.find(p => p.name === name))
      setPlatforms(prev => [...prev, { name, bg: "#374151", fg: "#fff" }]);
  };

  const toggleDay = (iso: number) => {
    const n = new Set(activeDays);
    if (n.has(iso)) { n.delete(iso); const g = { ...dayGoals }; delete g[iso]; setDayGoals(g); }
    else { n.add(iso); setDayGoals(p => ({ ...p, [iso]: "" })); }
    setActiveDays(n);
  };

  const ordered = DAYS.filter(d => activeDays.has(d.iso));
  const total   = ordered.reduce((s, d) => s + (parseFloat(dayGoals[d.iso] || "0") || 0), 0);
  const avg     = ordered.length ? Math.round(total / ordered.length) : 0;

  return (
    <div style={{ minHeight: "100vh", background: BG,
      fontFamily: SANS, color: "#fff", overflowY: "auto" }}>

      {/* Header — mirrors FinancesBold header style */}
      <div style={{
        background: "#111",
        borderBottom: `1px solid #2a2a2a`,
        padding: "44px 18px 16px",
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: "50%",
          background: "#1a1400",
          border: `2px solid ${GOLD}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 20, boxShadow: `0 0 16px ${GOLD}33`,
        }}>🌉</div>
        <div>
          <p style={{ margin: 0, fontFamily: CINZEL, fontWeight: 700,
            fontSize: 17, letterSpacing: "0.06em", color: GOLD }}>ISLANDCITY</p>
          <p style={{ margin: 0, fontSize: 9, color: GOLDD,
            letterSpacing: "0.28em", textTransform: "uppercase", fontWeight: 700 }}>
            Weekly Income Target
          </p>
        </div>
        <div style={{ marginLeft: "auto", textAlign: "right" }}>
          <p style={{ margin: 0, fontSize: 10, color: "#444", fontWeight: 600,
            letterSpacing: "0.1em" }}>THIS WEEK</p>
          <p style={{ margin: 0, fontFamily: MONO, fontSize: 22,
            fontWeight: 900, color: total > 0 ? GREEN : "#333" }}>
            ${total.toLocaleString()}
          </p>
        </div>
      </div>

      <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: 12 }}>

        {/* ── STEP 1: Pick days ── */}
        <div style={{
          background: CARD, border: `1px solid #2c2400`,
          borderRadius: 18, padding: "16px",
          boxShadow: `0 0 0 1px #f6dd8c18`,
        }}>
          <StepBadge n="1" label="Pick Your Days"
            right={
              <span style={{ fontFamily: MONO, fontSize: 12,
                color: "#666", fontWeight: 600 }}>
                {activeDays.size} day{activeDays.size !== 1 ? "s" : ""}
              </span>
            }
          />

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 5 }}>
            {DAYS.map(d => {
              const on = activeDays.has(d.iso);
              return (
                <button key={d.iso} onClick={() => toggleDay(d.iso)} style={{
                  padding: "10px 0",
                  borderRadius: 10,
                  border: `2px solid ${on ? GOLD : "#333"}`,
                  background: on ? "#2a2000" : "#111",
                  color: on ? GOLD : "#444",
                  fontFamily: SANS, fontSize: 9, fontWeight: on ? 900 : 600,
                  cursor: "pointer", transition: "all 0.15s",
                  boxShadow: on ? `0 0 12px ${GOLD}33` : "none",
                  display: "flex", flexDirection: "column",
                  alignItems: "center", gap: 2,
                }}>
                  <span style={{ fontSize: 11 }}>{d.abbr.slice(0, 1)}</span>
                  <span style={{ fontSize: 7, letterSpacing: "0.02em" }}>{d.abbr.slice(1)}</span>
                </button>
              );
            })}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 5, marginTop: 4 }}>
            {DAYS.map(d => (
              <div key={d.iso} style={{
                textAlign: "center", fontSize: 7, fontWeight: 700,
                color: activeDays.has(d.iso) ? GOLDD : "#333",
              }}>{d.abbr}</div>
            ))}
          </div>
        </div>

        {/* ── STEP 2: Daily targets ── */}
        <div style={{
          background: CARD, border: `1px solid #2c2400`,
          borderRadius: 18, padding: "16px",
          boxShadow: `0 0 0 1px #f6dd8c18`,
        }}>
          <StepBadge n="2" label="Daily Goal"
            right={
              ordered.length > 0 ? (
                <span style={{ fontFamily: MONO, fontSize: 12, color: "#555" }}>
                  avg ${avg}/day
                </span>
              ) : undefined
            }
          />

          {ordered.length === 0 ? (
            <p style={{ textAlign: "center", color: "#444", fontSize: 14,
              padding: "16px 0", margin: 0 }}>
              ↑ Toggle at least one day above
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {ordered.map(d => {
                const val = parseFloat(dayGoals[d.iso] || "0") || 0;
                return (
                  <div key={d.iso} style={{
                    display: "flex", alignItems: "center", gap: 12,
                    background: "#111",
                    border: `1px solid ${val > 0 ? "#2c2400" : "#222"}`,
                    borderRadius: 12, padding: "10px 12px",
                    transition: "border-color 0.2s",
                  }}>
                    <div style={{ width: 54, flexShrink: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 900,
                        color: GOLD, fontFamily: SANS }}>{d.abbr}</div>
                      <div style={{ fontSize: 10, color: "#444" }}>{d.full}</div>
                    </div>
                    <div style={{ flex: 1, position: "relative" }}>
                      <span style={{
                        position: "absolute", left: 8, top: "50%",
                        transform: "translateY(-50%)",
                        fontFamily: MONO, fontSize: 18, fontWeight: 900,
                        color: val > 0 ? GOLD : "#333", pointerEvents: "none",
                      }}>$</span>
                      <input
                        type="number" inputMode="decimal"
                        value={dayGoals[d.iso] ?? ""} placeholder="0"
                        onChange={e => setDayGoals(p => ({ ...p, [d.iso]: e.target.value }))}
                        style={{
                          width: "100%", boxSizing: "border-box",
                          background: "transparent", border: "none",
                          borderBottom: `2px solid ${val > 0 ? GOLDD : "#2a2a2a"}`,
                          padding: "5px 6px 5px 24px",
                          color: val > 0 ? "#fff" : "#444",
                          fontFamily: MONO, fontSize: 26, fontWeight: 900,
                          outline: "none", caretColor: GOLD,
                          transition: "border-color 0.2s",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── STEP 3: Total + Platform ── */}
        <div style={{
          background: "#0a1a0f",
          border: `1px solid #1a3a24`,
          borderRadius: 18, padding: "16px",
          boxShadow: `0 0 0 1px #4ade8018`,
        }}>
          <StepBadge n="3" label="Your Week Total" />

          {/* Big total number */}
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 12 }}>
            <span style={{
              fontFamily: MONO, fontSize: 52, fontWeight: 900, lineHeight: 1,
              color: total > 0 ? GREEN : "#1e3a28",
              textShadow: total > 0 ? `0 0 24px ${GREEN}55` : "none",
              transition: "all 0.3s",
            }}>${total.toLocaleString()}</span>
            <span style={{ fontFamily: SANS, fontSize: 14, color: "#2a5a38", fontWeight: 600 }}>
              / week
            </span>
          </div>

          {/* Proportional bar */}
          {total > 0 && ordered.length > 0 && (
            <>
              <div style={{ display: "flex", height: 6, borderRadius: 999,
                overflow: "hidden", gap: 2, marginBottom: 8 }}>
                {ordered.map(d => {
                  const amt = parseFloat(dayGoals[d.iso] || "0") || 0;
                  if (!amt) return null;
                  return <div key={d.iso} style={{
                    flex: amt, background: GREEN,
                    opacity: 0.35 + (amt / 600) * 0.65,
                    minWidth: 4, borderRadius: 999,
                  }} />;
                })}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px", marginBottom: 14 }}>
                {ordered.map(d => {
                  const amt = parseFloat(dayGoals[d.iso] || "0") || 0;
                  if (!amt) return null;
                  return (
                    <span key={d.iso} style={{ fontFamily: MONO, fontSize: 12, color: "#3a6a48" }}>
                      <span style={{ color: GREEN, fontWeight: 800 }}>{d.abbr}</span> ${amt}
                    </span>
                  );
                })}
              </div>
            </>
          )}

          <PlatformDropdown
            platforms={platforms} value={platform}
            onChange={setPlatform} onAdd={addPlatform}
          />
        </div>

        {/* Save */}
        <button style={{
          width: "100%", padding: "16px",
          background: GOLD, border: "none",
          borderRadius: 16, fontSize: 16, fontWeight: 900,
          color: BG, cursor: "pointer", fontFamily: SANS,
          letterSpacing: "0.03em",
          boxShadow: `0 4px 24px ${GOLD}44`,
        }}>
          Save Income Plan
        </button>
      </div>
    </div>
  );
}
