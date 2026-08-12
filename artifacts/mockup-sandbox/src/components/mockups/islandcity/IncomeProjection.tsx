import { useState, useRef, useEffect } from "react";

// ── INCOME PROJECTION — VIBRANT REDESIGN ────────────────────────────────────
// Flow: STEP 1 · Which days? → STEP 2 · How much each day? → STEP 3 · Total
// Full-saturation colors, zero grey, clear step hierarchy.

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
  { name: "EcoRide 10%",   bg: "#166534", fg: "#bbf7d0" },
  { name: "Other",          bg: "#334155", fg: "#cbd5e1" },
];

// Solid, full-saturation palette
const GOLD   = "#f6dd8c";   // headline gold — full opacity
const GOLDB  = "#d97706";   // darker gold for borders/accents
const GREEN  = "#4ade80";
const ORANGE = "#f97316";
const BLUE   = "#3b82f6";
const BG     = "#0b0700";
const MONO   = "JetBrains Mono,monospace";
const SANS   = "Inter,sans-serif";
const CINZEL = "Cinzel,serif";

// Step badge colors
const STEPS = [
  { num: "1", color: ORANGE, label: "PICK YOUR DAYS"        },
  { num: "2", color: GOLD,   label: "SET DAILY TARGETS"     },
  { num: "3", color: GREEN,  label: "YOUR WEEK AT A GLANCE" },
];

function StepHeader({ step, extraRight }: { step: typeof STEPS[0]; extraRight?: React.ReactNode }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      marginBottom: 14,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{
          width: 28, height: 28, borderRadius: "50%",
          background: step.color, color: "#0b0700",
          fontFamily: MONO, fontSize: 14, fontWeight: 900,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>{step.num}</span>
        <span style={{ fontFamily: SANS, fontSize: 13, fontWeight: 800,
          color: step.color, letterSpacing: "0.12em" }}>{step.label}</span>
      </div>
      {extraRight}
    </div>
  );
}

function initials(name: string) {
  const w = name.split(" ");
  return w.length === 1 ? name.slice(0, 2).toUpperCase() : w.map(x => x[0]).join("").slice(0, 3).toUpperCase();
}

// ── Platform Dropdown ─────────────────────────────────────────────────────────
function PlatformDropdown({
  platforms, value, onChange, onAdd,
}: {
  platforms: typeof PLATFORMS;
  value: string;
  onChange: (v: string) => void;
  onAdd: (name: string) => void;
}) {
  const [open, setOpen]     = useState(false);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft]   = useState("");
  const ref      = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sel      = platforms.find(p => p.name === value);

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
    <div ref={ref} style={{ position: "relative" }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 800,
        color: GOLD, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 8 }}>
        PRIMARY PLATFORM
      </label>
      <button onClick={() => { setOpen(o => !o); setAdding(false); }} style={{
        width: "100%",
        background: open ? "#1a0e00" : "#120a00",
        border: `2px solid ${open ? GOLD : GOLDB}`,
        borderRadius: 14, padding: "12px 14px", cursor: "pointer",
        display: "flex", alignItems: "center", gap: 10,
        transition: "all 0.15s",
        boxShadow: open ? `0 0 20px ${GOLD}33` : "none",
      }}>
        {sel ? (
          <>
            <span style={{
              width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
              background: sel.bg, color: sel.fg,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 9, fontWeight: 900,
            }}>{initials(sel.name)}</span>
            <span style={{ flex: 1, textAlign: "left", color: "#fff",
              fontFamily: SANS, fontSize: 16, fontWeight: 700 }}>{sel.name}</span>
          </>
        ) : (
          <span style={{ flex: 1, textAlign: "left", color: "#5a4020",
            fontFamily: SANS, fontSize: 15 }}>Choose platform…</span>
        )}
        <span style={{ color: GOLD, fontSize: 12, display: "inline-block",
          transition: "transform 0.15s", transform: open ? "rotate(180deg)" : "none" }}>▼</span>
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 99,
          background: "#140c00", border: `2px solid ${GOLDB}`,
          borderRadius: 14, boxShadow: "0 16px 40px #000000bb",
          maxHeight: 270, overflowY: "auto",
        }}>
          {platforms.map(p => {
            const on = value === p.name;
            return (
              <button key={p.name} onClick={() => { onChange(p.name); setOpen(false); }} style={{
                width: "100%", background: on ? "#2a1800" : "transparent",
                border: "none", borderBottom: "1px solid #1e1000",
                padding: "10px 14px", cursor: "pointer",
                display: "flex", alignItems: "center", gap: 10,
              }}>
                <span style={{
                  width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
                  background: p.bg, color: p.fg,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 9, fontWeight: 900,
                }}>{initials(p.name)}</span>
                <span style={{
                  flex: 1, textAlign: "left", fontFamily: SANS, fontSize: 14,
                  fontWeight: on ? 800 : 400, color: on ? GOLD : "#c8a050",
                }}>{p.name}</span>
                {on && <span style={{ color: GREEN, fontSize: 16 }}>✓</span>}
              </button>
            );
          })}
          {!adding ? (
            <button onClick={() => { setAdding(true); setTimeout(() => inputRef.current?.focus(), 50); }}
              style={{
                width: "100%", background: "transparent", border: "none",
                borderTop: `2px dashed ${GOLDB}66`, padding: "11px 14px",
                cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
                color: GOLD, fontFamily: SANS, fontSize: 14, fontWeight: 700,
              }}>
              <span style={{ fontSize: 20, lineHeight: 1 }}>+</span> Nueva plataforma…
            </button>
          ) : (
            <div style={{ padding: "10px 12px", borderTop: `2px dashed ${GOLDB}66`,
              display: "flex", gap: 8, alignItems: "center" }}>
              <input ref={inputRef} type="text" value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => { if (e.key==="Enter") confirm(); if (e.key==="Escape") { setAdding(false); setDraft(""); } }}
                placeholder="Platform name…"
                style={{
                  flex: 1, background: "#0b0700", border: `2px solid ${GOLD}`,
                  borderRadius: 8, padding: "7px 10px", color: "#fff",
                  fontFamily: SANS, fontSize: 13, outline: "none",
                }}
              />
              <button onClick={confirm} style={{
                background: GOLD, border: "none", borderRadius: 8,
                padding: "7px 14px", color: "#0b0700",
                fontFamily: SANS, fontWeight: 900, fontSize: 13, cursor: "pointer",
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
    1:"400", 2:"350", 3:"350", 4:"400", 5:"480",
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
    <div style={{ minHeight: "100vh", background: BG, fontFamily: SANS, color: "#fff", overflowY: "auto" }}>

      {/* ── Header ── */}
      <div style={{
        background: `linear-gradient(160deg,#1c0e00,${BG})`,
        borderBottom: `3px solid ${GOLDB}`,
        padding: "44px 18px 16px",
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <div style={{
          width: 46, height: 46, borderRadius: "50%",
          background: "#1c0e00",
          border: `2.5px solid ${GOLD}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 22, boxShadow: `0 0 20px ${GOLD}55`,
        }}>🌉</div>
        <div>
          <p style={{ margin: 0, fontFamily: CINZEL, fontWeight: 700,
            fontSize: 18, letterSpacing: "0.06em", color: GOLD }}>ISLANDCITY</p>
          <p style={{ margin: 0, fontSize: 10, color: GOLDB,
            letterSpacing: "0.28em", textTransform: "uppercase", fontWeight: 700 }}>
            Weekly Income Target
          </p>
        </div>
        <div style={{ marginLeft: "auto", textAlign: "right" }}>
          <p style={{ margin: 0, fontSize: 10, color: "#5a4020", fontWeight: 600 }}>THIS WEEK</p>
          <p style={{ margin: 0, fontFamily: MONO, fontSize: 20, fontWeight: 900, color: GREEN }}>
            ${total.toLocaleString()}
          </p>
        </div>
      </div>

      <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: 14 }}>

        {/* ── STEP 1: Days ── */}
        <div style={{
          background: "#120900",
          border: `2px solid ${ORANGE}`,
          borderRadius: 20, padding: "16px 16px",
          boxShadow: `0 0 24px ${ORANGE}22`,
        }}>
          <StepHeader step={STEPS[0]} extraRight={
            <span style={{ fontFamily: MONO, fontSize: 13, color: ORANGE, fontWeight: 700 }}>
              {activeDays.size} days
            </span>
          } />

          {/* 7-day toggle row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 5 }}>
            {DAYS.map(d => {
              const on = activeDays.has(d.iso);
              return (
                <button key={d.iso} onClick={() => toggleDay(d.iso)} style={{
                  padding: "10px 0",
                  borderRadius: 12,
                  border: `2px solid ${on ? ORANGE : "#2a1500"}`,
                  background: on ? ORANGE : "#0d0600",
                  color: on ? "#0b0700" : "#3a2200",
                  fontFamily: SANS, fontSize: 9, fontWeight: 900,
                  cursor: "pointer", transition: "all 0.15s",
                  boxShadow: on ? `0 0 14px ${ORANGE}66` : "none",
                  display: "flex", flexDirection: "column",
                  alignItems: "center", gap: 2, letterSpacing: "0.02em",
                }}>
                  {d.abbr.slice(0, 1)}
                  <span style={{ fontSize: 7, opacity: on ? 1 : 0.5 }}>{d.abbr.slice(1)}</span>
                </button>
              );
            })}
          </div>

          {/* Day names below */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 5, marginTop: 4 }}>
            {DAYS.map(d => (
              <div key={d.iso} style={{
                textAlign: "center", fontSize: 7, fontWeight: 700,
                color: activeDays.has(d.iso) ? ORANGE : "#2a1800",
                letterSpacing: "0em",
              }}>{d.abbr}</div>
            ))}
          </div>
        </div>

        {/* ── STEP 2: Daily targets ── */}
        <div style={{
          background: "#0e0d00",
          border: `2px solid ${GOLDB}`,
          borderRadius: 20, padding: "16px 16px",
          boxShadow: `0 0 24px ${GOLDB}22`,
        }}>
          <StepHeader step={STEPS[1]} extraRight={
            ordered.length > 0 ? (
              <span style={{ fontFamily: MONO, fontSize: 12, color: "#7a6020", fontWeight: 700 }}>
                avg ${avg}/day
              </span>
            ) : undefined
          } />

          {ordered.length === 0 ? (
            <div style={{
              textAlign: "center", padding: "20px 0",
              color: "#3a2a00", fontFamily: SANS, fontSize: 14, fontWeight: 600,
            }}>
              ↑ Select at least one day above
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {ordered.map((d, i) => {
                const val = parseFloat(dayGoals[d.iso] || "0") || 0;
                // Color scale: higher index days in a slightly different shade
                const rowColor = val >= 400 ? GOLD : val >= 300 ? "#d4a820" : "#a07820";
                return (
                  <div key={d.iso} style={{
                    display: "flex", alignItems: "center", gap: 12,
                    background: "#0b0900",
                    border: val > 0 ? `2px solid ${GOLDB}88` : "2px solid #1e1400",
                    borderRadius: 14, padding: "10px 12px",
                    transition: "border-color 0.2s",
                    boxShadow: val > 0 ? `0 0 10px ${GOLDB}22` : "none",
                  }}>
                    <div style={{ width: 56, flexShrink: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 900, color: GOLD,
                        fontFamily: SANS, letterSpacing: "0.04em" }}>{d.abbr}</div>
                      <div style={{ fontSize: 10, color: "#5a4020" }}>{d.full}</div>
                    </div>
                    <div style={{ flex: 1, position: "relative" }}>
                      <span style={{
                        position: "absolute", left: 10, top: "50%",
                        transform: "translateY(-50%)",
                        fontFamily: MONO, fontSize: 20, fontWeight: 900,
                        color: val > 0 ? rowColor : "#3a2800",
                        pointerEvents: "none",
                      }}>$</span>
                      <input
                        type="number" inputMode="decimal"
                        value={dayGoals[d.iso] ?? ""}
                        placeholder="0"
                        onChange={e => setDayGoals(p => ({ ...p, [d.iso]: e.target.value }))}
                        style={{
                          width: "100%", boxSizing: "border-box",
                          background: "transparent",
                          border: "none",
                          borderBottom: `2px solid ${val > 0 ? GOLDB : "#2a1a00"}`,
                          padding: "6px 8px 6px 28px",
                          color: val > 0 ? "#fff" : "#4a3010",
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
          background: "#001409",
          border: `2px solid ${GREEN}`,
          borderRadius: 20, padding: "16px 16px",
          boxShadow: `0 0 28px ${GREEN}22`,
        }}>
          <StepHeader step={STEPS[2]} />

          {/* Big total */}
          <div style={{
            display: "flex", alignItems: "baseline", gap: 4,
            marginBottom: 6,
          }}>
            <span style={{ fontFamily: MONO, fontSize: 52, fontWeight: 900,
              color: total > 0 ? GREEN : "#1a3a20", lineHeight: 1,
              textShadow: total > 0 ? `0 0 30px ${GREEN}88` : "none",
              transition: "all 0.3s",
            }}>${total.toLocaleString()}</span>
            <span style={{ fontFamily: SANS, fontSize: 14, color: "#3a6040", fontWeight: 600 }}>/wk</span>
          </div>

          {/* Per-day breakdown bar */}
          {total > 0 && ordered.length > 0 && (
            <>
              <div style={{ display: "flex", height: 8, borderRadius: 999, overflow: "hidden", gap: 2, marginBottom: 8 }}>
                {ordered.map(d => {
                  const amt = parseFloat(dayGoals[d.iso] || "0") || 0;
                  return amt > 0 ? (
                    <div key={d.iso} style={{
                      flex: amt, background: GREEN, opacity: 0.3 + (amt / 600) * 0.7,
                      minWidth: 4, borderRadius: 999,
                    }} />
                  ) : null;
                })}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 12px", marginBottom: 14 }}>
                {ordered.map(d => {
                  const amt = parseFloat(dayGoals[d.iso] || "0") || 0;
                  if (!amt) return null;
                  return (
                    <span key={d.iso} style={{ fontFamily: MONO, fontSize: 12, color: "#3a7048" }}>
                      <span style={{ color: GREEN, fontWeight: 800 }}>{d.abbr}</span> ${amt}
                    </span>
                  );
                })}
              </div>
            </>
          )}

          {/* Platform dropdown inside Step 3 */}
          <PlatformDropdown
            platforms={platforms}
            value={platform}
            onChange={setPlatform}
            onAdd={addPlatform}
          />
        </div>

        {/* ── Save ── */}
        <button style={{
          width: "100%", padding: "17px",
          background: GOLD,
          border: "none", borderRadius: 18,
          fontSize: 16, fontWeight: 900,
          color: "#0b0700", cursor: "pointer",
          fontFamily: SANS, letterSpacing: "0.04em",
          boxShadow: `0 4px 28px ${GOLD}55`,
        }}>
          Save Income Plan
        </button>
      </div>
    </div>
  );
}
