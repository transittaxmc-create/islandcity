// ── DASH cards: Financial Intelligence + Shift Breakdown ──────────────
export function FinancialIntelCard({ clock, earnMonth, expMonth, monthGoal, monthPct, onTrack }: {
  clock: Date;
  earnMonth: number;
  expMonth: number;
  monthGoal: number;
  monthPct: number;
  onTrack: boolean;
}) {
  const netMonth = earnMonth - expMonth;
  return (
    <div className="rounded-[20px] p-4" style={{ background: "#0d0d0d", border: "1px solid #1e1e1e" }}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-[9px] tracking-[0.22em] text-neutral-300 font-bold uppercase">Financial Intelligence</p>
          <p className="text-[11px] font-semibold text-neutral-300 mt-0.5">
            {clock.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </p>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold tracking-[0.12em] border ${
          onTrack ? "bg-[#052e16] border-[#4ade8044] text-[#4ade80]" : "bg-[#1a0f00] border-[#f6dd8c44] text-[#f6dd8c]"
        }`}>
          {onTrack ? "✓ On track" : "↗ Keep pushing"}
        </span>
      </div>
      <div className="mb-3">
        <p className="text-[8px] text-neutral-400 uppercase tracking-widest">Net balance</p>
        <p className={`font-mono-jet text-[30px] font-black leading-none tracking-tight mt-0.5 ${netMonth >= 0 ? "text-[#f6dd8c]" : "text-red-400"}`}>
          {netMonth >= 0 ? "+" : ""}{netMonth.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}
        </p>
      </div>
      <div className="flex gap-4 mb-3">
        <div>
          <p className="text-[8px] text-neutral-400 uppercase tracking-widest">INCOME</p>
          <p className="font-mono-jet text-[16px] font-bold text-[#4ade80] mt-0.5">${earnMonth.toLocaleString("en-US", { maximumFractionDigits: 0 })}</p>
        </div>
        <div>
          <p className="text-[8px] text-neutral-400 uppercase tracking-widest">EXPENSES</p>
          <p className="font-mono-jet text-[16px] font-bold text-red-400 mt-0.5">-${expMonth.toLocaleString("en-US", { maximumFractionDigits: 0 })}</p>
        </div>
      </div>
      {monthGoal > 0 && (
        <div>
          <div className="flex justify-between text-[9px] mb-1.5">
            <span className="font-mono-jet text-neutral-400">${earnMonth.toFixed(0)} earned</span>
            <span className="font-mono-jet text-[#f6dd8c]">Goal ${monthGoal.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>
          </div>
          <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${monthPct}%`, background: "linear-gradient(90deg,#d9b64f,#f6dd8c)" }} />
          </div>
        </div>
      )}
    </div>
  );
}

export function ShiftBreakdownCard({ todayTrips, grossToday, expensesToday, expensesTodayCount, netToday, weeklyTotal, totalTollsToday }: {
  todayTrips: { earnings: number | null; tips: number | null; extraCash: number | null }[];
  grossToday: number;
  expensesToday: number;
  expensesTodayCount: number;
  netToday: number;
  weeklyTotal: number;
  totalTollsToday: number;
}) {
  return (
    <div>
      <p className="text-[10px] tracking-[0.22em] text-neutral-400 font-bold mb-2.5">SHIFT BREAKDOWN</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 rounded-xl p-3.5 flex items-start justify-between gap-3"
          style={{ background: "#0d0d0d", border: "1px solid #1e1400" }}>
          <div className="flex-1">
            <p className="text-[9px] tracking-[0.18em] font-bold mb-2" style={{ color: "#d97706" }}>TODAY'S BREAKDOWN</p>
            <div className="space-y-1">
              {([
                ["Fare", todayTrips.reduce((a, b) => a + (b.earnings || 0), 0)],
                ["Tips", todayTrips.reduce((a, b) => a + (b.tips || 0) + (b.extraCash || 0), 0)],
                ["Tolls", totalTollsToday],
              ] as [string, number][]).map(([label, val]) => (
                <div key={label} className="flex items-center gap-4">
                  <span className="text-[10px] text-neutral-400 font-mono-jet w-14">{label}</span>
                  <span className="font-mono-jet text-[12px] font-semibold text-neutral-100">${val.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-[8px] text-neutral-400 tracking-widest uppercase mb-1">GROSS TODAY</p>
            <p className="font-mono-jet text-[22px] font-black text-[#f6dd8c] leading-none">${grossToday.toFixed(2)}</p>
            <p className="text-[9px] text-neutral-400 mt-0.5">{todayTrips.length} trip{todayTrips.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
        <div className="rounded-xl p-3.5" style={{ background: "#0d0d0d", border: "1px solid #1e0a0a" }}>
          <p className="text-[9px] tracking-[0.18em] font-bold text-[#ef4444]">TODAY'S EXPENSES</p>
          <p className="font-mono-jet text-[22px] font-black text-[#ef4444] mt-2">
            {expensesToday > 0 ? `−$${expensesToday.toFixed(2)}` : "$0.00"}
          </p>
          <p className="text-[10px] text-neutral-400 mt-1 font-mono-jet">{expensesTodayCount} entries today</p>
        </div>
        <div className="rounded-xl p-3.5" style={{ background: "#0d0d0d", border: `1px solid ${netToday >= 0 ? "#0a1e0a" : "#1e0a0a"}` }}>
          <p className={`text-[9px] tracking-[0.18em] font-bold ${netToday >= 0 ? "text-[#4ade80]" : "text-[#ef4444]"}`}>NET EARNINGS TODAY</p>
          <p className={`font-mono-jet text-[22px] font-black mt-2 ${netToday >= 0 ? "text-[#4ade80]" : "text-[#ef4444]"}`}>
            ${netToday.toFixed(2)}
          </p>
          <p className="text-[10px] text-neutral-400 mt-1 font-mono-jet">income − expenses · weekly ref. ${weeklyTotal.toFixed(0)}</p>
        </div>
      </div>
    </div>
  );
}