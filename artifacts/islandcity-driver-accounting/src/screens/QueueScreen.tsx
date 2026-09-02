// ── Queue · editable income review (spec DOC FINAL) ─────────────────
import { useState } from "react";
import { fmt, platformLogo, platformTypeLabel, type EntryRecord } from "../lib/domain";

interface Props {
  entries: EntryRecord[];
  onEdit: (e: EntryRecord) => void;
  onDelete: (id: string) => void;
  onPost: (id: string) => void;
}

export default function QueueScreen({ entries, onEdit, onDelete, onPost }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const open = entries.filter((e) => e.status === "open");
  const totalGross = open.reduce((s, e) => s + e.grossIncome, 0);
  const totalNet = open.reduce((s, e) => s + e.netPayout, 0);

  return (
    <div className="space-y-3 pb-4">
      <div className="rounded-2xl border border-[#1a1a1a] bg-[#0e0e0e] p-4">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">QUEUE</span>
          <span className="rounded-full border border-[#FF8C0055] bg-[#FF8C0018] px-2 py-0.5 text-[10px] font-black text-[#FF8C00]">{open.length} open</span>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-black p-2">
            <div className="text-[8px] font-bold text-neutral-500">TOTAL GROSS Q</div>
            <div className="font-mono text-[15px] font-black text-[#FFD700]">{fmt(totalGross)}</div>
          </div>
          <div className="rounded-lg bg-black p-2">
            <div className="text-[8px] font-bold text-neutral-500">TOTAL NET Q</div>
            <div className="font-mono text-[15px] font-black text-[#00FF6A]">{fmt(totalNet)}</div>
          </div>
          <div className="rounded-lg bg-black p-2">
            <div className="text-[8px] font-bold text-neutral-500">COUNT OPEN</div>
            <div className="font-mono text-[15px] font-black text-white">{open.length}</div>
          </div>
        </div>
      </div>

      {open.length === 0 && (
        <div className="rounded-2xl border border-[#1a1a1a] bg-[#0e0e0e] py-10 text-center text-[13px] font-bold text-[#6f6f6f]">
          No trips in queue — graba tu primer viaje en Daily Entry
        </div>
      )}
      {open.map((e) => {
        const isOpen = expanded === e.id;
        return (
          <div key={e.id} className="rounded-2xl border border-[#1a1a1a] bg-[#0e0e0e] p-3">
            {/* compact row 2-3 lines spec */}
            <button onClick={() => setExpanded(isOpen ? null : e.id)} className="w-full text-left">
              <div className="flex items-center gap-2">
                {platformLogo(e.platform) ? (
                  <img src={platformLogo(e.platform)!} alt="" className="h-5 w-5 rounded object-contain" />
                ) : (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#332F1A] text-[9px] font-black text-[#FFD700]">{e.platform.slice(0,1)}</span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="truncate text-[13px] font-black text-white">{e.platform}</span>
                  {platformTypeLabel(e.platformType) && (
                    <span className={`ml-1.5 rounded-full border px-1.5 py-0.5 text-[8px] font-black ${platformTypeLabel(e.platformType) === "VOUCHER" ? "border-[#FF8C0055] bg-[#FF8C0018] text-[#FF8C00]" : "border-[#3B82F655] bg-[#3B82F618] text-[#3B82F6]"}`}>
                      {platformTypeLabel(e.platformType)}
                    </span>
                  )}
                </span>
                <div className="text-right">
                  <div className="font-mono text-[15px] font-black text-[#00FF6A]">{fmt(e.netPayout)}</div>
                  <div className="text-[9px] font-bold text-[#6f6f6f]">{e.datetime.slice(11,16)}</div>
                </div>
              </div>
              <div className="mt-1 flex items-center justify-between text-[10px] font-bold text-[#8a8a8a]">
                <span className="truncate">{e.pickup.address || "—"} → {e.dropoff.address || "—"}</span>
                <span className="ml-2 rounded-full border border-[#FF8C0055] bg-[#FF8C0018] px-1.5 py-0.5 text-[8px] font-black text-[#FF8C00]">OPEN</span>
              </div>
            </button>

            {/* expanded edit view */}
            {isOpen && (
              <div className="mt-3 space-y-2 border-t border-[#1a1a1a] pt-3">
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div><span className="text-neutral-500">Earnings:</span> <span className="font-mono font-bold" style={{color:"#1E3A8A"}}>{fmt(e.earnings)}</span></div>
                  <div><span className="text-neutral-500">Extra Cash:</span> <span className="font-mono font-bold" style={{color:"#16A34A"}}>{fmt(e.extraCash)}</span></div>
                  <div><span className="text-neutral-500">Tips:</span> <span className="font-mono font-bold" style={{color:"#CA8A04"}}>{fmt(e.tips)}</span></div>
                  <div><span className="text-neutral-500">Toll:</span> <span className="font-mono font-bold" style={{color:"#EA580C"}}>{fmt(e.toll)}</span></div>
                  <div><span className="text-neutral-500">Fee:</span> <span className="font-mono font-bold" style={{color:"#DC2626"}}>{fmt(e.platformFee)}</span></div>
                  <div><span className="text-neutral-500">Gross:</span> <span className="font-mono font-bold text-[#111827]">{fmt(e.grossIncome)}</span></div>
                </div>
                <div className="text-[11px]"><span className="text-neutral-500">Pickup:</span> <span className="text-white">{e.pickup.address || "—"}</span></div>
                <div className="text-[11px]"><span className="text-neutral-500">Dropoff:</span> <span className="text-white">{e.dropoff.address || "—"}</span></div>
                {e.notes && <div className="text-[11px]"><span className="text-neutral-500">Notes:</span> <span className="text-white">{e.notes}</span></div>}
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={() => onEdit(e)} className="h-10 rounded-lg bg-[#FFD700] text-[11px] font-black text-black">✏️ EDIT</button>
                  <button onClick={() => onDelete(e.id)} className="h-10 rounded-lg border border-[#f8717155] bg-[#f8717115] text-[11px] font-black text-[#f87171]">🗑 DELETE</button>
                  <button onClick={() => onPost(e.id)} className="h-10 rounded-lg bg-[#00FF6A] text-[11px] font-black text-black">✓ POST</button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}