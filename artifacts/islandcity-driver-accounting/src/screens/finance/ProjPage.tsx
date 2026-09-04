// FINANCE · Page 1 · Cash Flow 14-day — ported 1:1
import { useState } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Cell } from "recharts";
import type { FinanceData, BankAdjEntry } from "./financeData";
import type { ReceiptRecord } from "../../lib/receipts";
import { BankBalanceCard, ProjExpenseCard, type ProjExpForm } from "./ProjCards";

export function ProjPage({ F, clock, expenses, addExpense, bankBalance, setBankBalance, bankAdjHistory, setBankAdjHistory, showToast }: {
  F: FinanceData;
  clock: Date;
  expenses: ReceiptRecord[];
  addExpense: (e: ReceiptRecord) => void;
  bankBalance: number;
  setBankBalance: (n: number) => void;
  bankAdjHistory: BankAdjEntry[];
  setBankAdjHistory: (fn: (prev: BankAdjEntry[]) => BankAdjEntry[]) => void;
  showToast: (m: string) => void;
}) {
  const [showProj, setShowProj] = useState(false);
  const [form, setForm] = useState<ProjExpForm>({
    name: "", amount: "", frequency: "monthly", category: "Fuel",
    dueDate: "", repeatEnabled: false, repeatUntil: "",
  });
  return (
    <div className="flex-shrink-0 w-full px-4 space-y-4 pb-6" style={{ scrollSnapAlign: "start" }}>
      <div className="flex items-center gap-3 pt-1">
        <p className="text-[9px] tracking-[0.22em] text-neutral-300 font-bold uppercase">CASH FLOW</p>
        <span className="px-2.5 py-0.5 rounded-full bg-[#f6dd8c]/20 border border-[#f6dd8c]/30 text-[#f6dd8c] text-[8px] font-bold tracking-[0.12em]">14-DAY PROJECTION</span>
      </div>

      <BankBalanceCard bankBalance={bankBalance} setBankBalance={setBankBalance} bankAdjHistory={bankAdjHistory} setBankAdjHistory={setBankAdjHistory} clock={clock} />
      <ProjExpenseCard show={showProj} setShow={setShowProj} form={form} setForm={setForm} expenses={expenses} addExpense={addExpense} monthFixed={F.monthFixed} clock={clock} showToast={showToast} />

      {F.cfDailyRecur > 0 && (
        <div className="bg-[#101010] border border-[#2e2e2e] rounded-2xl px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-[9px] tracking-[0.18em] text-orange-400 font-bold uppercase">RECURRING DRAIN</p>
            <p className="text-[10px] text-neutral-400 mt-0.5">Daily / weekly / monthly expenses combined</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="font-mono-jet text-[15px] font-bold text-orange-400">−${F.cfDailyRecur.toFixed(2)}/day</p>
            <p className="font-mono-jet text-[10px] text-neutral-400">−${(F.cfDailyRecur * 30).toFixed(0)}/month</p>
          </div>
        </div>
      )}

      {F.cfPayments14.length > 0 && (
        <div className="bg-[#101010] border border-[#2e2e2e] rounded-2xl p-4">
          <p className="text-[9px] tracking-[0.22em] text-[#f6dd8c]/90 font-bold uppercase mb-3">⚡ UPCOMING PAYMENTS</p>
          <div className="space-y-2">
            {F.cfPayments14.map((pmt) => (
              <div key={pmt.dueStr} className={`flex items-center gap-3 rounded-xl px-3 py-3 border ${pmt.daysUntil <= 2 ? "border-red-500/40 bg-[#0f0202]" : pmt.covered ? "border-[#4ade80]/20 bg-[#020f02]" : "border-red-500/20 bg-[#0f0202]"}`}>
                <span className={`w-3 h-3 rounded-full flex-shrink-0 ${pmt.daysUntil <= 2 ? "bg-red-500" : pmt.covered ? "bg-[#4ade80]" : "bg-red-500"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-white truncate">{pmt.name}</p>
                  <p className="text-[10px] text-neutral-400 mt-0.5">{pmt.daysUntil === 0 ? "Due today" : pmt.daysUntil === 1 ? "Tomorrow" : `In ${pmt.daysUntil} days`} · balance after: <span className="font-mono-jet">${pmt.balAfter.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span></p>
                </div>
                <p className="font-mono-jet text-[16px] font-black text-red-400 flex-shrink-0">-${pmt.amount.toFixed(0)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-[#101010] border border-[#2e2e2e] rounded-2xl p-4">
        <p className="text-[9px] tracking-[0.22em] text-[#f6dd8c]/90 font-bold uppercase mb-3">DAILY BALANCE</p>
        <ResponsiveContainer width="100%" height={110}>
          <BarChart data={F.cfDays.map((d) => ({ label: d.shortLabel, balance: d.balance, isToday: d.isToday, neg: d.balance < 0 }))} barSize={16} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <XAxis dataKey="label" tick={{ fontSize: 8, fill: "#6b7280" }} axisLine={false} tickLine={false} />
            <YAxis hide domain={[Math.min(F.cfMin * 1.1, 0), F.cfMax * 1.1]} />
            <Bar dataKey="balance" radius={[3, 3, 0, 0]}>{F.cfDays.map((d, i) => (<Cell key={i} fill={d.isToday ? "#f6dd8c" : d.balance < 0 ? "#ef4444" : "#4ade80"} fillOpacity={d.isToday ? 1 : 0.65} />))}</Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="flex justify-between text-[10px] font-mono-jet mt-1 px-1">
          <span className="text-neutral-400">Min: <span className={F.cfMin < 0 ? "text-red-400" : "text-neutral-300"}>${F.cfMin.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span></span>
          <span className="text-neutral-400">Max: <span className="text-[#4ade80]">${F.cfMax.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span></span>
        </div>
      </div>

      <div className="bg-[#101010] border border-[#2e2e2e] rounded-2xl p-4">
        <p className="text-[9px] tracking-[0.22em] text-[#f6dd8c]/90 font-bold uppercase mb-1">DETAILED TIMELINE</p>
        <div>
          {F.cfDays.map((d, i) => (
            <div key={d.dateStr} className={`flex items-start gap-3 py-2.5 ${i < F.cfDays.length - 1 ? "border-b border-[#1e1e1e]" : ""}`}>
              <div className="w-[44px] flex-shrink-0 pt-0.5">{d.isToday ? (<span className="inline-block px-1.5 py-0.5 rounded bg-[#f6dd8c]/20 text-[#f6dd8c] text-[7px] font-black tracking-widest">TODAY</span>) : (<span className="text-[10px] text-neutral-400 font-semibold">{d.shortLabel}</span>)}</div>
              <div className="flex-1 min-w-0">
                {d.isToday ? (<p className="text-[12px] text-neutral-400">{d.isWorkDay ? "Work day" : "Rest"}</p>) : (<div>
                  {d.income > 0 && <p className="text-[12px] text-[#4ade80] font-semibold">+${d.income.toLocaleString("en-US", { maximumFractionDigits: 0 })} income</p>}
                  {!d.isWorkDay && d.income === 0 && d.paymentTotal === 0 && <p className="text-[12px] text-neutral-400">Rest</p>}
                  {d.payments.map((pmt) => <p key={pmt.id} className="text-[11px] text-red-400 font-semibold">-${pmt.amount.toFixed(0)} {pmt.vendor || pmt.category}</p>)}
                </div>)}
              </div>
              <p className={`font-mono-jet text-[14px] font-bold flex-shrink-0 ${d.balance < 0 ? "text-red-400" : d.isToday ? "text-[#f6dd8c]" : "text-neutral-200"}`}>${d.balance.toLocaleString("en-US", { maximumFractionDigits: 0 })}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[#101010] border border-[#2e2e2e] rounded-2xl p-4">
        <p className="text-[9px] tracking-[0.22em] text-[#f6dd8c]/90 font-bold uppercase mb-3">ANNUAL OUTLOOK</p>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {([{ label: "End of Week", val: F.projWeek }, { label: "End of Month", val: F.projMonth }, { label: "End of Year", val: F.projYear }] as { label: string; val: number }[]).map(({ label, val }) => (
            <div key={label} className="bg-black border border-[#2e2e2e] rounded-xl p-2.5 text-center">
              <p className="text-[8px] text-neutral-400 uppercase tracking-widest leading-tight mb-1">{label}</p>
              <p className="text-[14px] font-bold text-[#f6dd8c] font-mono-jet">${(val / 1000).toFixed(1)}k</p>
            </div>
          ))}
        </div>
        <div className="bg-black border border-[#2e2e2e] rounded-xl p-3">
          <div className="flex justify-between items-center mb-1.5">
            <p className="text-[9px] text-neutral-400">Annual goal · Super Plus</p>
            <p className="text-[9px] text-[#f6dd8c]">${(F.annTarget / 1000).toFixed(0)}k · {Math.round(F.yearPct * 100)}%</p>
          </div>
          <div className="h-2 bg-[#1e1e1e] rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${F.yearPct * 100}%`, background: "linear-gradient(to right,#d9b64f,#f6dd8c)" }} />
          </div>
          <p className="text-[8px] text-neutral-400 mt-1.5">Based on weekly plan</p>
        </div>
      </div>
    </div>
  );
}