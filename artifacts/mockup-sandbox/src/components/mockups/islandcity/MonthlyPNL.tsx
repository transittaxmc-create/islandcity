import React from "react";
import "./_group.css";

const goldGrad = { background: "linear-gradient(90deg, #f6dd8c, #d9b64f)" };

export function MonthlyPNL() {
  const data = {
    income: [
      { name: "Uber", amount: 2840.50, color: "#ffffff" },
      { name: "Lyft", amount: 1420.00, color: "#ff00bf" },
      { name: "Privado", amount: 450.00, color: "#f6dd8c" },
    ],
    expenses: [
      { name: "Renta de Vehículo", amount: 600.00 },
      { name: "Carga EV / Gasolina", amount: 320.50 },
      { name: "Seguro Comercial", amount: 280.00 },
      { name: "Peajes (Tolls)", amount: 140.00 },
      { name: "Mantenimiento", amount: 95.00 },
    ]
  };

  const totalIncome = data.income.reduce((sum, i) => sum + i.amount, 0);
  const totalExpenses = data.expenses.reduce((sum, e) => sum + e.amount, 0);
  const maxExpense = Math.max(...data.expenses.map(e => e.amount));
  
  const grossProfit = totalIncome - totalExpenses;
  const taxRate = 0.20;
  const estimatedTax = grossProfit * taxRate;
  const netProfit = grossProfit - estimatedTax;

  const savingsGoal = 15000;
  const currentSavings = 6300;
  const savingsPercent = currentSavings / savingsGoal;

  return (
    <div className="min-h-screen w-full bg-black text-white overflow-y-auto pb-12" style={{ fontFamily: "Inter, sans-serif" }}>
      <div className="max-w-[390px] mx-auto bg-black min-h-screen border-x border-[#1a1a1a]">
        {/* Header */}
        <div className="px-4 pt-12 pb-3 flex items-center justify-between border-b border-[#1a1a1a]">
          <div>
            <p className="text-[10px] tracking-[0.3em] text-neutral-500 font-semibold uppercase">Financial Intelligence</p>
            <p className="font-['Cinzel'] text-[14px] tracking-[0.05em]" style={{ ...goldGrad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" } as any}>ISLANDCITY</p>
          </div>
          <div className="bg-[#141414] border border-[#222] rounded-full w-8 h-8 flex items-center justify-center text-[#f6dd8c] text-[11px] font-bold">M</div>
        </div>

        <div className="px-3 py-3 space-y-3">
          
          {/* ── Monthly Overview ── */}
          <div className="relative rounded-2xl overflow-hidden border border-[#d9b64f]/20 p-4"
            style={{ background: "linear-gradient(135deg, #0d0900 0%, #1a0f00 50%, #0d0900 100%)" }}>
            <div className="absolute inset-0 rounded-2xl pointer-events-none"
              style={{ boxShadow: "inset 0 0 40px #d9b64f0a, 0 0 20px #d9b64f08" }} />
            
            <div className="flex items-center gap-1.5 text-[8px] tracking-[0.3em] text-[#a07820] font-bold uppercase mb-3">
              <span>P&L</span>
              <span>·</span>
              <div className="flex items-center gap-1 bg-[#d9b64f]/10 px-2 py-0.5 rounded-full border border-[#d9b64f]/20 cursor-pointer hover:bg-[#d9b64f]/20 transition-colors">
                <span>AGO 2026</span>
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </div>
            </div>

            <div className="flex items-end justify-between">
              <div>
                <p className="text-[9px] text-neutral-400 mb-0.5">Ganancia neta (después de imp.)</p>
                <p className="font-['JetBrains_Mono',monospace] text-[40px] font-bold leading-none tracking-tight"
                  style={{ background: "linear-gradient(135deg, #f6dd8c, #d9b64f)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  ${netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
            
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="bg-black/50 border border-[#d9b64f]/10 rounded-xl p-2.5">
                <p className="text-[8px] text-neutral-500 uppercase tracking-widest mb-1">Ingresos</p>
                <p className="font-['JetBrains_Mono',monospace] text-[15px] font-bold text-[#4ade80]">+${totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="bg-black/50 border border-[#d9b64f]/10 rounded-xl p-2.5">
                <p className="text-[8px] text-neutral-500 uppercase tracking-widest mb-1">Gastos</p>
                <p className="font-['JetBrains_Mono',monospace] text-[15px] font-bold text-[#ef4444]">-${totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </div>

          {/* ── Income Breakdown ── */}
          <div className="bg-[#101010] border border-[#1e1e1e] rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[9px] tracking-[0.22em] text-neutral-500 font-bold uppercase">INGRESOS POR PLATAFORMA</p>
            </div>
            <div className="space-y-3.5">
              {data.income.map(item => (
                <div key={item.name}>
                  <div className="flex justify-between items-end mb-1.5">
                    <span className="text-[11px] font-medium text-neutral-200">{item.name}</span>
                    <span className="font-['JetBrains_Mono',monospace] text-[13px] font-bold text-white">${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(item.amount / totalIncome) * 100}%`, backgroundColor: item.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Expenses Breakdown ── */}
          <div className="bg-[#101010] border border-[#1e1e1e] rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[9px] tracking-[0.22em] text-neutral-500 font-bold uppercase">GASTOS OPERATIVOS</p>
            </div>
            <div className="space-y-3.5">
              {data.expenses.map(item => (
                <div key={item.name}>
                  <div className="flex justify-between items-end mb-1.5">
                    <span className="text-[11px] font-medium text-neutral-400">{item.name}</span>
                    <span className="font-['JetBrains_Mono',monospace] text-[13px] text-neutral-300">${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-neutral-600" style={{ width: `${(item.amount / maxExpense) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-[#1e1e1e]">
               <button className="w-full text-center text-[10px] text-neutral-500 hover:text-white uppercase tracking-widest transition-colors font-medium">Ver todos los movimientos</button>
            </div>
          </div>

          {/* ── Taxes & Net ── */}
          <div className="bg-[#101010] border border-[#1e1e1e] rounded-2xl p-4 space-y-2.5">
            <div className="flex justify-between items-center">
              <span className="text-[11px] text-neutral-400">Ganancia Bruta</span>
              <span className="font-['JetBrains_Mono',monospace] text-[13px] text-white">${grossProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[11px] text-neutral-400">Impuestos Estimados ({(taxRate*100)}%)</span>
              <span className="font-['JetBrains_Mono',monospace] text-[13px] text-[#ef4444]">-${estimatedTax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="pt-2.5 border-t border-[#1e1e1e] flex justify-between items-center">
              <span className="text-[11px] font-bold text-[#f6dd8c] uppercase tracking-wider">Ganancia Neta</span>
              <span className="font-['JetBrains_Mono',monospace] text-[15px] font-bold text-[#f6dd8c]">${netProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* ── Savings Goal ── */}
          <div className="bg-[#101010] border border-[#1e1e1e] rounded-2xl p-4">
            <div className="flex justify-between items-start mb-1">
              <div>
                <p className="text-[9px] tracking-[0.22em] text-[#3b82f6] font-bold uppercase">META DE AHORRO ANUAL</p>
                <p className="text-[10px] text-neutral-500 mt-1">Fondo de emergencia & retiro</p>
              </div>
            </div>
            
            <div className="flex items-center gap-5 mt-4">
              <svg width="90" height="90" viewBox="0 0 90 90" className="flex-shrink-0">
                <circle cx="45" cy="45" r="36" fill="none" stroke="#1e1e1e" strokeWidth="8"/>
                <circle cx="45" cy="45" r="36" fill="none" stroke="#3b82f6" strokeWidth="8"
                  strokeLinecap="round" strokeDasharray={`${savingsPercent * 2 * Math.PI * 36} ${2 * Math.PI * 36}`}
                  transform="rotate(-90 45 45)"/>
                <text x="45" y="42" textAnchor="middle" fill="#3b82f6" fontSize="16" fontWeight="bold" fontFamily="JetBrains Mono, monospace">{Math.round(savingsPercent * 100)}%</text>
                <text x="45" y="55" textAnchor="middle" fill="#6b7280" fontSize="7" fontFamily="JetBrains Mono, monospace">${(currentSavings/1000).toFixed(1)}k / ${(savingsGoal/1000).toFixed(1)}k</text>
              </svg>
              
              <div className="flex-1 space-y-2">
                <div className="bg-black border border-[#1e1e1e] rounded-xl p-2.5">
                  <p className="text-[8px] text-neutral-500 uppercase tracking-widest mb-1">Ahorrado</p>
                  <p className="font-['JetBrains_Mono',monospace] text-[15px] font-bold text-white">${currentSavings.toLocaleString()}</p>
                </div>
                <div className="bg-black border border-[#1e1e1e] rounded-xl p-2.5">
                  <p className="text-[8px] text-neutral-500 uppercase tracking-widest mb-1">Restante</p>
                  <p className="font-['JetBrains_Mono',monospace] text-[13px] font-bold text-neutral-400">${(savingsGoal - currentSavings).toLocaleString()}</p>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-[#1e1e1e]">
               <button className="w-full bg-[#3b82f6]/10 hover:bg-[#3b82f6]/20 text-[#3b82f6] text-[11px] font-bold uppercase tracking-wider py-2.5 rounded-lg transition-colors">
                 Transferir a Ahorros
               </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
