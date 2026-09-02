// ── Shared UI tokens (spec design system) ───────────────────────────
// bg #0A0A0A · gold #FFD700 / #332F1A · neon green #00FF6A/#4ADE80 ·
// orange #FF8C00 pending · buttons 60-64px touch targets.

export const CARD = "rounded-2xl border border-[#1a1a1a] bg-[#0e0e0e] p-4";
export const LABEL = "text-[10px] font-black uppercase tracking-[0.08em] text-[#8a8a8a]";
export const INPUT =
  "w-full rounded-xl border border-[#2a2a2a] bg-black px-3 py-4 text-[20px] font-bold text-white outline-none focus:border-[#FFD700]";
export const INPUT_SM =
  "w-full rounded-lg border border-[#2a2a2a] bg-black px-3 py-2 text-[14px] font-bold text-white outline-none focus:border-[#FFD700]";

export const BTN_GOLD =
  "h-16 w-full rounded-2xl text-[16px] font-black tracking-wider text-black disabled:opacity-40";
export const BTN_DARK =
  "h-14 w-full rounded-xl border border-[#2a2a2a] bg-[#111] text-[12px] font-bold text-white active:bg-[#1c1c1c]";

export function pillCls(color: "gold" | "green" | "orange"): string {
  const map = {
    gold: "border-[#FFD70055] bg-[#FFD70018] text-[#FFD700]",
    green: "border-[#00FF6A55] bg-[#00FF6A18] text-[#00FF6A]",
    orange: "border-[#FF8C0055] bg-[#FF8C0018] text-[#FF8C00]",
  };
  return `inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-black ${map[color]}`;
}