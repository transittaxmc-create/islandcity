// ── FINANCE data engine — ported 1:1 from EI Program (replit-backup) ──
import type { EntryRecord } from "../../lib/domain";
import type { ReceiptRecord } from "../../lib/receipts";

export interface BankAdjEntry { id: string; date: string; time: string; prevBalance: number; newBalance: number; note: string }
export interface RecurringPlan { enabled: boolean; workDays: number[]; dayTargets: Record<number, number>; untilDate: string }
export type WeekOverrides = Record<string, { workDays: number[]; dayTargets: Record<number, number> }>;

export function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
/** ISO day 1=Mon … 7=Sun */
export function isoDay(d: Date): number { return d.getDay() === 0 ? 7 : d.getDay(); }
/** Net per trip — earnings + tips + extraCash + toll (original _tripNet). */
export function tripNet(t: EntryRecord): number {
  return (t.earnings || 0) + (t.tips || 0) + (t.extraCash || 0) + (t.toll || 0);
}
function expDate(e: ReceiptRecord): string { return (e.createdAt || e.dueDate || "").slice(0, 10); }
export function isRecurring(e: ReceiptRecord): boolean {
  return !!e.frequency && e.frequency !== "one-time";
}

export interface FinanceInputs {
  clock: Date;
  entries: EntryRecord[];
  expenses: ReceiptRecord[];
  dailyGoal: number;
  workDays: number[];
  dayTargets: Record<number, number>;
  weekOverrides: WeekOverrides;
  recurringPlan: RecurringPlan;
  bankBalance: number;
}

export function computeFinance(inp: FinanceInputs) {
  const { clock, entries, expenses, dailyGoal, workDays, dayTargets, weekOverrides, recurringPlan, bankBalance } = inp;
  const finWd = clock.getDay();
  const finMon = new Date(clock);
  finMon.setDate(clock.getDate() + (finWd === 0 ? -6 : 1 - finWd));
  const finWeekStart = toYMD(finMon);
  const finMonthStart = `${clock.getFullYear()}-${String(clock.getMonth() + 1).padStart(2, "0")}-01`;
  const finYearStart = `${clock.getFullYear()}-01-01`;
  const finToday = toYMD(clock);

  const earnToday = entries.filter((t) => t.datetime.slice(0, 10) === finToday).reduce((a, t) => a + tripNet(t), 0);
  const earnWeek = entries.filter((t) => t.datetime.slice(0, 10) >= finWeekStart).reduce((a, t) => a + tripNet(t), 0);
  const earnMonth = entries.filter((t) => t.datetime.slice(0, 10) >= finMonthStart).reduce((a, t) => a + tripNet(t), 0);
  const earnYear = entries.filter((t) => t.datetime.slice(0, 10) >= finYearStart).reduce((a, t) => a + tripNet(t), 0);

  // Weekly bar chart (Mon i=0 … Sun i=6)
  const _DAY = ["M", "Tu", "W", "Th", "F", "Sa", "Su"] as const;
  const weekChart = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(finMon); d.setDate(finMon.getDate() + i);
    const ds = toYMD(d);
    const actual = entries.filter((t) => t.datetime.slice(0, 10) === ds).reduce((a, t) => a + tripNet(t), 0);
    const isoDayI = i === 6 ? 7 : i + 1;
    const dayPlan = workDays.includes(isoDayI) ? (dayTargets[isoDayI] ?? dailyGoal) : 0;
    return { day: _DAY[i], actual, projected: dayPlan, ds };
  });

  // Projections — per-day targets
  const todayISO = isoDay(clock);
  const weekPlanTotal = workDays.reduce((s, iso) => s + (dayTargets[iso] ?? dailyGoal), 0);
  const avgDayTarget = workDays.length > 0 ? weekPlanTotal / workDays.length : dailyGoal;
  const todayRem = workDays.includes(todayISO) ? Math.max((dayTargets[todayISO] ?? dailyGoal) - earnToday, 0) : 0;
  const remainWkPlan = todayRem + workDays.filter((d) => d > todayISO).reduce((s, iso) => s + (dayTargets[iso] ?? dailyGoal), 0);
  const projWeek = earnWeek + remainWkPlan;
  const dimM = new Date(clock.getFullYear(), clock.getMonth() + 1, 0).getDate();
  const remainDaysM = dimM - clock.getDate();
  const projMonth = earnMonth + avgDayTarget * Math.round(remainDaysM * (workDays.length / 7));
  const doy = Math.ceil((clock.getTime() - new Date(finYearStart + "T00:00:00").getTime()) / 86400000);
  const projYear = earnYear + avgDayTarget * Math.round((365 - doy) * (workDays.length / 7));
  const annTarget = weekPlanTotal * 52;
  const yearPct = annTarget > 0 ? Math.min(projYear / annTarget, 1) : 0;
  const todayPlan = workDays.includes(todayISO) ? (dayTargets[todayISO] ?? dailyGoal) : dailyGoal;

  // Platform table
  const byPlat: Record<string, { today: number; week: number; month: number }> = {};
  entries.forEach((t) => {
    const plat = t.platform || "Other";
    if (!byPlat[plat]) byPlat[plat] = { today: 0, week: 0, month: 0 };
    const a = tripNet(t);
    const ds = t.datetime.slice(0, 10);
    if (ds === finToday) byPlat[plat].today += a;
    if (ds >= finWeekStart) byPlat[plat].week += a;
    if (ds >= finMonthStart) byPlat[plat].month += a;
  });
  const platRows = Object.entries(byPlat).sort((a, b) => b[1].week - a[1].week);

  // Expense health
  const monthFixed = expenses.reduce((s, e) => {
    if (e.frequency === "daily") return s + e.amount * 30;
    if (e.frequency === "weekly") return s + e.amount * 4.33;
    if (e.frequency === "monthly") return s + e.amount;
    return s;
  }, 0);
  const expMonth = expenses.filter((e) => expDate(e) >= finMonthStart).reduce((s, e) => s + e.amount, 0);
  const netProj = projMonth - (expMonth + monthFixed);

  // ── Monthly cash flow (Proyecciones) ──────────────────────────────
  const mwTodayStr = toYMD(clock);
  const recurWk = expenses.reduce((s, e) => {
    if (!isRecurring(e)) return s;
    if (e.endDate && e.endDate < mwTodayStr) return s; // expired
    if (e.frequency === "monthly") return s + e.amount / 4.33;
    if (e.frequency === "weekly") return s + e.amount;
    if (e.frequency === "daily") return s + e.amount * 7;
    return s;
  }, 0);
  const recurPerDay = (dateStr: string) => expenses.reduce((s, e) => {
    if (!isRecurring(e)) return s;
    if (e.endDate && e.endDate < dateStr) return s;
    if (e.frequency === "monthly") return s + e.amount / (4.33 * 7);
    if (e.frequency === "weekly") return s + e.amount / 7;
    if (e.frequency === "daily") return s + e.amount;
    return s;
  }, 0);

  const mwYear = clock.getFullYear(), mwMo = clock.getMonth();
  const mwFirst = new Date(mwYear, mwMo, 1);
  const mwLast = new Date(mwYear, mwMo + 1, 0);

  // Weeks overlapping the current month (start on Monday)
  type MW = { wStr: string; eStr: string; label: string; projIncome: number; projExp: number; isPast: boolean; isCurrent: boolean };
  const mwWeeks: MW[] = (() => {
    const wks: MW[] = [];
    const ws0 = new Date(mwFirst);
    const sd = ws0.getDay(); ws0.setDate(ws0.getDate() - (sd === 0 ? 6 : sd - 1));
    let ws = new Date(ws0);
    while (ws <= mwLast) {
      const we = new Date(ws); we.setDate(we.getDate() + 6);
      const wStr = toYMD(ws), eStr = toYMD(we);
      const wkOv = weekOverrides[wStr];
      const isFutureWk = wStr > finWeekStart;
      const inRecurPlan = isFutureWk && recurringPlan.enabled && recurringPlan.untilDate >= wStr;
      const effWD = wkOv?.workDays ?? (inRecurPlan ? recurringPlan.workDays : workDays);
      const effDT = wkOv?.dayTargets ?? (inRecurPlan ? recurringPlan.dayTargets : dayTargets);
      let projIncome = 0, daysInMo = 0;
      for (let di = 0; di < 7; di++) {
        const dd = new Date(ws); dd.setDate(ws.getDate() + di);
        if (dd.getMonth() !== mwMo) continue;
        daysInMo++;
        const iso = isoDay(dd);
        if (effWD.includes(iso)) projIncome += (effDT[iso] ?? dailyGoal);
      }
      const projExp = recurWk * (daysInMo / 7);
      const isPast = eStr < mwTodayStr, isCurrent = wStr <= mwTodayStr && eStr >= mwTodayStr;
      const m1 = ws.toLocaleDateString("en-US", { month: "short" }), m2 = we.toLocaleDateString("en-US", { month: "short" });
      const label = m1 === m2 ? `${ws.getDate()}–${we.getDate()} ${m1}` : `${ws.getDate()} ${m1}–${we.getDate()} ${m2}`;
      wks.push({ wStr, eStr, label, projIncome, projExp, isPast, isCurrent });
      ws = new Date(ws); ws.setDate(ws.getDate() + 7);
    }
    return wks;
  })();

  // Running balance forward from today's bankBalance
  const mwCurIdx = mwWeeks.findIndex((w) => w.isCurrent);
  const mwBalances: number[] = mwWeeks.map(() => NaN);
  if (mwCurIdx >= 0) {
    const curW = mwWeeks[mwCurIdx];
    const daysPast = Math.max(0, Math.floor((clock.getTime() - new Date(curW.wStr + "T00:00:00").getTime()) / 86400000));
    const remRecurWk = recurWk * ((7 - daysPast) / 7);
    mwBalances[mwCurIdx] = bankBalance + remainWkPlan - remRecurWk;
    for (let i = mwCurIdx + 1; i < mwWeeks.length; i++) {
      mwBalances[i] = mwBalances[i - 1] + mwWeeks[i].projIncome - mwWeeks[i].projExp;
    }
  }

  // ── 14-day cash flow projection ───────────────────────────────────
  const cfDailyRecur = recurWk / 7;
  const cfDays = (() => {
    const days: {
      date: Date; dateStr: string; shortLabel: string; isToday: boolean; isWorkDay: boolean;
      income: number; paymentTotal: number; payments: ReceiptRecord[]; balance: number;
    }[] = [];
    let bal = bankBalance;
    for (let i = 0; i < 14; i++) {
      const d = new Date(clock);
      d.setDate(clock.getDate() + i);
      const dateStr = toYMD(d);
      const iso = isoDay(d);
      const isWorkDay = workDays.includes(iso);
      const isToday = i === 0;
      const income = isToday ? 0 : (isWorkDay ? (dayTargets[iso] ?? dailyGoal) : 0);
      const payments = expenses.filter((e) =>
        e.dueDate === dateStr && e.frequency === "monthly" && (!e.endDate || e.endDate >= dateStr));
      const paymentTotal = payments.reduce((s, e) => s + e.amount, 0);
      if (!isToday) bal = bal + income - recurPerDay(dateStr) - paymentTotal;
      const shortLabel = isToday ? "NOW"
        : d.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 2).toUpperCase();
      days.push({ date: new Date(d), dateStr, shortLabel, isToday, isWorkDay, income, paymentTotal, payments, balance: isToday ? bankBalance : bal });
    }
    return days;
  })();
  const cfMin = Math.min(...cfDays.map((d) => d.balance));
  const cfMax = Math.max(...cfDays.map((d) => d.balance));
  const cfPayments14 = expenses
    .filter((e) => e.dueDate && e.frequency === "monthly" && (!e.endDate || e.endDate >= e.dueDate))
    .map((e) => {
      const daysUntil = Math.round((new Date(e.dueDate! + "T12:00:00").getTime() - clock.getTime()) / 86400000);
      const dayEntry = cfDays.find((d) => d.dateStr === e.dueDate);
      const balAfter = dayEntry?.balance ?? bankBalance;
      const prePayBal = dayEntry ? (dayEntry.balance + dayEntry.paymentTotal) : bankBalance;
      const covered = prePayBal >= e.amount;
      return { name: e.vendor || e.category, amount: e.amount, dueStr: e.dueDate!, daysUntil, balAfter, covered };
    })
    .filter((p) => p.daysUntil >= 0 && p.daysUntil <= 13)
    .sort((a, b) => a.daysUntil - b.daysUntil);

  return {
    finWeekStart, finMonthStart, finYearStart, finToday, finMon,
    earnToday, earnWeek, earnMonth, earnYear,
    weekChart, weekPlanTotal, avgDayTarget, remainWkPlan, projWeek,
    projMonth, projYear, annTarget, yearPct, todayPlan,
    platRows, monthFixed, expMonth, netProj,
    recurWk, mwWeeks, mwBalances, cfDailyRecur, cfDays, cfMin, cfMax, cfPayments14,
  };
}
export type FinanceData = ReturnType<typeof computeFinance>;