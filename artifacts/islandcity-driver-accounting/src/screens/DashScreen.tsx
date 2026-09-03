// ── DASH screen — ported 1:1 from EI Program dashboard ────────────────
import { useMemo } from "react";
import type { EntryRecord } from "../lib/domain";
import type { ReceiptRecord } from "../lib/receipts";
import { IRS_RATE_PER_MILE, computeDemandZones } from "../lib/nycZones";
import { GOLD_GRADIENT, GaugeArc, GoalRing } from "./dash/Gauge";
import { FinancialIntelCard, ShiftBreakdownCard } from "./dash/FinanceCards";
import { ZonesCard, TripStatsCard, TollCard } from "./dash/ZonesCard";

export interface DashProps {
  clock: Date;
  gps: { lat: number; lng: number; acc: number } | null;
  todayTrips: EntryRecord[];
  grossToday: number;
  netToday: number;
  expenses: ReceiptRecord[];
  weeklyTotal: number;
  shiftActive: boolean;
  isOnBreak: boolean;
  activeHoursDecimal: number;
  shiftMiles: number;
  hourlyGoal: number;
  setHourlyGoal: (n: number) => void;
  dailyGoal: number;
  onStart: () => void;
  onBreak: () => void;
  onEnd: () => void;
  onRefreshGps: () => void;
  tollsToday: number;
  tollsWeek: number;
  tollsMonth: number;
  tollsYear: number;
}

export default function DashScreen(p: DashProps) {
  const shiftActive = p.shiftActive;
  const isOnBreak = p.isOnBreak;
  const shiftStatusLabel = shiftActive ? (isOnBreak ? "ON BREAK" : "ON DUTY") : "OFF DUTY";

  // $/hr — primary: shift timer; fallback: first→last trip today (single trip = 15 min)
  const todayTrips = p.todayTrips;
  const grossToday = p.grossToday;
  const perHourGross = useMemo(() => {
    if (grossToday <= 0) return 0;
    const activeH = p.activeHoursDecimal;
    if (activeH > 0.1) return grossToday / activeH;
    // Fallback: no shift timer — use first→last trip today (single trip = 15 min)
    const times = todayTrips.map((t) => new Date(t.datetime).getTime()).sort((a, b) => a - b);
    if (times.length === 0) return 0;
    const hours = times.length === 1 ? 0.25 : Math.max((Date.now() - times[0]) / 3600000, 0.25);
    return grossToday / hours;
  }, [grossToday, p.activeHoursDecimal, todayTrips]);

  const todayGoal = p.dailyGoal;
  const goalPct = Math.min((grossToday / todayGoal) * 100, 100);
  const remainingToGoal = Math.max(todayGoal - grossToday, 0);
  const projectedFinish = perHourGross <= 0 || grossToday >= todayGoal ? null : new Date(Date.now() + (remainingToGoal / perHourGross) * 3600000);

  const expensesToday = p.expenses.filter((e) => (e.dueDate || e.createdAt || "").slice(0, 10) === p.clock.toISOString().slice(0, 10)).reduce((a, e) => a + e.amount, 0);
  const expensesTodayCount = p.expenses.filter((e) => (e.dueDate || e.createdAt || "").slice(0, 10) === p.clock.toISOString().slice(0, 10)).length;
  const netToday = grossToday - expensesToday;

  // Week total — Mon as start of week
  const weeklyTotal = p.weeklyTotal;

  // Financial Intelligence — month summary
  const monthStr = `${p.clock.getFullYear()}-${String(p.clock.getMonth() + 1).padStart(2, "0")}`;
  const earnMonth = todayTripsGrossMonth(p.todayTrips, monthStr);
  const expMonth = p.expenses.filter((e) => (e.dueDate || e.createdAt || "").startsWith(monthStr) && e.frequency !== "monthly" && e.frequency !== "weekly").reduce((a, e) => a + e.amount, 0);
  const monthGoal = p.dailyGoal * 4.33;
  const monthPct = monthGoal > 0 ? Math.min((earnMonth / monthGoal) * 100, 100) : 0;
  const dayOfMonth = p.clock.getDate();
  const daysInMonth = new Date(p.clock.getFullYear(), p.clock.getMonth() + 1, 0).getDate();
  const paceTarget = monthGoal * (p.clock.getDate() / daysInMonth);
  const onTrack = earnMonth >= paceTarget * 0.85;

  // Smart suggestion — time-of-day + pace
  const smartSuggestion = useMemo(() => {
    const h = p.clock.getHours();
    const dow = p.clock.getDay();
    const wd = dow >= 1 && dow <= 5;
    if (grossToday >= todayGoal) return { emoji: "🏆", text: `Goal $${todayGoal} reached. Exceptional shift!`, type: "gold" };
    if (perHourGross > 0) {
      if (perHourGross < 60) return { emoji: "🚨", text: `Your rate of $${perHourGross.toFixed(0)}/hr is below your healthy zone (minimum $60/hr). Consider repositioning — check the high-demand zones below.`, type: "warn" };
      if (perHourGross < 70) return { emoji: "📊", text: `Running $${perHourGross.toFixed(0)}/hr — acceptable pace, but room to improve. Stay in active zones and catch the peaks.`, type: "warm" };
      if (perHourGross < 90) return { emoji: "💪", text: `Strong pace — $${perHourGross.toFixed(0)}/hr. You're in the sweet spot. Keep it up and make every opportunity count.`, type: "good" };
      return { emoji: "🚀", text: `Exceptional pace — $${perHourGross.toFixed(0)}/hr. Top-tier shift. Don't stop.`, type: "gold" };
    }
    if (wd && h >= 7 && h < 9) return { emoji: "🔥", text: "Morning rush — Midtown, Queens→Manhattan, Penn Station. Get moving.", type: "hot" };
    if (h >= 12 && h < 14) return { emoji: "🍽", text: "Lunch surge — Midtown, Financial District (FiDi), Brooklyn Heights. Quick short trips.", type: "warm" };
    if (wd && h >= 17 && h < 20) return { emoji: "⚡", text: "Afternoon peak — best hour of the day. JFK/LGA also active. Push hard.", type: "hot" };
    if (!wd && (h >= 22 || h < 2)) return { emoji: "🌙", text: "Weekend night — LES, Williamsburg, Midtown. High surge potential.", type: "purple" };
    if (h >= 2 && h < 6) return { emoji: "😴", text: "Dead zone 2–6 AM — very low demand. Rest or reposition.", type: "cold" };
    if (wd && h >= 9 && h < 11) return { emoji: "📉", text: "Post-rush lull. Good time for a break or queuing at JFK/LGA.", type: "warn" };
    return { emoji: "📍", text: "Start your shift to begin tracking your performance.", type: "neutral" };
  }, [p.clock, grossToday, todayGoal, perHourGross]);

  const demandZones = computeDemandZones(p.clock.getHours(), p.clock.getDay(), p.gps?.lat ?? null, p.gps?.lng ?? null);

  const greeting = p.clock.getHours() < 6 ? "Good evening" : p.clock.getHours() < 12 ? "Good morning" : p.clock.getHours() < 19 ? "Good afternoon" : "Good evening";

  const suggestionStyle: Record<string, string> = {
    gold: "bg-[#1a1600] border border-[#2a2200] border-l-[#f6dd8c]",
    hot: "bg-[#1a0800] border border-[#2a1000] border-l-[#fb923c]",
    warm: "bg-[#1a1200] border border-[#2a1e00] border-l-[#fbbf24]",
    good: "bg-[#052e16] border border-[#166534] border-l-[#4ade80]",
    purple: "bg-[#1a1625] border border-[#2a2340] border-l-[#a78bfa]",
    cold: "bg-[#0a0a14] border border-[#1a1a2a] border-l-[#60a5fa]",
    warn: "bg-[#1a0f00] border border-[#2a1800] border-l-[#f59e0b]",
    neutral: "bg-[#141414] border border-[#2e2e2e] border-l-[#374151]",
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[24px] font-bold leading-tight">{greeting}, Miguel.</h2>
        <p className="font-mono-jet text-[11px] tracking-[0.18em] mt-1.5 uppercase" style={GOLD_GRADIENT}>
          {p.clock.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).toUpperCase()}
        </p>
        <p className="font-mono-jet text-[10px] text-neutral-400 mt-1">
          {p.clock.toLocaleTimeString()}
          {p.gps ? ` · ${p.gps.lat.toFixed(4)}, ${p.gps.lng.toFixed(4)}` : " · Locating…"}
        </p>
      </div>

      {/* Main status card */}
      <div className="rounded-[20px] px-4 pt-3.5 pb-3 overflow-hidden relative"
        style={{ background: "#0d0d0d", border: "1px solid #1e1e1e", boxShadow: "0 0 0 1px #1a1200 inset" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, #d97706, #f6dd8c44, transparent)" }} />
        <div className="flex items-center justify-between">
          <p className="font-mono-jet text-[10px] text-neutral-400">
            {p.clock.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} ·{" "}
            {p.clock.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
          </p>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[9px] tracking-[0.12em] font-bold"
            style={shiftActive && !isOnBreak ? { background: "#052e16", borderColor: "#4ade8066", color: "#4ade80" }
              : shiftActive && isOnBreak ? { background: "#1c0d00", borderColor: "#f9731666", color: "#f97316" }
              : { background: "#111", borderColor: "#2a2a2a", color: "#737373" }}>
            <span className={`w-1.5 h-1.5 rounded-full ${shiftActive && !isOnBreak ? "bg-[#4ade80] animate-pulse" : shiftActive && isOnBreak ? "bg-[#f97316] animate-pulse" : "bg-neutral-600"}`} />
            {shiftStatusLabel}
          </span>
        </div>
        <div className="mt-2">
          <p className="font-mono-jet text-[11px] text-neutral-400">
            {p.gps ? `${p.gps.lat.toFixed(4)}, ${p.gps.lng.toFixed(4)}` : "GPS inactive"}{p.gps?.acc ? ` · ±${Math.round(p.gps.acc)}m` : ""}
          </p>
        </div>
        <p className="font-mono-jet text-[32px] font-black mt-2 tracking-tight" style={GOLD_GRADIENT}>${grossToday.toFixed(2)}</p>
        <p className="font-mono-jet text-[10px] text-neutral-400 mt-0.5">{todayTrips.length} {todayTrips.length === 1 ? "trip" : "trips"} · fare + tips + tolls</p>
        <div className="mt-3 h-px" style={{ background: "linear-gradient(90deg, #1e1400, #1e1e1e)" }} />
        <div className="mt-2.5 flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${shiftActive && !isOnBreak ? "bg-[#4ade80]" : shiftActive && isOnBreak ? "bg-[#f97316]" : "bg-neutral-700"}`} />
          <span className={`text-[10px] font-mono-jet ${shiftActive && !isOnBreak ? "text-[#4ade80]" : shiftActive && isOnBreak ? "text-[#f97316]" : "text-neutral-400"}`}>
            {shiftActive ? (isOnBreak ? "On break" : "On duty") : "Shift ended"}
          </span>
          <button onClick={p.onRefreshGps} className="ml-auto text-[9px] text-neutral-400 font-mono-jet flex items-center gap-1 active:opacity-60" title="Tap to refresh GPS">
            <span className={`w-1 h-1 rounded-full ${p.gps ? "bg-[#4ade80]" : "bg-neutral-600"}`} />
            GPS {p.gps ? "active" : "inactive"} ↻
          </button>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {(["START", "BREAK", "END"] as const).map((s) => {
            const isActive = (s === "START" && shiftActive && !isOnBreak) || (s === "BREAK" && isOnBreak) || (s === "END" && !shiftActive);
            const disabled = s === "BREAK" && !shiftActive;
            return (
              <button key={s} onClick={() => (s === "START" ? p.onStart() : s === "BREAK" ? p.onBreak() : p.onEnd())} disabled={disabled}
                className="h-[38px] rounded-full border text-[11px] tracking-[0.12em] font-bold transition-all"
                style={disabled ? { background: "#0a0a0a", border: "1px solid #1a1a1a", color: "#444" }
                  : isActive ? { background: "linear-gradient(90deg, #f6dd8c, #d9b64f)", border: "1px solid #d9b64f", color: "#000" }
                  : { background: "transparent", border: "1px solid #d9b64f99", color: "#f6dd8c" }}>
                {s === "BREAK" ? (isOnBreak ? "RESUME" : "BREAK") : s === "END" ? "END SHIFT" : "START"}
              </button>
            );
          })}
        </div>
      </div>

      {/* Goal tracker: $/HR NOW gauge + ring + slider + stats + odometer */}
      <div className="rounded-[20px] p-4 space-y-4" style={{ background: "#0d0d0d", border: "1px solid #1e1e1e" }}>
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] tracking-[0.18em] font-bold" style={GOLD_GRADIENT}>$/HR NOW</h3>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[9px] font-bold tracking-[0.12em]"
            style={shiftActive && !isOnBreak ? { background: "#052e16", borderColor: "#4ade8066", color: "#4ade80" }
              : shiftActive && isOnBreak ? { background: "#1c0d00", borderColor: "#f9731666", color: "#f97316" }
              : { background: "#111", borderColor: "#2a2a2a", color: "#737373" }}>
            <span className={`w-1.5 h-1.5 rounded-full ${shiftActive && !isOnBreak ? "bg-[#4ade80] animate-pulse" : shiftActive && isOnBreak ? "bg-[#f97316] animate-pulse" : "bg-neutral-600"}`} />
            {shiftStatusLabel}
          </span>
        </div>
        <GaugeArc perHourGross={perHourGross} goal={p.hourlyGoal} />
        <div className="flex items-center gap-4 bg-[#080808] border border-[#1a1a1a] rounded-2xl p-3.5">
          <GoalRing grossToday={grossToday} todayGoal={todayGoal} goalPct={goalPct} />
          <div className="flex-1 min-w-0">
            <p className="text-[8px] text-neutral-400 uppercase tracking-widest">EARNED TODAY</p>
            <p className="font-mono-jet text-[24px] font-black leading-none mt-0.5" style={{ color: goalPct >= 100 ? "#4ade80" : goalPct >= 70 ? "#f6dd8c" : "#d9b64f" }}>${grossToday.toFixed(2)}</p>
            <div className="grid grid-cols-2 gap-x-3 mt-2">
              <div>
                <p className="text-[8px] text-neutral-400 uppercase">Remaining</p>
                <p className="font-mono-jet text-[14px] font-bold text-neutral-300">${remainingToGoal.toFixed(0)}</p>
              </div>
              <div>
                <p className="text-[8px] text-neutral-400 uppercase">$/Hour</p>
                <p className={`font-mono-jet text-[14px] font-bold ${perHourGross >= 80 ? "text-[#4ade80]" : perHourGross >= 60 ? "text-[#f6dd8c]" : "text-neutral-400"}`}>
                  {perHourGross > 0 ? `$${perHourGross.toFixed(2)}` : "—"}
                </p>
              </div>
            </div>
            {projectedFinish && grossToday < todayGoal && (
              <p className="text-[9px] text-[#4ade80] font-semibold mt-1.5">✓ Goal ~ {projectedFinish.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</p>
            )}
            {grossToday >= todayGoal && (
              <p className="text-[9px] text-[#4ade80] font-semibold mt-1.5">🏆 Daily goal ${todayGoal} reached!</p>
            )}
          </div>
        </div>
        <div className="rounded-xl p-3.5" style={{ background: "#080808", border: "1px solid #1e1400" }}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-neutral-400">Gross hourly rate target</span>
            <span className="font-mono-jet text-[20px] font-black" style={GOLD_GRADIENT}>${p.hourlyGoal}/h</span>
          </div>
          <input type="range" min={50} max={100} step={1} value={p.hourlyGoal} onChange={(e) => p.setHourlyGoal(parseInt(e.target.value))} className="w-full mt-3" />
          <div className="flex justify-between mt-1">
            <span className="text-[10px] font-mono-jet text-neutral-400">$50</span>
            <span className="text-[10px] font-mono-jet text-neutral-400">$100</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {([
            ["THIS SHIFT", grossToday > 0 ? `$${grossToday.toFixed(2)}` : "—", grossToday > 0 ? "#f6dd8c" : "#374151"],
            ["ACTIVE HRS", p.activeHoursDecimal > 0 ? `${p.activeHoursDecimal.toFixed(1)}h` : "—", p.activeHoursDecimal > 0 ? "#f6dd8c" : "#374151"],
            ["DAILY GOAL", `${goalPct.toFixed(0)}%`, goalPct >= 100 ? "#4ade80" : goalPct >= 70 ? "#f6dd8c" : "#9ca3af"],
          ] as [string, string, string][]).map(([label, val, col]) => (
            <div key={label} className="rounded-xl p-3" style={{ background: "#080808", border: `1px solid ${col}22` }}>
              <p className="text-[9px] tracking-[0.14em] text-neutral-400">{label}</p>
              <p className="font-mono-jet text-[15px] font-black mt-1" style={{ color: col }}>{val}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between rounded-xl px-4 py-3" style={{ background: "#080808", border: "1px solid #1a1e1a" }}>
          <div>
            <p className="text-[9px] tracking-[0.18em] text-neutral-300 font-bold uppercase">Odometer · This Shift</p>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="font-mono-jet text-[26px] font-black text-[#f6dd8c]">{p.shiftMiles.toFixed(1)}</span>
              <span className="text-[11px] text-neutral-400 font-semibold">mi</span>
            </div>
            <p className="text-[9px] text-neutral-400 mt-0.5">{p.gps ? "● GPS tracking" : "○ GPS inactive"}</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] tracking-[0.18em] text-neutral-300 font-bold uppercase">IRS Deduction</p>
            <p className="font-mono-jet text-[20px] font-black text-[#4ade80] mt-1">${(p.shiftMiles * IRS_RATE_PER_MILE).toFixed(2)}</p>
            <p className="text-[9px] text-neutral-400 mt-0.5">${IRS_RATE_PER_MILE.toFixed(2)}/mi · 2025 rate</p>
          </div>
        </div>
        <div className={`rounded-xl p-3.5 border-l-[3px] ${suggestionStyle[smartSuggestion.type] ?? suggestionStyle.neutral}`}>
          <div className="flex items-start gap-2">
            <span className="text-[16px] flex-shrink-0 mt-0.5">{smartSuggestion.emoji}</span>
            <p className="text-[11px] leading-[1.5] text-neutral-200">{smartSuggestion.text}</p>
          </div>
          {perHourGross > 0 && grossToday < todayGoal && (
            <p className="text-[10px] font-mono-jet text-neutral-400 mt-2">
              At this pace you need {(remainingToGoal / perHourGross).toFixed(1)}h more to reach ${todayGoal}
            </p>
          )}
        </div>
        <ZonesCard zones={demandZones} clock={p.clock} hasGps={!!p.gps} />
        <TripStatsCard todayTripCount={todayTrips.length} grossToday={grossToday} weeklyTotal={weeklyTotal} />
        <TollCard tollYear={p.clock.getFullYear()} totalTollsToday={p.tollsToday} tollsWeek={p.tollsWeek} tollsMonth={p.tollsMonth} tollsYear={p.tollsYear} shiftActive={shiftActive} />
      </div>

      <FinancialIntelCard clock={p.clock} earnMonth={earnMonth} expMonth={expMonth} monthGoal={monthGoal} monthPct={monthPct} onTrack={onTrack} />
      <ShiftBreakdownCard todayTrips={todayTrips} grossToday={grossToday} expensesToday={expensesToday} expensesTodayCount={expensesTodayCount} netToday={netToday} weeklyTotal={weeklyTotal} totalTollsToday={p.tollsToday} />
    </div>
  );
}

function todayTripsGrossMonth(entries: EntryRecord[], monthStr: string): number {
  return entries
    .filter((t) => t.datetime.startsWith(monthStr))
    .reduce((a, t) => a + (t.earnings || 0) + (t.tips || 0) + (t.extraCash || 0) + (t.toll || 0), 0);
}