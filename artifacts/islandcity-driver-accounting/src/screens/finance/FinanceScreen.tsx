// FINANCE Â· shell â€” 6 pages horizontal scroll â€” Trip + Copiloto + 4 more
import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { FinanceData, BankAdjEntry, RecurringPlan } from "./financeData";
import type { ReceiptRecord } from "../../lib/receipts";
import type { EntryRecord } from "../../lib/domain";
import { WeekPage } from "./WeekPage";
import { PresupuestoPage } from "./PresupuestoPage";
import { PlatformsPage } from "./PlatformsPage";
import { HealthPage } from "./HealthPage";
import { MatutinaPage } from "./MatutinaPage";
import { TripPage } from "./TripPage";

export function FinanceScreen(props: {
  F: FinanceData;
  clock: Date;
  entries: EntryRecord[];
  onAddEntry: (e: EntryRecord) => void;
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
  const { F, clock, entries, onAddEntry, expenses, addExpense, dailyGoal, workDays, setWorkDays, dayTargets, setDayTargets, recurringPlan, setRecurringPlan, bankBalance, setBankBalance, bankAdjHistory, setBankAdjHistory, showToast } = props;
  const [finPage, setFinPage] = useState(0);
  const finScrollRef = useRef<HTMLDivElement | null>(null);
  const names = ["Trip", "Copiloto", "This Week", "Presupuesto", "Platforms", "Financial Health"];
  const PAGE_COUNT = 6;
  return (
    <div>
      <div className="flex items-start justify-between px-4 pt-4 pb-3">
        <div>
          <p className="text-[10px] tracking-[0.22em] text-neutral-400 font-semibold uppercase">Financial Intelligence</p>
          <p className="text-[12px] font-semibold text-neutral-200 mt-0.5">{names[finPage]}</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Previous finance section"
            disabled={finPage === 0}
            onClick={() => { const el = finScrollRef.current; if (el) el.scrollTo({ left: (finPage - 1) * el.offsetWidth, behavior: "smooth" }); }}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-neutral-200 disabled:text-neutral-600"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="min-w-[48px] text-center text-[12px] font-semibold tabular-nums text-neutral-300">{finPage + 1} / {PAGE_COUNT}</span>
          <button
            type="button"
            aria-label="Next finance section"
            disabled={finPage === PAGE_COUNT - 1}
            onClick={() => { const el = finScrollRef.current; if (el) el.scrollTo({ left: (finPage + 1) * el.offsetWidth, behavior: "smooth" }); }}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-neutral-200 disabled:text-neutral-600"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div ref={finScrollRef} className="flex"
        style={{ overflowX: "scroll", scrollSnapType: "x mandatory", scrollbarWidth: "none" }}
        onScroll={(e) => { const el = e.currentTarget; setFinPage(Math.round(el.scrollLeft / (el.offsetWidth || 1))); }}>

        <TripPage clock={clock} entries={entries} onAddEntry={onAddEntry} showToast={showToast} />

        <MatutinaPage clock={clock} entries={entries} expenses={expenses}
          bankBalance={bankBalance} bankAdjHistory={bankAdjHistory}
          dailyGoal={dailyGoal} workDays={workDays} dayTargets={dayTargets} showToast={showToast} />

        <WeekPage F={F} dailyGoal={dailyGoal} workDays={workDays} setWorkDays={setWorkDays}
          dayTargets={dayTargets} setDayTargets={setDayTargets} recurringPlan={recurringPlan}
          setRecurringPlan={setRecurringPlan} showToast={showToast} />

        <PresupuestoPage clock={clock} entries={entries} expenses={expenses}
          dailyGoal={dailyGoal} workDays={workDays} dayTargets={dayTargets}
          bankBalance={bankBalance} setBankBalance={setBankBalance}
          bankAdjHistory={bankAdjHistory} setBankAdjHistory={setBankAdjHistory}
          showToast={showToast} />

        <PlatformsPage F={F} />

        <HealthPage F={F} clock={clock} expenses={expenses} bankAdjHistory={bankAdjHistory} />
      </div>
    </div>
  );
}
