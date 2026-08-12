import React, { useState } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, useAnimation } from "framer-motion";
import "./_group.css";

const goldGrad = { background: "linear-gradient(90deg, #f6dd8c, #d9b64f)" };

interface Transaction {
  id: string;
  date: string;
  desc: string;
  amount: number;
  type: "credit" | "debit";
  category: "business" | "personal" | "unclear";
  matched?: boolean;
  matchedTo?: string;
}

const INITIAL_TRANSACTIONS: Transaction[] = [
  { id: "1", date: "Aug 11", desc: "UBER DEPOSIT", amount: 623.40, type: "credit", category: "business", matched: true, matchedTo: "7 viajes · Lun 11" },
  { id: "2", date: "Aug 10", desc: "LYFT WEEKLY PAY", amount: 241.80, type: "credit", category: "business", matched: true, matchedTo: "3 viajes · Dom-Vie" },
  { id: "3", date: "Aug 10", desc: "BP #4521 QUEENS", amount: 55.24, type: "debit", category: "business", matched: true, matchedTo: "Gasolina · recibo ✓" },
  { id: "4", date: "Aug 09", desc: "AMAZON PRIME", amount: 14.99, type: "debit", category: "personal", matched: false },
  { id: "5", date: "Aug 09", desc: "AUTOZONE #847", amount: 38.75, type: "debit", category: "business", matched: false },
  { id: "6", date: "Aug 08", desc: "MCDONALD'S #3421", amount: 12.40, type: "debit", category: "personal", matched: false },
  { id: "7", date: "Aug 07", desc: "ECORIDE PAYMENT", amount: 189.50, type: "credit", category: "business", matched: true, matchedTo: "4 viajes · Jue 7" },
  { id: "8", date: "Aug 07", desc: "SUNPASS TOLL", amount: 8.25, type: "debit", category: "business", matched: true, matchedTo: "Peaje · entrada manual" },
  { id: "9", date: "Aug 06", desc: "NETFLIX", amount: 15.49, type: "debit", category: "personal", matched: false },
  { id: "10", date: "Aug 06", desc: "SHELL GAS JAMAICA", amount: 62.10, type: "debit", category: "unclear", matched: false },
];

function CategoryBadge({ cat }: { cat: Transaction["category"] }) {
  const styles = {
    business: "bg-[#4ade80]/10 border-[#4ade80]/30 text-[#4ade80]",
    personal:  "bg-[#f97316]/10 border-[#f97316]/30 text-[#f97316]",
    unclear:   "bg-[#eab308]/10 border-[#eab308]/30 text-[#eab308]",
  };
  const labels = { business: "Negocio", personal: "Personal", unclear: "¿?" };
  return (
    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${styles[cat]}`}>
      {labels[cat]}
    </span>
  );
}

function SwipeItem({ tx, onProcess }: { tx: Transaction; onProcess: (id: string, cat: 'business'|'personal') => void }) {
  const x = useMotionValue(0);
  const controls = useAnimation();
  
  const boxShadow = useTransform(
    x,
    [-100, 0, 100],
    [
      "15px 0 30px -10px rgba(249,115,22,0.6)",
      "0px 0 0px 0px rgba(0,0,0,0)",
      "-15px 0 30px -10px rgba(74,222,128,0.6)"
    ]
  );
  
  const leftOpacity = useTransform(x, [0, 60], [0, 1]);
  const rightOpacity = useTransform(x, [-60, 0], [1, 0]);
  const leftScale = useTransform(x, [0, 60], [0.8, 1]);
  const rightScale = useTransform(x, [-60, 0], [1, 0.8]);

  const handleDragEnd = async (e: any, info: any) => {
    if (info.offset.x > 80) {
      await controls.start({ x: 400, transition: { duration: 0.25, ease: "easeOut" } });
      onProcess(tx.id, 'business');
    } else if (info.offset.x < -80) {
      await controls.start({ x: -400, transition: { duration: 0.25, ease: "easeOut" } });
      onProcess(tx.id, 'personal');
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0, transition: { duration: 0.2 } }}
      className="relative border-b border-[#141414] bg-[#080808] overflow-hidden"
    >
      {/* Left Background (Green - Negocio) */}
      <div className="absolute inset-0 flex items-center justify-start px-6 bg-gradient-to-r from-[#4ade80]/20 to-transparent">
        <motion.div style={{ opacity: leftOpacity, scale: leftScale }} className="flex items-center gap-2 text-[#4ade80] font-bold text-[13px]">
          <span className="text-[18px]">✓</span> Negocio
        </motion.div>
      </div>

      {/* Right Background (Orange - Personal) */}
      <div className="absolute inset-0 flex items-center justify-end px-6 bg-gradient-to-l from-[#f97316]/20 to-transparent">
        <motion.div style={{ opacity: rightOpacity, scale: rightScale }} className="flex items-center gap-2 text-[#f97316] font-bold text-[13px]">
          Personal <span className="text-[18px]">→</span>
        </motion.div>
      </div>

      {/* Draggable Card */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.7}
        onDragEnd={handleDragEnd}
        animate={controls}
        style={{ x, boxShadow }}
        whileTap={{ cursor: "grabbing" }}
        className="relative z-10 px-4 py-4 flex items-center gap-3 bg-[#101010] cursor-grab touch-pan-y"
      >
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${tx.matched ? "bg-[#4ade80]" : "bg-[#eab308]"}`} />
        <div className="flex-1 min-w-0 pointer-events-none">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-[13px] font-medium text-white truncate">{tx.desc}</p>
            <CategoryBadge cat={tx.category} />
          </div>
          <p className="text-[10px] text-neutral-500">
            {tx.date}
            {tx.matched && tx.matchedTo && (
              <span className="text-[#4ade80]"> · {tx.matchedTo}</span>
            )}
            {!tx.matched && (
              <span className="text-[#eab308]"> · sin reconciliar</span>
            )}
          </p>
        </div>
        <p className={`font-['JetBrains_Mono',monospace] text-[14px] font-bold flex-shrink-0 pointer-events-none ${
          tx.type === "credit" ? "text-[#4ade80]" : "text-neutral-300"
        }`}>
          {tx.type === "credit" ? "+" : "-"}${tx.amount.toFixed(2)}
        </p>
      </motion.div>
    </motion.div>
  );
}

export function BankReconcileSwipe() {
  const [activeTxs, setActiveTxs] = useState(INITIAL_TRANSACTIONS);
  const [undoStack, setUndoStack] = useState<{tx: Transaction; swipedCategory: 'business'|'personal'; id: string}[]>([]);

  const handleProcess = (id: string, swipedCategory: 'business' | 'personal') => {
    const tx = activeTxs.find((t) => t.id === id);
    if (!tx) return;

    setActiveTxs((prev) => prev.filter((t) => t.id !== id));
    setUndoStack((prev) => [{ tx, swipedCategory, id: Date.now().toString() }, ...prev]);
  };

  const handleUndo = (undoId: string) => {
    const item = undoStack.find((u) => u.id === undoId);
    if (!item) return;

    setUndoStack((prev) => prev.filter((u) => u.id !== undoId));
    setActiveTxs((prev) => {
      const newTxs = [item.tx, ...prev];
      return newTxs.sort((a, b) => {
        const idxA = INITIAL_TRANSACTIONS.findIndex((t) => t.id === a.id);
        const idxB = INITIAL_TRANSACTIONS.findIndex((t) => t.id === b.id);
        return idxA - idxB;
      });
    });
  };

  const allTxs = [...activeTxs, ...undoStack.map(u => ({ ...u.tx, category: u.swipedCategory, matched: true }))];
  const matchedCount = allTxs.filter((t) => t.matched).length;
  const unmatchedCount = allTxs.filter((t) => !t.matched).length;
  const bizIncome = allTxs.filter((t) => t.type === "credit" && t.category === "business").reduce((s, t) => s + t.amount, 0);
  const bizExpenses = allTxs.filter((t) => t.type === "debit" && t.category === "business").reduce((s, t) => s + t.amount, 0);

  return (
    <div className="min-h-screen w-full bg-black text-white overflow-y-auto" style={{ fontFamily: "Inter, sans-serif" }}>
      <div className="max-w-[390px] mx-auto bg-black min-h-screen relative">

        {/* Header */}
        <div className="px-4 pt-12 pb-3 flex items-center justify-between border-b border-[#1a1a1a]">
          <div>
            <p className="text-[10px] tracking-[0.3em] text-neutral-500 font-semibold uppercase">AI · Reconciliación</p>
            <p className="font-['Cinzel'] text-[14px] tracking-[0.05em]" style={goldGrad as any}>ESTADO DE BANCO</p>
          </div>
          <div className="bg-[#141414] border border-[#222] rounded-full w-8 h-8 flex items-center justify-center text-[#f6dd8c] text-[11px] font-bold">M</div>
        </div>

        <div className="px-3 py-3 space-y-3">
          
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-[#101010] border border-[#1e1e1e] rounded-2xl p-3">
              <p className="text-[7px] text-neutral-600 uppercase tracking-widest mb-1">Reconciliadas</p>
              <p className="font-['JetBrains_Mono',monospace] text-[22px] font-bold text-[#4ade80]">{matchedCount}/{INITIAL_TRANSACTIONS.length}</p>
              <div className="mt-1.5 h-1 bg-[#1e1e1e] rounded-full overflow-hidden">
                <div className="h-full bg-[#4ade80] rounded-full" style={{ width: `${(matchedCount/INITIAL_TRANSACTIONS.length)*100}%`, transition: 'width 0.3s ease' }} />
              </div>
            </div>
            <div className="bg-[#101010] border border-[#1e1e1e] rounded-2xl p-3">
              <p className="text-[7px] text-neutral-600 uppercase tracking-widest mb-1">Sin reconciliar</p>
              <p className="font-['JetBrains_Mono',monospace] text-[22px] font-bold text-[#eab308]">{unmatchedCount}</p>
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

          {/* Swipe Instruction */}
          <div className="pt-2 pb-1 flex justify-center items-center gap-4 text-[10px] font-bold tracking-widest uppercase opacity-70">
            <span className="text-[#f97316]">← Personal</span>
            <span className="text-neutral-500">Desliza</span>
            <span className="text-[#4ade80]">Negocio →</span>
          </div>

          {/* Transaction list */}
          <div className="bg-[#101010] border border-[#1e1e1e] rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-4 pt-4 mb-2">
              <p className="text-[9px] tracking-[0.22em] text-neutral-500 font-bold uppercase">PENDIENTES</p>
              <span className="text-[10px] text-neutral-500">{activeTxs.length} restantes</span>
            </div>
            <div className="divide-y divide-[#141414]">
              <AnimatePresence>
                {activeTxs.map((t) => (
                  <SwipeItem key={t.id} tx={t} onProcess={handleProcess} />
                ))}
                {activeTxs.length === 0 && (
                  <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    className="p-8 text-center text-neutral-500 text-[12px]"
                  >
                    ¡Todo reconciliado! 🎉
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="pb-40" />
        </div>

        {/* Undo Stack */}
        <AnimatePresence>
          {undoStack.length > 0 && (
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-6 px-4 pointer-events-none"
            >
              <div className="w-full max-w-[390px] bg-[#1a1a1a]/95 backdrop-blur-xl border border-[#333] rounded-2xl overflow-hidden shadow-[0_-10px_40px_rgba(0,0,0,0.5)] pointer-events-auto">
                <div className="p-3 bg-[#222]/80 border-b border-[#333] flex justify-between items-center">
                  <p className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold">Historial Reciente</p>
                  <span className="text-[10px] text-[#f6dd8c] bg-[#f6dd8c]/10 px-2 py-0.5 rounded-full">{undoStack.length} procesadas</span>
                </div>
                <div className="max-h-[160px] overflow-y-auto p-2 space-y-1 scrollbar-hide">
                  <AnimatePresence>
                    {undoStack.map((item) => (
                      <motion.div 
                        key={item.id}
                        layout
                        initial={{ opacity: 0, x: -20, height: 0 }}
                        animate={{ opacity: 1, x: 0, height: 'auto' }}
                        exit={{ opacity: 0, scale: 0.9, height: 0 }}
                        className="flex items-center justify-between bg-[#111] p-2 rounded-xl border border-[#222]"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-1.5 h-8 rounded-full flex-shrink-0 ${item.swipedCategory === 'business' ? 'bg-[#4ade80]' : 'bg-[#f97316]'}`} />
                          <div className="min-w-0">
                            <p className="text-[11px] font-medium text-white truncate max-w-[140px]">{item.tx.desc}</p>
                            <p className="text-[9px] text-neutral-500">${item.tx.amount.toFixed(2)} • {item.swipedCategory === 'business' ? 'Negocio' : 'Personal'}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleUndo(item.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2a2a2a] text-[10px] text-white font-medium hover:bg-[#333] transition-colors flex-shrink-0"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>
                          Deshacer
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}

export default BankReconcileSwipe;
