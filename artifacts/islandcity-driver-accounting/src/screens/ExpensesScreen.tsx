// ── Expenses · PHASE 2 (spec DOC: Expenses Entry + E-ZPass Reconciliation) ──
import { useEffect, useRef, useState } from "react";
import { type EntryRecord } from "../lib/domain";
import { type EzpTransaction, detectToll, tollAmount, TOLLS } from "../lib/tolls";
import { type ReceiptRecord, detectCategoryFromVendor, simulateOCR, fileToDataUrl, putPhoto, getPhoto, type OcrResult, ocrReceipt } from "../lib/receipts";
import { ChevronLeft, ChevronDown, Camera, Upload } from "lucide-react";

interface Props {
  entries: EntryRecord[];
  addExpense: (e: ReceiptRecord) => void;
  expenses: ReceiptRecord[];
  transactions: EzpTransaction[];
  updateTransaction: (t: EzpTransaction) => void;
}

const EXPENSE_TABS = [
  { id: "ezpass", label: "E-ZPass Reconciliation" },
  { id: "expenses", label: "Expenses Entry" },
] as const;

export default function ExpensesScreen({ entries, addExpense, expenses, transactions, updateTransaction }: Props) {
  const [activeTab, setActiveTab] = useState<"ezpass" | "expenses">("expenses");
  const [expenseType, setExpenseType] = useState<"personal" | "business">("business");
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ReceiptRecord | null>(null);
  const [showRegularForm, setShowRegularForm] = useState(false);
  const [regVendor, setRegVendor] = useState("");
  const [regAmount, setRegAmount] = useState("");
  const [regCategory, setRegCategory] = useState("Fuel");
  const [regFrequency, setRegFrequency] = useState<"daily" | "weekly" | "monthly" | "one-time">("one-time");
  const [regDueDate, setRegDueDate] = useState("");
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setScanning(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      const ocrResult = await ocrReceipt(dataUrl);
      
      if (ocrResult) {
        // Auto-fill from OCR result
        const category = detectCategoryFromVendor(ocrResult.vendor || 'Unknown Vendor');
        const type = ["Fuel", "Maintenance", "Cleaning", "Insurance", "Tolls"].includes(category) ? "business" : expenseType;
        
        const record: ReceiptRecord = {
          id: Math.random().toString(36).slice(2),
          vendor: ocrResult.vendor || 'Unknown Vendor',
          amount: ocrResult.amount || 0,
          category,
          dueDate: new Date().toISOString().split('T')[0],
          imageBase64: dataUrl,
          thumbnailBase64: dataUrl,
          businessCategory: category,
          type,
          expenseType: 'receipt',
        };
        
        // Save photo to IndexedDB
        await putPhoto(record.id, dataUrl);
        setScanResult(record);
        setExpenseType(type);
      } else {
        // Fallback - simulate OCR
        const record = await simulateOCR(dataUrl);
        await putPhoto(record.id, dataUrl);
        setScanResult(record);
        setExpenseType(record.type);
      }
    } catch (err) {
      console.error("Scan error:", err);
    } finally {
      setScanning(false);
    }
  };

  const saveExpense = () => {
    if (!scanResult) return;
    addExpense(scanResult);
    setScanResult(null);
  };

  
  const reconciledCount = transactions.filter(t => t.status === 'reconciled').length;
  const pendingCount = transactions.filter(t => t.status === 'pending').length;
  const discrepancyCount = transactions.filter(t => t.status === 'discrepancy').length;

  const totalEzpassMonth = transactions.reduce((sum, t) => sum + (t.ezpassStatementAmount || t.detectedAmount || 0), 0);

  const filteredTransactions = (filter: string) => {
    switch(filter) {
      case 'reconciled': return transactions.filter(t => t.status === 'reconciled');
      case 'pending': return transactions.filter(t => t.status === 'discrepancy' || t.status === 'pending');
      default: return transactions;
    }
  };

  return (
    <div className="pb-24">
      {/* Tabs */}
      <div className="flex border-b border-[#1a1a1a] bg-[#030303]">
        {EXPENSE_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-3 text-[11px] font-black ${activeTab === tab.id ? "border-b-2 border-[#FFD700] text-[#FFD700]" : "text-neutral-500"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "ezpass" && (
        <div className="p-4">
          {/* Totals */}
          <div className="mb-4 grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-[#0e0e0e] p-3 text-center">
              <div className="text-[8px] font-bold text-neutral-500">PENDING</div>
              <div className="font-mono text-[16px] font-black text-[#F59E0B]">{pendingCount}</div>
            </div>
            <div className="rounded-xl bg-[#0e0e0e] p-3 text-center">
              <div className="text-[8px] font-bold text-neutral-500">RECONCILED</div>
              <div className="font-mono text-[16px] font-black text-[#00FF6A]">{reconciledCount}</div>
            </div>
            <div className="rounded-xl bg-[#0e0e0e] p-3 text-center">
              <div className="text-[8px] font-bold text-neutral-500">TOTAL</div>
              <div className="font-mono text-[16px] font-black text-[#FFD700]">${totalEzpassMonth.toFixed(2)}</div>
            </div>
          </div>

          {/* Transaction List */}
          <div className="space-y-2">
            {transactions.map((tx) => (
              <div key={tx.id} className="rounded-xl border border-[#2a2a2a] bg-[#0e0e0e] p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{tx.tollName}</div>
                    <div className="text-[11px] text-neutral-400">{tx.timestamp}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold">${tx.detectedAmount.toFixed(2)}</div>
                    <span className={`text-[10px] font-black ${tx.status === 'reconciled' ? 'text-[#00FF6A]' : tx.status === 'discrepancy' ? 'text-[#DC2626]' : 'text-[#F59E0B]'}`}>
                      {tx.status.toUpperCase()}
                    </span>
                  </div>
                </div>
                {tx.status === 'discrepancy' || tx.status === 'pending' && (
                  <div className="mt-2 flex gap-2">
                    <input 
                      type="number" 
                      step="0.01" 
                      placeholder="E-ZPass statement amount"
                      className="flex-1 h-8 rounded-lg border border-[#2a2a2a] bg-black px-2 text-[12px] text-white outline-none"
                      defaultValue={tx.ezpassStatementAmount || ''}
                      onChange={(e) => updateTransaction({...tx, ezpassStatementAmount: parseFloat(e.target.value) || undefined})}
                    />
                    <button 
                      onClick={() => updateTransaction({...tx, ezpassStatementAmount: parseFloat(tx.ezpassStatementAmount || 0) || undefined, status: 'reconciled'})}
                      className="px-3 rounded-lg bg-[#00FF6A] text-[10px] font-black text-black"
                    >
                      ✓
                    </button>
                  </div>
                )}
              </div>
            ))}
                        {transactions.length === 0 && (
              <div className="py-8 text-center text-neutral-500">No E-ZPass transactions yet</div>
            )}
          </div>
        </div>
      )}

      {/* Expenses Entry Tab */}
      {activeTab === "expenses" && (
        <div className="p-4">
          {/* Personal/Business toggle */}
          <div className="mb-4 flex items-center gap-2">
            <span className="text-[11px] font-black text-neutral-400">TYPE:</span>
            <button
              onClick={() => setExpenseType("personal")}
              className={`px-3 py-1 rounded-full text-[11px] font-black ${expenseType === "personal" ? "bg-[#9CA3AF] text-black" : "bg-[#1a1a1a] text-neutral-500"}`}
            >
              👤 PERSONAL
            </button>
            <button
              onClick={() => setExpenseType("business")}
              className={`px-3 py-1 rounded-full text-[11px] font-black ${expenseType === "business" ? "bg-[#FFD700] text-black" : "bg-[#1a1a1a] text-neutral-500"}`}
            >
              💼 BUSINESS
            </button>
          </div>

          {expenseType === "business" && (
            <div className="mb-2 flex items-center gap-2 rounded-lg border border-[#22C55E]/30 bg-[#22C55E]/10 px-2 py-1">
              <span className="text-[10px] font-black text-[#22C55E]">✓ Tax Deductible?</span>
            </div>
          )}
          {expenseType === "personal" && (
            <div className="mb-2 text-[10px] text-neutral-500">Personal expense - not deductible</div>
          )}

          {/* Scan Receipt Card */}
          <div className="mb-4 rounded-xl border border-[#2a2a2a] bg-[#0e0e0e] p-3">
            <div className="text-[10px] font-black uppercase tracking-wider text-neutral-400 mb-2">📸 SCAN RECEIPT</div>
            <div className="text-[11px] text-neutral-400 mb-2">Sube foto del recibo - guardado en telefono + auto-llena campos</div>
            
            <div className="flex gap-2 mb-2">
              <input 
                type="file" 
                accept="image/*" 
                capture="environment"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-1 h-10 rounded-lg border border-[#2a2a2a] bg-black text-[11px] font-black text-white"
              >
                📷 Camera
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-1 h-10 rounded-lg border border-[#2a2a2a] bg-black text-[11px] font-black text-white"
              >
                🖼️ Gallery
              </button>
            </div>
            
            <div className="border-2 border-dashed border-[#2a2a2a] rounded-lg h-16 flex items-center justify-center text-[11px] text-neutral-500">
              Drag & drop image here
            </div>
          </div>
        </div>
      )}

      {/* Scanning overlay */}
      {scanning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="rounded-2xl bg-[#0e0e0e] p-6 text-center max-w-[300px]">
            <div className="mb-3 text-[14px] font-bold">Escaneando... OCR leyendo fecha, monto, tipo, categoria...</div>
            <div className="animate-pulse text-[32px]">🔍</div>
          </div>
        </div>
      )}

      {/* Scan Result - auto-filled fields with green border */}
      {scanResult && (
        <div className="mb-4 rounded-xl border-2 border-[#22C55E] bg-[#0e0e0e] p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">SCAN RESULT</span>
            <span className="text-[9px] font-black bg-[#FFD700] text-black px-1.5 py-0.5 rounded">Auto-filled from receipt</span>
          </div>
          <div className="space-y-2">
            <div>
              <div className="text-[10px] font-black text-neutral-400">Expense Name</div>
              <input type="text" value={scanResult.vendor} onChange={(e) => setScanResult({...scanResult, vendor: e.target.value})} className="h-10 w-full rounded-lg border border-[#2a2a2a] bg-black px-2 text-[13px] text-white" />
            </div>
            <div>
              <div className="text-[10px] font-black text-neutral-400">Amount</div>
              <input type="number" value={scanResult.amount} onChange={(e) => setScanResult({...scanResult, amount: parseFloat(e.target.value) || 0})} className="h-10 w-full rounded-lg border border-[#2a2a2a] bg-black px-2 font-mono text-[14px] text-[#22C55E]" />
            </div>
            <div>
              <div className="text-[10px] font-black text-neutral-400">Category</div>
              <select value={scanResult.category} onChange={(e) => setScanResult({...scanResult, category: e.target.value})} className="h-10 w-full rounded-lg border border-[#2a2a2a] bg-black px-2 text-[13px] text-white">
                {EXPENSE_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div>
              <div className="text-[10px] font-black text-neutral-400">Due Date</div>
              <input type="date" value={scanResult.dueDate} onChange={(e) => setScanResult({...scanResult, dueDate: e.target.value})} className="h-10 w-full rounded-lg border border-[#2a2a2a] bg-black px-2 text-[13px] text-white" />
            </div>
            <button
              onClick={saveExpense}
              className="h-12 w-full rounded-lg bg-[#22C55E] text-[13px] font-black mt-2"
            >
                )}

          {!scanResult && !showRegularForm && (
            <button
              onClick={() => setShowRegularForm(true)}
              className="mb-4 h-12 w-full rounded-xl text-[14px] font-black text-black"
              style={{ background: "linear-gradient(90deg,#FFD700,#d9b64f)" }}
            >
              + Add Regular Expense
            </button>
          )}

          {/* Regular Expense Form */}
          {showRegularForm && !scanResult && (
            <div className="mb-4 rounded-xl border-2 border-[#FFD700] bg-[#0e0e0e] p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">REGULAR EXPENSE</span>
                <button onClick={() => setShowRegularForm(false)} className="text-neutral-500">✕</button>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="text-[10px] font-black text-neutral-400">Expense Name</div>
                  <input type="text" value={regVendor} onChange={(e) => setRegVendor(e.target.value)} placeholder="e.g., Insurance, Car Wash" className="h-12 w-full rounded-lg border border-[#2a2a2a] bg-black px-3 text-[14px] text-white" />
                </div>
                <div>
                  <div className="text-[10px] font-black text-neutral-400">Amount</div>
                  <input type="number" value={regAmount} onChange={(e) => setRegAmount(e.target.value)} placeholder="$0.00" className="h-12 w-full rounded-lg border border-[#2a2a2a] bg-black px-3 font-mono text-[22px] font-black text-[#FFD700]" />
                </div>
                <div>
                  <div className="text-[10px] font-black text-neutral-400">Category</div>
                  <select value={regCategory} onChange={(e) => setRegCategory(e.target.value)} className="h-12 w-full rounded-lg border border-[#2a2a2a] bg-black px-3 text-[14px] text-white">
                    {EXPENSE_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div>
                  <div className="text-[10px] font-black text-neutral-400">Frequency</div>
                  <select value={regFrequency} onChange={(e) => setRegFrequency(e.target.value as any)} className="h-12 w-full rounded-lg border border-[#2a2a2a] bg-black px-3 text-[14px] text-white">
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="one-time">One Time</option>
                  </select>
                </div>
                <div>
                  <div className="text-[10px] font-black text-neutral-400">Due Date</div>
                  <input type="date" value={regDueDate} onChange={(e) => setRegDueDate(e.target.value)} className="h-12 w-full rounded-lg border border-[#2a2a2a] bg-black px-3 text-[14px] text-white" />
                </div>
                <button
                  onClick={saveRegularExpense}
                  className="h-14 w-full rounded-xl bg-[#FFD700] text-[14px] font-black"
                >
                  ✔️ SAVE REGULAR EXPENSE
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Expenses list with filters */}
      {activeTab === "expenses" && (
        <div className="px-4 pt-2">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-[10px] font-black text-neutral-400">FILTERS:</span>
            <button className="text-[11px] font-black text-[#FFD700]">ALL</button>
            <button className="text-[11px] font-black text-neutral-500">PERSONAL</button>
            <button className="text-[11px] font-black text-neutral-500">BUSINESS</button>
          </div>
          
          <div className="space-y-2">
            {expenses.map((expense) => (
              <div key={expense.id} className="flex items-center gap-3 rounded-xl border border-[#2a2a2a] bg-[#0e0e0e] p-2">
                {expense.thumbnailBase64 && (
                  <img src={expense.thumbnailBase64} alt={expense.vendor} className="h-10 w-10 rounded object-cover" />
                )}
                <div className="flex-1">
                  <div className="font-medium">{expense.vendor}</div>
                  <div className="text-[11px] text-neutral-400">{expense.category} · {expense.dueDate}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold">${expense.amount.toFixed(2)}</div>
                  <span className={`text-[9px] font-black ${expense.type === 'business' ? 'text-[#FFD700]' : 'text-neutral-500'}`}>
                    {expense.type.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
            {expenses.length === 0 && (
              <div className="py-4 text-center text-[12px] text-neutral-500">No expenses recorded yet</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


