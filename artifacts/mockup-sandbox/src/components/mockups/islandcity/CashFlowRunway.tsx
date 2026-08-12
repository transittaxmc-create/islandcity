import React from "react";

// ── CASH FLOW RUNWAY ────────────────────────────────────────────────────────
// A fundamentally different approach: Instead of a dashboard of scattered widgets,
// this design treats cash flow as a chronological "Runway" — a vertical timeline
// showing how today's actions and upcoming obligations affect the bottom line.
// The aesthetic is "Swiss Ledger": stark, high-contrast, light-themed, focusing 
// on typography and clear information hierarchy rather than neon charts.

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
    balanceAfter: 1816, // 2450 + 285 - 919 roughly
  },
  {
    id: "t3",
    label: "IN 7 DAYS",
    title: "Weekly Projection Clearance",
    type: "income",
    value: 1885, // remaining of 2170 week projection
    details: "Estimated based on current momentum",
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

export function CashFlowRunway() {
  const currentBalance = 2450;
  const safeToSpend = currentBalance - 919; // Subtracting the closest major obligation

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        background: "#F4F4F0",
        color: "#111111",
        fontFamily: "'Inter', sans-serif",
        overflowY: "auto",
        paddingBottom: "80px",
      }}
    >
      <div style={{ maxWidth: 390, margin: "0 auto", position: "relative" }}>
        
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div
          style={{
            padding: "44px 20px 20px",
            borderBottom: "2px solid #111",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, letterSpacing: "-0.03em" }}>
              ISLANDCITY
            </h1>
            <p style={{ margin: "2px 0 0", fontSize: 10, fontWeight: 600, color: "#666", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              Financial Runway
            </p>
          </div>
          <div
            style={{
              width: 32,
              height: 32,
              background: "#111",
              color: "#F4F4F0",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            M
          </div>
        </div>

        {/* ── Hero: Safe to Spend ────────────────────────────────────────── */}
        <div style={{ padding: "32px 20px", borderBottom: "1px solid #D5D5D0" }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#666", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Safe to Spend
          </p>
          <h2
            style={{
              margin: "8px 0 16px",
              fontSize: 56,
              fontWeight: 900,
              lineHeight: 1,
              letterSpacing: "-0.04em",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            ${safeToSpend.toLocaleString()}
          </h2>
          
          <div style={{ display: "flex", gap: "24px" }}>
            <div>
              <p style={{ margin: 0, fontSize: 10, color: "#666", textTransform: "uppercase" }}>Current Balance</p>
              <p style={{ margin: "2px 0 0", fontSize: 15, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>
                ${currentBalance.toLocaleString()}
              </p>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 10, color: "#666", textTransform: "uppercase" }}>Locked for Obligations</p>
              <p style={{ margin: "2px 0 0", fontSize: 15, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: "#D32F2F" }}>
                -$919
              </p>
            </div>
          </div>
        </div>

        {/* ── Timeline ───────────────────────────────────────────────────── */}
        <div style={{ padding: "0" }}>
          {timeline.map((item, index) => {
            const isLast = index === timeline.length - 1;
            const isIncome = item.type === "income";
            const color = isIncome ? "#0F9D58" : "#D32F2F";

            return (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  position: "relative",
                  borderBottom: isLast ? "none" : "1px solid #D5D5D0",
                }}
              >
                {/* Left Time Column */}
                <div
                  style={{
                    width: "80px",
                    padding: "24px 0 24px 20px",
                    borderRight: "2px solid #111",
                    flexShrink: 0,
                    position: "relative",
                  }}
                >
                  <p style={{ margin: 0, fontSize: 10, fontWeight: 700, lineHeight: 1.4, color: "#111" }}>
                    {item.label.split(" ").map((word, i) => (
                      <span key={i} style={{ display: "block" }}>{word}</span>
                    ))}
                  </p>
                  
                  {/* Timeline Dot */}
                  <div
                    style={{
                      position: "absolute",
                      right: "-5px",
                      top: "24px",
                      width: "8px",
                      height: "8px",
                      background: "#F4F4F0",
                      border: "2px solid #111",
                      borderRadius: "50%",
                    }}
                  />
                </div>

                {/* Right Content Column */}
                <div style={{ padding: "24px 20px", flexGrow: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{item.title}</h3>
                      <p style={{ margin: "4px 0 0", fontSize: 12, color: "#666" }}>{item.details}</p>
                    </div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 18,
                        fontWeight: 800,
                        fontFamily: "'JetBrains Mono', monospace",
                        color: color,
                        textAlign: "right"
                      }}
                    >
                      {item.value > 0 ? "+" : ""}{item.value.toLocaleString()}
                    </p>
                  </div>

                  {/* Contextual UI depending on type */}
                  {item.id === "t1" && (
                    <div style={{ marginTop: "16px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                        <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>Daily Goal</span>
                        <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>${item.value} / ${item.goal}</span>
                      </div>
                      <div style={{ width: "100%", height: "4px", background: "#D5D5D0", borderRadius: "2px", overflow: "hidden" }}>
                        <div style={{ width: `${Math.min((item.value / item.goal!) * 100, 100)}%`, height: "100%", background: "#111" }} />
                      </div>
                    </div>
                  )}

                  {item.balanceAfter !== null && (
                    <div style={{ marginTop: "16px", paddingTop: "12px", borderTop: "1px dashed #D5D5D0" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 11, color: "#666", fontWeight: 600 }}>Est. Balance</span>
                        <span style={{ fontSize: 14, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace" }}>
                          ${item.balanceAfter.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Footer Actions ──────────────────────────────────────────────── */}
        <div style={{ padding: "32px 20px" }}>
          <button
            style={{
              width: "100%",
              padding: "16px",
              background: "#111",
              color: "#FFF",
              border: "none",
              borderRadius: "8px",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            }}
          >
            Adjust Projections
          </button>
        </div>

      </div>
    </div>
  );
}
