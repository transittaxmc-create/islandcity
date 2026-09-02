// ── Ledger · Register All Expenses / Spend (spec E-ZPass panel) ─────
import { useEffect, useState } from "react";
import { fmt, type LedgerTx, type TollHit } from "../lib/domain";
import { BTN_DARK, CARD, LABEL, pillCls } from "../lib/ui";

interface Props {
  txs: LedgerTx[];
  tollLog: TollHit[];
  today: string;
  getPhoto: (key: string) => Promise<string | null>;
  onScanEzPass: (tx: LedgerTx, file: File) => void;
  onAddReceipt: (file: File) => void;
  onCloseDay: () => void;
}

function ReceiptThumb({ keyStr, getPhoto }: { keyStr: string; getPhoto: (k: string) => Promise<string | null> }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    getPhoto(keyStr).then((s) => alive && setSrc(s));
    return () => {
      alive = false;
    };
  }, [keyStr, getPhoto]);
  if (!src) return <span className="text-[14px]">📎</span>;
  return <img src={src} alt="receipt" className="h-8 w-8 rounded object-cover" />;
}

export default function LedgerScreen({ txs, tollLog, today, getPhoto, onScanEzPass, onAddReceipt, onCloseDay }: Props) {
  const pending = txs.filter((t) => t.type === "EZPASS_DAILY" && t.status === "POR_PAGAR");
  const settled = txs.filter((t) => t.status === "PAID" || t.status === "PAGADO");
  const totalSpend = settled.reduce((s, t) => s + t.amount, 0);
  const todayTollTotal = tollLog.filter((h) => h.date === today).reduce((s, h) => s + h.amount, 0);

  return (
    <div className="space-y-3 pb-4">
      <div className={CARD}>
        <div className="flex items-center justify-between">
          <span className={LABEL}>LEDGER · REGISTER ALL EXPENSES</span>
          <span className="font-mono text-[16px] font-black text-[#FF8C00]">{fmt(totalSpend)}</span>
        </div>
        <div className="mt-1 text-[9px] font-bold text-[#6f6f6f]">
          TOTAL SPEND = TODOS LOS PAID + PAGADO · REAL PROFIT = GRAND TOTAL − TOTAL SPEND
        </div>
        <label className="mt-2 block cursor-pointer">
          <span className={BTN_DARK + " flex items-center justify-center gap-1"}>📎 AGREGAR RECIBO</span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onAddReceipt(f);
              e.target.value = "";
            }}
          />
        </label>
        {todayTollTotal > 0 && !pending.some((p) => p.sourceDate === today) && (
          <button onClick={onCloseDay} className="mt-2 h-14 w-full rounded-xl bg-[#FF8C00] text-[12px] font-black text-black">
            🔒 CERRAR DÍA · GENERAR E-ZPASS POR PAGAR ({fmt(todayTollTotal)})
          </button>
        )}
      </div>
      <div className={CARD}>
        <div className={LABEL}>REGISTRO · TODAS LAS TRANSACCIONES</div>
        {settled.length === 0 && (
          <div className="mt-2 text-center text-[11px] font-bold text-[#6f6f6f]">Sin transacciones pagadas</div>
        )}
        <div className="mt-2 space-y-1.5">
          {settled.map((t) => (
            <div key={t.id} className="flex items-center gap-2 rounded-lg bg-black px-3 py-2">
              {t.type === "EZPASS_DAILY" ? <span className="text-[16px]">🛣️</span> : <span className="text-[16px]">🧾</span>}
              <div className="min-w-0 flex-1">
                <div className="text-[12px] font-black text-white">{t.title}</div>
                <div className="text-[9px] font-bold text-[#6f6f6f]">
                  {t.displayTime}
                  {t.notes ? ` · ${t.notes}` : ""}
                </div>
              </div>
              {t.photoKey && <ReceiptThumb keyStr={t.photoKey} getPhoto={getPhoto} />}
              <div className="font-mono text-[13px] font-black text-white">{fmt(t.amount)}</div>
              <span className={pillCls(t.status === "PAGADO" ? "green" : "gold")}>
                {t.status === "PAGADO" ? "PAGADO" : "PAID"}
              </span>
            </div>
          ))}
        </div>
        {settled.length > 0 && (
          <div className="mt-2 text-center text-[10px] font-black text-[#00FF6A]">
            All expenses settled • No pending items
            <div className="text-[9px] font-bold text-[#6f6f6f]">
              Settlement complete · {new Date().toLocaleDateString()}
            </div>
          </div>
        )}
      </div>

      {/* pending E-ZPass bottom panel — spec AC5/AC8 */}
      {pending.length > 0 ? (
        <div className="rounded-2xl border-2 border-[#FF8C00] bg-[#0A0A0A] p-4">
          <div className="flex items-center justify-between">
            <span className={pillCls("orange")}>⚠ POR PAGAR</span>
            <span className="text-[10px] font-black text-[#FF8C00]">ESPERANDO ESCANEO</span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-[18px]">🛣️</span>
            <div>
              <div className="text-[14px] font-black text-white">{pending[0].title}</div>
              <div className="text-[9px] font-bold text-[#6f6f6f]">
                {pending[0].sourceDate === today ? "Hoy · GPS tolls" : pending[0].displayTime}
              </div>
            </div>
            <div className="ml-auto font-mono text-[20px] font-black text-[#FF8C00]">{fmt(pending[0].amount)}</div>
          </div>
          <label className="mt-3 block cursor-pointer">
            <span className="flex h-14 w-full items-center justify-center rounded-xl bg-[#FF8C00] text-[12px] font-black text-black">
              📷 ESCANEAR RECIBO E-ZPASS
            </span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onScanEzPass(pending[0], f);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      ) : (
        todayTollTotal > 0 && (
          <div className="rounded-2xl border border-[#00FF6A44] bg-[#00FF6A0D] p-3 text-center text-[10px] font-black text-[#00FF6A]">
            ✓ Sin E-ZPass pendientes · {fmt(todayTollTotal)} detectados hoy listos para cerrar
          </div>
        )
      )}
    </div>
  );
}