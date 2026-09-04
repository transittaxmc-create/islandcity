// ── FINANCE · Page 0 · This Week — ported 1:1 ─────────────────────────
import { useState } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import type { FinanceData, RecurringPlan } from "./financeData";

export function WeekPage({ F, dailyGoal, workDays, setWorkDays, dayTargets, setDayTargets, recurringPlan, setRecurringPlan, showToast }: {
  F: FinanceData;
  dailyGoal: number;
  workDays: number[];
  setWorkDays: (v: number[]) => void;
  dayTargets: Record<number, number>;
  setDayTargets: (v: Record<number, number>) => void;
  recurringPlan: RecurringPlan;
  setRecurringPlan: (v: RecurringPlan) => void;
  showToast: (m: string) => void;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const [repeatUntil, setRepeatUntil] = useState("");
  return (
    <div className="flex-shrink-0 w-full px-4 space-y-4 pb-6" style={{ scrollSnapAlign: "start" }}>
      {/* ESTA SEMANA chart */}
      <div className="bg-[#101010] border border-[#2e2e2e] rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[9px] tracking-[0.22em] text-neutral-300 font-bold uppercase">THIS WEEK</p>
          <div className="flex gap-3 text-[8px] text-neutral-400">
            <span className="flex items-center gap-1"><span className="inline-block w-2 h-1.5 rounded bg-[#d9b64f]/30" />Planned</span>
            <span className="flex items-center gap-1"><span className="inline-block w-2 h-1.5 rounded bg-[#f6dd8c]" />Actual</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={90}>
          <BarChart data={F.weekChart} barGap={2} barSize={14} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <XAxis dataKey="day" tick={{ fill: "#6b7280", fontSize: 9 }} axisLine={false} tickLine={false} />
            <YAxis hide domain={[0, Math.max(...F.weekChart.map((d) => Math.max(d.projected, d.actual)), 1) * 1.15]} />
            <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 8, fontSize: 11 }}
              labelStyle={{ color: "#f6dd8c" }} formatter={(v: number) => [`$${v.toFixed(0)}`]} />
            <Bar dataKey="projected" name="Planned" fill="#d9b64f22" radius={[3, 3, 0, 0]} />
            <Bar dataKey="actual" name="Actual" fill="#f6dd8c" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="flex justify-between mt-2 pt-2 border-t border-[#2e2e2e]">
          <div>
            <p className="text-[9px] text-neutral-400">Earned so far</p>
            <p className="text-[15px] font-bold text-[#f6dd8c] font-mono-jet">${F.earnWeek.toFixed(2)}</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] text-neutral-400">Week plan total</p>
            <p className="text-[15px] font-bold text-white font-mono-jet">${F.projWeek.toFixed(2)}</p>
            <p className="text-[8px] text-neutral-400 mt-0.5">pending + posted trips</p>
          </div>
        </div>
      </div>

      {/* PLAN SEMANAL DE INGRESOS */}
      <div className="bg-[#101010] border border-[#2e2e2e] rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[9px] tracking-[0.22em] text-neutral-300 font-bold uppercase">WEEKLY INCOME PLAN</p>
          <span className="text-[9px] text-neutral-400">{workDays.length} active day{workDays.length !== 1 ? "s" : ""}</span>
        </div>
        <div className="grid grid-cols-7 gap-1 mb-1.5">
          {([1, 2, 3, 4, 5, 6, 7] as const).map((iso, i) => {
            const on = workDays.includes(iso);
            return (
              <button key={iso}
                onClick={() => setWorkDays(on ? workDays.filter((x) => x !== iso) : [...workDays, iso].sort())}
                className={`flex flex-col items-center py-2 rounded-lg border transition-all active:scale-95 ${on ? "bg-black border-[#f6dd8c]/50" : "bg-[#0a0a0a] border-[#1a1a1a]"}`}>
                <span className={`text-[9px] font-bold leading-none mb-1.5 ${on ? "text-[#f6dd8c]" : "text-neutral-400"}`}>{["M", "Tu", "W", "Th", "F", "Sa", "Su"][i]}</span>
                <span className={`w-3 h-3 rounded-full transition-colors ${on ? "bg-[#f6dd8c]" : "bg-[#252525]"}`} />
              </button>
            );
          })}
        </div>
        <div className="grid grid-cols-7 gap-1 mb-4">
          {([1, 2, 3, 4, 5, 6, 7] as const).map((iso) => {
            const on = workDays.includes(iso);
            return (
              <div key={iso} className={`transition-opacity ${on ? "opacity-100" : "opacity-20"}`}>
                <input type="number" min="0" max="9999" step="10"
                  value={on ? (dayTargets[iso] ?? dailyGoal) : ""} disabled={!on} placeholder="—"
                  onChange={(e) => setDayTargets({ ...dayTargets, [iso]: parseFloat(e.target.value) || 0 })}
                  className="w-full text-center bg-transparent text-[10px] font-bold font-mono-jet text-[#f6dd8c] focus:outline-none disabled:cursor-default border-b border-[#2a2a2a] pb-0.5 focus:border-[#f6dd8c]/50 transition-colors" />
              </div>
            );
          })}
        </div>
        <div className="pt-3 border-t border-[#2e2e2e]">
          <div className="flex items-baseline justify-between mb-0.5">
            <p className="text-[9px] text-neutral-400 uppercase tracking-[0.15em]">Weekly total</p>
            <p className="text-[22px] font-bold text-[#f6dd8c] font-mono-jet leading-none">
              ${F.weekPlanTotal.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
          </div>
          <p className="text-[8px] text-neutral-400 mb-3">avg ${F.avgDayTarget.toFixed(0)}/day</p>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="bg-black border border-[#2e2e2e] rounded-xl p-2.5 text-center">
              <p className="text-[8px] text-neutral-400 uppercase tracking-widest mb-0.5">Est. monthly</p>
              <p className="text-[13px] font-bold text-white font-mono-jet">${((F.weekPlanTotal * 4.33) / 1000).toFixed(1)}k</p>
            </div>
            <div className="bg-black border border-[#2e2e2e] rounded-xl p-2.5 text-center">
              <p className="text-[8px] text-neutral-400 uppercase tracking-widest mb-0.5">Est. yearly</p>
              <p className="text-[13px] font-bold text-white font-mono-jet">${(F.annTarget / 1000).toFixed(0)}k</p>
            </div>
          </div>
          <div className="bg-[#0f0a00] border border-[#d9b64f]/20 rounded-xl p-2.5 flex items-center gap-2">
            <span className="text-[#d9b64f] text-[12px]">💡</span>
            <p className="text-[9px] text-[#d9b64f]">Days without a custom target use <strong className="text-[#d9b64f]">${dailyGoal}/day</strong> as the default.</p>
          </div>
        </div>
      </div>

      {/* 🔁 Repeat this weekly pattern until a date */}
      <div className="bg-[#101010] border border-[#2e2e2e] rounded-2xl p-4 space-y-3">
        {recurringPlan.enabled && !showPicker && (
          <div className="bg-[#0c140c] border border-[#4ade80]/25 rounded-xl p-3 flex items-start justify-between gap-2">
            <div>
              <p className="text-[9px] font-bold text-[#4ade80] mb-0.5">🔁 Repeating weekly pattern</p>
              <p className="text-[11px] text-white font-semibold">
                Until {new Date(recurringPlan.untilDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </p>
              <p className="text-[9px] text-neutral-400 mt-0.5">
                {recurringPlan.workDays.length} day{recurringPlan.workDays.length !== 1 ? "s" : ""}/week ·{" "}
                ${recurringPlan.workDays.reduce((s, iso) => s + (recurringPlan.dayTargets[iso] ?? dailyGoal), 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}/wk projected
              </p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button onClick={() => { setRepeatUntil(recurringPlan.untilDate); setShowPicker(true); }}
                className="text-[9px] text-[#f6dd8c] border border-[#f6dd8c]/30 px-2 py-1 rounded-full">Edit</button>
              <button onClick={() => { setRecurringPlan({ enabled: false, workDays: [], dayTargets: {}, untilDate: "" }); showToast("Recurring pattern cleared ✓"); }}
                className="text-[9px] text-neutral-400 border border-[#2a2a2a] px-2 py-1 rounded-full hover:text-[#ff6b6b] hover:border-[#ff6b6b]/30 transition-colors">Clear</button>
            </div>
          </div>
        )}

        <button onClick={() => {
          if (recurringPlan.enabled && !showPicker) {
            setRecurringPlan({ enabled: false, workDays: [], dayTargets: {}, untilDate: "" });
            showToast("Recurring pattern cleared ✓");
          } else {
            setRepeatUntil(recurringPlan.untilDate || "");
            setShowPicker((p) => !p);
          }
        }} className="w-full flex items-center gap-3 text-left">
          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${recurringPlan.enabled || showPicker ? "bg-[#f6dd8c] border-[#f6dd8c]" : "bg-transparent border-[#3a3a3a]"}`}>
            {(recurringPlan.enabled || showPicker) && <span className="text-black text-[11px] font-black leading-none">✓</span>}
          </div>
          <div className="flex-1">
            <p className="text-[12px] text-white font-semibold leading-snug">🔁 Repeat this weekly pattern until a date</p>
            <p className="text-[9px] text-neutral-400 mt-0.5">Spreads this exact schedule to every future week automatically</p>
          </div>
        </button>
        {showPicker && (
          <div className="pt-1 space-y-3">
            <div>
              <label className="text-[9px] text-neutral-300 font-bold uppercase tracking-widest mb-1.5 block">Repeat until</label>
              <input type="date" value={repeatUntil} min={F.finWeekStart}
                onChange={(e) => setRepeatUntil(e.target.value)}
                className="w-full h-11 rounded-xl bg-black border border-[#f6dd8c]/30 px-3 text-white text-[14px] font-semibold focus:outline-none focus:border-[#f6dd8c] transition-colors" />
            </div>
            {repeatUntil && (() => {
              const nWeeks = Math.max(0, Math.ceil(
                (new Date(repeatUntil + "T12:00:00").getTime() - new Date(F.finWeekStart + "T12:00:00").getTime()) / (7 * 86400000)));
              return (
                <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-2 flex items-center justify-between">
                  <p className="text-[9px] text-neutral-400">{nWeeks} week{nWeeks !== 1 ? "s" : ""} · {workDays.length} day{workDays.length !== 1 ? "s" : ""}/wk</p>
                  <p className="font-mono-jet text-[11px] font-bold text-[#f6dd8c]">${F.weekPlanTotal.toLocaleString("en-US", { maximumFractionDigits: 0 })}/wk</p>
                </div>
              );
            })()}
            <div className="flex gap-2">
              <button onClick={() => {
                if (!repeatUntil) { showToast("Pick an end date first"); return; }
                setRecurringPlan({ enabled: true, workDays: [...workDays], dayTargets: { ...dayTargets }, untilDate: repeatUntil });
                setShowPicker(false);
                showToast("Recurring pattern saved ✓");
              }} className="flex-1 h-11 rounded-full bg-[#f6dd8c] text-black text-[13px] font-bold active:scale-95 transition-transform">
                Save recurring pattern
              </button>
              <button onClick={() => setShowPicker(false)}
                className="h-11 px-4 rounded-full border border-[#2a2a2a] text-neutral-400 text-[12px] hover:text-white transition-colors">Cancel</button>
            </div>
            <p className="text-[9px] text-neutral-400 text-center">Each individual week can still be adjusted when it arrives — just edit the plan above and it only affects that week.</p>
          </div>
        )}
      </div>
    </div>
  );
}