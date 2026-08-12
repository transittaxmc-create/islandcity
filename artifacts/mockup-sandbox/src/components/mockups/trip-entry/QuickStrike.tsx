import { useState } from "react";

const PLATFORMS = [
  { name: "Uber",            color: "#ffffff", bg: "#000000", text: "#ffffff" },
  { name: "Lyft",            color: "#ff00bf", bg: "#ff00bf", text: "#ffffff" },
  { name: "Empower",         color: "#3b82f6", bg: "#3b82f6", text: "#ffffff" },
  { name: "Gallant",         color: "#f97316", bg: "#f97316", text: "#ffffff" },
  { name: "Aki Technology",  color: "#0ea5e9", bg: "#0ea5e9", text: "#ffffff" },
  { name: "Street Hail",     color: "#6b7280", bg: "#6b7280", text: "#ffffff" },
  { name: "Classic Ryde",    color: "#14b8a6", bg: "#14b8a6", text: "#ffffff" },
  { name: "Other",           color: "#9ca3af", bg: "#9ca3af", text: "#ffffff" },
];

export function QuickStrike() {
  const [platform, setPlatform] = useState("Uber");
  const [amount, setAmount]     = useState("");
  const [tips, setTips]         = useState("");
  const [toll, setToll]         = useState("");
  const [showMore, setShowMore] = useState(false);

  const fare  = parseFloat(amount) || 0;
  const tip   = parseFloat(tips)   || 0;
  const tl    = parseFloat(toll)   || 0;
  const total = fare + tip + tl;

  const sel = PLATFORMS.find(p => p.name === platform) || PLATFORMS[0];

  return (
    <div className="min-h-screen bg-black text-white flex flex-col" style={{ fontFamily: "'Inter', sans-serif", maxWidth: 390, margin: "0 auto" }}>

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-6 pb-3">
        <div>
          <p className="text-[11px] tracking-[0.2em] text-neutral-500 uppercase">New Trip</p>
          <h1 className="text-[22px] font-black tracking-tight text-white">REVENUE ENTRY</h1>
        </div>
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-[20px]"
          style={{ background: "#111" }}>💰</div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 space-y-5 pb-36">

        {/* ── PLATFORM — big tappable pills ── */}
        <div>
          <p className="text-[10px] tracking-[0.2em] text-neutral-500 uppercase mb-3">Platform</p>
          <div className="grid grid-cols-2 gap-2">
            {PLATFORMS.map(p => (
              <button key={p.name} onClick={() => setPlatform(p.name)}
                className="h-14 rounded-2xl flex items-center gap-3 px-4 transition-all border"
                style={{
                  background: platform === p.name ? p.bg + "22" : "#111",
                  borderColor: platform === p.name ? p.color : "#222",
                  color: platform === p.name ? p.color : "#555",
                }}>
                <span className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black flex-shrink-0"
                  style={{ background: platform === p.name ? p.bg : "#222", color: platform === p.name ? p.text : "#666" }}>
                  {p.name[0]}
                </span>
                <span className="text-[13px] font-bold truncate">{p.name}</span>
                {platform === p.name && (
                  <span className="ml-auto text-[14px]">✓</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── AMOUNT — massive input ── */}
        <div>
          <p className="text-[10px] tracking-[0.2em] text-neutral-500 uppercase mb-3">Fare / Earnings</p>
          <div className="relative rounded-3xl border-2 flex items-center px-5"
            style={{ background: "#0d0d0d", borderColor: amount ? "#f6dd8c" : "#1e1e1e", height: 88 }}>
            <span className="text-[32px] font-black text-neutral-500 mr-2">$</span>
            <input
              type="number" inputMode="decimal" placeholder="0.00"
              value={amount} onChange={e => setAmount(e.target.value)}
              className="flex-1 bg-transparent outline-none text-[42px] font-black tracking-tight"
              style={{ color: amount ? "#f6dd8c" : "#333" }}
            />
          </div>
        </div>

        {/* ── TIPS ── */}
        <div>
          <p className="text-[10px] tracking-[0.2em] text-neutral-500 uppercase mb-3">Tips</p>
          <div className="relative rounded-2xl border flex items-center px-5"
            style={{ background: "#0a0a0a", borderColor: tips ? "#4ade80" : "#1a1a1a", height: 64 }}>
            <span className="text-[20px] font-bold text-neutral-600 mr-2">$</span>
            <input
              type="number" inputMode="decimal" placeholder="0.00"
              value={tips} onChange={e => setTips(e.target.value)}
              className="flex-1 bg-transparent outline-none text-[28px] font-bold"
              style={{ color: tips ? "#4ade80" : "#444" }}
            />
          </div>
        </div>

        {/* ── MORE DETAILS toggle ── */}
        <button onClick={() => setShowMore(s => !s)}
          className="w-full h-11 rounded-2xl border flex items-center justify-center gap-2 text-[12px] font-bold tracking-[0.1em] transition-all"
          style={{ background: "#0a0a0a", borderColor: "#1e1e1e", color: "#555" }}>
          {showMore ? "▲ LESS DETAILS" : "▼ MORE DETAILS"}
          <span className="text-[10px] text-neutral-600">(toll · platform fee · pickup · notes)</span>
        </button>

        {showMore && (
          <div className="space-y-3">
            {[
              { label: "Toll ($)", val: toll, set: setToll, color: "#fb923c" },
            ].map(f => (
              <div key={f.label}>
                <p className="text-[10px] tracking-[0.2em] text-neutral-600 uppercase mb-2">{f.label}</p>
                <div className="relative rounded-2xl border flex items-center px-4"
                  style={{ background: "#0a0a0a", borderColor: f.val ? f.color : "#1a1a1a", height: 56 }}>
                  <span className="text-[18px] font-bold text-neutral-600 mr-2">$</span>
                  <input type="number" inputMode="decimal" placeholder="0.00"
                    value={f.val} onChange={e => f.set(e.target.value)}
                    className="flex-1 bg-transparent outline-none text-[24px] font-bold"
                    style={{ color: f.val ? f.color : "#444" }}
                  />
                </div>
              </div>
            ))}
            <div>
              <p className="text-[10px] tracking-[0.2em] text-neutral-600 uppercase mb-2">Pickup / Drop-off</p>
              <input placeholder="Pickup address…"
                className="w-full h-14 rounded-2xl px-4 text-[16px] bg-[#0a0a0a] border border-[#1a1a1a] text-neutral-300 outline-none" />
              <input placeholder="Drop-off address…"
                className="w-full h-14 rounded-2xl px-4 text-[16px] bg-[#0a0a0a] border border-[#1a1a1a] text-neutral-300 outline-none mt-2" />
            </div>
          </div>
        )}
      </div>

      {/* ── STICKY BOTTOM: total + save ── */}
      <div className="fixed bottom-0 left-0 right-0 px-5 pb-8 pt-4"
        style={{ background: "linear-gradient(to top, #000 70%, transparent)", maxWidth: 390, margin: "0 auto" }}>
        {/* Running total */}
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black flex-shrink-0"
              style={{ background: sel.bg, color: sel.text }}>{sel.name[0]}</span>
            <span className="text-[13px] font-semibold text-neutral-400">{platform}</span>
          </div>
          <span className="text-[26px] font-black" style={{ color: total > 0 ? "#f6dd8c" : "#333" }}>
            ${total.toFixed(2)}
          </span>
        </div>
        <button className="w-full h-16 rounded-3xl text-[18px] font-black tracking-[0.06em] transition-all active:scale-[0.98]"
          style={{ background: total > 0 ? "#f6dd8c" : "#1a1a1a", color: total > 0 ? "#000" : "#333" }}>
          {total > 0 ? `SAVE TRIP — $${total.toFixed(2)}` : "SAVE TRIP"}
        </button>
      </div>
    </div>
  );
}
