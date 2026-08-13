export function DarkMode() {
  return (
    <div className="min-h-screen w-full" style={{ background: "#0a0a0a", fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-5 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#d97706,#f6dd8c)" }}>
            <span style={{ fontSize: 16 }}>📊</span>
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 900, letterSpacing: "0.14em", color: "#ffffff" }}>ISLANDCITY</p>
            <p style={{ fontSize: 8, letterSpacing: "0.2em", color: "#a3a3a3", marginTop: -1 }}>TRANSIT SERVICES</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Theme toggle — NIGHT */}
          <div style={{ display:"flex", alignItems:"center", gap:6, background:"#1a1a1a", border:"1px solid #2e2e2e", borderRadius:20, padding:"4px 10px" }}>
            <span style={{ fontSize:11 }}>🌙</span>
            <div style={{ width:28, height:16, borderRadius:8, background:"#facc15", position:"relative" }}>
              <div style={{ width:12, height:12, borderRadius:"50%", background:"#000", position:"absolute", top:2, right:2, transition:"all 0.2s" }} />
            </div>
            <span style={{ fontSize:11, color:"#555" }}>☀️</span>
          </div>
          <div style={{ width:34, height:34, borderRadius:"50%", background:"#1a1a1a", border:"1px solid #2e2e2e", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, color:"#f6dd8c" }}>M</div>
        </div>
      </div>

      <div className="px-4 space-y-1 mb-3">
        <p style={{ fontSize:22, fontWeight:900, color:"#ffffff" }}>Good evening, Miguel.</p>
        <p style={{ fontSize:10, letterSpacing:"0.12em", color:"#737373", fontWeight:600 }}>THURSDAY, AUGUST 13, 2026</p>
        <p style={{ fontSize:10, color:"#525252", fontFamily:"'JetBrains Mono',monospace" }}>2:36 AM</p>
      </div>

      <div className="px-4 space-y-3">
        {/* Main status card */}
        <div style={{ background:"#0d0d0d", border:"1px solid #1e1e1e", borderRadius:20, padding:"14px 16px", position:"relative", overflow:"hidden" }}>
          <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:"linear-gradient(90deg,#d97706,#f6dd8c44,transparent)" }} />
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <p style={{ fontSize:10, color:"#737373", fontFamily:"'JetBrains Mono',monospace" }}>Thu, Aug 13 · 2:36 AM</p>
            <span style={{ background:"#111", border:"1px solid #2a2a2a", color:"#737373", borderRadius:20, fontSize:9, fontWeight:700, letterSpacing:"0.12em", padding:"3px 10px" }}>● OFF DUTY</span>
          </div>
          <p style={{ fontSize:10, color:"#525252", fontFamily:"'JetBrains Mono',monospace", marginTop:8 }}>GPS inactive</p>
          <p style={{ fontSize:34, fontWeight:900, background:"linear-gradient(90deg,#f6dd8c,#d9b64f)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", marginTop:6, fontFamily:"'JetBrains Mono',monospace" }}>$141.23</p>
          <p style={{ fontSize:10, color:"#737373", fontFamily:"'JetBrains Mono',monospace", marginTop:2 }}>7 trips · fare + tips + tolls</p>
          <div style={{ height:1, background:"linear-gradient(90deg,#1e1400,#1e1e1e)", margin:"12px 0" }} />
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ width:6, height:6, borderRadius:"50%", background:"#404040", display:"inline-block" }} />
            <span style={{ fontSize:10, color:"#737373", fontFamily:"'JetBrains Mono',monospace" }}>Shift ended</span>
            <span style={{ marginLeft:"auto", fontSize:9, color:"#525252", fontFamily:"'JetBrains Mono',monospace" }}>● GPS inactive</span>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginTop:12 }}>
            {["START","BREAK","END SHIFT"].map((s,i) => (
              <button key={s} style={{ height:38, borderRadius:20, border: i===2?"1px solid #d9b64f99":"1px solid #d9b64f99", background:"transparent", color:"#f6dd8c", fontSize:10, fontWeight:700, letterSpacing:"0.1em", cursor:"pointer" }}>{s}</button>
            ))}
          </div>
        </div>

        {/* $/HR gauge card */}
        <div style={{ background:"#0d0d0d", border:"1px solid #1e1e1e", borderRadius:20, padding:"16px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
            <span style={{ fontSize:11, fontWeight:700, letterSpacing:"0.18em", background:"linear-gradient(90deg,#f6dd8c,#d9b64f)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>$/HR NOW</span>
            <span style={{ background:"#111", border:"1px solid #2a2a2a", color:"#737373", borderRadius:20, fontSize:9, fontWeight:700, letterSpacing:"0.12em", padding:"3px 10px" }}>● OFF DUTY</span>
          </div>
          {/* Gauge */}
          <div style={{ position:"relative", width:"100%", height:120, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <svg width="260" height="110" viewBox="0 0 260 130">
              <path d="M 20 110 A 110 110 0 0 1 240 110" fill="none" stroke="#1e1e1e" strokeWidth="18" strokeLinecap="round"/>
              <path d="M 20 110 A 110 110 0 0 1 80 30" fill="none" stroke="#ef4444" strokeWidth="18" strokeLinecap="round"/>
              <path d="M 80 30 A 110 110 0 0 1 160 15" fill="none" stroke="#f97316" strokeWidth="18" strokeLinecap="round"/>
              <path d="M 160 15 A 110 110 0 0 1 220 55" fill="none" stroke="#eab308" strokeWidth="18" strokeLinecap="round"/>
              <path d="M 220 55 A 110 110 0 0 1 240 110" fill="none" stroke="#22c55e" strokeWidth="18" strokeLinecap="round"/>
              <text x="130" y="108" textAnchor="middle" fill="#555" fontSize="11" fontFamily="JetBrains Mono,monospace">/hr gross</text>
            </svg>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginTop:4 }}>
            {[["EARNED TODAY","$141.23","#ffffff"],["REMAINING","$258.77","#a3a3a3"],["$/HOUR","$37.20","#f6dd8c"]].map(([l,v,c])=>(
              <div key={l} style={{ textAlign:"center" }}>
                <p style={{ fontSize:8, color:"#737373", letterSpacing:"0.14em", fontWeight:700 }}>{l}</p>
                <p style={{ fontSize:15, fontWeight:900, color:c, fontFamily:"'JetBrains Mono',monospace" }}>{v}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom nav */}
      <div style={{ position:"fixed", bottom:0, left:0, right:0, background:"#0d0d0d", borderTop:"1px solid #1e1e1e", display:"flex", justifyContent:"space-around", padding:"10px 0 20px" }}>
        {[["🏠","DASH",true],["✈","TRIPS",false],["💳","EXPENSES",false],["📈","FINANCE",false],["📄","REPORTS",false]].map(([icon,label,active])=>(
          <div key={String(label)} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
            <span style={{ fontSize:18 }}>{icon}</span>
            <span style={{ fontSize:8, fontWeight:700, letterSpacing:"0.1em", color: active ? "#f6dd8c" : "#525252" }}>{String(label)}</span>
            {active && <div style={{ width:16, height:2, borderRadius:1, background:"#f6dd8c" }} />}
          </div>
        ))}
      </div>
    </div>
  );
}
