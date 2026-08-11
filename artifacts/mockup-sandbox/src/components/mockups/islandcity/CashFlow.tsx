import "./_group.css";

// ── 14-Day Cash Flow Timeline ───────────────────────────────────────────────

interface DayEntry {
  date: string;
  dayShort: string;
  income: number;
  expenses: { name: string; amount: number }[];
  balance: number;
  isWorkDay: boolean;
  isToday?: boolean;
}

const TODAY_BAL = 2450;

const DAYS: DayEntry[] = [
  { date: "Hoy · 11 ago", dayShort: "HOY", income: 0, expenses: [], balance: 2450, isWorkDay: false, isToday: true },
  { date: "Mié · 12 ago", dayShort: "MIÉ", income: 320, expenses: [], balance: 2770, isWorkDay: true },
  { date: "Jue · 13 ago", dayShort: "JUE", income: 350, expenses: [{ name: "Car Payment", amount: 919 }], balance: 2201, isWorkDay: true },
  { date: "Vie · 14 ago", dayShort: "VIE", income: 400, expenses: [], balance: 2601, isWorkDay: true },
  { date: "Sáb · 15 ago", dayShort: "SÁB", income: 480, expenses: [], balance: 3081, isWorkDay: true },
  { date: "Dom · 16 ago", dayShort: "DOM", income: 0, expenses: [], balance: 3081, isWorkDay: false },
  { date: "Lun · 17 ago", dayShort: "LUN", income: 300, expenses: [{ name: "Gas", amount: 60 }], balance: 3321, isWorkDay: true },
  { date: "Mar · 18 ago", dayShort: "MAR", income: 320, expenses: [], balance: 3641, isWorkDay: true },
  { date: "Mié · 19 ago", dayShort: "MIÉ", income: 350, expenses: [{ name: "Renta", amount: 1500 }], balance: 2491, isWorkDay: true },
  { date: "Jue · 20 ago", dayShort: "JUE", income: 350, expenses: [{ name: "Car Payment", amount: 919 }], balance: 1922, isWorkDay: true },
  { date: "Vie · 21 ago", dayShort: "VIE", income: 400, expenses: [], balance: 2322, isWorkDay: true },
  { date: "Sáb · 22 ago", dayShort: "SÁB", income: 480, expenses: [{ name: "Car Wash", amount: 35 }], balance: 2767, isWorkDay: true },
  { date: "Dom · 23 ago", dayShort: "DOM", income: 0, expenses: [], balance: 2767, isWorkDay: false },
  { date: "Lun · 24 ago", dayShort: "LUN", income: 300, expenses: [], balance: 3067, isWorkDay: true },
];

function balanceColor(bal: number) {
  if (bal < 0) return "#ef4444";
  if (bal < 500) return "#f97316";
  if (bal < 1000) return "#eab308";
  return "#4ade80";
}

const goldGrad = { background: "linear-gradient(90deg, #f6dd8c, #d9b64f)" };

export function CashFlow() {
  const minBal = Math.min(...DAYS.map((d) => d.balance));
  const maxBal = Math.max(...DAYS.map((d) => d.balance));
  const upcoming = DAYS.slice(1).filter((d) => d.expenses.length > 0);

  return (
    <div className="min-h-screen w-full bg-black text-white overflow-y-auto" style={{ fontFamily: "Inter, sans-serif" }}>
      <div className="max-w-[390px] mx-auto bg-black min-h-screen">

        {/* Header */}
        <div className="px-4 pt-12 pb-3 flex items-center justify-between border-b border-[#1a1a1a]">
          <div>
            <p className="text-[10px] tracking-[0.3em] text-neutral-500 font-semibold uppercase">Cash Flow</p>
            <p className="font-['Cinzel'] text-[14px] tracking-[0.05em]" style={goldGrad as any}>PROYECCIÓN 14 DÍAS</p>
          </div>
          <div className="bg-[#141414] border border-[#222] rounded-full w-8 h-8 flex items-center justify-center text-[#f6dd8c] text-[11px] font-bold">M</div>
        </div>

        <div className="px-3 py-3 space-y-3">

          {/* ── Saldo actual ── */}
          <div className="bg-[#101010] border border-[#1e1e1e] rounded-2xl p-4">
            <p className="text-[8px] tracking-[0.25em] text-neutral-500 uppercase font-bold mb-1">SALDO EN BANCO HOY</p>
            <div className="flex items-end gap-3">
              <div>
                <p className="font-['JetBrains_Mono',monospace] text-[38px] font-bold leading-none text-[#f6dd8c]">$2,450</p>
                <p className="text-[9px] text-neutral-500 mt-1">Actualizado manualmente · ago 11</p>
              </div>
              <button className="mb-1 bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl px-3 py-2 text-[10px] text-neutral-400 flex items-center gap-1.5">
                ✏️ Editar
              </button>
            </div>
          </div>

          {/* ── Alertas de pagos próximos ── */}
          <div className="bg-[#101010] border border-[#1e1e1e] rounded-2xl p-4">
            <p className="text-[9px] tracking-[0.22em] text-neutral-500 font-bold uppercase mb-3">⚡ PAGOS PRÓXIMOS</p>
            <div className="space-y-2">
              {[
                { name: "Car Payment", amount: 919, days: 2, balAfter: 2201, safe: true },
                { name: "Renta", amount: 1500, days: 8, balAfter: 2491, safe: true },
                { name: "Car Payment", amount: 919, days: 9, balAfter: 1922, safe: true },
              ].map((p, i) => (
                <div key={i} className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${
                  p.days <= 3 ? "border-red-500/30 bg-red-500/5" :
                  p.days <= 7 ? "border-yellow-500/30 bg-yellow-500/5" :
                  "border-[#1e1e1e] bg-black/40"
                }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[14px] flex-shrink-0 ${
                    p.days <= 3 ? "bg-red-500/15" : p.days <= 7 ? "bg-yellow-500/15" : "bg-[#1e1e1e]"
                  }`}>
                    {p.days <= 3 ? "🔴" : p.days <= 7 ? "🟡" : "🟢"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-white truncate">{p.name}</p>
                    <p className="text-[9px] text-neutral-500">en {p.days} días · saldo después: <span style={{ color: balanceColor(p.balAfter) }}>${p.balAfter.toLocaleString()}</span></p>
                  </div>
                  <p className="font-['JetBrains_Mono',monospace] text-[14px] font-bold text-red-400 flex-shrink-0">-${p.amount}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Mini bar chart ── */}
          <div className="bg-[#101010] border border-[#1e1e1e] rounded-2xl p-4">
            <p className="text-[9px] tracking-[0.22em] text-neutral-500 font-bold uppercase mb-3">BALANCE DÍA A DÍA</p>
            <div className="flex items-end gap-1 h-[70px] mb-2">
              {DAYS.map((d, i) => {
                const pct = (d.balance - minBal + 200) / (maxBal - minBal + 400);
                const color = balanceColor(d.balance);
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                    <div className="w-full rounded-sm" style={{ height: `${Math.max(pct * 68, 4)}px`, background: color, opacity: d.isToday ? 1 : 0.6 }} />
                    <p className="text-[6px] text-neutral-600">{d.dayShort.slice(0, 2)}</p>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-[8px] mt-1">
              <span className="text-neutral-600">Mín: <span className="text-[#eab308]">${Math.min(...DAYS.map(d=>d.balance)).toLocaleString()}</span></span>
              <span className="text-neutral-600">Máx: <span className="text-[#4ade80]">${Math.max(...DAYS.map(d=>d.balance)).toLocaleString()}</span></span>
            </div>
          </div>

          {/* ── Timeline detalle ── */}
          <div className="bg-[#101010] border border-[#1e1e1e] rounded-2xl p-4">
            <p className="text-[9px] tracking-[0.22em] text-neutral-500 font-bold uppercase mb-3">TIMELINE DETALLADO</p>
            <div className="space-y-0">
              {DAYS.map((d, i) => (
                <div key={i} className={`flex items-start gap-3 py-2.5 ${i < DAYS.length - 1 ? "border-b border-[#141414]" : ""} ${d.isToday ? "bg-[#0d0d0d] -mx-4 px-4 rounded-none" : ""}`}>
                  {/* Left: day pill */}
                  <div className={`w-[46px] flex-shrink-0 rounded-lg px-1 py-1 text-center ${d.isToday ? "bg-[#d9b64f]/20 border border-[#d9b64f]/30" : "bg-[#0a0a0a] border border-[#1a1a1a]"}`}>
                    <p className={`text-[7px] font-bold ${d.isToday ? "text-[#f6dd8c]" : "text-neutral-500"}`}>{d.dayShort}</p>
                  </div>
                  {/* Middle: income + expenses */}
                  <div className="flex-1 min-w-0">
                    {d.income > 0 && (
                      <p className="text-[10px] text-[#4ade80]">+${d.income} ingreso</p>
                    )}
                    {d.expenses.map((e, j) => (
                      <p key={j} className="text-[10px] text-red-400">-${e.amount} {e.name}</p>
                    ))}
                    {d.income === 0 && d.expenses.length === 0 && (
                      <p className="text-[9px] text-neutral-600">{d.isWorkDay ? "Día de trabajo" : "Descanso"}</p>
                    )}
                  </div>
                  {/* Right: balance */}
                  <p className="font-['JetBrains_Mono',monospace] text-[12px] font-bold flex-shrink-0"
                    style={{ color: balanceColor(d.balance) }}>
                    ${d.balance.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
