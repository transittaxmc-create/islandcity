// ── AI ADVISOR · insights, projections & best zones/hours ─────────────
// Layout: cards #0e0e0e / border #1a1a1a · gold #FFD700 · font-mono-jet numbers
import { useMemo, useState } from "react";
import { fmt, type EntryRecord } from "../lib/domain";
import type { ReceiptRecord } from "../lib/receipts";

interface Props {
  entries: EntryRecord[];
  expenses: ReceiptRecord[];
  goal: number;
}

type Period = "day" | "week" | "month";

const PERIODS: { key: Period; label: string; days: number }[] = [
  { key: "day", label: "DAY", days: 1 },
  { key: "week", label: "WEEK", days: 7 },
  { key: "month", label: "MONTH", days: 30 },
];

const DOW = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function periodStart(period: Period, now: Date): Date {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === "day") return d;
  if (period === "week") {
    const dow = (d.getDay() + 6) % 7; // Monday = 0
    d.setDate(d.getDate() - dow);
    return d;
  }
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export default function AiScreen({ entries, expenses, goal }: Props) {
  const [period, setPeriod] = useState<Period>("week");

  const A = useMemo(() => {
    const now = new Date();
    const from = periodStart(period, now).getTime();
    const days = PERIODS.find((p) => p.key === period)?.days ?? 7;

    const trips = entries.filter((e) => new Date(e.datetime).getTime() >= from);
    const bills = expenses.filter((e) => {
      const raw = e.dueDate || e.createdAt || "";
      const t = raw ? new Date(raw).getTime() : NaN;
      return !isNaN(t) && t >= from;
    });

    const gross = trips.reduce((a, e) => a + (e.grossIncome || 0), 0);
    const net = trips.reduce((a, e) => a + (e.netPayout || 0), 0);
    const spent = bills.reduce((a, e) => a + (e.amount || 0), 0);
    const profit = net - spent;
    const avgTrip = trips.length > 0 ? net / trips.length : 0;
    const dailyAvg = gross / days;
    const goalPct = goal > 0 ? (dailyAvg / goal) * 100 : 0;

    // Best hour of day (by gross)
    const byHour = new Array(24).fill(0) as number[];
    const byDow = new Array(7).fill(0) as number[];
    const byZone = new Map<string, { trips: number; gross: number }>();
    for (const e of trips) {
      const d = new Date(e.datetime);
      byHour[d.getHours()] += e.grossIncome || 0;
      byDow[d.getDay()] += e.grossIncome || 0;
      const zone = e.pickup?.businessName || e.pickup?.address?.split(",")[0]?.trim() || "";
      if (zone) {
        const z = byZone.get(zone) ?? { trips: 0, gross: 0 };
        z.trips++;
        z.gross += e.grossIncome || 0;
        byZone.set(zone, z);
      }
    }
    const bestHour = byHour.reduce((best, v, i) => (v > byHour[best] ? i : best), 0);
    const bestDow = byDow.reduce((best, v, i) => (v > byDow[best] ? i : best), 0);
    const topZones = [...byZone.entries()].sort((a, b) => b[1].gross - a[1].gross).slice(0, 5);

    return {
      trips, gross, net, spent, profit, avgTrip, dailyAvg, goalPct,
      projMonth: dailyAvg * 30, projYear: dailyAvg * 365,
      bestHour: byHour[bestHour] > 0 ? bestHour : null,
      bestHourGross: byHour[bestHour],
      bestDow: byDow[bestDow] > 0 ? bestDow : null,
      bestDowGross: byDow[bestDow],
      topZones,
    };
  }, [entries, expenses, goal, period]);

  // ── Insight engine (rule-based, no external API) ──
  const insights = useMemo(() => {
    const out: { emoji: string; title: string; text: string; tone: "good" | "warn" | "bad" | "info" }[] = [];

    if (A.trips.length === 0) {
      out.push({ emoji: "🚗", title: "SIN DATOS", text: "Registra viajes en DAILY ENTRY para activar el análisis del periodo.", tone: "info" });
      return out;
    }
    if (A.profit < 0) {
      out.push({ emoji: "⚠️", title: "PÉRDIDA", text: `Gastaste ${fmt(A.spent)} contra ${fmt(A.net)} neto. Revisa gastos fijos o aumenta viajes.`, tone: "bad" });
    } else if (A.goalPct >= 100) {
      out.push({ emoji: "🔥", title: "META SUPERADA", text: `Promedias ${fmt(A.dailyAvg)}/día contra meta de ${fmt(goal)}. Mantén el ritmo.`, tone: "good" });
    } else if (A.goalPct >= 70) {
      out.push({ emoji: "📈", title: "CERCA DE LA META", text: `Te faltan ${fmt(Math.max(goal - A.dailyAvg, 0))}/día. Suma ~${Math.ceil(Math.max(goal - A.dailyAvg, 0) / Math.max(A.avgTrip, 1))} viajes diarios.`, tone: "warn" });
    } else {
      out.push({ emoji: "💡", title: "POR DEBAJO DE META", text: `Promedias ${fmt(A.dailyAvg)}/día contra ${fmt(goal)}. Enfócate en horas pico y zonas calientes.`, tone: "warn" });
    }
    if (A.bestHour !== null) {
      const h12 = A.bestHour % 12 === 0 ? 12 : A.bestHour % 12;
      const ampm = A.bestHour < 12 ? "AM" : "PM";
      out.push({ emoji: "⏰", title: "MEJOR HORA", text: `${h12}:00 ${ampm} genera ${fmt(A.bestHourGross)} en este periodo. Prioriza ese bloque.`, tone: "info" });
    }
    if (A.bestDow !== null && period !== "day") {
      out.push({ emoji: "📅", title: "MEJOR DÍA", text: `${DOW[A.bestDow]} es tu día más fuerte con ${fmt(A.bestDowGross)}.`, tone: "info" });
    }
    if (A.avgTrip > 0 && A.avgTrip < 12) {
      out.push({ emoji: "🎯", title: "TICKET BAJO", text: `Promedio ${fmt(A.avgTrip)} por viaje. Filtra viajes cortos y busca aeropuerto o larga distancia.`, tone: "warn" });
    }
    return out;
  }, [A, goal, period]);

  const toneStyle: Record<string, { border: string; color: string }> = {
    good: { border: "#4ade8055", color: "#4ade80" },
    warn: { border: "#FFD70055", color: "#f6dd8c" },
    bad: { border: "#f8717155", color: "#f87171" },
    info: { border: "#2a2a2a", color: "#9ca3af" },
  };

  const stat = (label: string, value: string, color: string) => (
    <div className="rounded-xl border p-3" style={{ background: "#080808", borderColor: `${color}22` }}>
      <p className="text-[9px] font-black uppercase tracking-[0.14em] text-neutral-400">{label}</p>
      <p className="mt-1 font-mono-jet text-[15px] font-black" style={{ color }}>{value}</p>
    </div>
  );

  return (
    <div className="space-y-3 pb-4">
      {/* ═══ HEADER + PERIOD ═══ */}
      <div className="rounded-2xl border border-[#1a1a1a] bg-[#0e0e0e] p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-400">AI ADVISOR</p>
            <p className="mt-0.5 text-[9px] text-neutral-500">{A.trips.length} viajes analizados · meta {fmt(goal)}/día</p>
          </div>
          <span className="text-[20px]">✨</span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-1.5">
          {PERIODS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setPeriod(key)}
              className="h-9 rounded-lg text-[10px] font-black tracking-wider"
              style={period === key
                ? { background: "#FFD700", color: "#000" }
                : { background: "#141414", color: "#8a8a8a", border: "1px solid #2a2a2a" }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ GOAL PROGRESS ═══ */}
      <div className="rounded-2xl border border-[#1a1a1a] bg-[#0e0e0e] p-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-400">DAILY PACE</p>
            <p className="mt-0.5 text-[9px] text-neutral-500">Promedio del periodo vs meta diaria</p>
          </div>
          <p className="font-mono-jet text-[26px] font-black" style={{ color: A.goalPct >= 100 ? "#4ade80" : A.goalPct >= 70 ? "#f6dd8c" : "#9ca3af" }}>
            {fmt(A.dailyAvg)}
          </p>
        </div>
        <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-[#1a1a1a]">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${Math.min(A.goalPct, 100)}%`, background: A.goalPct >= 100 ? "#4ade80" : "linear-gradient(90deg,#FFD700,#d9b64f)" }}
          />
        </div>
        <p className="mt-1.5 text-[9px] font-bold text-neutral-400">{A.goalPct.toFixed(0)}% de la meta · {fmt(goal)}/día</p>
      </div>

      {/* ═══ INSIGHTS ═══ */}
      <div className="space-y-2">
        {insights.map((ins, i) => {
          const t = toneStyle[ins.tone];
          return (
            <div key={i} className="rounded-xl border-l-[3px] bg-[#0e0e0e] p-3.5" style={{ borderLeftColor: t.color, border: `1px solid ${t.border}`, borderLeftWidth: 3, borderLeftStyle: "solid" }}>
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 flex-shrink-0 text-[16px]">{ins.emoji}</span>
                <div className="min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-[0.18em]" style={{ color: t.color }}>{ins.title}</p>
                  <p className="mt-1 text-[11px] leading-[1.5] text-neutral-200">{ins.text}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ═══ KPI GRID ═══ */}
      <div className="grid grid-cols-3 gap-2">
        {stat("GROSS", fmt(A.gross), A.gross > 0 ? "#f6dd8c" : "#374151")}
        {stat("NET", fmt(A.net), A.net > 0 ? "#4ade80" : "#374151")}
        {stat("SPENT", fmt(A.spent), A.spent > 0 ? "#f87171" : "#374151")}
        {stat("PROFIT", fmt(A.profit), A.profit >= 0 ? "#4ade80" : "#f87171")}
        {stat("TRIPS", String(A.trips.length), A.trips.length > 0 ? "#f6dd8c" : "#374151")}
        {stat("AVG / TRIP", fmt(A.avgTrip), A.avgTrip > 0 ? "#f6dd8c" : "#374151")}
      </div>

      {/* ═══ PROJECTIONS ═══ */}
      <div className="rounded-2xl border border-[#1a1a1a] bg-[#0e0e0e] p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-400">PROJECTIONS</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-[#1a1a1a] bg-[#080808] p-3">
            <p className="text-[9px] font-black uppercase tracking-[0.14em] text-neutral-400">MONTHLY</p>
            <p className="mt-1 font-mono-jet text-[18px] font-black text-[#f6dd8c]">{fmt(A.projMonth)}</p>
          </div>
          <div className="rounded-xl border border-[#1a1a1a] bg-[#080808] p-3">
            <p className="text-[9px] font-black uppercase tracking-[0.14em] text-neutral-400">YEARLY</p>
            <p className="mt-1 font-mono-jet text-[18px] font-black text-[#f6dd8c]">{fmt(A.projYear)}</p>
          </div>
        </div>
        <p className="mt-2 text-center text-[9px] text-neutral-500">Basado en {fmt(A.dailyAvg)}/día del periodo seleccionado</p>
      </div>

      {/* ═══ TOP ZONES ═══ */}
      <div className="rounded-2xl border border-[#1a1a1a] bg-[#0e0e0e] p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-400">TOP PICKUP ZONES</p>
        <div className="mt-3 space-y-1.5">
          {A.topZones.map(([zone, d], i) => (
            <div key={zone} className="flex items-center gap-2.5 rounded-xl border border-[#1a1a1a] bg-[#080808] px-3 py-2.5">
              <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[#FFD700] text-[10px] font-black text-black">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-bold text-white">{zone}</p>
                <p className="text-[9px] text-neutral-500">{d.trips} viajes</p>
              </div>
              <p className="font-mono-jet text-[13px] font-black text-[#f6dd8c]">{fmt(d.gross)}</p>
            </div>
          ))}
          {A.topZones.length === 0 && (
            <p className="py-4 text-center text-[11px] text-neutral-500">Captura GPS en PICKUP para ver tus mejores zonas</p>
          )}
        </div>
      </div>
    </div>
  );
}
