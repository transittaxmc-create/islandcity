// ── Queue · income review (spec: review against official invoice) ───
import { fmt, platformDisplay, platformLogo, platformPills, tripDate, type Trip } from "../lib/domain";
import { BTN_DARK, CARD, LABEL } from "../lib/ui";

export interface QuickState {
  id: string;
  gross: string;
  tips: string;
  cashRec: string;
  tollReimb: string;
  comm: string;
}

interface Props {
  trips: Trip[];
  closedDays: Record<string, boolean>;
  quick: QuickState | null;
  setQuick: (q: QuickState | null) => void;
  onQuickSave: (id: string) => void;
  onFullEdit: (trip: Trip) => void;
  onDelete: (id: string) => void;
  onPost: (id: string) => void;
  pendingCount: number;
}

export default function QueueScreen({
  trips,
  closedDays,
  quick,
  setQuick,
  onQuickSave,
  onFullEdit,
  onDelete,
  onPost,
  pendingCount,
}: Props) {
  const sorted = [...trips].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="space-y-3 pb-4">
      <div className={CARD}>
        <div className="flex items-center justify-between">
          <span className={LABEL}>QUEUE</span>
          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${
            pendingCount ? "border-[#FF8C0055] bg-[#FF8C0018] text-[#FF8C00]" : "border-[#00FF6A55] bg-[#00FF6A18] text-[#00FF6A]"
          }`}>
            {pendingCount ? `${pendingCount} pendientes` : "TODO POSTEADO ✓"}
          </span>
        </div>
        <div className="mt-1 text-[10px] font-bold text-[#6f6f6f]">
          Revisa cada viaje contra la factura oficial · POST → Dashboard
        </div>
      </div>

      {sorted.length === 0 && (
        <div className={CARD + " py-10 text-center text-[13px] font-bold text-[#6f6f6f]"}>
          No trips yet — graba tu primer viaje en Daily Entry
        </div>
      )}
      {sorted.map((t) => {
        const closed = !!closedDays[tripDate(t)];
        const isEdit = quick?.id === t.id;
        const st =
          t.status === "posted"
            ? "border-[#00FF6A55] bg-[#00FF6A18] text-[#00FF6A]"
            : "border-[#FF8C0055] bg-[#FF8C0018] text-[#FF8C00]";
        return (
          <div key={t.id} className={CARD}>
            <div className="flex items-center gap-2">
              {platformLogo(t.platform) ? (
                <img src={platformLogo(t.platform)!} alt="" className="h-5 w-5 rounded object-contain" />
              ) : (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#332F1A] text-[9px] font-black text-[#FFD700]">
                  {t.platform.slice(0, 1)}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-black text-white">
                  {platformDisplay(t.platform)}
                  <span className="ml-1.5 font-mono text-[11px] text-[#8a8a8a]">{t.ref}</span>
                </div>
                <div className="text-[10px] font-bold text-[#6f6f6f]">
                  {t.displayTime}
                  {t.tripMiles > 0 ? ` · ${t.tripMiles.toFixed(1)} mi` : ""}
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-[18px] font-black text-[#00FF6A]">{fmt(t.net)}</div>
                <span className={`mt-0.5 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-black ${st}`}>
                  {t.status === "posted" ? "POSTED" : "PENDING"}
                </span>
              </div>
            </div>

            <div className="mt-1.5 text-[10px] font-bold text-[#8a8a8a]">
              {t.origin.text ? `📍 ${t.origin.text}` : "—"} {t.destination.text ? `→ ${t.destination.text}` : ""}
              {t.notes ? <span className="ml-2 text-[#6f6f6f]">📝 {t.notes}</span> : null}
            </div>

            {isEdit ? (
              <div className="mt-2 rounded-xl border border-[#FFD70033] bg-black p-2">
                <div className="grid grid-cols-2 gap-1.5">
                  {(
                    [
                      ["gross", "GROSS"],
                      ["tips", "TIPS"],
                      ["cashRec", "CASH"],
                      ["tollReimb", "TOLL R."],
                      ["comm", "COMM"],
                    ] as const
                  ).map(([k, lbl]) => (
                    <div key={k}>
                      <div className="text-[8px] font-black text-[#6f6f6f]">{lbl}</div>
                      <input
                        type="number"
                        step="0.01"
                        value={quick[k]}
                        onChange={(e) => setQuick(quick ? { ...quick, [k]: e.target.value } : quick)}
                        className="w-full rounded-md border border-[#2a2a2a] bg-black px-2 py-1.5 font-mono text-[13px] text-white outline-none"
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                  <button onClick={() => setQuick(null)} className="h-10 rounded-lg border border-[#2a2a2a] text-[11px] font-black text-[#8a8a8a]">
                    CANCEL
                  </button>
                  <button onClick={() => onQuickSave(t.id)} className="h-10 rounded-lg bg-[#FFD700] text-[11px] font-black text-black">
                    SAVE
                  </button>
                </div>
              </div>
            ) : (
              !closed && (
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() =>
                      setQuick({ id: t.id, gross: String(t.gross), tips: String(t.tips), cashRec: String(t.cashRec), tollReimb: String(t.tollReimb), comm: String(t.comm) })
                    }
                    className={BTN_DARK.replace("h-14", "h-10")}
                  >
                    ⚡ QUICK
                  </button>
                  <button onClick={() => onFullEdit(t)} className={BTN_DARK.replace("h-14", "h-10")}>
                    ✏️ FULL EDIT
                  </button>
                  <button
                    onClick={() => onDelete(t.id)}
                    className="h-10 rounded-lg border border-[#f8717155] bg-[#f8717115] text-[11px] font-black text-[#f87171]"
                  >
                    🗑 DELETE
                  </button>
                  <button
                    onClick={() => onPost(t.id)}
                    className="h-10 rounded-lg bg-[#00FF6A] text-[11px] font-black text-black disabled:opacity-40"
                  >
                    ✓ POST
                  </button>
                </div>
              )
            )}
            {closed && <div className="mt-2 text-center text-[9px] font-black text-[#FF8C00]">🔒 Día cerrado</div>}
          </div>
        );
      })}
    </div>
  );
}