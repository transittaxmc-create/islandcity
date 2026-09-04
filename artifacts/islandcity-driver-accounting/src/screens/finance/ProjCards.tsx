// â”€â”€ FINANCE Â· Projections page cards â€” ported 1:1 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
import { useState } from "react";
import { EXPENSE_CATEGORIES, type ReceiptRecord } from "../../lib/receipts";
import { toYMD, type BankAdjEntry } from "./financeData";

export function BankBalanceCard({ bankBalance, setBankBalance, bankAdjHistory, setBankAdjHistory, clock }: {
  bankBalance: number;
  setBankBalance: (n: number) => void;
  bankAdjHistory: BankAdjEntry[];
  setBankAdjHistory: (fn: (prev: BankAdjEntry[]) => BankAdjEntry[]) => void;
  clock: Date;
}) {
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState("");
  const [editNote, setEditNote] = useState("");
  return (
    <div className="bg-[#101010] border border-[#d9b64f]/25 rounded-2xl overflow-hidden" style={{ position: "relative" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg,#d9b64f,#f6dd8c44,transparent)" }} />
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[9px] tracking-[0.22em] text-[#f6dd8c]/90 font-bold uppercase">BANK BALANCE TODAY</p>
          {!editing && (
            <button onClick={() => { setEditVal(bankBalance.toFixed(2)); setEditing(true); }}
              className="flex items-center gap-1 text-[9px] text-[#f6dd8c] border border-[#f6dd8c]/30 px-2.5 py-1 rounded-full active:scale-95 transition-transform">
              âœï¸ Edit
            </button>
          )}
        </div>
        {editing ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-neutral-400 text-[18px] font-mono-jet">$</span>
              <input type="number" value={editVal} onChange={(e) => setEditVal(e.target.value)}
                className="flex-1 bg-black border border-[#f6dd8c]/40 rounded-xl px-3 py-2 text-[#f6dd8c] font-mono-jet text-[20px] font-bold focus:outline-none focus:border-[#f6dd8c]"
                autoFocus inputMode="decimal" />
            </div>
            <input type="text" placeholder="Optional note (e.g. car repair âˆ’$270)" value={editNote}
              onChange={(e) => setEditNote(e.target.value)}
              className="w-full bg-black border border-[#2e2e2e] rounded-xl px-3 py-1.5 text-neutral-300 text-[11px] focus:outline-none focus:border-[#f6dd8c]/30" />
            <div className="flex gap-2">
              <button onClick={() => {
                const nv = parseFloat(editVal);
                if (!isNaN(nv)) {
                  const adj: BankAdjEntry = {
                    id: Date.now().toString(),
                    date: toYMD(clock),
                    time: clock.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
                    prevBalance: bankBalance, newBalance: nv,
                    note: editNote.trim(),
                  };
                  setBankAdjHistory((prev) => [adj, ...prev].slice(0, 20));
                  setBankBalance(nv);
                }
                setEditing(false); setEditVal(""); setEditNote("");
              }} className="flex-1 bg-[#f6dd8c] text-black text-[12px] font-bold py-2.5 rounded-xl active:scale-95 transition-transform">Save</button>
              <button onClick={() => { setEditing(false); setEditVal(""); setEditNote(""); }}
                className="px-4 text-neutral-400 text-[12px] border border-[#2a2a2a] rounded-xl">Cancel</button>
            </div>
          </div>
        ) : (
          <>
            <p className="font-mono-jet text-[36px] font-black text-[#f6dd8c] leading-none tracking-tight">
              ${bankBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            {bankAdjHistory.length > 0 && (
              <p className="text-[9px] text-neutral-400 mt-1">
                Updated manually Â· {new Date(bankAdjHistory[0].date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export interface ProjExpForm {
  name: string; amount: string; frequency: "daily" | "weekly" | "monthly";
  category: string; dueDate: string; repeatEnabled: boolean; repeatUntil: string;
}

export const DEFAULT_VENDORS = [
  "Shell", "Mobil", "Chevron", "Dunkin", "Starbucks", "Walmart", "Target", "CVS", "Walgreens",
  "Uber", "Lyft", "Con Edison", "Verizon", "T-Mobile", "AT&T", "Geico", "Progressive",
  "EZPass NJ", "MTA", "Costco", "BJ's", "Aldi", "Key Food", "Stop & Shop", "McDonald's",
  "Burger King", "Popeyes", "Chick-fil-A", "Jiffy Lube", "Midas", "AutoZone", "Advance Auto Parts",
  "Firestone", "Goodyear", "Car Wash", "Rent", "Phone Bill", "Other",
];

export function ProjExpenseCard({ show, setShow, form, setForm, expenses, addExpense, monthFixed, clock, showToast }: {
  show: boolean;
  setShow: (v: boolean) => void;
  form: ProjExpForm;
  setForm: (fn: (s: ProjExpForm) => ProjExpForm) => void;
  expenses: ReceiptRecord[];
  addExpense: (e: ReceiptRecord) => void;
  monthFixed: number;
  clock: Date;
  showToast: (m: string) => void;
}) {
  const allVendors = [...new Set([...DEFAULT_VENDORS, ...expenses.map((e) => e.vendor).filter(Boolean)])];
  return (
    <div className="bg-[#101010] border border-[#d9b64f]/25 rounded-2xl overflow-hidden" style={{ position: "relative" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg,#4ade8088,#4ade8022,transparent)" }} />
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-[9px] tracking-[0.22em] text-[#4ade80]/90 font-bold uppercase">PROJECTED EXPENSES</p>
            <p className="text-[9px] text-neutral-400 mt-0.5">Add recurring costs to your cash flow</p>
          </div>
          <button onClick={() => setShow(!show)}
            className="flex items-center gap-1.5 h-7 px-3 rounded-full border text-[10px] font-bold transition-colors"
            style={{ background: show ? "#1a0a0a" : "#0d1f0d", borderColor: show ? "#ff6b6b33" : "#4ade8033", color: show ? "#ff6b6b" : "#4ade80" }}>
            {show ? "âœ• Cancel" : "+ Add expense"}
          </button>
        </div>
        {!show && expenses.some((e) => e.frequency && e.frequency !== "one-time") && (
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] text-neutral-400">{expenses.filter((e) => e.frequency && e.frequency !== "one-time").length} recurring Â· </span>
            <span className="font-mono-jet text-[9px] font-bold text-orange-400">âˆ’${monthFixed.toFixed(0)}/mo</span>
          </div>
        )}
        {show && (
          <div className="space-y-3 mt-3">
            <div>
              <label className="text-[9px] text-neutral-300 font-bold uppercase tracking-widest mb-1 block">Vendor / Expense Name</label>
              <div className="relative">
                <select value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                  className="w-full h-11 rounded-xl bg-black border border-[#262626] px-3 pr-8 text-white text-[13px] appearance-none focus:outline-none">
                  <option value="">Select a vendor...</option>
                  {allVendors.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 text-[10px]">â–¼</span>
              </div>
            </div>
            <div className="flex gap-2">
              <div className="w-[110px] flex-shrink-0">
                <label className="text-[9px] text-neutral-300 font-bold uppercase tracking-widest mb-1 block">Amount ($)</label>
                <input inputMode="decimal" value={form.amount} onChange={(e) => setForm((s) => ({ ...s, amount: e.target.value }))}
                  placeholder="0.00"
                  className="w-full h-11 rounded-xl bg-black border border-[#262626] px-3 text-white text-[16px] font-bold font-mono-jet placeholder:text-neutral-400 focus:outline-none" />
              </div>
              <div className="flex-1">
                <label className="text-[9px] text-neutral-300 font-bold uppercase tracking-widest mb-1 block">Frequency</label>
                <div className="flex gap-1">
                  {(["daily", "weekly", "monthly"] as const).map((f) => (
                    <button key={f} onClick={() => setForm((s) => ({ ...s, frequency: f }))}
                      className={`flex-1 h-11 rounded-xl text-[9px] font-bold transition-colors capitalize ${form.frequency === f ? "bg-[#facc15] text-black" : "bg-[#1e1e1e] text-neutral-400 border border-[#262626] hover:text-white"}`}>
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <label className="text-[9px] text-neutral-300 font-bold uppercase tracking-widest mb-1 block">Category (IRS Schedule C)</label>
              <div className="relative">
                <select value={form.category} onChange={(e) => setForm((s) => ({ ...s, category: e.target.value }))}
                  className="w-full h-11 rounded-xl bg-black border border-[#262626] px-3 pr-8 text-white text-[13px] appearance-none focus:outline-none">
                  {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 text-[10px]">â–¼</span>
              </div>
            </div>
          {form.frequency === "monthly" && (
            <div>
              <label className="text-[9px] text-neutral-300 font-bold uppercase tracking-widest mb-1 block">Next due date (optional)</label>
              <input type="date" value={form.dueDate} onChange={(e) => setForm((s) => ({ ...s, dueDate: e.target.value }))}
                className="w-full h-11 rounded-xl bg-black border border-[#262626] px-3 text-white text-[13px] focus:outline-none" />
            </div>
          )}

          {/* Flip repeat until date toggle */}
          <div className="border border-[#2e2e2e] rounded-xl p-3 space-y-2">
            <button onClick={() => {
              setForm((s) => ({ ...s, repeatEnabled: !s.repeatEnabled, repeatUntil: s.repeatEnabled ? "" : s.repeatUntil }));
            }} className="w-full flex items-center gap-2.5 text-left">
              <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${form.repeatEnabled ? "bg-[#f6dd8c] border-[#f6dd8c]" : "bg-transparent border-[#3a3a3a]"}`}>
                {form.repeatEnabled && <span className="text-black text-[10px] font-black leading-none">✕</span>}
              </div>
              <div>
                <p className="text-[11px] text-white font-semibold leading-none">🔁 Repeat until a date</p>
                <p className="text-[9px] text-neutral-400 mt-0.5">Stop projecting this expense after a specific date</p>
              </div>
            </button>
            {form.repeatEnabled && (
              <div>
                <label className="text-[9px] text-neutral-300 font-bold uppercase tracking-widest mb-1 block">Stop repeating after</label>
                <input type="date" value={form.repeatUntil} min={toYMD(clock)}
                  onChange={(e) => setForm((s) => ({ ...s, repeatUntil: e.target.value }))}
                  className="w-full h-10 rounded-xl bg-black border border-[#f6dd8c]/30 px-3 text-white text-[13px] focus:outline-none focus:border-[#f6dd8c]" />
              </div>
            )}
          </div>

          <button onClick={() => {
            const amt = parseFloat(form.amount);
            if (!form.name.trim() || !amt || amt <= 0) { showToast("Enter a name and amount"); return; }
            if (form.repeatEnabled && !form.repeatUntil) { showToast("Pick an end date or uncheck Repeat"); return; }
            const rec: ReceiptRecord = {
              id: Date.now().toString(),
              vendor: form.name.trim(),
              amount: amt,
              category: form.category,
              dueDate: form.dueDate || toYMD(clock),
              type: "business",
              expenseType: "regular",
              frequency: form.frequency,
              endDate: form.repeatEnabled ? form.repeatUntil : undefined,
              createdAt: new Date().toISOString(),
            };
            addExpense(rec);
            setForm(() => ({ name: "", amount: "", frequency: "monthly", category: form.category, dueDate: "", repeatEnabled: false, repeatUntil: "" }));
            setShow(false);
            const untilLabel = form.repeatEnabled ? ` · until ${new Date(form.repeatUntil + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : "";
            showToast(`Expense saved ✓ $${amt.toFixed(2)}/${form.frequency}${untilLabel}`);
          }} className="w-full h-12 rounded-full bg-[#facc15] text-black text-[13px] font-bold tracking-wide hover:bg-[#fde047] transition-colors">
            Save Projected Expense
          </button>
          </div>
        )}
      </div>
    </div>
  );
}