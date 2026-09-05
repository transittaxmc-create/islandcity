// ── Copiloto Financiero · Actualización Matutina (krispy clean) ──
// Dark/gold. Real data from the app: bankBalance, entries, expenses.
import type { EntryRecord } from "../../lib/domain";
import type { ReceiptRecord } from "../../lib/receipts";
import type { BankAdjEntry } from "./financeData";
import { toYMD, tripNet } from "./financeData";

interface Props {
  clock: Date;
  entries: EntryRecord[];
  expenses: ReceiptRecord[];
  bankBalance: number;
  bankAdjHistory: BankAdjEntry[];
  dailyGoal: number;
  workDays: number[];
  dayTargets: Record<number, number>;
  showToast: (m: string) => void;
}

function dayDiff(a: Date, b: Date): number {
  const ms = a.getTime() - b.getTime();
  return Math.round(ms / 86400000);
}
function parseYMD(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || "");
  if (!m) return null;
  const d = new Date(+m[1], +m[2] - 1, +m[3]);
  return isNaN(d.getTime()) ? null : d;
}

export function MatutinaPage({ clock, entries, expenses, bankBalance, bankAdjHistory, dailyGoal, workDays, dayTargets, showToast }: Props) {
  const today = new Date(clock);
  today.setHours(0, 0, 0, 0);
  const monthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(1, "0")}-01`;

  const inMonth = (d: string) => (d || "").slice(0, 7) === monthStart.slice(0, 7);
  const incomeMonth = entries.filter(e => inMonth(e.datetime)).reduce((a, t) => a + tripNet(t), 0);
  const tollsMonth = entries.filter(e => inMonth(e.datetime)).reduce((a, t) => a + (t.toll || 0), 0);
  const expMonth = expenses.filter(e => inMonth(e.createdAt || e.dueDate)).reduce((a, e) => a + (e.amount || 0), 0);

  const upcoming: { rec: ReceiptRecord; due: Date; days: number }[] = [];
  for (const e of expenses) {
    const d = parseYMD(e.dueDate);
    if (d) {
      const days = dayDiff(d, today);
      if (days >= 0 && days <= 14) upcoming.push({ rec: e, due: d, days });
    }
  }
  upcoming.sort((x, y) => x.days - y.days);

  const next7 = upcoming.filter(u => u.days <= 7);
  const projIncome7 = (() => {
    let total = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(today); d.setDate(today.getDate() + i);
      const iso = d.getDay() === 0 ? 7 : d.getDay();
      if (workDays.includes(iso)) total += dayTargets[iso] ?? dailyGoal;
    }
    return total;
  })();
  const projExpenses7 = next7.reduce((a, u) => a + (u.rec.amount || 0), 0);
  const proj7 = bankBalance + projIncome7 - projExpenses7;

  // ----- AI insight (1 principal, determinista) -----
  const urgent = upcoming.find(u => u.days <= 2);
  const nearDue = upcoming.find(u => u.days <= 7 && u !== urgent);
  let sev = "good", icon = "🟢", title = "", sub = "";
  if (urgent) { sev = "bad"; icon = "🔴"; title = `Pago de $${(urgent.rec.amount||0).toFixed(2)} vence en ${urgent.days===0?"hoy":`${urgent.days} día${urgent.days===1?"":"s"}`}`; sub = "Pagar a tiempo protege tu score. Revisa el plan de abajo."; }
  else if (nearDue) { sev = "warn"; icon = "🟡"; title = `Próximo pago: $${(nearDue.rec.amount||0).toFixed(2)} en ${nearDue.days} día${nearDue.days===1?"":"s"}`; sub = "Tienes margen. Confirma disponibilidad de saldo."; }
  else if (upcoming.length > 0) { sev = "info"; icon = "💡"; title = `${upcoming.length} pago${upcoming.length===1?"":"s"} programado${upcoming.length===1?"":"s"} los próximos 14 días`; sub = "Todo bajo control. Proyección holgada."; }
  else if (expMonth > 0 && incomeMonth >= expMonth) { sev = "good"; icon = "🟢"; title = "Ingresos cubren gastos este mes"; sub = "Balance mes: +$" + (incomeMonth - expMonth).toFixed(2); }
  else { sev = "good"; icon = "🟢"; title = "Todo en orden"; sub = "Sin pagos pendientes a la vista."; }

  // ----- Score (determinista simple) -----
  let score = 742;
  if (bankBalance <= 0) score -= 60;
  if (urgent) score -= 15;
  if (expMonth > incomeMonth && incomeMonth > 0) score -= 20;
  if (bankAdjHistory.length > 0) score += 10;
  if (proj7 < 0) score -= 20;
  score = Math.max(560, Math.min(820, score));
  const scoreSev = score >= 700 ? "good" : score >= 620 ? "warn" : "bad";
  const dotColor = scoreSev === "good" ? "#22ff88" : scoreSev === "warn" ? "#ffb020" : "#ff5d5d";

  // ----- Plan de pagos (top 3) -----
  const plan = upcoming.slice(0, 3).map(u => {
    const tag = u.days <= 3 ? "ALTA" : u.days <= 7 ? "MEDIA" : "FONDO";
    const tagColor = tag === "ALTA" ? "#ff5d5d" : tag === "MEDIA" ? "#ffb020" : "#22ff88";
    return { ...u, tag, tagColor };
  });

  const fmtK = (n: number) => "$" + n.toLocaleString(undefined, { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });

  return (
    <div className="w-full" style={{ maxWidth: 520, margin: "0 auto", padding: "2px 14px 30px" }}>
      {/* SALDO REAL */}
      <div className="rounded-2xl border border-[#1a1a1a] bg-[#0e0e0e] p-4" style={{ borderLeft: "3px solid #f5d78e" }}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-400">Saldo real de hoy</p>
            <p className="mt-1 text-[32px] font-black leading-none" style={{ color: "#f5d78e" }}>{fmtK(bankBalance)}</p>
            <p className="mt-1 text-[11px] text-neutral-500">{bankAdjHistory.length > 0 ? "Conciliado · actualizado" : "Sin conciliar aún · toca ajustar saldo"}</p>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-[#1a1a1a] bg-[#080808] px-3 py-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: dotColor }} />
            <span className="text-[13px] font-black" style={{ color: dotColor }}>{score}</span>
            <span className="text-[9px] font-black uppercase tracking-wider text-neutral-500">/850</span>
          </div>
        </div>
      </div>

      {/* AI COPILOT · 1 insight */}
      <div className="mt-3 rounded-2xl border border-[#1a1a1a] bg-[#0e0e0e] p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-400">🤖 AI Copilot</p>
        <div className="mt-2 flex items-start gap-2.5">
          <span className="text-[18px] leading-none">{icon}</span>
          <div className="min-w-0">
            <p className="text-[14px] font-bold text-neutral-100">{title}</p>
            <p className="mt-0.5 text-[12px] text-neutral-400">{sub}</p>
          </div>
        </div>
      </div>

      {/* PLAN OPERATIVO */}
      <div className="mt-3 rounded-2xl border border-[#1a1a1a] bg-[#0e0e0e] p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-400">Plan operativo de pagos</p>
        {plan.length === 0 ? (
          <p className="mt-2 text-[12px] text-neutral-500">Nada pendiente en los próximos 14 días 🎉</p>
        ) : (
          <div className="mt-2 flex flex-col gap-2">
            {plan.map((u) => (
              <div key={u.rec.id} className="flex items-center gap-2.5 rounded-xl border border-[#1a1a1a] bg-[#080808] p-2.5">
                <span className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black tracking-wide" style={{ background: u.tagColor + "22", color: u.tagColor }}>{u.tag}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-bold text-neutral-100">{u.rec.vendor || "Pago"}</p>
                  <p className="text-[11px] text-neutral-500">{u.days === 0 ? "Vence hoy" : `En ${u.days} día${u.days === 1 ? "" : "s"}`} · {u.due.toLocaleDateString("es", { month: "short", day: "numeric" })}</p>
                </div>
                <p className="text-[14px] font-black" style={{ color: u.tagColor }}>{u.rec.amount ? "$" + u.rec.amount.toFixed(2) : "—"}</p>
                <button
                  className="shrink-0 rounded-lg px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wide transition-transform active:scale-95"
                  style={{ background: "#f5d78e", color: "#000" }}
                  onClick={() => showToast(`${u.rec.vendor || "Pago"} marcado como pagado`)}
                >PAGAR</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ESTE MES */}
      <div className="mt-3 rounded-2xl border border-[#1a1a1a] bg-[#0e0e0e] p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-400">Este mes</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {[
            { lbl: "Ingresos", val: fmtK(incomeMonth), c: "#22ff88" },
            { lbl: "Gastos", val: fmtK(expMonth), c: "#ff5d5d" },
            { lbl: "Balance", val: fmtK(incomeMonth - expMonth), c: "#e8ecf1" },
            { lbl: "Peajes", val: fmtK(tollsMonth), c: "#ffb020" },
          ].map(k => (
            <div key={k.lbl} className="rounded-xl border border-[#1a1a1a] bg-[#080808] p-3">
              <p className="text-[9px] font-black uppercase tracking-[0.14em] text-neutral-500">{k.lbl}</p>
              <p className="mt-0.5 text-[17px] font-black" style={{ color: k.c }}>{k.val}</p>
            </div>
          ))}
        </div>
      </div>

      {/* PROYECCIÓN 7 días */}
      <div className="mt-3 rounded-2xl border border-[#1a1a1a] bg-[#0e0e0e] p-4">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-400">Proyección · 7 días</p>
          <span className="text-[10px] font-bold text-neutral-500">{next7.length} pago{next7.length === 1 ? "" : "s"}</span>
        </div>
        <p className="mt-1 text-[22px] font-black" style={{ color: proj7 >= 0 ? "#22d3ee" : "#ff5d5d" }}>{fmtK(proj7)}</p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#1a1a1a]">
          <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.max(4, ((bankBalance + projIncome7) / Math.max(1, proj7 || 1)) * 100))}%`, background: "linear-gradient(90deg,#f5d78e,#d9b64f)" }} />
        </div>
        <p className="mt-1.5 text-[11px] text-neutral-500">
          Saldo hoy {fmtK(bankBalance)} + ingresos {fmtK(projIncome7)} − pagos {fmtK(projExpenses7)}
        </p>
      </div>
    </div>
  );
}