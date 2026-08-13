export function LightMode() {
  return (
    <div className="min-h-screen w-full" style={{ background: "#f0f0f0", fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-5 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#d97706,#f6dd8c)" }}>
            <span style={{ fontSize: 16 }}>📊</span>
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 900, letterSpacing: "0.14em", color: "#18181b" }}>ISLANDCITY</p>
            <p style={{ fontSize: 8, letterSpacing: "0.2em", color: "#71717a", marginTop: -1 }}>TRANSIT SERVICES</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Theme toggle — DAY */}
          <div style={{ display:"flex", alignItems:"center", gap:6, background:"#ffffff", border:"1px solid #e4e4e7", borderRadius:20, padding:"4px 10px" }}>
            <span style={{ fontSize:11, opacity:0.4 }}>🌙</span>
            <div style={{ width:28, height:16, borderRadius:8, background:"#d4d4d8", position:"relative" }}>
              <div style={{ width:12, height:12, borderRadius:"50%", background:"#ffffff", position:"absolute", top:2, left:2, transition:"all 0.2s", boxShadow:"0 1px 3px #0003" }} />
            </div>
            <span style={{ fontSize:11 }}>☀️</span>
          </div>
          <div style={{ width:34, height:34, borderRadius:"50%", background:"#18181b", border:"1px solid #3f3f46", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, color:"#f6dd8c" }}>M</div>
        </div>
      </div>

      <div className="px-4 space-y-1 mb-3">
        <p style={{ fontSize:22, fontWeight:900, color:"#18181b" }}>Good evening, Miguel.</p>
        <p style={{ fontSize:10, letterSpacing:"0.12em", color:"#71717a", fontWeight:600 }}>THURSDAY, AUGUST 13, 2026</p>
        <p style={{ fontSize:10, color:"#a1a1aa", fontFamily:"'JetBrains Mono',monospace" }}>2:36 AM</p>
      </div>

      <div className="px-4 space-y-3">
        {/* Main status card */}
        <div style={{ background:"#ffffff", border:"1px solid #e4e4e7", borderRadius:20, padding:"14px 16px", position:"relative", overflow:"hidden", boxShadow:"0 1px 4px #0000000a" }}>
          <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:"linear-gradient(90deg,#d97706,#fbbf2444,transparent)" }} />
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <p style={{ fontSize:10, color:"#71717a", fontFamily:"'JetBrains Mono',monospace" }}>Thu, Aug 13 · 2:36 AM</p>
            <span style={{ background:"#f4f4f5", border:"1px solid #e4e4e7", color:"#71717a", borderRadius:20, fontSize:9, fontWeight:700, letterSpacing:"0.12em", padding:"3px 10px" }}>● OFF DUTY</span>
          </div>
          <p style={{ fontSize:10, color:"#a1a1aa", fontFamily:"'JetBrains Mono',monospace", marginTop:8 }}>GPS inactive</p>
          <p style={{ fontSize:34, fontWeight:900, background:"linear-gradient(90deg,#b45309,#d97706)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", marginTop:6, fontFamily:"'JetBrains Mono',monospace" }}>$141.23</p>
          <p style={{ fontSize:10, color:"#71717a", fontFamily:"'JetBrains Mono',monospace", marginTop:2 }}>7 trips · fare + tips + tolls</p>
          <div style={{ height:1, background:"#f4f4f5", margin:"12px 0" }} />
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ width:6, height:6, borderRadius:"50%", background:"#d4d4d8", display:"inline-block" }} />
            <span style={{ fontSize:10, color:"#71717a", fontFamily:"'JetBrains Mono',monospace" }}>Shift ended</span>
            <span style={{ marginLeft:"auto", fontSize:9, color:"#a1a1aa", fontFamily:"'JetBrains Mono',monospace" }}>● GPS inactive</span>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginTop:12 }}>
            {["START","BREAK","END SHIFT"].map(s => (
              <button key={s} style={{ height:38, borderRadius:20, border:"1px solid #d97706", background:"transparent", color:"#b45309", fontSize:10, fontWeight:700, letterSpacing:"0.1em", cursor:"pointer" }}>{s}</button>
            ))}
          </div>
        </div>

        {/* $/HR gauge card */}
        <div style={{ background:"#ffffff", border:"1px solid #e4e4e7", borderRadius:20, padding:"16px", boxShadow:"0 1px 4px #0000000a" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
            <span style={{ fontSize:11, fontWeight:700, letterSpacing:"0.18em", color:"#b45309" }}>$/HR NOW</span>
            <span style={{ background:"#f4f4f5", border:"1px solid #e4e4e7", color:"#71717a", borderRadius:20, fontSize:9, fontWeight:700, letterSpacing:"0.12em", padding:"3px 10px" }}>● OFF DUTY</span>
          </div>
          {/* Gauge */}
          <div style={{ position:"relative", width:"100%", height:120, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <svg width="260" height="110" viewBox="0 0 260 130">
              <path d="M 20 110 A 110 110 0 0 1 240 110" fill="none" stroke="#f4f4f5" strokeWidth="18" strokeLinecap="round"/>
              <path d="M 20 110 A 110 110 0 0 1 80 30" fill="none" stroke="#fca5a5" strokeWidth="18" strokeLinecap="round"/>
              <path d="M 80 30 A 110 110 0 0 1 160 15" fill="none" stroke="#fdba74" strokeWidth="18" strokeLinecap="round"/>
              <path d="M 160 15 A 110 110 0 0 1 220 55" fill="none" stroke="#fde047" strokeWidth="18" strokeLinecap="round"/>
              <path d="M 220 55 A 110 110 0 0 1 240 110" fill="none" stroke="#86efac" strokeWidth="18" strokeLinecap="round"/>
              <text x="130" y="108" textAnchor="middle" fill="#a1a1aa" fontSize="11" fontFamily="JetBrains Mono,monospace">/hr gross</text>
            </svg>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginTop:4 }}>
            {[["EARNED TODAY","$141.23","#18181b"],["REMAINING","$258.77","#71717a"],["$/HOUR","$37.20","#b45309"]].map(([l,v,c])=>(
              <div key={l} style={{ textAlign:"center" }}>
                <p style={{ fontSize:8, color:"#a1a1aa", letterSpacing:"0.14em", fontWeight:700 }}>{l}</p>
                <p style={{ fontSize:15, fontWeight:900, color:c, fontFamily:"'JetBrains Mono',monospace" }}>{v}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Mini goal bar */}
        <div style={{ background:"#ffffff", border:"1px solid #e4e4e7", borderRadius:16, padding:"12px 16px", boxShadow:"0 1px 4px #0000000a" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
            <span style={{ fontSize:10, color:"#71717a", fontWeight:600, letterSpacing:"0.1em" }}>DAILY GOAL</span>
            <span style={{ fontSize:14, fontWeight:900, color:"#b45309", fontFamily:"'JetBrains Mono',monospace" }}>$60/h</span>
          </div>
          <div style={{ background:"#f4f4f5", borderRadius:8, height:6, overflow:"hidden" }}>
            <div style={{ width:"35%", height:"100%", background:"linear-gradient(90deg,#b45309,#f59e0b)", borderRadius:8 }} />
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", marginTop:6 }}>
            <span style={{ fontSize:9, color:"#a1a1aa", fontFamily:"'JetBrains Mono',monospace" }}>$141.23 / $400</span>
            <span style={{ fontSize:9, color:"#16a34a", fontWeight:700 }}>35%</span>
          </div>
        </div>
      </div>

      {/* Bottom nav */}
      <div style={{ position:"fixed", bottom:0, left:0, right:0, background:"#ffffff", borderTop:"1px solid #e4e4e7", display:"flex", justifyContent:"space-around", padding:"10px 0 20px" }}>
        {[["🏠","DASH",true],["✈","TRIPS",false],["💳","EXPENSES",false],["📈","FINANCE",false],["📄","REPORTS",false]].map(([icon,label,active])=>(
          <div key={String(label)} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
            <span style={{ fontSize:18 }}>{icon}</span>
            <span style={{ fontSize:8, fontWeight:700, letterSpacing:"0.1em", color: active ? "#b45309" : "#a1a1aa" }}>{String(label)}</span>
            {active && <div style={{ width:16, height:2, borderRadius:1, background:"#d97706" }} />}
          </div>
        ))}
      </div>
    </div>
  );
}
