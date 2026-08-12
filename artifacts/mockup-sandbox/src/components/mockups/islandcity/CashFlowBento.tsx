import React from "react";

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

const goldGrad = { background: "linear-gradient(90deg, #f6dd8c, #d9b64f)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" };

export default function CashFlowBento() {
  const minBal = Math.min(...DAYS.map((d) => d.balance));
  const maxBal = Math.max(...DAYS.map((d) => d.balance));
  const upcoming = [
    { name: "Car Payment", amount: 919, days: 2, balAfter: 2201, safe: true },
    { name: "Renta", amount: 1500, days: 8, balAfter: 2491, safe: true },
    { name: "Car Payment", amount: 919, days: 9, balAfter: 1922, safe: true },
  ];

  return (
    <div className="min-h-screen w-full bg-[#050505] text-white overflow-y-auto font-sans">
      <div className="max-w-[390px] mx-auto bg-[#050505] min-h-screen flex flex-col">
        
        {/* Header - Sticky */}
        <div className="sticky top-0 z-10 bg-[#050505]/80 backdrop-blur-md px-5 pt-12 pb-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] tracking-[0.2em] text-neutral-400 font-medium uppercase mb-1">Visión General</p>
            <p className="font-serif text-[16px] tracking-wide" style={goldGrad}>PROYECCIÓN DE FLUJO</p>
          </div>
          <div className="bg-[#141414] border border-[#222] rounded-full w-9 h-9 flex items-center justify-center text-[#f6dd8c] text-[12px] font-bold shadow-lg shadow-[#d9b64f]/10">M</div>
        </div>

        <div className="px-5 py-4 space-y-4 flex-1">

          {/* Bento Grid Header */}
          <div className="grid grid-cols-2 gap-3">
            {/* Main Balance */}
            <div className="col-span-2 bg-gradient-to-br from-[#121212] to-[#0a0a0a] border border-[#1e1e1e] rounded-[24px] p-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#d9b64f]/5 rounded-full blur-3xl -mr-10 -mt-10" />
              <div className="flex justify-between items-start mb-4">
                <p className="text-[10px] tracking-[0.15em] text-neutral-400 uppercase font-semibold">Balance de hoy</p>
                <button className="bg-[#1e1e1e] hover:bg-[#2a2a2a] transition-colors border border-[#2a2a2a] rounded-full px-3 py-1.5 text-[10px] text-neutral-300 flex items-center gap-1.5">
                  ✏️ Editar
                </button>
              </div>
              <p className="font-mono text-[42px] font-light tracking-tight text-white leading-none mb-2">
                $<span className="font-bold text-[#f6dd8c]">2,450</span>
              </p>
              <p className="text-[10px] text-neutral-500">Actualizado hace 2 horas</p>
            </div>

            {/* Min Balance */}
            <div className="bg-[#101010] border border-[#1e1e1e] rounded-[20px] p-4 flex flex-col justify-between">
              <p className="text-[9px] tracking-[0.1em] text-neutral-500 uppercase font-medium mb-2">Punto Más Bajo</p>
              <div>
                <p className="font-mono text-[18px] font-bold text-[#eab308]">${minBal.toLocaleString()}</p>
                <p className="text-[9px] text-neutral-500 mt-0.5">En 9 días</p>
              </div>
            </div>

            {/* Max Balance */}
            <div className="bg-[#101010] border border-[#1e1e1e] rounded-[20px] p-4 flex flex-col justify-between">
              <p className="text-[9px] tracking-[0.1em] text-neutral-500 uppercase font-medium mb-2">Punto Más Alto</p>
              <div>
                <p className="font-mono text-[18px] font-bold text-[#4ade80]">${maxBal.toLocaleString()}</p>
                <p className="text-[9px] text-neutral-500 mt-0.5">En 7 días</p>
              </div>
            </div>
            
            {/* Graph inside Bento */}
            <div className="col-span-2 bg-[#101010] border border-[#1e1e1e] rounded-[24px] p-5">
              <p className="text-[10px] tracking-[0.1em] text-neutral-400 uppercase font-semibold mb-4">Trayectoria de 14 días</p>
              <div className="flex items-end gap-1.5 h-[80px]">
                {DAYS.map((d, i) => {
                  const pct = (d.balance - minBal + 200) / (maxBal - minBal + 400);
                  const color = balanceColor(d.balance);
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group relative">
                      <div 
                        className={`w-full rounded-full transition-all duration-300 ${d.isToday ? 'shadow-[0_0_8px_rgba(246,221,140,0.4)]' : ''}`} 
                        style={{ 
                          height: `${Math.max(pct * 70, 8)}px`, 
                          background: d.isToday ? '#f6dd8c' : color, 
                          opacity: d.isToday ? 1 : 0.3 
                        }} 
                      />
                      <p className={`text-[8px] ${d.isToday ? 'text-[#f6dd8c] font-bold' : 'text-neutral-600'}`}>{d.dayShort[0]}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Horizontal Scroll for Alerts */}
          <div className="-mx-5 px-5">
            <div className="flex items-center justify-between mb-3 px-1">
              <p className="text-[11px] tracking-[0.15em] text-white font-semibold uppercase">⚡ Próximos Pagos</p>
              <span className="text-[10px] text-neutral-500">{upcoming.length} pendientes</span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-4 pt-1 snap-x no-scrollbar" style={{ scrollbarWidth: 'none' }}>
              {upcoming.map((p, i) => (
                <div key={i} className={`snap-start flex-shrink-0 w-[200px] rounded-[20px] p-4 border relative overflow-hidden ${
                  p.days <= 3 ? "bg-gradient-to-br from-[#1a0f0f] to-[#120808] border-red-500/20" : 
                  p.days <= 7 ? "bg-gradient-to-br from-[#1a170f] to-[#121008] border-yellow-500/20" : 
                  "bg-gradient-to-br from-[#141414] to-[#0a0a0a] border-[#1e1e1e]"
                }`}>
                  {p.days <= 3 && <div className="absolute top-0 right-0 w-16 h-16 bg-red-500/10 rounded-full blur-xl -mr-4 -mt-4" />}
                  <div className="flex justify-between items-start mb-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] border ${
                      p.days <= 3 ? "bg-red-500/10 border-red-500/20 text-red-400" : 
                      p.days <= 7 ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-400" : 
                      "bg-[#222] border-[#333] text-neutral-400"
                    }`}>
                      {p.days}d
                    </div>
                    <p className="font-mono text-[14px] font-bold text-white">-${p.amount}</p>
                  </div>
                  <p className="text-[13px] font-medium text-white mb-0.5">{p.name}</p>
                  <p className="text-[10px] text-neutral-500">Quedarán <span className="font-mono text-white">${p.balAfter}</span></p>
                </div>
              ))}
              {/* Padding block for smooth scroll ending */}
              <div className="w-[1px] flex-shrink-0" />
            </div>
          </div>

          {/* Vertical Timeline */}
          <div>
            <p className="text-[11px] tracking-[0.15em] text-white font-semibold uppercase mb-4 px-1">Detalle Diario</p>
            <div className="bg-[#101010] border border-[#1e1e1e] rounded-[24px] overflow-hidden">
              {DAYS.map((d, i) => (
                <div key={i} className={`px-4 py-3.5 flex items-center gap-3 ${i < DAYS.length - 1 ? "border-b border-[#1a1a1a]" : ""} ${d.isToday ? "bg-[#161616] relative" : ""}`}>
                  {d.isToday && <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#f6dd8c]" />}
                  
                  {/* Date column */}
                  <div className="w-[42px] flex flex-col items-center justify-center">
                    <p className={`text-[9px] font-bold uppercase ${d.isToday ? "text-[#f6dd8c]" : "text-neutral-500"}`}>{d.dayShort}</p>
                    <p className={`text-[12px] font-medium ${d.isToday ? "text-white" : "text-neutral-400"}`}>{d.date.split('·')[1]?.trim().split(' ')[0]}</p>
                  </div>
                  
                  {/* Divider */}
                  <div className="w-[1px] h-8 bg-[#222]" />

                  {/* Activity column */}
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    {d.income > 0 && (
                      <p className="text-[11px] text-[#4ade80] font-medium">+${d.income} <span className="text-neutral-500 font-normal">est.</span></p>
                    )}
                    {d.expenses.map((e, j) => (
                      <p key={j} className="text-[11px] text-red-400 font-medium">-${e.amount} <span className="text-neutral-500 font-normal">{e.name}</span></p>
                    ))}
                    {d.income === 0 && d.expenses.length === 0 && (
                      <p className="text-[11px] text-neutral-600 italic">{d.isWorkDay ? "Día de trabajo regular" : "Día libre"}</p>
                    )}
                  </div>

                  {/* Balance column */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-[9px] text-neutral-500 mb-0.5">Saldo</p>
                    <p className="font-mono text-[13px] font-bold" style={{ color: d.isToday ? '#f6dd8c' : balanceColor(d.balance) }}>
                      ${d.balance.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="h-6" /> {/* Bottom padding */}

        </div>
      </div>
    </div>
  );
}
