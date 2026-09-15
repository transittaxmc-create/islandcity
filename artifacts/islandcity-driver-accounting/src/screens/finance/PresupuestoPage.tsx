// ── FINANCE · PRESUPUESTO · Master Register (replaces Cash Flow 14-day) ──
// Format: 1:1 replica of the approved "Balance Diario AI" mock —
//   3 summary cards (Actual Bank Balance · Pending · Projected Balance),
//   red cash-flow alert banner, and a 9-column Master Register table.
// Data is REAL:
//   confirmed rows  ← recorded entries (per day+platform) + expenses due ≤ today
//   projected rows  ← weekly plan (daily goal × work days) + dated/recurring expenses
//   balances        ← running forward from today's bank balance
import { useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ArrowUpRight, ArrowRight, Hourglass, AlertTriangle, Check, Clock, Home } from "lucide-react";
import type { EntryRecord } from "../../lib/domain";
import { platformLogo } from "../../lib/domain";
import type { ReceiptRecord } from "../../lib/receipts";
import { toYMD, isoDay, tripNet, type BankAdjEntry } from "./financeData";

interface Props {
  clock: Date;
  entries: EntryRecord[];
  expenses: ReceiptRecord[];
  dailyGoal: number;
  workDays: number[];
  dayTargets: Record<number, number>;
  bankBalance: number;
  setBankBalance: (n: number) => void;
  bankAdjHistory: BankAdjEntry[];
  setBankAdjHistory: (fn: (prev: BankAdjEntry[]) => BankAdjEntry[]) => void;
  showToast: (m: string) => void;
}

const PAST_DAYS = 7;   // confirmed history shown
const FUT_DAYS = 13;   // projection horizon (today+13)
const RIDE_NET = 15;   // avg net $/ride used for the contingency "rides/day" hint

const MONTHS = ["Jan", "Feb", "March", "April", "May", "June", "July", "Aug", "Sept", "Oct", "Nov", "Dec"];
function dayLabel(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return `${MONTHS[d.getMonth()]} ${String(d.getDate()).padStart(2, "0")}`;
}
const money = (n: number) =>
  "$" + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b + "T12:00:00").getTime() - new Date(a + "T12:00:00").getTime()) / 86400000);
}

const BRANDS: Record<string, [string, string]> = {
  Uber: ["#000000", "#ffffff"], Lyft: ["#FF00BF", "#ffffff"], Shell: ["#FBCE07", "#7a0c00"],
  Chevron: ["#e60000", "#ffffff"], Mobil: ["#003399", "#ffffff"], Exxon: ["#cc0000", "#ffffff"],
  Sunoco: ["#131c2b", "#ffffff"], BP: ["#007c30", "#ffffff"], Costco: ["#005daa", "#ffffff"],
  Walmart: ["#0071ce", "#ffffff"], Target: ["#cc0000", "#ffffff"], CVS: ["#cc0000", "#ffffff"],
  Walgreens: ["#e31837", "#ffffff"], Verizon: ["#cd040b", "#ffffff"], "T-Mobile": ["#e20074", "#ffffff"],
};
function brandOf(source: string): { badgeColor: string; badgeText: string; badgeIcon: "home" | null } {
  if (/rent|landlord|apartment/i.test(source)) return { badgeColor: "#64748b", badgeText: "#ffffff", badgeIcon: "home" };
  const hit = Object.keys(BRANDS).find(
    (k) => source.toLowerCase() === k.toLowerCase() || source.toLowerCase().includes(k.toLowerCase()),
  );
  const c = hit ? BRANDS[hit] : ["#475569", "#ffffff"];
  return { badgeColor: c[0], badgeText: c[1], badgeIcon: null };
}

type Status = "confirmed" | "projected" | "deficit";
interface Row {
  key: string;
  date: string;
  source: string;
  logo: string | null;
  badgeColor: string;
  badgeText: string;
  badgeIcon: "home" | null;
  desc: string;
  italic: boolean;
  bankReal: number | null;
  projIncome: number | null;
  projExpense: number | null;
  status: Status;
  actualBal: number | null;
  projBal: number;
}
type Raw = Omit<Row, "status" | "actualBal" | "projBal">;

export function PresupuestoPage({
  clock, entries, expenses, dailyGoal, workDays, dayTargets,
  bankBalance, setBankBalance, bankAdjHistory, setBankAdjHistory, showToast,
}: Props) {
  const [dismissed, setDismissed] = useState(false);
  const [editingBank, setEditingBank] = useState(false);
  const [editVal, setEditVal] = useState("");
  const [editNote, setEditNote] = useState("");
  const [onlyPending, setOnlyPending] = useState(false);
  const tableRef = useRef<HTMLDivElement | null>(null);

  const model = useMemo(() => {
    const today = toYMD(clock);
    const dates: string[] = [];
    for (let k = -PAST_DAYS; k <= FUT_DAYS; k++) {
      const d = new Date(clock);
      d.setDate(clock.getDate() + k);
      dates.push(toYMD(d));
    }
    const lastDate = dates[dates.length - 1];

    // Dominant recorded platform — the source shown on expected-earnings rows
    const platCount: Record<string, number> = {};
    entries.forEach((t) => {
      const p = t.platform || "Other";
      platCount[p] = (platCount[p] || 0) + 1;
    });
    const dominant = Object.entries(platCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "Uber";

    const raw: Raw[] = [];

    // 1) CONFIRMED income — one row per (day, platform)
    const incMap: Record<string, { date: string; platform: string; sum: number }> = {};
    entries.forEach((t) => {
      const ds = t.datetime.slice(0, 10);
      if (ds < dates[0] || ds > today) return;
      const k = ds + "|" + (t.platform || "Other");
      if (!incMap[k]) incMap[k] = { date: ds, platform: t.platform || "Other", sum: 0 };
      incMap[k].sum += tripNet(t);
    });
    Object.values(incMap).forEach((g) =>
      raw.push({
        key: "in-" + g.date + "-" + g.platform, date: g.date, source: g.platform,
        logo: platformLogo(g.platform), ...brandOf(g.platform),
        desc: "Recorded Earnings", italic: false,
        bankReal: g.sum, projIncome: null, projExpense: null,
      }),
    );

    // 2) CONFIRMED expenses — dated records already due (≤ today)
    expenses.forEach((e) => {
      const ds = (e.dueDate || e.createdAt || "").slice(0, 10);
      if (!ds || ds < dates[0] || ds > today) return;
      raw.push({
        key: "ce-" + e.id, date: ds, source: e.vendor || e.category, logo: null, ...brandOf(e.vendor || e.category),
        desc: e.category + " Expense", italic: false,
        bankReal: -e.amount, projIncome: null, projExpense: null,
      });
    });

    // 3) PROJECTED income — future work days at their day target
    for (let k = PAST_DAYS + 1; k < dates.length; k++) {
      const ds = dates[k];
      const iso = isoDay(new Date(ds + "T12:00:00"));
      if (!workDays.includes(iso)) continue;
      const amt = dayTargets[iso] ?? dailyGoal;
      if (!(amt > 0)) continue;
      raw.push({
        key: "pi-" + ds, date: ds, source: dominant, logo: platformLogo(dominant), ...brandOf(dominant),
        desc: "Expected Earnings", italic: true,
        bankReal: null, projIncome: amt, projExpense: null,
      });
    }

    // 4) PROJECTED expenses — occurrences by frequency within the horizon
    expenses.forEach((e) => {
      const due = (e.dueDate || "").slice(0, 10);
      if (!due) return;
      const until = e.endDate || lastDate;
      const occ: string[] = [];
      if (e.frequency === "daily") {
        dates.forEach((ds) => { if (ds > today && ds >= due && ds <= until) occ.push(ds); });
      } else if (e.frequency === "weekly") {
        dates.forEach((ds) => {
          if (ds > today && ds >= due && ds <= until && daysBetween(due, ds) % 7 === 0) occ.push(ds);
        });
      } else {
        // monthly & one-time — on their due date (same rule as the cash-flow engine)
        if (due > today && due <= lastDate && due <= until) occ.push(due);
      }
      occ.forEach((ds, i) =>
        raw.push({
          key: "pe-" + e.id + "-" + ds + "-" + i, date: ds,
          source: e.vendor || e.category, logo: null, ...brandOf(e.vendor || e.category),
          desc: /rent/i.test(e.category + " " + (e.vendor || "")) ? "Monthly Rent Payment" : e.category + " Expense",
          italic: true,
          bankReal: null, projIncome: null, projExpense: e.amount,
        }),
      );
    });

    const rank = (r: Raw) => (r.bankReal != null ? (r.bankReal >= 0 ? 0 : 1) : r.projIncome != null ? 2 : 3);
    raw.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : rank(a) - rank(b)));

    // Balances — forward pass from the opening balance implied by today's bank
    const confirmedSum = raw.reduce((s, r) => s + (r.bankReal ?? 0), 0);
    const opening = bankBalance - confirmedSum;
    let run = opening;
    let actRun = opening;
    const rows: Row[] = raw.map((r) => {
      run += (r.bankReal ?? 0) + (r.projIncome ?? 0) - (r.projExpense ?? 0);
      let actualBal: number | null = null;
      if (r.bankReal != null) {
        actRun += r.bankReal;
        actualBal = actRun;
      }
      const status: Status = r.bankReal != null ? "confirmed" : run < 0 ? "deficit" : "projected";
      return { ...r, status, actualBal, projBal: run };
    });

    const pending = -rows.reduce((s, r) => s + (r.projExpense ?? 0), 0);
    const endProj = rows.length ? rows[rows.length - 1].projBal : bankBalance;

    let alert: { dayLabel: string; cause: string; deficit: number; perDay: number; ridesLo: number; ridesHi: number } | null = null;
    const firstNeg = rows.find((r) => r.status === "deficit");
    if (firstNeg) {
      const worst = -Math.min(...rows.filter((r) => r.projBal < 0).map((r) => r.projBal));
      const causeRow = rows.filter((r) => r.date === firstNeg.date).sort((a, b) => (b.projExpense ?? 0) - (a.projExpense ?? 0))[0];
      const daysLeft = Math.max(1, daysBetween(today, firstNeg.date));
      const perDay = Math.ceil(worst / daysLeft);
      const lo = Math.max(1, Math.floor(perDay / RIDE_NET));
      alert = { dayLabel: dayLabel(firstNeg.date), cause: causeRow?.source || "expenses", deficit: worst, perDay, ridesLo: lo, ridesHi: lo + 1 };
    }
    return { today, rows, pending, endProj, alert };
  }, [clock, entries, expenses, dailyGoal, workDays, dayTargets, bankBalance]);

  const saveBank = () => {
    const nv = parseFloat(editVal);
    if (isNaN(nv)) return;
    const adj: BankAdjEntry = {
      id: Date.now().toString(),
      date: toYMD(clock),
      time: clock.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      prevBalance: bankBalance,
      newBalance: nv,
      note: editNote.trim(),
    };
    setBankAdjHistory((prev) => [adj, ...prev].slice(0, 20));
    setBankBalance(nv);
    setEditingBank(false);
    setEditVal("");
    setEditNote("");
    showToast("Bank balance updated");
  };

  const shown = onlyPending ? model.rows.filter((r) => r.status !== "confirmed") : model.rows;

  return (
    <div className="flex-shrink-0 w-full px-4 space-y-3 pb-6" style={{ scrollSnapAlign: "start" }}>
      {/* 3 summary cards — same layout order as the approved mock */}
      <div className="grid grid-cols-3 gap-2">
        <SummaryCard
          accent="#22c55e" icon={<ArrowUpRight size={13} />} label="Actual Bank Balance"
          amount={(bankBalance < 0 ? "-" : "") + money(bankBalance)}
          amountColor={bankBalance < 0 ? "#f87171" : "#ffffff"}
          detailsColor="#4ade80" onDetails={() => { setEditVal(bankBalance.toFixed(2)); setEditingBank(true); }}
        />
        <SummaryCard
          accent="#f59e0b" icon={<Hourglass size={13} />} label="Pending"
          amount={(model.pending < 0 ? "-" : "") + money(model.pending)}
          amountColor={model.pending < 0 ? "#fbbf24" : "#e2e8f0"}
          detailsColor="#fbbf24" detailsActive={onlyPending}
          onDetails={() => setOnlyPending((v) => !v)}
        />
        <SummaryCard
          accent="#3b82f6" icon={<ArrowRight size={13} />} label="Projected Balance"
          amount={(model.endProj < 0 ? "-" : "") + money(model.endProj)}
          amountColor={model.endProj < 0 ? "#f87171" : "#ffffff"}
          detailsColor="#60a5fa"
          onDetails={() => tableRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })}
        />
      </div>

      {editingBank && (
        <div className="space-y-2 rounded-xl border p-3" style={{ borderColor: "rgba(34,197,94,0.35)", background: "#0d1b33" }}>
          <div className="flex items-center justify-between">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-300">Edit Bank Balance</p>
            {bankAdjHistory.length > 0 && (
              <p className="text-[8px] text-slate-500">
                Updated manually · {new Date(bankAdjHistory[0].date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono-jet text-[16px] text-slate-400">$</span>
            <input type="number" inputMode="decimal" value={editVal} autoFocus onChange={(e) => setEditVal(e.target.value)}
              className="h-10 flex-1 rounded-lg border bg-[#0a1428] px-3 font-mono-jet text-[16px] font-bold text-white focus:outline-none"
              style={{ borderColor: "rgba(34,197,94,0.4)" }} />
          </div>
          <input type="text" value={editNote} onChange={(e) => setEditNote(e.target.value)}
            placeholder="Optional note (e.g. car repair −$270)"
            className="h-9 w-full rounded-lg border border-[#22345c] bg-[#0a1428] px-3 text-[11px] text-slate-200 focus:outline-none" />
          <div className="flex gap-2">
            <button onClick={saveBank} className="flex-1 rounded-lg bg-[#22c55e] py-2.5 text-[12px] font-bold text-black transition-transform active:scale-95">Save</button>
            <button onClick={() => { setEditingBank(false); setEditVal(""); setEditNote(""); }}
              className="rounded-lg border border-[#22345c] px-4 text-[12px] text-slate-300">Cancel</button>
          </div>
        </div>
      )}

      {model.alert && !dismissed && (
        <div className="flex items-center gap-2 rounded-lg px-3 py-2.5" style={{ background: "#f4635f" }}>
          <AlertTriangle size={14} className="flex-shrink-0 text-white" />
          <p className="text-[10px] font-bold leading-snug text-white">
            CASH FLOW ALERT: -{money(model.alert.deficit)} Deficit on {model.alert.dayLabel} ({model.alert.cause}).
            Contingency Target: +${Math.round(model.alert.perDay).toLocaleString("en-US")}/day extra
            ({model.alert.ridesLo}-{model.alert.ridesHi} rides/day)
          </p>
          <button onClick={() => setDismissed(true)}
            className="ml-auto flex-shrink-0 rounded px-2.5 py-1 text-[9px] font-bold text-white"
            style={{ background: "rgba(255,255,255,0.28)" }}>Dismiss</button>
        </div>
      )}

      {/* Master Register — 9 columns, horizontal scroll on mobile (as approved) */}
      <div ref={tableRef} className="rounded-2xl bg-[#0d1b33] p-3">
        <div className="flex items-center justify-between px-1 pb-2">
          <p className="text-[14px] font-bold text-white">Master Register</p>
          {onlyPending && (
            <button onClick={() => setOnlyPending(false)} className="text-[9px] font-bold text-[#fbbf24]">
              SHOWING PENDING · CLEAR
            </button>
          )}
        </div>
        <div className="overflow-x-auto rounded-lg" style={{ scrollbarWidth: "thin" }}>
          <table className="w-full min-w-[900px]" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr className="bg-[#1c2a47]">
                {["Date", "App/Source", "Description", "Bank Real ($)", "Projected Income (+)", "Projected Expense (−)", "Actual Balance", "Projected Balance", "Status"].map((h) => (
                  <th key={h} className="whitespace-nowrap px-2.5 py-2 text-left text-[9px] font-semibold uppercase tracking-wide text-slate-300">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.map((r, i) => (
                <tr key={r.key} style={{ background: r.status === "deficit" ? "#fecaca" : i % 2 === 0 ? "#ffffff" : "#e9f1fe" }}>
                  <Td><span className="text-[10px] font-semibold text-[#0f172a]">{dayLabel(r.date)}</span></Td>
                  <Td><SourceBadge r={r} /></Td>
                  <Td><span className={"text-[10px] text-[#0f172a]" + (r.italic ? " italic" : "")}>{r.desc}</span></Td>
                  <Td>{r.bankReal == null ? <Dash /> : (
                    <span className={"font-mono-jet text-[10px] font-bold " + (r.bankReal >= 0 ? "text-green-600" : "text-red-600")}>
                      {r.bankReal >= 0 ? "+" : "−"}{money(r.bankReal)}
                    </span>
                  )}</Td>
                  <Td>{r.projIncome == null ? <Dash /> : (
                    <span className="font-mono-jet text-[10px] font-bold text-blue-600">+{money(r.projIncome)}</span>
                  )}</Td>
                  <Td>{r.projExpense == null ? <Dash /> : (
                    <span className="font-mono-jet text-[10px] font-bold text-red-600">−{money(r.projExpense)}</span>
                  )}</Td>
                  <Td>{r.actualBal == null ? <Dash /> : (
                    <span className={"font-mono-jet text-[10px] font-semibold " + (r.actualBal < 0 ? "text-red-600" : "text-[#0f172a]")}>{money(r.actualBal)}</span>
                  )}</Td>
                  <Td>
                    <span className={"font-mono-jet text-[10px] font-bold " + (r.projBal < 0 ? "text-red-600" : "text-[#0f172a]")}>{money(r.projBal)}</span>
                  </Td>
                  <Td><StatusPill status={r.status} /></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {shown.length === 0 && (
          <p className="py-6 text-center text-[11px] text-slate-400">
            No transactions in the register yet — record a day in ENTRY and add expenses.
          </p>
        )}
      </div>
    </div>
  );
}

const Dash = () => <span className="text-slate-400">–</span>;

function Td({ children }: { children: ReactNode }) {
  return <td className="whitespace-nowrap px-2.5 py-2 align-middle">{children}</td>;
}

function SourceBadge({ r }: { r: Row }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center overflow-hidden rounded-full text-[8px] font-black"
        style={{ background: r.badgeColor, color: r.badgeText }}>
        {r.logo ? <img src={r.logo} alt={r.source} className="h-5 w-5 object-cover" />
          : r.badgeIcon === "home" ? <Home size={11} />
          : r.source.slice(0, 2).toUpperCase()}
      </span>
      <span className="text-[10px] font-semibold text-[#0f172a]">{r.source}</span>
    </span>
  );
}

function StatusPill({ status }: { status: Status }) {
  if (status === "confirmed") {
    return <span className="inline-flex items-center gap-1 rounded-md bg-green-600 px-2 py-[3px] text-[9px] font-bold text-white"><Check size={9} strokeWidth={3} />Confirmed</span>;
  }
  if (status === "deficit") {
    return <span className="inline-flex items-center gap-1 rounded-md bg-red-600 px-2 py-[3px] text-[9px] font-bold text-white"><AlertTriangle size={9} />Deficit Risk</span>;
  }
  return <span className="inline-flex items-center gap-1 rounded-md bg-blue-500 px-2 py-[3px] text-[9px] font-bold text-white"><Clock size={9} />Projected</span>;
}

function SummaryCard(props: {
  accent: string; icon: ReactNode; label: string; amount: string; amountColor: string;
  detailsColor: string; detailsActive?: boolean; onDetails: () => void;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl bg-[#0d1b33] p-2.5" style={{ borderLeft: "3px solid " + props.accent }}>
      <div className="flex items-start justify-between">
        <span className="flex h-6 w-6 items-center justify-center rounded-md text-white" style={{ background: props.accent }}>{props.icon}</span>
        <button onClick={props.onDetails} className="text-[8px] font-bold transition-transform active:scale-95"
          style={{ color: props.detailsActive ? "#ffffff" : props.detailsColor }}>
          View Details
        </button>
      </div>
      <p className="mt-1.5 text-[8px] font-semibold leading-tight text-slate-400">{props.label}</p>
      <p className="mt-0.5 font-mono-jet text-[13px] font-bold" style={{ color: props.amountColor }}>{props.amount}</p>
    </div>
  );
}
