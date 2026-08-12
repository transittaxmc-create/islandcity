import React, { useRef, useEffect } from "react";
import { Send, Sparkles, User } from "lucide-react";
import "./_group.css";

// ── FINANCES BOLD CHAT ───────────────────────────────────────────────────────
// Expands the Advisor Panel into a mini chat interface with Gemini.

const ZONES = [
  { min: 0,  max: 45, color: "#ef4444", label: "Bajo"   },
  { min: 45, max: 58, color: "#f97316", label: "OK"     },
  { min: 58, max: 68, color: "#eab308", label: "Bueno"  },
  { min: 68, max: 80, color: "#4ade80", label: "Gran"   },
  { min: 80, max: 90, color: "#3b82f6", label: "Óptimo" },
];
const MAX_VAL = 90;

function valToAngle(v: number) {
  return 180 + Math.min(v / MAX_VAL, 1) * 180;
}
function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}
function arc(cx: number, cy: number, r: number, a1: number, a2: number) {
  const s = polar(cx, cy, r, a1);
  const e = polar(cx, cy, r, a2);
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${a2 - a1 > 180 ? 1 : 0} 1 ${e.x} ${e.y}`;
}

function Gauge({ value }: { value: number }) {
  const CX = 155, CY = 128, R = 108, SW = 26;
  const zone = ZONES.find(z => value >= z.min && value < z.max) ?? ZONES[ZONES.length - 1];
  const needleAngle = valToAngle(Math.min(value, MAX_VAL));
  const tip = polar(CX, CY, R - 8, needleAngle);
  const b1  = polar(CX, CY, 11, needleAngle + 90);
  const b2  = polar(CX, CY, 11, needleAngle - 90);
  return (
    <svg width="310" height="148" viewBox="0 0 310 148">
      {/* Track */}
      <path d={arc(CX, CY, R, 180, 360)} fill="none" stroke="#161616" strokeWidth={SW} />
      {/* Zone arcs */}
      {ZONES.map(z => (
        <path key={z.label}
          d={arc(CX, CY, R, valToAngle(z.min), valToAngle(Math.min(z.max, MAX_VAL)))}
          fill="none" stroke={z.color} strokeWidth={SW - 4} strokeLinecap="butt" opacity={0.88} />
      ))}
      {/* Zone dividers */}
      {[45, 58, 68, 80].map(v => {
        const a = valToAngle(v);
        const i2 = polar(CX, CY, R - SW / 2 + 1, a);
        const o2 = polar(CX, CY, R + SW / 2 - 3, a);
        return <line key={v} x1={i2.x} y1={i2.y} x2={o2.x} y2={o2.y} stroke="#000" strokeWidth="2.5" opacity="0.6" />;
      })}
      {/* $0 / $90 labels */}
      <text x="44" y="146" fill="#3a3a3a" fontSize="10" fontFamily="JetBrains Mono,monospace">$0</text>
      <text x="252" y="146" fill="#3a3a3a" fontSize="10" fontFamily="JetBrains Mono,monospace">$90</text>
      {/* Zone labels on arc */}
      {ZONES.map(z => {
        const midAngle = valToAngle((z.min + Math.min(z.max, MAX_VAL)) / 2);
        const p = polar(CX, CY, R - SW / 2 - 14, midAngle);
        return (
          <text key={z.label} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle"
            fill={z.color} fontSize="8" fontWeight="700" fontFamily="JetBrains Mono,monospace" opacity="0.7">
            {z.label}
          </text>
        );
      })}
      {/* Needle */}
      <defs>
        <filter id="needleGlow"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <polygon points={`${tip.x},${tip.y} ${b1.x},${b1.y} ${b2.x},${b2.y}`}
        fill={zone.color} filter="url(#needleGlow)" />
      {/* Hub */}
      <circle cx={CX} cy={CY} r="11" fill="#0e0e0e" stroke={zone.color} strokeWidth="2.5" />
      {/* Current rate — big label inside arc */}
      <text x={CX} y={CY - 50} textAnchor="middle" fill={zone.color}
        fontSize="36" fontWeight="900" fontFamily="JetBrains Mono,monospace">${value}.40</text>
      <text x={CX} y={CY - 30} textAnchor="middle" fill="#555"
        fontSize="10" fontFamily="JetBrains Mono,monospace">/hr AHORA</text>
    </svg>
  );
}

// Stat chip row (Target vs Actual)
function StatChip({ label, val, sub, color }: { label: string; val: string; sub?: string; color: string }) {
  return (
    <div style={{ flex: 1, background: "#0d0d0d", borderRadius: 14, padding: "10px 10px 8px" }}>
      <p style={{ margin: 0, fontSize: 8, color: "#444", textTransform: "uppercase", letterSpacing: "0.18em" }}>{label}</p>
      <p style={{ margin: "4px 0 2px", fontSize: 18, fontWeight: 900, color, fontFamily: "JetBrains Mono,monospace", lineHeight: 1 }}>{val}</p>
      {sub && <p style={{ margin: 0, fontSize: 9, color: "#444" }}>{sub}</p>}
    </div>
  );
}

// Mini bar (Performance History)
function HistoryBar({ h, color, label }: { h: number; color: string; label: string }) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <div style={{ width: "70%", height: 56, display: "flex", alignItems: "flex-end" }}>
        <div style={{ width: "100%", height: `${h}%`, background: color, borderRadius: "4px 4px 0 0", opacity: 0.85 }} />
      </div>
      <p style={{ margin: 0, fontSize: 9, color: "#444" }}>{label}</p>
    </div>
  );
}

const goldStyle: React.CSSProperties = {
  background: "linear-gradient(90deg,#f6dd8c,#d9b64f)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

export function FinancesBoldChat() {
  const perHour   = 65;
  const grossToday = 285.00;
  const goalToday  = 400;
  const goalPct    = grossToday / goalToday;
  const R = 42, CX = 52, CY = 52, circ = 2 * Math.PI * R;
  const filled = Math.min(goalPct, 1) * circ;
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  return (
    <div style={{ minHeight: "100vh", width: "100%", background: "#000", color: "#fff",
      fontFamily: "Inter,sans-serif", overflowY: "auto", paddingBottom: "24px" }}>
      <div style={{ maxWidth: 390, margin: "0 auto" }}>

        {/* ── IC Brand header ─────────────────────────────────────────────── */}
        <div style={{
          background: "#0a0800",
          borderBottom: "1px solid #d9b64f22",
          padding: "44px 16px 14px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          {/* Logo + name */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 38, height: 38, borderRadius: "50%",
              background: "radial-gradient(circle at 40% 40%,#1a1500,#000)",
              border: "1.5px solid #d9b64f55",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16,
            }}>🌉</div>
            <div>
              <p style={{ margin: 0, fontFamily: "Cinzel,serif", fontWeight: 700, fontSize: 15,
                letterSpacing: "0.04em", ...goldStyle as any }}>ISLANDCITY</p>
              <p style={{ margin: 0, fontSize: 7, color: "#a07820", letterSpacing: "0.3em", textTransform: "uppercase" }}>
                TRANSIT SERVICES
              </p>
            </div>
          </div>
          {/* EN TURNO badge */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{
              background: "#0f1f0f", border: "1px solid #4ade8040",
              borderRadius: 999, padding: "4px 12px",
              fontSize: 10, color: "#4ade80", fontWeight: 700,
              display: "flex", alignItems: "center", gap: 5,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80", display: "inline-block" }}/>
              EN TURNO
            </span>
            <div style={{
              width: 32, height: 32, borderRadius: "50%", background: "#161616",
              border: "1px solid #222", display: "flex", alignItems: "center", justifyContent: "center",
              color: "#f6dd8c", fontSize: 11, fontWeight: 700,
            }}>M</div>
          </div>
        </div>

        {/* ── HOURLY EARNINGS ADVISOR card ───────────────────────────────── */}
        <div style={{ margin: "12px 12px 0",
          background: "#080808", border: "1px solid #1e1e1e", borderRadius: 22, overflow: "hidden" }}>
          {/* Card title */}
          <div style={{ padding: "14px 18px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#d9b64f",
              textTransform: "uppercase", letterSpacing: "0.18em" }}>HOURLY EARNINGS</p>
            <span style={{
              fontSize: 9, color: "#555", background: "#111",
              border: "1px solid #222", borderRadius: 999, padding: "3px 9px",
            }}>CURRENT RATE</span>
          </div>

          {/* Gauge — centred */}
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 8 }}>
            <Gauge value={perHour} />
          </div>
        </div>

        {/* ── TARGET VS. ACTUAL ───────────────────────────────────────────── */}
        <div style={{ margin: "10px 12px 0",
          background: "#080808", border: "1px solid #1e1e1e", borderRadius: 22, padding: "14px 16px" }}>
          <p style={{ margin: "0 0 10px", fontSize: 9, color: "#555",
            textTransform: "uppercase", letterSpacing: "0.22em", fontWeight: 700 }}>TARGET VS. ACTUAL</p>
          <div style={{ display: "flex", gap: 8 }}>
            <StatChip label="Weekly Reg."  val="$68/hr"  sub="meta semanal" color="#d9b64f" />
            <StatChip label="$/hr Actual"  val="$65/hr"  sub="este turno"   color="#4ade80" />
            <StatChip label="Last Hour"    val="$71/hr"  sub="12:00–1:00"   color="#3b82f6" />
          </div>
        </div>

        {/* ── ADVISOR CHAT PANEL ──────────────────────────────────────────── */}
        <div style={{ margin: "10px 12px 0",
          background: "#050505",
          border: "1px solid #d9b64f22", borderRadius: 22, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          
          {/* Header */}
          <div style={{ padding: "14px 16px 12px", borderBottom: "1px solid #1e1e1e", display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(135deg,#0a0900,#120f00)" }}>
             <p style={{ margin: 0, fontSize: 10, color: "#a07820",
              textTransform: "uppercase", letterSpacing: "0.22em", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                <Sparkles size={12} color="#f6dd8c" />
                AI ADVISOR
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                 <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80", opacity: 0.8 }} />
                 <span style={{ fontSize: 9, color: "#777", letterSpacing: "0.05em" }}>LIVE</span>
              </div>
          </div>

          {/* Scrollable Messages Area */}
          <div style={{ height: "320px", overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: 16 }}>
            
            {/* AI Message 1 */}
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start", maxWidth: "90%" }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                background: "#d9b64f22", border: "1px solid #d9b64f44",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Sparkles size={14} color="#f6dd8c" />
              </div>
              <div>
                <div style={{ background: "#111", padding: "12px", borderRadius: "4px 14px 14px 14px", border: "1px solid #1a1a1a" }}>
                  <p style={{ margin: "0 0 5px", fontSize: 12, fontWeight: 700, color: "#f6dd8c" }}>Your performance is good!</p>
                  <p style={{ margin: "0 0 8px", fontSize: 11, color: "#aaa", lineHeight: 1.5 }}>
                    $65/hr está en la zona <span style={{ color: "#4ade80", fontWeight: 700 }}>GRAN</span>.
                    Focus on high-demand zones or a slightly higher rate per mile to maintain target of $68–$70/hr.
                    Avoid lower-paid jobs.
                  </p>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {["Alta demanda →", "Evitar tráfico", "Meta: $70/hr"].map(tag => (
                      <span key={tag} style={{
                        fontSize: 8, color: "#d9b64f", background: "#d9b64f12",
                        border: "1px solid #d9b64f30", borderRadius: 999, padding: "3px 8px",
                      }}>{tag}</span>
                    ))}
                  </div>
                </div>
                <span style={{ fontSize: 9, color: "#444", marginLeft: 4, marginTop: 4, display: "block" }}>12:45 PM</span>
              </div>
            </div>

            {/* User Message 1 */}
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start", alignSelf: "flex-end", maxWidth: "85%", flexDirection: "row-reverse" }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                background: "#161616", border: "1px solid #333",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <User size={14} color="#888" />
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                <div style={{ background: "#222", padding: "10px 14px", borderRadius: "14px 4px 14px 14px" }}>
                  <p style={{ margin: 0, fontSize: 12, color: "#eee", lineHeight: 1.4 }}>
                    Should I go to JFK now?
                  </p>
                </div>
                <span style={{ fontSize: 9, color: "#444", marginRight: 4, marginTop: 4 }}>1:12 PM</span>
              </div>
            </div>

            {/* AI Message 2 */}
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start", maxWidth: "90%" }}>
               <div style={{
                width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                background: "#d9b64f22", border: "1px solid #d9b64f44",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Sparkles size={14} color="#f6dd8c" />
              </div>
              <div>
                <div style={{ background: "#111", padding: "12px", borderRadius: "4px 14px 14px 14px", border: "1px solid #1a1a1a" }}>
                  <p style={{ margin: 0, fontSize: 11, color: "#aaa", lineHeight: 1.5 }}>
                    JFK is seeing <span style={{ color: "#f97316", fontWeight: 700 }}>moderate traffic</span> but <span style={{ color: "#4ade80", fontWeight: 700 }}>high demand</span>. A trip there takes ~45 mins, but you're highly likely to grab a $50+ fare back to Manhattan or Brooklyn. Go for it if you want longer sustained drives.
                  </p>
                </div>
                <span style={{ fontSize: 9, color: "#444", marginLeft: 4, marginTop: 4, display: "block" }}>1:12 PM</span>
              </div>
            </div>

            {/* User Message 2 */}
             <div style={{ display: "flex", gap: 10, alignItems: "flex-start", alignSelf: "flex-end", maxWidth: "85%", flexDirection: "row-reverse" }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                background: "#161616", border: "1px solid #333",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <User size={14} color="#888" />
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                <div style={{ background: "#222", padding: "10px 14px", borderRadius: "14px 4px 14px 14px" }}>
                  <p style={{ margin: 0, fontSize: 12, color: "#eee", lineHeight: 1.4 }}>
                    When should I clock out to hit my $400 goal?
                  </p>
                </div>
                <span style={{ fontSize: 9, color: "#444", marginRight: 4, marginTop: 4 }}>1:15 PM</span>
              </div>
            </div>

            {/* AI Message 3 */}
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start", maxWidth: "90%" }}>
               <div style={{
                width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                background: "#d9b64f22", border: "1px solid #d9b64f44",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Sparkles size={14} color="#f6dd8c" />
              </div>
              <div>
                <div style={{ background: "#111", padding: "12px", borderRadius: "4px 14px 14px 14px", border: "1px solid #1a1a1a" }}>
                  <p style={{ margin: 0, fontSize: 11, color: "#aaa", lineHeight: 1.5 }}>
                    At your current pace of <span style={{ color: "#fff", fontWeight: 700 }}>$65/hr</span>, you'll hit $400 in about 1 hour and 45 minutes, right around <span style={{ color: "#3b82f6", fontWeight: 700 }}>5:45 PM</span>. Keep up the rhythm!
                  </p>
                </div>
                <span style={{ fontSize: 9, color: "#444", marginLeft: 4, marginTop: 4, display: "block" }}>1:15 PM</span>
              </div>
            </div>

            <div ref={chatEndRef} />
          </div>

          {/* Input Area */}
          <div style={{ padding: "10px 14px 14px", borderTop: "1px solid #1a1a1a", background: "#0a0a0a" }}>
            <div style={{ display: "flex", gap: 8, background: "#161616", border: "1px solid #222", borderRadius: "999px", padding: "4px 4px 4px 16px", alignItems: "center" }}>
              <input 
                type="text" 
                placeholder="Ask your AI advisor..." 
                disabled
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#fff",
                  fontSize: 12,
                  flex: 1,
                  outline: "none",
                  fontFamily: "Inter, sans-serif"
                }}
              />
              <button style={{
                width: 32, height: 32, borderRadius: "50%", background: "#d9b64f",
                display: "flex", alignItems: "center", justifyContent: "center",
                border: "none", cursor: "pointer", flexShrink: 0
              }}>
                <Send size={14} color="#000" style={{ marginLeft: -2, marginTop: 1 }} />
              </button>
            </div>
            
            <div style={{ display: "flex", gap: 6, overflowX: "auto", padding: "12px 0 0", scrollbarWidth: "none" }}>
              {["Optimize my route", "Show high demand", "End shift summary"].map(sugg => (
                 <button key={sugg} style={{
                    whiteSpace: "nowrap",
                    background: "#111", border: "1px solid #222", color: "#888",
                    padding: "6px 12px", borderRadius: "999px", fontSize: 10,
                    cursor: "pointer", fontFamily: "Inter, sans-serif"
                 }}>
                   {sugg}
                 </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── HOY — Meta diaria (ring) ────────────────────────────────────── */}
        <div style={{ margin: "10px 12px 20px",
          background: "#080808", border: "1px solid #1e1e1e", borderRadius: 22, padding: "16px" }}>
          <p style={{ margin: "0 0 12px", fontSize: 9, color: "#555",
            textTransform: "uppercase", letterSpacing: "0.22em", fontWeight: 700 }}>HOY — META DIARIA</p>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            {/* Ring */}
            <svg width={104} height={104} style={{ flexShrink: 0 }}>
              <circle cx={CX} cy={CY} r={R} fill="none" stroke="#141414" strokeWidth={9} />
              <circle cx={CX} cy={CY} r={R} fill="none"
                stroke={goalPct >= 1 ? "#4ade80" : "#d9b64f"} strokeWidth={9}
                strokeLinecap="round" strokeDasharray={`${filled} ${circ}`}
                transform={`rotate(-90 ${CX} ${CY})`} />
              <text x={CX} y={CY - 4} textAnchor="middle" fill={goalPct >= 1 ? "#4ade80" : "#f6dd8c"}
                fontSize="17" fontWeight="900" fontFamily="JetBrains Mono,monospace">
                {Math.round(goalPct * 100)}%
              </text>
              <text x={CX} y={CY + 12} textAnchor="middle" fill="#444" fontSize="8"
                fontFamily="JetBrains Mono,monospace">$285/$400</text>
            </svg>
            {/* Stats list */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { label: "Today",      val: `$${grossToday.toFixed(0)}`, color: "#fff"     },
                { label: "Daily Goal", val: `$${goalToday}`,             color: "#f6dd8c"  },
                { label: "Remaining",  val: `$${Math.max(goalToday - grossToday, 0).toFixed(0)}`, color: "#4ade80" },
                { label: "Meta ≈",     val: "5:45 PM",                   color: "#3b82f6"  },
              ].map(r => (
                <div key={r.label} style={{ display: "flex", justifyContent: "space-between" }}>
                  <p style={{ margin: 0, fontSize: 12, color: "#666" }}>{r.label}</p>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: r.color,
                    fontFamily: "JetBrains Mono,monospace" }}>{r.val}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
