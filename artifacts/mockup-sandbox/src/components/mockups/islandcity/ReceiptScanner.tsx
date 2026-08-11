import "./_group.css";
import { useState } from "react";

// ── AI Receipt Scanner ───────────────────────────────────────────────────────

const goldGrad = { background: "linear-gradient(90deg, #f6dd8c, #d9b64f)" };

type ScanState = "idle" | "scanning" | "done";

const CATEGORIES = ["Gasolina", "Seguro", "Peaje", "Car Wash", "Reparación", "Teléfono", "Comida", "Otro"];
const PLATFORMS  = ["Uber", "Lyft", "EcoRide", "Empower", "Street Hail", "Otro"];

export function ReceiptScanner() {
  const [state, setState] = useState<ScanState>("done");

  return (
    <div className="min-h-screen w-full bg-black text-white overflow-y-auto" style={{ fontFamily: "Inter, sans-serif" }}>
      <div className="max-w-[390px] mx-auto bg-black min-h-screen">

        {/* Header */}
        <div className="px-4 pt-12 pb-3 flex items-center justify-between border-b border-[#1a1a1a]">
          <div>
            <p className="text-[10px] tracking-[0.3em] text-neutral-500 font-semibold uppercase">AI · Gemini Vision</p>
            <p className="font-['Cinzel'] text-[14px] tracking-[0.05em]" style={goldGrad as any}>ESCANEAR RECIBO</p>
          </div>
          <div className="bg-[#141414] border border-[#222] rounded-full w-8 h-8 flex items-center justify-center text-[#f6dd8c] text-[11px] font-bold">M</div>
        </div>

        <div className="px-3 py-3 space-y-3">

          {/* ── Camera / Receipt preview ── */}
          <div className="bg-[#101010] border border-[#1e1e1e] rounded-2xl overflow-hidden">
            {state === "done" ? (
              /* Scanned receipt preview */
              <div className="relative">
                {/* Receipt mockup */}
                <div className="bg-[#f5f5f0] text-black mx-4 my-4 rounded-xl p-4 text-center shadow-2xl"
                  style={{ fontFamily: "monospace", border: "1px dashed #ccc" }}>
                  <p className="text-[10px] font-bold mb-1">BP GAS STATION</p>
                  <p className="text-[8px] text-gray-500">4521 Queens Blvd · Woodside NY</p>
                  <p className="text-[8px] text-gray-400 mb-2">08/11/2026  14:32</p>
                  <div className="border-t border-dashed border-gray-300 pt-2 mb-2">
                    <div className="flex justify-between text-[9px]">
                      <span>Regular 87</span><span>$3.89/gal</span>
                    </div>
                    <div className="flex justify-between text-[9px]">
                      <span>14.2 gal</span><span>$55.24</span>
                    </div>
                  </div>
                  <div className="border-t border-gray-400 pt-1">
                    <div className="flex justify-between text-[11px] font-bold">
                      <span>TOTAL</span><span>$55.24</span>
                    </div>
                  </div>
                  <p className="text-[7px] text-gray-400 mt-2">CREDIT CARD ····1247</p>
                </div>
                {/* AI badge */}
                <div className="absolute top-5 right-5 bg-[#3b82f6]/20 border border-[#3b82f6]/40 rounded-full px-2 py-1 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#3b82f6] animate-pulse"/>
                  <span className="text-[8px] text-[#3b82f6] font-bold">Gemini leyó</span>
                </div>
              </div>
            ) : (
              /* Camera placeholder */
              <div className="h-[200px] bg-[#0a0a0a] flex flex-col items-center justify-center gap-3 mx-3 my-3 rounded-xl border-2 border-dashed border-[#2a2a2a]">
                <div className="w-16 h-16 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-[28px]">📷</div>
                <p className="text-[11px] text-neutral-500">Toma foto del recibo</p>
                <p className="text-[9px] text-neutral-700">o toca para subir imagen</p>
              </div>
            )}

            {/* Camera / Scan buttons */}
            {state !== "done" && (
              <div className="px-4 pb-4 flex gap-2">
                <button className="flex-1 h-11 rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] text-[11px] text-neutral-400 flex items-center justify-center gap-2"
                  onClick={() => setState("scanning")}>
                  📁 Subir foto
                </button>
                <button className="flex-1 h-11 rounded-xl text-black text-[11px] font-bold flex items-center justify-center gap-2"
                  style={goldGrad} onClick={() => setState("scanning")}>
                  📷 Cámara
                </button>
              </div>
            )}
          </div>

          {/* ── AI reading progress / result ── */}
          {state === "scanning" && (
            <div className="bg-[#0a0a0a] border border-[#3b82f6]/30 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#3b82f6]/10 flex items-center justify-center text-[20px] animate-pulse">🤖</div>
              <div>
                <p className="text-[12px] font-semibold text-[#3b82f6]">Gemini leyendo recibo…</p>
                <p className="text-[9px] text-neutral-500">Extrayendo datos automáticamente</p>
              </div>
            </div>
          )}

          {/* ── Extracted fields ── */}
          {state === "done" && (
            <>
              {/* AI success banner */}
              <div className="bg-[#0a1a0a] border border-[#4ade80]/20 rounded-2xl p-3 flex items-center gap-3">
                <span className="text-[18px]">✅</span>
                <div>
                  <p className="text-[11px] font-semibold text-[#4ade80]">Gemini extrajo los datos</p>
                  <p className="text-[9px] text-neutral-500">Revisa y confirma antes de guardar</p>
                </div>
              </div>

              {/* Populated form */}
              <div className="bg-[#101010] border border-[#1e1e1e] rounded-2xl p-4 space-y-3">
                <p className="text-[9px] tracking-[0.22em] text-neutral-500 font-bold uppercase">DATOS DEL RECIBO</p>

                {/* Vendor */}
                <div>
                  <p className="text-[8px] text-neutral-600 uppercase tracking-widest mb-1">Negocio</p>
                  <div className="bg-[#4ade80]/5 border border-[#4ade80]/20 rounded-xl px-3 py-2.5 flex items-center justify-between">
                    <p className="text-[13px] font-semibold text-white">BP Gas Station</p>
                    <span className="text-[8px] text-[#4ade80]">✓ AI</span>
                  </div>
                </div>

                {/* Amount */}
                <div>
                  <p className="text-[8px] text-neutral-600 uppercase tracking-widest mb-1">Monto total</p>
                  <div className="bg-[#4ade80]/5 border border-[#4ade80]/20 rounded-xl px-3 py-2.5 flex items-center justify-between">
                    <p className="font-['JetBrains_Mono',monospace] text-[18px] font-bold text-[#f6dd8c]">$55.24</p>
                    <span className="text-[8px] text-[#4ade80]">✓ AI</span>
                  </div>
                </div>

                {/* Date */}
                <div>
                  <p className="text-[8px] text-neutral-600 uppercase tracking-widest mb-1">Fecha</p>
                  <div className="bg-[#4ade80]/5 border border-[#4ade80]/20 rounded-xl px-3 py-2.5 flex items-center justify-between">
                    <p className="text-[13px] text-white">08/11/2026 · 2:32 PM</p>
                    <span className="text-[8px] text-[#4ade80]">✓ AI</span>
                  </div>
                </div>

                {/* Category */}
                <div>
                  <p className="text-[8px] text-neutral-600 uppercase tracking-widest mb-1.5">Categoría</p>
                  <div className="flex gap-2 flex-wrap">
                    {CATEGORIES.map((c) => (
                      <button key={c} className={`px-2.5 py-1 rounded-full text-[9px] font-semibold border transition-all ${
                        c === "Gasolina"
                          ? "bg-[#d9b64f]/20 border-[#d9b64f]/60 text-[#f6dd8c]"
                          : "bg-[#1a1a1a] border-[#2a2a2a] text-neutral-500"
                      }`}>{c}</button>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <p className="text-[8px] text-neutral-600 uppercase tracking-widest mb-1">Notas (opcional)</p>
                  <div className="bg-[#0a0a0a] border border-[#1e1e1e] rounded-xl px-3 py-2.5">
                    <p className="text-[11px] text-neutral-600">Queens Blvd · Woodside</p>
                  </div>
                </div>

                {/* Receipt saved indicator */}
                <div className="flex items-center gap-2 bg-[#0a0a14] border border-[#3b82f6]/20 rounded-xl px-3 py-2">
                  <span className="text-[12px]">📁</span>
                  <p className="text-[9px] text-neutral-500">Foto guardada en <span className="text-[#3b82f6]">/receipts/2026-08/</span></p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 pb-4">
                <button className="flex-1 h-12 rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] text-[11px] text-neutral-400"
                  onClick={() => setState("idle")}>
                  Descartar
                </button>
                <button className="flex-[2] h-12 rounded-2xl text-black text-[13px] font-bold"
                  style={goldGrad}>
                  ✓ Guardar gasto
                </button>
              </div>
            </>
          )}

          {/* Start over */}
          {state === "done" && (
            <button className="w-full py-3 text-[10px] text-neutral-600 text-center"
              onClick={() => setState("idle")}>
              Escanear otro recibo →
            </button>
          )}

        </div>
      </div>
    </div>
  );
}
