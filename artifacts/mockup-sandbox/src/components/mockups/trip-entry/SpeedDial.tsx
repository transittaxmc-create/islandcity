import { useState } from "react";

const PLATFORMS = [
  { name: "Uber",           color: "#ffffff", bg: "#1a1a1a" },
  { name: "Lyft",           color: "#ff00bf", bg: "#2a001f" },
  { name: "Empower",        color: "#60a5fa", bg: "#0a1628" },
  { name: "Gallant",        color: "#fb923c", bg: "#1a0e00" },
  { name: "Aki Tech",       color: "#38bdf8", bg: "#00141e" },
  { name: "Street Hail",    color: "#9ca3af", bg: "#111" },
  { name: "Classic Ryde",   color: "#2dd4bf", bg: "#00100f" },
  { name: "Other",          color: "#a78bfa", bg: "#0e0a1a" },
];

const QUICK_TIPS = [2, 3, 5, 10];

export function SpeedDial() {
  const [platform, setPlatform] = useState("Uber");
  const [displayVal, setDisplayVal] = useState("0");
  const [tips, setTips] = useState(0);
  const [toll, setToll] = useState("");
  const [step, setStep]   = useState<"amount" | "details">("amount");

  const fare  = parseFloat(displayVal) || 0;
  const tl    = parseFloat(toll) || 0;
  const total = fare + tips + tl;

  const sel = PLATFORMS.find(p => p.name === platform) || PLATFORMS[0];

  const handleKey = (k: string) => {
    if (k === "⌫") {
      setDisplayVal(v => v.length > 1 ? v.slice(0, -1) : "0");
    } else if (k === ".") {
      if (!displayVal.includes(".")) setDisplayVal(v => v + ".");
    } else {
      setDisplayVal(v => v === "0" ? k : v + k);
    }
  };

  const KEYS = ["1","2","3","4","5","6","7","8","9",".","0","⌫"];

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col" style={{ fontFamily: "'Inter', sans-serif", maxWidth: 390, margin: "0 auto" }}>

      {step === "amount" ? (
        <>
          {/* ── Amount display ── */}
          <div className="px-6 pt-8 pb-2">
            <p className="text-[10px] tracking-[0.25em] text-neutral-600 uppercase">Trip Earnings</p>
            <div className="flex items-end gap-1 mt-1">
              <span className="text-[28px] font-black text-neutral-600 mb-1">$</span>
              <span className="text-[64px] font-black leading-none tracking-tight"
                style={{ color: fare > 0 ? "#f6dd8c" : "#222" }}>
                {displayVal}
              </span>
            </div>
            {tips > 0 && (
              <p className="text-[13px] text-[#4ade80] font-semibold mt-1">+ ${tips.toFixed(2)} tip = ${(fare + tips).toFixed(2)}</p>
            )}
          </div>

          {/* ── Platform selector — horizontal scroll ── */}
          <div className="px-6 mb-4">
            <p className="text-[9px] tracking-[0.2em] text-neutral-600 uppercase mb-2">Platform</p>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {PLATFORMS.map(p => (
                <button key={p.name} onClick={() => setPlatform(p.name)}
                  className="flex-shrink-0 h-10 px-4 rounded-full text-[12px] font-bold transition-all border"
                  style={{
                    background: platform === p.name ? p.bg : "transparent",
                    borderColor: platform === p.name ? p.color : "#1e1e1e",
                    color: platform === p.name ? p.color : "#444",
                  }}>
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* ── Quick tip buttons ── */}
          <div className="px-6 mb-4">
            <p className="text-[9px] tracking-[0.2em] text-neutral-600 uppercase mb-2">Quick Tip</p>
            <div className="flex gap-2">
              {QUICK_TIPS.map(t => (
                <button key={t} onClick={() => setTips(tips === t ? 0 : t)}
                  className="flex-1 h-12 rounded-2xl text-[18px] font-black transition-all border"
                  style={{
                    background: tips === t ? "#0d2010" : "#0a0a0a",
                    borderColor: tips === t ? "#4ade80" : "#1a1a1a",
                    color: tips === t ? "#4ade80" : "#333",
                  }}>
                  +${t}
                </button>
              ))}
              <button onClick={() => setTips(0)}
                className="w-12 h-12 rounded-2xl text-[12px] font-bold border"
                style={{ background: "#0a0a0a", borderColor: "#1a1a1a", color: "#444" }}>
                ✕
              </button>
            </div>
          </div>

          {/* ── Numeric keypad ── */}
          <div className="px-5 grid grid-cols-3 gap-2 flex-1">
            {KEYS.map(k => (
              <button key={k} onClick={() => handleKey(k)}
                className="h-16 rounded-2xl text-[24px] font-bold transition-all active:scale-95 border"
                style={{
                  background: k === "⌫" ? "#1a0a00" : "#0f0f0f",
                  borderColor: k === "⌫" ? "#f97316" : "#1a1a1a",
                  color: k === "⌫" ? "#fb923c" : "#e5e7eb",
                }}>
                {k}
              </button>
            ))}
          </div>

          {/* ── Next button ── */}
          <div className="px-5 py-5">
            <button onClick={() => fare > 0 && setStep("details")}
              className="w-full h-16 rounded-3xl text-[18px] font-black tracking-[0.06em] transition-all active:scale-[0.98] flex items-center justify-center gap-3"
              style={{
                background: fare > 0 ? "#f6dd8c" : "#111",
                color: fare > 0 ? "#000" : "#333",
              }}>
              {fare > 0
                ? <><span style={{ color: sel.color, fontSize: 14, fontWeight: 900 }}>{sel.name} ·</span> ${total.toFixed(2)} → Details</>
                : "Enter amount first"
              }
            </button>
          </div>
        </>
      ) : (
        <>
          {/* ── Details step ── */}
          <div className="px-6 pt-8 pb-4">
            <button onClick={() => setStep("amount")} className="text-[12px] text-neutral-500 flex items-center gap-1 mb-4">
              ← Back
            </button>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] tracking-[0.2em] text-neutral-600 uppercase">Trip Details</p>
                <h2 className="text-[22px] font-black">{platform}</h2>
              </div>
              <span className="text-[32px] font-black" style={{ color: "#f6dd8c" }}>${total.toFixed(2)}</span>
            </div>
          </div>

          <div className="px-6 space-y-4 flex-1 overflow-y-auto">
            {/* Toll */}
            <div>
              <p className="text-[10px] tracking-[0.2em] text-neutral-500 uppercase mb-2">Toll ($)</p>
              <div className="relative rounded-2xl border flex items-center px-4"
                style={{ background: "#0a0a0a", borderColor: toll ? "#fb923c" : "#1a1a1a", height: 64 }}>
                <span className="text-[20px] font-bold text-neutral-600 mr-2">$</span>
                <input type="number" inputMode="decimal" placeholder="0.00" value={toll} onChange={e => setToll(e.target.value)}
                  className="flex-1 bg-transparent outline-none text-[28px] font-bold"
                  style={{ color: toll ? "#fb923c" : "#444" }} />
              </div>
            </div>

            {/* Pickup */}
            <div>
              <p className="text-[10px] tracking-[0.2em] text-neutral-500 uppercase mb-2">Pickup</p>
              <input placeholder="Pickup address or GPS auto…"
                className="w-full h-14 rounded-2xl px-4 text-[16px] border outline-none"
                style={{ background: "#0a0a0a", borderColor: "#1a1a1a", color: "#ccc" }} />
            </div>

            {/* Dropoff */}
            <div>
              <p className="text-[10px] tracking-[0.2em] text-neutral-500 uppercase mb-2">Drop-off</p>
              <input placeholder="Drop-off address…"
                className="w-full h-14 rounded-2xl px-4 text-[16px] border outline-none"
                style={{ background: "#0a0a0a", borderColor: "#1a1a1a", color: "#ccc" }} />
            </div>

            {/* Trip summary */}
            <div className="rounded-3xl border p-4 space-y-2" style={{ background: "#0a0a0a", borderColor: "#1e1e1e" }}>
              {[
                ["Fare",  `$${fare.toFixed(2)}`,  "#f6dd8c"],
                ["Tips",  `+$${tips.toFixed(2)}`, "#4ade80"],
                ["Toll",  `+$${tl.toFixed(2)}`,   "#fb923c"],
              ].map(([l, v, c]) => (
                <div key={l} className="flex justify-between items-center">
                  <span className="text-[13px] text-neutral-500">{l}</span>
                  <span className="text-[16px] font-bold" style={{ color: c as string }}>{v}</span>
                </div>
              ))}
              <div className="border-t pt-2 flex justify-between items-center" style={{ borderColor: "#1e1e1e" }}>
                <span className="text-[13px] font-bold text-white">Total</span>
                <span className="text-[22px] font-black text-[#f6dd8c]">${total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="px-5 py-5">
            <button className="w-full h-16 rounded-3xl text-[18px] font-black tracking-[0.06em] active:scale-[0.98] transition-all"
              style={{ background: "#f6dd8c", color: "#000" }}>
              SAVE TRIP — ${total.toFixed(2)}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
