import { fmt, platformLogo, type EntryRecord } from "../lib/domain";

interface Props {
  entries: EntryRecord[];
}

export default function TransactionLedgerScreen({ entries }: Props) {
  const ledgerEntries = entries.filter((entry) => entry.status === "reconciled" || entry.status === "posted");
  const total = ledgerEntries.reduce((sum, entry) => sum + entry.netPayout, 0);

  return (
    <div className="space-y-3 pb-4">
      <div className="rounded-2xl border border-[#1a1a1a] bg-[#0e0e0e] p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-neutral-400">TRANSACTION LEDGER</div>
            <div className="mt-1 text-[11px] text-neutral-500">Solo transacciones reconciliadas</div>
          </div>
          <div className="font-mono text-[18px] font-black text-[#00FF6A]">{fmt(total)}</div>
        </div>
      </div>

      {ledgerEntries.length === 0 ? (
        <div className="rounded-2xl border border-[#1a1a1a] bg-[#0e0e0e] py-10 text-center text-[12px] font-bold text-neutral-500">
          No hay transacciones reconciliadas todavía.
        </div>
      ) : ledgerEntries.map((entry) => (
        <div key={entry.id} className="rounded-2xl border border-[#1a1a1a] bg-[#0e0e0e] p-3">
          <div className="flex items-center gap-2">
            {platformLogo(entry.platform) && <img src={platformLogo(entry.platform)!} alt="" className="h-5 w-5 rounded object-contain" />}
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-black text-white">{entry.platform} · Trip {entry.id.slice(-6)}</div>
              <div className="text-[10px] text-neutral-500">{new Date(entry.datetime).toLocaleString()}</div>
            </div>
            <div className="text-right">
              <div className="font-mono text-[15px] font-black text-[#00FF6A]">{fmt(entry.netPayout)}</div>
              <div className="text-[9px] font-black uppercase text-[#60A5FA]">{entry.status === "posted" ? "LEDGER" : "RECONCILIADA"}</div>
            </div>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] text-neutral-400">
            <div className="truncate">{entry.pickup.icon} {entry.pickup.businessName || entry.pickup.type || "Pickup"} · {entry.pickup.city || "-"}</div>
            <div className="truncate">{entry.dropoff.icon} {entry.dropoff.businessName || entry.dropoff.type || "Dropoff"} · {entry.dropoff.city || "-"}</div>
          </div>
          {entry.reconciliation?.paymentReference && <div className="mt-2 text-[10px] text-neutral-500">Payment: {entry.reconciliation.paymentReference}</div>}
        </div>
      ))}
    </div>
  );
}
