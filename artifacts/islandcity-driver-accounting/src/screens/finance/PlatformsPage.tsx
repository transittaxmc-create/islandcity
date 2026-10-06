// FINANCE · Page 2 · Income by Platform — ported 1:1
import type { FinanceData } from "./financeData";

type PlatformMeta = { initial: string; bg: string; tags: string[] };

const platformMeta: Record<string, PlatformMeta> = {
  "EcoRide - 10% fee": { initial: "E", bg: "bg-[#22c55e]", tags: ["ACCESS-A-RIDE", "VOUCHER"] },
  "EcoRide": { initial: "E", bg: "bg-[#22c55e]", tags: ["ACCESS-A-RIDE", "VOUCHER"] },
  "Uber": { initial: "U", bg: "bg-white", tags: [] },
  "Lyft": { initial: "L", bg: "bg-[#ff00bf]", tags: [] },
  "Empower": { initial: "E", bg: "bg-[#1a1a1a]", tags: [] },
  "Gallant": { initial: "G", bg: "bg-[#f97316]", tags: ["VOUCHER"] },
  "Aventus Ride": { initial: "A", bg: "bg-[#1a3d25]", tags: ["VOUCHER"] },
  "Classic Ryde": { initial: "CR", bg: "bg-[#14b8a6]", tags: ["VOUCHER"] },
  "Aki Technology": { initial: "AKI", bg: "bg-[#0ea5e9]", tags: ["ACCESS-A-RIDE", "VOUCHER"] },
  "Street Hail": { initial: "SH", bg: "bg-[#6b7280]", tags: [] },
  "Island City Transit": { initial: "ICT", bg: "bg-[#0d1b2e]", tags: ["PRIVATE"] },
  "Transit Tax": { initial: "TT", bg: "bg-black", tags: ["TAX"] },
  "Throo": { initial: "T", bg: "bg-[#0e1e30]", tags: [] },
  "Brakha Group": { initial: "BG", bg: "bg-[#1e2d6b]", tags: ["TAX"] },
  "TBZI Luxury": { initial: "TB", bg: "bg-[#0d1b2e]", tags: [] },
  "Other": { initial: "O", bg: "bg-[#9ca3af]", tags: [] },
};

const getPlatformMeta = (name: string): PlatformMeta =>
  platformMeta[name] || { initial: name[0]?.toUpperCase() || "O", bg: "bg-[#9ca3af]", tags: [] };

export function PlatformsPage({ F }: { F: FinanceData }) {
  if (F.platRows.length === 0) {
    return (
      <div className="flex-shrink-0 w-full px-4 pb-6" style={{ scrollSnapAlign: "start" }}>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <span className="text-[44px] mb-3">🚘</span>
          <p className="text-[13px] font-semibold text-neutral-400 mb-1">No trips recorded yet</p>
          <p className="text-[11px] text-neutral-400 leading-relaxed">Log your first trip to see<br />your breakdown by platform here</p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex-shrink-0 w-full px-4 pb-6" style={{ scrollSnapAlign: "start" }}>
      <div className="bg-[#101010] border border-[#2e2e2e] rounded-2xl p-4">
        <p className="mb-3 text-[12px] font-bold uppercase tracking-[0.12em] text-neutral-200">Income by platform</p>
        <div className="space-y-2">
          {F.platRows.map(([platform, d]) => {
            const meta = getPlatformMeta(platform);
            return (
              <div key={platform} className="rounded-xl border border-[#242424] bg-[#090909] p-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${meta.bg} text-[10px] font-bold text-black`}>{meta.initial}</span>
                  <span className="min-w-0 flex-1 break-words text-[13px] font-semibold leading-5 text-white">{platform}</span>
                </div>
                <dl className="mt-3 grid grid-cols-3 gap-2">
                  {([
                    ["Today", d.today, "text-neutral-300"],
                    ["Week", d.week, "text-[#f6dd8c]"],
                    ["Month", d.month, "text-white"],
                  ] as const).map(([label, amount, color]) => (
                    <div key={label} className="min-w-0">
                      <dt className="text-[11px] font-medium text-neutral-400">{label}</dt>
                      <dd className={`mt-0.5 break-all font-mono-jet tabular-nums text-[13px] font-semibold ${color}`}>
                        ${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}