import React from "react";

// ── CASH FLOW RUNWAY (ALT LAYOUT) ──────────────────────────────────────────
// Exploring a different spatial organization:
// - A "Dark Fintech" aesthetic with deep backgrounds and neon accents
// - The vertical timeline is transformed into a horizontal snapping carousel
// - The hero section uses a Bento-style grid to group key metrics densely
// - Visual weight is shifted toward the remaining estimated balance

const timeline = [
  {
    id: "t1",
    label: "TODAY",
    title: "Today's Shift",
    type: "income",
    value: 285,
    goal: 400,
    details: "71% to daily target",
    balanceAfter: null,
  },
  {
    id: "t2",
    label: "IN 2 DAYS",
    title: "Car Payment",
    type: "expense",
    value: -919,
    details: "Auto-deduction",
    balanceAfter: 1816,
  },
  {
    id: "t3",
    label: "IN 7 DAYS",
    title: "Weekly Clearance",
    type: "income",
    value: 1885,
    details: "Est. based on momentum",
    balanceAfter: 3701,
  },
  {
    id: "t4",
    label: "IN 8 DAYS",
    title: "Renta",
    type: "expense",
    value: -1500,
    details: "Bank transfer",
    balanceAfter: 2201,
  },
];

export function CashFlowRunwayAltLayout() {
  const currentBalance = 2450;
  const lockedObligations = 919;
  const safeToSpend = currentBalance - lockedObligations;

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        backgroundColor: "#0A0A0A",
        color: "#EDEDED",
        fontFamily: "'Inter', sans-serif",
        overflowY: "auto",
        overflowX: "hidden",
        paddingBottom: "100px",
      }}
    >
      <div style={{ maxWidth: 414, margin: "0 auto", position: "relative" }}>
        
        {/* ── Navbar ─────────────────────────────────────────────────────── */}
        <div
          style={{
            padding: "40px 24px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: "linear-gradient(135deg, #222, #111)",
              border: "1px solid #333",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#FFF" }} />
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: "#888", letterSpacing: "0.05em", textTransform: "uppercase" }}>
              IslandCity
            </p>
            <h1 style={{ margin: 0, fontSize: 16, fontWeight: 500, color: "#FFF" }}>
              Runway
            </h1>
          </div>
        </div>

        {/* ── Bento Hero Section ─────────────────────────────────────────── */}
        <div style={{ padding: "0 24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          
          {/* Main Safe to Spend Card */}
          <div
            style={{
              gridColumn: "1 / -1",
              background: "linear-gradient(180deg, #1A1A1A 0%, #111 100%)",
              borderRadius: "20px",
              padding: "24px",
              border: "1px solid #2A2A2A",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div style={{ position: "absolute", top: -50, right: -50, width: 150, height: 150, background: "#00FF94", filter: "blur(80px)", opacity: 0.15 }} />
            
            <p style={{ margin: 0, fontSize: 13, color: "#888", fontWeight: 500 }}>Safe to Spend</p>
            <h2
              style={{
                margin: "12px 0 0",
                fontSize: 48,
                fontWeight: 300,
                letterSpacing: "-0.05em",
                color: "#FFF",
              }}
            >
              ${safeToSpend.toLocaleString()}
            </h2>
          </div>

          {/* Sub Metrics */}
          <div
            style={{
              background: "#141414",
              borderRadius: "16px",
              padding: "16px",
              border: "1px solid #222",
            }}
          >
            <p style={{ margin: 0, fontSize: 11, color: "#777", marginBottom: 8 }}>Current Balance</p>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 500 }}>${currentBalance.toLocaleString()}</p>
          </div>
          
          <div
            style={{
              background: "#1A0F0F",
              borderRadius: "16px",
              padding: "16px",
              border: "1px solid #331515",
            }}
          >
            <p style={{ margin: 0, fontSize: 11, color: "#FF4D4D", marginBottom: 8 }}>Locked</p>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 500, color: "#FF4D4D" }}>-${lockedObligations.toLocaleString()}</p>
          </div>
        </div>

        {/* ── Horizontal Runway (Timeline) ────────────────────────────────── */}
        <div style={{ marginTop: "40px" }}>
          <div style={{ padding: "0 24px", marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 500 }}>The Runway</h3>
            <span style={{ fontSize: 12, color: "#666" }}>Swipe left</span>
          </div>

          {/* Scrolling Track */}
          <div
            style={{
              display: "flex",
              gap: "16px",
              overflowX: "auto",
              padding: "0 24px 24px",
              scrollSnapType: "x mandatory",
              scrollbarWidth: "none", // Firefox
              msOverflowStyle: "none", // IE
            }}
          >
            <style>{`
              div::-webkit-scrollbar {
                display: none;
              }
            `}</style>
            
            {timeline.map((item, index) => {
              const isIncome = item.type === "income";
              
              return (
                <div
                  key={item.id}
                  style={{
                    flexShrink: 0,
                    width: "280px",
                    scrollSnapAlign: "start",
                    background: "#141414",
                    borderRadius: "20px",
                    border: "1px solid #222",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  {/* Card Header (Time) */}
                  <div style={{ padding: "16px 20px", borderBottom: "1px solid #222", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#888" }}>{item.label}</span>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: isIncome ? "#00FF94" : "#FF4D4D" }} />
                  </div>

                  {/* Card Body */}
                  <div style={{ padding: "20px", flexGrow: 1 }}>
                    <h4 style={{ margin: 0, fontSize: 18, fontWeight: 500 }}>{item.title}</h4>
                    <p style={{ margin: "6px 0 20px", fontSize: 13, color: "#666" }}>{item.details}</p>
                    
                    <p
                      style={{
                        margin: 0,
                        fontSize: 28,
                        fontWeight: 300,
                        color: isIncome ? "#00FF94" : "#FFF",
                        letterSpacing: "-0.03em"
                      }}
                    >
                      {item.value > 0 ? "+" : ""}{item.value.toLocaleString()}
                    </p>

                    {item.id === "t1" && (
                      <div style={{ marginTop: "24px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                          <span style={{ fontSize: 11, color: "#888" }}>Daily Goal</span>
                          <span style={{ fontSize: 11, color: "#FFF" }}>{Math.round((item.value / item.goal!) * 100)}%</span>
                        </div>
                        <div style={{ width: "100%", height: "4px", background: "#222", borderRadius: "2px", overflow: "hidden" }}>
                          <div style={{ width: `${Math.min((item.value / item.goal!) * 100, 100)}%`, height: "100%", background: "#00FF94" }} />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card Footer (Balance) */}
                  {item.balanceAfter !== null && (
                    <div style={{ padding: "16px 20px", background: "#0F0F0F", borderTop: "1px solid #222", borderRadius: "0 0 20px 20px" }}>
                      <p style={{ margin: 0, fontSize: 11, color: "#666" }}>Est. Balance After</p>
                      <p style={{ margin: "4px 0 0", fontSize: 16, fontWeight: 500, color: "#FFF" }}>
                        ${item.balanceAfter.toLocaleString()}
                      </p>
                    </div>
                  )}
                  {item.balanceAfter === null && (
                    <div style={{ padding: "16px 20px", background: "#0F0F0F", borderTop: "1px solid #222", borderRadius: "0 0 20px 20px" }}>
                      <p style={{ margin: 0, fontSize: 11, color: "#444" }}>Balance unaffected yet</p>
                      <p style={{ margin: "4px 0 0", fontSize: 16, fontWeight: 500, color: "#111" }}>
                        -
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Fixed Bottom Action ────────────────────────────────────────── */}
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            padding: "20px 24px",
            background: "linear-gradient(0deg, #0A0A0A 60%, transparent 100%)",
            display: "flex",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <button
            style={{
              pointerEvents: "auto",
              width: "100%",
              maxWidth: 366,
              padding: "18px",
              background: "#FFF",
              color: "#000",
              border: "none",
              borderRadius: "100px",
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 8px 32px rgba(255,255,255,0.15)",
            }}
          >
            Adjust Projections
          </button>
        </div>

      </div>
    </div>
  );
}
