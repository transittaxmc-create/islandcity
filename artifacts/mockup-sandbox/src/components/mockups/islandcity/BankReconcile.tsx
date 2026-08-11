import "./_group.css";

// ── Bank Statement PDF Reconciliation ───────────────────────────────────────

const goldGrad = { background: "linear-gradient(90deg, #f6dd8c, #d9b64f)" };

interface Transaction {
  date: string;
  desc: string;
  amount: number;
  type: "credit" | "debit";
  category: "business" | "personal" | "unclear";
  matched?: boolean;
  matchedTo?: string;
}

const TRANSACTIONS: Transaction[] = [
  { date: "Aug 11", desc: "UBER DEPOSIT", amount: 623.40, type: "credit", category: "business", matched: true, matchedTo: "7 viajes · Lun 11" },
  { date: "Aug 10", desc: "LYFT WEEKLY PAY", amount: 241.80, type: "credit", category: "business", matched: true, matchedTo: "3 viajes · Dom-Vie" },
  { date: "Aug 10", desc: "BP #4521 QUEENS", amount: 55.24, type: "debit", category: "business", matched: true, matchedTo: "Gasolina · recibo ✓" },
  { date: "Aug 09", desc: "AMAZON PRIME", amount: 14.99, type: "debit", category: "personal", matched: false },
  { date: "Aug 09", desc: "AUTOZONE #847", amount: 38.75, type: "debit", category: "business", matched: false },
  { date: "Aug 08", desc: "MCDONALD'S #3421", amount: 12.40, type: "debit", category: "personal", matched: false },
  { date: "Aug 07", desc: "ECORIDE PAYMENT", amount: 189.50, type: "credit", category: "business", matched: true, matchedTo: "4 viajes · Jue 7" },
  { date: "Aug 07", desc: "SUNPASS TOLL", amount: 8.25, type: "debit", category: "business", matched: true, matchedTo: "Peaje · entrada manual" },
  { date: "Aug 06", desc: "NETFLIX", amount: 15.49, type: "debit", category: "personal", matched: false },
  { date: "Aug 06", desc: "SHELL GAS JAMAICA", amount: 62.10, type: "debit", category: "unclear", matched: false },
];

function CategoryBadge({ cat }: { cat: Transaction["category"] }) {
  const styles = {
    business: "bg-[#4ade80]/10 border-[#4ade80]/30 text-[#4ade80]",
    personal:  "bg-[#f97316]/10 border-[#f97316]/30 text-[#f97316]",
    unclear:   "bg-[#eab308]/10 border-[#eab308]/30 text-[#eab308]",
  };
  const labels = { business: "Negocio", personal: "Personal", unclear: "¿?" };
  return (
    <span className={`text-[7px] font-bold px-1.5 py-0.5 rounded-full border ${styles[cat]}`}>
      {labels[cat]}
    </span>
  );
}

export function BankReconcile() {
  const matched = TRANSACTIONS.filter((t) => t.matched).length;
  const unmatched = TRANSACTIONS.filter((t) => !t.matched).length;
  const bizIncome = TRANSACTIONS.filter((t) => t.type === "credit" && t.category === "business").reduce((s, t) => s + t.amount, 0);
  const bizExpenses = TRANSACTIONS.filter((t) => t.type === "debit" && t.category === "business").reduce((s, t) => s + t.amount, 0);

  return (
    <div className="min-h-screen w-full bg-black text-white overflow-y-auto" style={{ fontFamily: "Inter, sans-serif" }}>
      <div className="max-w-[390px] mx-auto bg-black min-h-screen">

        {/* Header */}
        <div className="px-4 pt-12 pb-3 flex items-center justify-between border-b border-[#1a1a1a]">
          <div>
            <p className="text-[10px] tracking-[0.3em] text-neutral-500 font-semibold uppercase">AI · Reconciliación</p>
            <p className="font-['Cinzel'] text-[14px] tracking-[0.05em]" style={goldGrad as any}>ESTADO DE BANCO</p>
          </div>
          <div className="bg-[#141414] border border-[#222] rounded-full w-8 h-8 flex items-center justify-center text-[#f6dd8c] text-[11px] font-bold">M</div>
        </div>

        <div className="px-3 py-3 space-y-3">

          {/* ── Upload / Period ── */}
          <div className="bg-[#101010] border border-[#1e1e1e] rounded-2xl p-4">
            <p className="text-[9px] tracking-[0.22em] text-neutral-500 font-bold uppercase mb-3">SUBIR ESTADO DE CUENTA</p>
            {/* Uploaded file indicator */}
            <div className="bg-[#4ade80]/5 border border-[#4ade80]/20 rounded-xl p-3 flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-[#4ade80]/10 flex items-center justify-center text-[18px] flex-shrink-0">📄</div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-white truncate">Chase_Statement_Aug2026.pdf</p>
                <p className="text-[8px] text-neutral-500">Agosto 1–11, 2026 · 10 transacciones</p>
              </div>
              <span className="text-[8px] text-[#4ade80] font-bold flex-shrink-0">✓ Leído</span>
            </div>
            <button className="w-full h-10 rounded-xl border border-dashed border-[#2a2a2a] text-[10px] text-neutral-600 flex items-center justify-center gap-2">
              📎 Subir otro PDF
            </button>
          </div>

          {/* ── Summary cards ── */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-[#101010] border border-[#1e1e1e] rounded-2xl p-3">
              <p className="text-[7px] text-neutral-600 uppercase tracking-widest mb-1">Reconciliadas</p>
              <p className="font-['JetBrains_Mono',monospace] text-[22px] font-bold text-[#4ade80]">{matched}/{TRANSACTIONS.length}</p>
              <div className="mt-1.5 h-1 bg-[#1e1e1e] rounded-full overflow-hidden">
                <div className="h-full bg-[#4ade80] rounded-full" style={{ width: `${(matched/TRANSACTIONS.length)*100}%` }} />
              </div>
            </div>
            <div className="bg-[#101010] border border-[#1e1e1e] rounded-2xl p-3">
              <p className="text-[7px] text-neutral-600 uppercase tracking-widest mb-1">Sin reconciliar</p>
              <p className="font-['JetBrains_Mono',monospace] text-[22px] font-bold text-[#eab308]">{unmatched}</p>
              <p className="text-[8px] text-neutral-600 mt-1">Necesitan revisión</p>
            </div>
            <div className="bg-[#101010] border border-[#1e1e1e] rounded-2xl p-3">
              <p className="text-[7px] text-neutral-600 uppercase tracking-widest mb-1">Ingresos negocio</p>
              <p className="font-['JetBrains_Mono',monospace] text-[15px] font-bold text-[#4ade80]">+${bizIncome.toFixed(0)}</p>
            </div>
            <div className="bg-[#101010] border border-[#1e1e1e] rounded-2xl p-3">
              <p className="text-[7px] text-neutral-600 uppercase tracking-widest mb-1">Gastos negocio</p>
              <p className="font-['JetBrains_Mono',monospace] text-[15px] font-bold text-red-400">-${bizExpenses.toFixed(0)}</p>
            </div>
          </div>

          {/* ── Category filter ── */}
          <div className="flex gap-2 overflow-x-auto pb-0.5">
            {["Todo", "Sin revisar", "Negocio ✓", "Personal", "¿?"].map((f, i) => (
              <button key={f} className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[9px] font-semibold border ${
                i === 0 ? "border-[#d9b64f]/50 text-[#f6dd8c] bg-[#d9b64f]/10"
                        : "border-[#1e1e1e] text-neutral-500 bg-transparent"
              }`}>{f}</button>
            ))}
          </div>

          {/* ── Transaction list ── */}
          <div className="bg-[#101010] border border-[#1e1e1e] rounded-2xl overflow-hidden">
            <p className="text-[9px] tracking-[0.22em] text-neutral-500 font-bold uppercase px-4 pt-4 mb-2">TRANSACCIONES</p>
            <div className="divide-y divide-[#141414]">
              {TRANSACTIONS.map((t, i) => (
                <div key={i} className={`px-4 py-3 flex items-center gap-3 ${t.matched ? "" : "bg-[#0d0d08]"}`}>
                  {/* Match status dot */}
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${t.matched ? "bg-[#4ade80]" : "bg-[#eab308]"}`} />
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <p className="text-[11px] font-medium text-white truncate">{t.desc}</p>
                      <CategoryBadge cat={t.category} />
                    </div>
                    <p className="text-[8px] text-neutral-600">
                      {t.date}
                      {t.matched && t.matchedTo && (
                        <span className="text-[#4ade80]"> · {t.matchedTo}</span>
                      )}
                      {!t.matched && (
                        <span className="text-[#eab308]"> · sin reconciliar</span>
                      )}
                    </p>
                  </div>
                  {/* Amount */}
                  <p className={`font-['JetBrains_Mono',monospace] text-[12px] font-bold flex-shrink-0 ${
                    t.type === "credit" ? "text-[#4ade80]" : "text-neutral-300"
                  }`}>
                    {t.type === "credit" ? "+" : "-"}${t.amount.toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Reconcile action ── */}
          <button className="w-full h-13 rounded-2xl text-black text-[13px] font-bold py-3.5" style={goldGrad}>
            ✓ Reconciliar transacciones pendientes
          </button>

          <div className="pb-6" />

        </div>
      </div>
    </div>
  );
}
