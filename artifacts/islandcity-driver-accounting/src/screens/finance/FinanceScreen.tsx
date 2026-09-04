// FINANCE · shell — 4 pages horizontal scroll — ported 1:1
import { useRef, useState } from "react";
import type { FinanceData, BankAdjEntry, RecurringPlan } from "./financeData";
import type { ReceiptRecord } from "../../lib/receipts";
import { WeekPage } from "./WeekPage";
import { ProjPage } from "./ProjPage";
import { PlatformsPage } from "./PlatformsPage";
import { HealthPage } from "./HealthPage";

export function FinanceScreen(props: {
  F: FinanceData;
  clock: Date;
  expenses: ReceiptRecord[];
  addExpense: (e: ReceiptRecord) => void;
  dailyGoal: number;
  workDays: number[];
  setWorkDays: (v: number[]) => void;
  dayTargets: Record<number, number>;
  setDayTargets: (v: Record<number, number>) => void;
  recurringPlan: RecurringPlan;
  setRecurringPlan: (v: RecurringPlan) => void;
  bankBalance: number;
  setBankBalance: (n: number) => void;
  bankAdjHistory: BankAdjEntry[];
  setBankAdjHistory: (fn: (prev: BankAdjEntry[]) => BankAdjEntry[]) => void;
  showToast: (m: string) => void;
}) {
  const { F, clock, expenses, addExpense, dailyGoal, workDays, setWorkDays, dayTargets, setDayTargets, recurringPlan, setRecurringPlan, bankBalance, setBankBalance, bankAdjHistory, setBankAdjHistory, showToast } = props;
  const [finPage, setFinPage] = useState(0);
  const finScrollRef = useRef<HTMLDivElement | null>(null);
  const names = ["This Week", "Projections", "Platforms", "Financial Health"];
  return (
    <div>
      <div className="flex items-start justify-between px-4 pt-4 pb-3">
        <div>
          <p className="text-[10px] tracking-[0.22em] text-neutral-400 font-semibold uppercase">Financial Intelligence</p>
          <p className="text-[12px] font-semibold text-neutral-200 mt-0.5">{names[finPage]}</p>
        </div>
        <div className="flex items-center gap-1.5 mt-1">
          {[0, 1, 2, 3].map((i) => (
            <button key={i}
              onClick={() => { const el = finScrollRef.current; if (el) el.scrollTo({ left: i * el.offsetWidth, behavior: "smooth" }); }}
              style={{ width: i === finPage ? 16 : 8, height: 8, borderRadius: 4, background: i === finPage ? "#f6dd8c" : "#2a2a2a", transition: "all 0.3s", flexShrink: 0, border: "none", padding: 0, cursor: "pointer" }} />
          ))}
        </div>
      </div>

      <div ref={finScrollRef} className="flex"
        style={{ overflowX: "scroll", scrollSnapType: "x mandatory", scrollbarWidth: "none" }}
        onScroll={(e) => { const el = e.currentTarget; setFinPage(Math.round(el.scrollLeft / (el.offsetWidth || 1))); }}>

        <WeekPage F={F} dailyGoal={dailyGoal} workDays={workDays} setWorkDays={setWorkDays}
          dayTargets={dayTargets} setDayTargets={setDayTargets} recurringPlan={recurringPlan}
          setRecurringPlan={setRecurringPlan} showToast={showToast} />

        <ProjPage F={F} clock={clock} expenses={expenses} addExpense={addExpense}
          bankBalance={bankBalance} setBankBalance={setBankBalance}
          bankAdjHistory={bankAdjHistory} setBankAdjHistory={setBankAdjHistory} showToast={showToast} />

        <PlatformsPage F={F} />

        <HealthPage F={F} clock={clock} expenses={expenses} bankAdjHistory={bankAdjHistory} />
      </div>
    </div>
  );
}