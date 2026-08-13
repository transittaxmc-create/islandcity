import { useState } from "react";

export function ThemeSwitch() {
  const [dark, setDark] = useState(true);

  const d = {
    bg:       dark ? "#0a0a0a"  : "#f0f0f0",
    card:     dark ? "#0d0d0d"  : "#ffffff",
    border:   dark ? "#1e1e1e"  : "#e4e4e7",
    text:     dark ? "#ffffff"  : "#18181b",
    sub:      dark ? "#737373"  : "#71717a",
    mono:     dark ? "#525252"  : "#a1a1aa",
    badge:    dark ? "#111"     : "#f4f4f5",
    badgeBdr: dark ? "#2a2a2a"  : "#e4e4e7",
    badgeTxt: dark ? "#737373"  : "#71717a",
    gold:     dark ? "linear-gradient(90deg,#f6dd8c,#d9b64f)" : "linear-gradient(90deg,#b45309,#d97706)",
    goldSolid:dark ? "#f6dd8c"  : "#b45309",
    btnBdr:   dark ? "#d9b64f99": "#d97706",
    btnTxt:   dark ? "#f6dd8c"  : "#b45309",
    sep:      dark ? "linear-gradient(90deg,#1e1400,#1e1e1e)" : "#f4f4f5",
    gaugeTrack: dark ? "#1e1e1e": "#f4f4f5",
    navBg:    dark ? "#0d0d0d"  : "#ffffff",
    navBdr:   dark ? "#1e1e1e"  : "#e4e4e7",
    navActive:dark ? "#f6dd8c"  : "#b45309",
    navDot:   dark ? "#f6dd8c"  : "#d97706",
    toggleTrack: dark ? "#facc15": "#d4d4d8",
    toggleKnob:  dark ? "#000"   : "#fff",
    toggleKnobPos: dark ? "right" : "left",
    barFill:  dark ? "linear-gradient(90deg,#d97706,#f6dd8c)" : "linear-gradient(90deg,#b45309,#f59e0b)",
    barBg:    dark ? "#1a1a1a"  : "#f4f4f5",
    shadow:   dark ? "none"     : "0 1px 4px #0000000a",
  };

  return (
    <div style={{ minHeight:"100vh", background:d.bg, fontFamily:"'Inter',sans-serif", transition:"background 0.3s" }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"20px 16px 12px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:36, height:36, borderRadius:10, background:"linear-gradient(135deg,#d97706,#f6dd8c)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>📊</div>
          <div>
            <p style={{ fontSize:13, fontWeight:900, letterSpacing:"0.14em", color:d.text, margin:0, transition:"color 0.3s" }}>ISLANDCITY</p>
            <p style={{ fontSize:8, letterSpacing:"0.2em", color:d.sub, margin:0, transition:"color 0.3s" }}>TRANSIT SERVICES</p>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          {/* LIVE SWITCH */}
          <button onClick={() => setDark(!dark)} style={{
            display:"flex", alignItems:"center", gap:6,
            background: dark ? "#1a1a1a" : "#ffffff",
            border: `1px solid ${dark ? "#2e2e2e" : "#e4e4e7"}`,
            borderRadius:20, padding:"5px 10px", cursor:"pointer", transition:"all 0.3s"
          }}>
            <span style={{ fontSize:12, opacity: dark ? 1 : 0.35, transition:"opacity 0.3s" }}>🌙</span>
            <div style={{ width:30, height:17, borderRadius:9, background:d.toggleTrack, position:"relative", transition:"background 0.3s" }}>
              <div style={{
                width:13, height:13, borderRadius:"50%", background:d.toggleKnob,
                position:"absolute", top:2, transition:"left 0.25s, right 0.25s",
                ...(dark ? { right:2 } : { left:2 }),
                boxShadow: dark ? "none" : "0 1px 3px #0003"
              }} />
            </div>
            <span style={{ fontSize:12, opacity: dark ? 0.35 : 1, transition:"opacity 0.3s" }}>☀️</span>
          </button>
          <div style={{ width:34, height:34, borderRadius:"50%", background: dark ? "#1a1a1a" : "#18181b", border:`1px solid ${dark ? "#2e2e2e" : "#3f3f46"}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, color:"#f6dd8c" }}>M</div>
        </div>
      </div>

      {/* Greeting */}
      <div style={{ padding:"0 16px 12px" }}>
        <p style={{ fontSize:22, fontWeight:900, color:d.text, margin:"0 0 3px", transition:"color 0.3s" }}>Good evening, Miguel.</p>
        <p style={{ fontSize:10, letterSpacing:"0.12em", color:d.sub, fontWeight:600, margin:"0 0 2px", transition:"color 0.3s" }}>THURSDAY, AUGUST 13, 2026</p>
        <p style={{ fontSize:10, color:d.mono, fontFamily:"'JetBrains Mono',monospace", margin:0, transition:"color 0.3s" }}>2:36 AM</p>
      </div>

      <div style={{ padding:"0 16px", display:"flex", flexDirection:"column", gap:12 }}>
        {/* Main status card */}
        <div style={{ background:d.card, border:`1px solid ${d.border}`, borderRadius:20, padding:"14px 16px", position:"relative", overflow:"hidden", boxShadow:d.shadow, transition:"all 0.3s" }}>
          <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:"linear-gradient(90deg,#d97706,#f6dd8c44,transparent)" }} />
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <p style={{ fontSize:10, color:d.sub, fontFamily:"'JetBrains Mono',monospace", margin:0, transition:"color 0.3s" }}>Thu, Aug 13 · 2:36 AM</p>
            <span style={{ background:d.badge, border:`1px solid ${d.badgeBdr}`, color:d.badgeTxt, borderRadius:20, fontSize:9, fontWeight:700, letterSpacing:"0.12em", padding:"3px 10px", transition:"all 0.3s" }}>● OFF DUTY</span>
          </div>
          <p style={{ fontSize:10, color:d.mono, fontFamily:"'JetBrains Mono',monospace", margin:"8px 0 0", transition:"color 0.3s" }}>GPS inactive</p>
          <p style={{ fontSize:34, fontWeight:900, background:d.gold, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", margin:"6px 0 2px", fontFamily:"'JetBrains Mono',monospace", transition:"all 0.3s" }}>$141.23</p>
          <p style={{ fontSize:10, color:d.sub, fontFamily:"'JetBrains Mono',monospace", margin:0, transition:"color 0.3s" }}>7 trips · fare + tips + tolls</p>
          <div style={{ height:1, background:d.sep, margin:"12px 0", transition:"background 0.3s" }} />
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ width:6, height:6, borderRadius:"50%", background: dark ? "#404040" : "#d4d4d8", display:"inline-block", transition:"background 0.3s" }} />
            <span style={{ fontSize:10, color:d.sub, fontFamily:"'JetBrains Mono',monospace", transition:"color 0.3s" }}>Shift ended</span>
            <span style={{ marginLeft:"auto", fontSize:9, color:d.mono, fontFamily:"'JetBrains Mono',monospace", transition:"color 0.3s" }}>● GPS inactive</span>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginTop:12 }}>
            {["START","BREAK","END SHIFT"].map(s => (
              <button key={s} style={{ height:38, borderRadius:20, border:`1px solid ${d.btnBdr}`, background:"transparent", color:d.btnTxt, fontSize:10, fontWeight:700, letterSpacing:"0.1em", cursor:"pointer", transition:"all 0.3s" }}>{s}</button>
            ))}
          </div>
        </div>

        {/* $/HR card */}
        <div style={{ background:d.card, border:`1px solid ${d.border}`, borderRadius:20, padding:"16px", boxShadow:d.shadow, transition:"all 0.3s" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
            <span style={{ fontSize:11, fontWeight:700, letterSpacing:"0.18em", background:d.gold, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>$/HR NOW</span>
            <span style={{ background:d.badge, border:`1px solid ${d.badgeBdr}`, color:d.badgeTxt, borderRadius:20, fontSize:9, fontWeight:700, letterSpacing:"0.12em", padding:"3px 10px", transition:"all 0.3s" }}>● OFF DUTY</span>
          </div>
          <div style={{ display:"flex", justifyContent:"center", margin:"4px 0" }}>
            <svg width="240" height="100" viewBox="0 0 260 130">
              <path d="M 20 110 A 110 110 0 0 1 240 110" fill="none" stroke={d.gaugeTrack} strokeWidth="18" strokeLinecap="round"/>
              <path d="M 20 110 A 110 110 0 0 1 80 30"  fill="none" stroke={dark?"#ef4444":"#fca5a5"} strokeWidth="18" strokeLinecap="round"/>
              <path d="M 80 30 A 110 110 0 0 1 160 15"  fill="none" stroke={dark?"#f97316":"#fdba74"} strokeWidth="18" strokeLinecap="round"/>
              <path d="M 160 15 A 110 110 0 0 1 220 55" fill="none" stroke={dark?"#eab308":"#fde047"} strokeWidth="18" strokeLinecap="round"/>
              <path d="M 220 55 A 110 110 0 0 1 240 110" fill="none" stroke={dark?"#22c55e":"#86efac"} strokeWidth="18" strokeLinecap="round"/>
              <text x="130" y="108" textAnchor="middle" fill={d.mono} fontSize="11" fontFamily="JetBrains Mono,monospace">/hr gross</text>
            </svg>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginTop:4 }}>
            {[["EARNED TODAY","$141.23",d.text],["REMAINING","$258.77",d.sub],["$/HOUR","$37.20",d.goldSolid]].map(([l,v,c])=>(
              <div key={String(l)} style={{ textAlign:"center" }}>
                <p style={{ fontSize:8, color:d.mono, letterSpacing:"0.14em", fontWeight:700, margin:"0 0 2px", transition:"color 0.3s" }}>{l}</p>
                <p style={{ fontSize:15, fontWeight:900, color:String(c), fontFamily:"'JetBrains Mono',monospace", margin:0, transition:"color 0.3s" }}>{v}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Daily goal bar */}
        <div style={{ background:d.card, border:`1px solid ${d.border}`, borderRadius:16, padding:"12px 16px", boxShadow:d.shadow, transition:"all 0.3s" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
            <span style={{ fontSize:10, color:d.sub, fontWeight:600, letterSpacing:"0.1em", transition:"color 0.3s" }}>DAILY GOAL</span>
            <span style={{ fontSize:14, fontWeight:900, color:d.goldSolid, fontFamily:"'JetBrains Mono',monospace", transition:"color 0.3s" }}>$60/h</span>
          </div>
          <div style={{ background:d.barBg, borderRadius:8, height:6, overflow:"hidden", transition:"background 0.3s" }}>
            <div style={{ width:"35%", height:"100%", background:d.barFill, borderRadius:8, transition:"background 0.3s" }} />
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", marginTop:6 }}>
            <span style={{ fontSize:9, color:d.mono, fontFamily:"'JetBrains Mono',monospace", transition:"color 0.3s" }}>$141.23 / $400</span>
            <span style={{ fontSize:9, color:"#16a34a", fontWeight:700 }}>35%</span>
          </div>
        </div>
      </div>

      {/* Bottom nav */}
      <div style={{ position:"fixed", bottom:0, left:0, right:0, background:d.navBg, borderTop:`1px solid ${d.navBdr}`, display:"flex", justifyContent:"space-around", padding:"10px 0 20px", transition:"all 0.3s" }}>
        {[["🏠","DASH",true],["✈️","TRIPS",false],["💳","EXPENSES",false],["📈","FINANCE",false],["📄","REPORTS",false]].map(([icon,label,active])=>(
          <div key={String(label)} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
            <span style={{ fontSize:18 }}>{icon}</span>
            <span style={{ fontSize:8, fontWeight:700, letterSpacing:"0.1em", color: active ? d.navActive : d.mono, transition:"color 0.3s" }}>{String(label)}</span>
            {active && <div style={{ width:16, height:2, borderRadius:1, background:d.navDot, transition:"background 0.3s" }} />}
          </div>
        ))}
      </div>
    </div>
  );
}
