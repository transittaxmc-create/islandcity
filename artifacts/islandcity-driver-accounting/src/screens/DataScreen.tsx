// ── DATA · backup / restore / legacy import + storage stats ───────────
// Layout: cards #0e0e0e / border #1a1a1a · gold #FFD700 · font-mono-jet numbers
import { useMemo, useRef } from "react";
import type { EntryRecord } from "../lib/domain";
import type { ReceiptRecord } from "../lib/receipts";
import type { EzpTransaction } from "../lib/tolls";

interface Props {
  entries: EntryRecord[];
  expenses: ReceiptRecord[];
  transactions: EzpTransaction[];
  exportBackup: () => void;
  importFullBackup: (file: File) => void;
  importLegacy: (file: File) => void;
}

/** Bytes used by every ic_ / ic- key in localStorage (UTF-16 approximation). */
function storageBytes(): { bytes: number; keys: number } {
  let bytes = 0;
  let keys = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith("ic_") || k.startsWith("ic-"))) {
        bytes += (k.length + (localStorage.getItem(k)?.length ?? 0)) * 2;
        keys++;
      }
    }
  } catch { /* storage blocked */ }
  return { bytes, keys };
}

function humanBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

export default function DataScreen({ entries, expenses, transactions, exportBackup, importFullBackup, importLegacy }: Props) {
  const fullInputRef = useRef<HTMLInputElement | null>(null);
  const legacyInputRef = useRef<HTMLInputElement | null>(null);

  const S = useMemo(() => {
    const { bytes, keys } = storageBytes();
    const open = entries.filter((e) => e.status === "open").length;
    const posted = entries.filter((e) => e.status === "posted").length;
    const dates = entries.map((e) => new Date(e.datetime).getTime()).filter((t) => !isNaN(t)).sort((a, b) => a - b);
    return {
      bytes, keys, open, posted,
      first: dates.length ? new Date(dates[0]) : null,
      last: dates.length ? new Date(dates[dates.length - 1]) : null,
      quotaPct: Math.min((bytes / (5 * 1024 * 1024)) * 100, 100), // 5 MB typical quota
    };
  }, [entries]);

  const stat = (label: string, value: string, color: string) => (
    <div className="rounded-xl border p-3" style={{ background: "#080808", borderColor: `${color}22` }}>
      <p className="text-[9px] font-black uppercase tracking-[0.14em] text-neutral-400">{label}</p>
      <p className="mt-1 font-mono-jet text-[15px] font-black" style={{ color }}>{value}</p>
    </div>
  );

  return (
    <div className="space-y-3 pb-4">
      {/* ═══ HEADER ═══ */}
      <div className="rounded-2xl border border-[#1a1a1a] bg-[#0e0e0e] p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-400">DATA</p>
            <p className="mt-0.5 text-[9px] text-neutral-500">Backup · Restore · Legacy import</p>
          </div>
          <span className="text-[20px]">📦</span>
        </div>
      </div>

      {/* ═══ INVENTARIO ═══ */}
      <div className="grid grid-cols-3 gap-2">
        {stat("TRIPS", String(entries.length), entries.length > 0 ? "#f6dd8c" : "#374151")}
        {stat("OPEN", String(S.open), S.open > 0 ? "#FFD700" : "#374151")}
        {stat("POSTED", String(S.posted), S.posted > 0 ? "#4ade80" : "#374151")}
        {stat("EXPENSES", String(expenses.length), expenses.length > 0 ? "#fb923c" : "#374151")}
        {stat("E-ZPASS TX", String(transactions.length), transactions.length > 0 ? "#f6dd8c" : "#374151")}
        {stat("KEYS", String(S.keys), S.keys > 0 ? "#9ca3af" : "#374151")}
      </div>

      {/* ═══ STORAGE ═══ */}
      <div className="rounded-2xl border border-[#1a1a1a] bg-[#0e0e0e] p-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-400">LOCAL STORAGE</p>
            <p className="mt-0.5 text-[9px] text-neutral-500">
              {S.first && S.last
                ? `${S.first.toLocaleDateString("en-US")} → ${S.last.toLocaleDateString("en-US")}`
                : "Sin viajes registrados"}
            </p>
          </div>
          <p className="font-mono-jet text-[20px] font-black text-[#f6dd8c]">{humanBytes(S.bytes)}</p>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[#1a1a1a]">
          <div
            className="h-full rounded-full"
            style={{ width: `${Math.max(S.quotaPct, 1)}%`, background: S.quotaPct > 80 ? "#f87171" : "linear-gradient(90deg,#FFD700,#d9b64f)" }}
          />
        </div>
        <p className="mt-1.5 text-[9px] text-neutral-500">{S.quotaPct.toFixed(1)}% de ~5 MB de cuota del navegador</p>
      </div>

      {/* ═══ BACKUP / RESTORE ═══ */}
      <div className="rounded-2xl border border-[#1a1a1a] bg-[#0e0e0e] p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-400">BACKUP / RESTORE</p>
        <div className="mt-3 flex gap-2">
          <button onClick={exportBackup} className="h-12 flex-1 rounded-xl bg-[#FFD700] text-[11px] font-black text-black">
            💾 EXPORT BACKUP
          </button>
          <button onClick={() => fullInputRef.current?.click()} className="h-12 flex-1 rounded-xl border border-[#FFD70055] bg-[#141414] text-[11px] font-black text-[#FFD700]">
            📥 IMPORT BACKUP
          </button>
        </div>
        <input
          ref={fullInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) importFullBackup(f); e.target.value = ""; }}
        />
        <p className="mt-2.5 text-center text-[9px] leading-relaxed text-neutral-500">
          EXPORT guarda TODOS tus datos en un .json · IMPORT en el otro dispositivo los restaura (reemplaza) y recarga
        </p>
      </div>

      {/* ═══ LEGACY IMPORT ═══ */}
      <div className="rounded-2xl border border-[#1a1a1a] bg-[#0e0e0e] p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-400">LEGACY IMPORT · EI PROGRAM</p>
        <button
          onClick={() => legacyInputRef.current?.click()}
          className="mt-3 h-12 w-full rounded-xl border border-[#2a2a2a] bg-[#141414] text-[11px] font-black text-neutral-300"
        >
          🗂 SELECCIONAR BACKUP LEGACY (.json)
        </button>
        <input
          ref={legacyInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) importLegacy(f); e.target.value = ""; }}
        />
        <p className="mt-2.5 text-center text-[9px] leading-relaxed text-neutral-500">
          Fusiona (merge por id) viajes, recibos y transacciones del EI Program antiguo — no borra lo que ya tienes
        </p>
      </div>
    </div>
  );
}
