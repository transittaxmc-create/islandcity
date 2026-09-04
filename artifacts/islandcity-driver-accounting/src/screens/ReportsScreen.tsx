// ── REPORTS · P&L + platform breakdown + CSV export ───────────────────
// Layout: cards #0e0e0e / border #1a1a1a · gold #FFD700
// labels text-[10px] font-black uppercase tracking-[0.18em] · numbers font-mono-jet
import { useMemo, useState } from "react";
import { fmt, platformLogo, type EntryRecord } from "../lib/domain";
import type { ReceiptRecord } from "../lib/receipts";
import { IRS_RATE_PER_MILE } from "../lib/nycZones";

interface Props {
  entries: EntryRecord[];
  expenses: ReceiptRecord[];
  showToast: (msg: string, ms?: number) => void;
}

type Period = "day" | "week" | "month" | "year";

const PERIODS: { key: Period; label: string }[] = [
  { key: "day", label: "DAY" },
  { key: "week", label: "WEEK" },
  { key: "month", label: "MONTH" },
  { key: "year", label: "YEAR" },
];

/** Inclusive start of the selected period (local time, Monday-based week). */
function periodStart(period: Period, now: Date): Date {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === "day") return d;
  if (period === "week") {
    const dow = (d.getDay() + 6) % 7; // Monday = 0
    d.setDate(d.getDate() - dow);
    return d;
  }
  if (period === "month") return new Date(now.getFullYear(), now.getMonth(), 1);
  return new Date(now.getFullYear(), 0, 1);
}

function csvCell(v: string | number | null | undefined): string {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function ReportsScreen({ entries, expenses, showToast }: Props) {
  const [period, setPeriod] = useState<Period>("week");

  const R = useMemo(() => {
    const now = new Date();
    const from = periodStart(period, now).getTime();

    const trips = entries.filter((e) => new Date(e.datetime).getTime() >= from);
    const bills = expenses.filter((e) => {
      const raw = e.dueDate || e.createdAt || "";
      const t = raw ? new Date(raw).getTime() : NaN;
      return !isNaN(t) && t >= from;
    });

    const gross = trips.reduce((a, e) => a + (e.grossIncome || 0), 0);
    const net = trips.reduce((a, e) => a + (e.netPayout || 0), 0);
    const tolls = trips.reduce((a, e) => a + (e.toll || 0), 0);
    const tips = trips.reduce((a, e) => a + (e.tips || 0), 0);
    const fees = trips.reduce((a, e) => a + (e.platformFee || 0), 0);
    const cash = trips.reduce((a, e) => a + (e.extraCash || 0), 0);

    const expTotal = bills.reduce((a, e) => a + (e.amount || 0), 0);
    const expBiz = bills.filter((e) => e.type === "business").reduce((a, e) => a + (e.amount || 0), 0);
    const profit = net - expTotal;
    const margin = gross > 0 ? (profit / gross) * 100 : 0;
    const avgTrip = trips.length > 0 ? net / trips.length : 0;

    const map = new Map<string, { trips: number; net: number; fee: number }>();
    for (const e of trips) {
      const k = e.platform || "Other";
      const p = map.get(k) ?? { trips: 0, net: 0, fee: 0 };
      p.trips++;
      p.net += e.netPayout || 0;
      p.fee += e.platformFee || 0;
      map.set(k, p);
    }
    const byPlatform = [...map.entries()].sort((a, b) => b[1].net - a[1].net);

    const miles = trips.length * 12; // est. 12 mi / trip until odometer logging lands
    const irsCredit = miles * IRS_RATE_PER_MILE;

    return { trips, bills, gross, net, tolls, tips, fees, cash, expTotal, expBiz, profit, margin, avgTrip, byPlatform, miles, irsCredit };
  }, [entries, expenses, period]);

  const exportCsv = () => {
    if (R.trips.length === 0) { showToast("✗ No hay viajes en este periodo", 3000); return; }
    const head = ["Date", "Time", "Platform", "Type", "Pickup", "Dropoff", "Earnings", "Extra Cash", "Tips", "Toll", "Platform Fee", "Gross", "Net", "Invoice", "Status", "Notes"];
    const rows = R.trips
      .slice()
      .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime())
      .map((e) => {
        const d = new Date(e.datetime);
        return [
          d.toLocaleDateString("en-US"),
          d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
          e.platform, e.platformType, e.pickup?.address ?? "", e.dropoff?.address ?? "",
          (e.earnings ?? 0).toFixed(2), (e.extraCash ?? 0).toFixed(2), (e.tips ?? 0).toFixed(2),
          (e.toll ?? 0).toFixed(2), (e.platformFee ?? 0).toFixed(2),
          e.grossIncome.toFixed(2), e.netPayout.toFixed(2), e.invoiceRef ?? "", e.status, e.notes ?? "",
        ].map(csvCell).join(",");
      });
    const totals = ["TOTAL", "", "", "", "", "", "", "", R.tips.toFixed(2), R.tolls.toFixed(2), R.fees.toFixed(2), R.gross.toFixed(2), R.net.toFixed(2), "", "", ""].join(",");
    const csv = [head.join(","), ...rows, totals].join("\r\n");

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    a.href = url;
    a.download = `IslandCity_Report_${period}_${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`✓ CSV exportado · ${R.trips.length} viajes`, 4000);
  };

  const stat = (label: string, value: string, color: string) => (
    <div className="rounded-xl border p-3" style={{ background: "#080808", borderColor: `${color}22` }}>
      <p className="text-[9px] font-black uppercase tracking-[0.14em] text-neutral-400">{label}</p>
      <p className="mt-1 font-mono-jet text-[15px] font-black" style={{ color }}>{value}</p>
    </div>
  );

  return (
    <div className="space-y-3 pb-4">
      {/* ═══ HEADER + PERIOD SWITCH ═══ */}
      <div className="rounded-2xl border border-[#1a1a1a] bg-[#0e0e0e] p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-400">REPORTS</p>
            <p className="mt-0.5 text-[9px] text-neutral-500">Profit &amp; Loss · {R.trips.length} viajes · {R.bills.length} gastos</p>
          </div>
          <button onClick={exportCsv} className="h-10 rounded-lg bg-[#FFD700] px-3 text-[11px] font-black text-black">⬇ CSV</button>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-1.5">
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

      {/* ═══ P&L ═══ */}
      <div className="rounded-2xl border border-[#1a1a1a] bg-[#0e0e0e] p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-400">PROFIT &amp; LOSS</p>
        <div className="mt-3 space-y-1.5">
          {([
            ["Gross Income", R.gross, "#ffffff"],
            ["Platform Fees", -R.fees, "#f87171"],
            ["Net Payout", R.net, "#4ade80"],
            ["Expenses", -R.expTotal, "#f87171"],
          ] as [string, number, string][]).map(([label, val, col]) => (
            <div key={label} className="flex items-center justify-between border-b border-[#141414] pb-1.5 last:border-0">
              <span className="text-[11px] text-neutral-300">{label}</span>
              <span className="font-mono-jet text-[13px] font-black" style={{ color: col }}>
                {val < 0 ? `-${fmt(Math.abs(val))}` : fmt(val)}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between rounded-xl px-3 py-3" style={{ background: "#080808", border: `1px solid ${R.profit >= 0 ? "#4ade8033" : "#f8717133"}` }}>
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-neutral-300">NET PROFIT</p>
            <p className="mt-0.5 text-[9px] text-neutral-500">Margin {R.margin.toFixed(1)}%</p>
          </div>
          <p className="font-mono-jet text-[24px] font-black" style={{ color: R.profit >= 0 ? "#4ade80" : "#f87171" }}>{fmt(R.profit)}</p>
        </div>
      </div>

      {/* ═══ KPI GRID ═══ */}
      <div className="grid grid-cols-3 gap-2">
        {stat("TRIPS", String(R.trips.length), R.trips.length > 0 ? "#f6dd8c" : "#374151")}
        {stat("AVG / TRIP", fmt(R.avgTrip), R.avgTrip > 0 ? "#f6dd8c" : "#374151")}
        {stat("TIPS", fmt(R.tips), R.tips > 0 ? "#4ade80" : "#374151")}
        {stat("TOLLS", fmt(R.tolls), R.tolls > 0 ? "#fb923c" : "#374151")}
        {stat("FEES", fmt(R.fees), R.fees > 0 ? "#f87171" : "#374151")}
        {stat("EXTRA CASH", fmt(R.cash), R.cash > 0 ? "#4ade80" : "#374151")}
      </div>

      {/* ═══ BY PLATFORM ═══ */}
      <div className="rounded-2xl border border-[#1a1a1a] bg-[#0e0e0e] p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-400">BY PLATFORM</p>
        <div className="mt-3 space-y-2">
          {R.byPlatform.map(([name, d]) => {
            const pct = R.net > 0 ? (d.net / R.net) * 100 : 0;
            const logo = platformLogo(name);
            return (
              <div key={name} className="rounded-xl border border-[#1a1a1a] bg-[#080808] p-2.5">
                <div className="flex items-center gap-2">
                  {logo
                    ? <img src={logo} alt={name} className="h-6 w-6 flex-shrink-0 rounded object-cover" />
                    : <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded bg-[#1a1a1a] text-[10px] font-black text-neutral-400">{name.slice(0, 1)}</div>}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-bold text-white">{name}</p>
                    <p className="text-[9px] text-neutral-500">{d.trips} viajes · fee {fmt(d.fee)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono-jet text-[13px] font-black text-[#f6dd8c]">{fmt(d.net)}</p>
                    <p className="text-[9px] text-neutral-500">{pct.toFixed(0)}%</p>
                  </div>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#1a1a1a]">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, background: "linear-gradient(90deg,#FFD700,#d9b64f)" }} />
                </div>
              </div>
            );
          })}
          {R.byPlatform.length === 0 && (
            <p className="py-4 text-center text-[11px] text-neutral-500">No hay viajes en este periodo</p>
          )}
        </div>
      </div>

      {/* ═══ TAX / IRS ═══ */}
      <div className="rounded-2xl border border-[#1a1a1a] bg-[#0e0e0e] p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-400">TAX SUMMARY · IRS</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-[#1a1a1a] bg-[#080808] p-3">
            <p className="text-[9px] font-black uppercase tracking-[0.14em] text-neutral-400">EST. MILES</p>
            <p className="mt-1 font-mono-jet text-[18px] font-black text-[#f6dd8c]">{R.miles.toFixed(0)}<span className="ml-1 text-[10px] text-neutral-500">mi</span></p>
          </div>
          <div className="rounded-xl border border-[#4ade8022] bg-[#080808] p-3">
            <p className="text-[9px] font-black uppercase tracking-[0.14em] text-neutral-400">IRS DEDUCTION</p>
            <p className="mt-1 font-mono-jet text-[18px] font-black text-[#4ade80]">{fmt(R.irsCredit)}</p>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between rounded-xl border border-[#1a1a1a] bg-[#080808] px-3 py-2.5">
          <span className="text-[10px] text-neutral-400">Business expenses (deducible)</span>
          <span className="font-mono-jet text-[13px] font-black text-[#4ade80]">{fmt(R.expBiz)}</span>
        </div>
        <p className="mt-2 text-center text-[9px] text-neutral-500">
          ${IRS_RATE_PER_MILE.toFixed(2)}/mi · tasa 2025 · estimado 12 mi por viaje
        </p>
      </div>
    </div>
  );
}
