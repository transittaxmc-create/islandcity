// FINANCE · Page 3 · Financial Health — ported 1:1
import type { FinanceData, BankAdjEntry } from "./financeData";
import type { ReceiptRecord } from "../../lib/receipts";

export function HealthPage({ F, clock, expenses, bankAdjHistory }: {
  F: FinanceData; clock: Date; expenses: ReceiptRecord[]; bankAdjHistory: BankAdjEntry[];
}) {
  const monthName = clock.toLocaleDateString("en-US", { month: "long" }).toUpperCase();
  const recurring = expenses.filter((e) => e.frequency && e.frequency !== "one-time");
  return (
    <div className="flex-shrink-0 w-full px-4 space-y-4 pb-6" style={{ scrollSnapAlign: "start" }}>
      <div className="bg-[#101010] border border-[#2e2e2e] rounded-2xl p-4">
        <p className="text-[9px] tracking-[0.22em] text-neutral-300 font-bold uppercase mb-3">
          FINANCIAL HEALTH · {monthName}
        </p>
        <div className="space-y-2.5">
          {([
            { label: "Actual earnings this month", val: F.earnMonth, color: "text-[#4ade80]" },
            { label: "Projected by month end", val: F.projMonth, color: "text-[#f6dd8c]" },
            { label: "Actual expenses this month", val: -F.expMonth, color: "text-red-400" },
            { label: "Projected recurring expenses", val: -F.monthFixed, color: "text-orange-400" },
          ] as { label: string; val: number; color: string }[]).map(({ label, val, color }) => (
            <div key={label} className="flex justify-between items-center gap-2">
              <p className="text-[11px] text-neutral-400 leading-tight">{label}</p>
              <p className={`font-mono-jet text-[13px] font-bold flex-shrink-0 ${color}`}>
                {val < 0 ? `-$${Math.abs(val).toFixed(2)}` : `$${val.toFixed(2)}`}
              </p>
            </div>
          ))}
          <div className="pt-2.5 border-t border-[#2a2a2a] flex justify-between items-center">
            <p className="text-[12px] font-bold text-white">PROJECTED NET EARNINGS</p>
            <p className={`font-mono-jet text-[19px] font-bold ${F.netProj >= 0 ? "text-[#4ade80]" : "text-red-400"}`}>
              {F.netProj < 0 ? `-$${Math.abs(F.netProj).toFixed(2)}` : `$${F.netProj.toFixed(2)}`}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-[#101010] border border-[#2e2e2e] rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[9px] tracking-[0.22em] text-neutral-300 font-bold uppercase">RECURRING EXPENSES</p>
          <span className="font-mono-jet text-[11px] text-orange-400 font-bold">−${F.monthFixed.toFixed(0)}/mo</span>
        </div>
        <div className="space-y-2">
          {recurring.map((e) => {
            const monthlyEq = e.frequency === "daily" ? e.amount * 30 : e.frequency === "weekly" ? e.amount * 4.33 : e.amount;
            const freqLabel = e.frequency === "daily" ? "daily" : e.frequency === "weekly" ? "weekly" : "monthly";
            return (
              <div key={e.id} className="flex items-center justify-between gap-2 py-1.5 border-b border-[#1a1a1a] last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-white truncate">{e.vendor}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[9px] bg-orange-400/10 text-orange-400 px-1.5 py-0.5 rounded-full border border-orange-400/20 font-bold">{freqLabel}</span>
                    {e.dueDate && <span className="text-[9px] text-neutral-400 font-mono-jet">due {e.dueDate.slice(5)}</span>}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-mono-jet text-[13px] font-bold text-red-400">−${e.amount.toFixed(2)}</p>
                  {e.frequency !== "monthly" && <p className="font-mono-jet text-[9px] text-neutral-400">≈${monthlyEq.toFixed(0)}/mo</p>}
                </div>
              </div>
            );
          })}
          {recurring.length === 0 && <p className="text-[11px] text-neutral-400">No recurring expenses yet</p>}
        </div>
        <div className="mt-3 pt-2 border-t border-[#1a1a1a] flex justify-between text-[10px]">
          <span className="text-neutral-400">Monthly total</span>
          <span className="font-mono-jet font-bold text-orange-400">−${F.monthFixed.toFixed(2)}</span>
        </div>
      </div>

      {bankAdjHistory.length > 0 && (
        <div className="bg-[#101010] border border-[#2e2e2e] rounded-2xl p-4">
          <p className="text-[9px] tracking-[0.22em] text-neutral-300 font-bold uppercase mb-3">BALANCE ADJUSTMENT HISTORY</p>
          <div className="space-y-2">
            {bankAdjHistory.slice(0, 6).map((adj) => (
              <div key={adj.id} className="flex items-start justify-between gap-2 py-1.5 border-b border-[#1a1a1a] last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="font-mono-jet text-[10px] text-neutral-400">{adj.date} · {adj.time}</p>
                  {adj.note && <p className="text-[11px] text-neutral-400 mt-0.5 truncate">{adj.note}</p>}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-mono-jet text-[11px] text-neutral-400">${adj.prevBalance.toFixed(0)} → <span className="text-[#f6dd8c] font-bold">${adj.newBalance.toFixed(0)}</span></p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}