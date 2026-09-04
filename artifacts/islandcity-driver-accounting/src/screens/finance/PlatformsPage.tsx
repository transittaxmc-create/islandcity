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
        <p className="text-[9px] tracking-[0.22em] text-neutral-300 font-bold uppercase mb-3">INCOME BY PLATFORM</p>
        <table className="w-full text-[11px]">
          <thead>
            <tr className="text-[8px] text-neutral-400 uppercase tracking-widest border-b border-[#2e2e2e]">
              <th className="text-left pb-2 font-semibold">Platform</th>
              <th className="text-right pb-2 font-semibold">Today</th>
              <th className="text-right pb-2 font-semibold">Week</th>
              <th className="text-right pb-2 font-semibold">Month</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1a1a1a]">
            {F.platRows.map(([platform, d]) => {
              const meta = getPlatformMeta(platform);
              return (
                <tr key={platform}>
                  <td className="py-2">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-5 h-5 rounded-full ${meta.bg} flex items-center justify-center text-[7px] font-bold text-black flex-shrink-0`}>{meta.initial}</span>
                      <span className="text-neutral-300 text-[10px] truncate max-w-[70px]">{platform}</span>
                    </div>
                  </td>
                  <td className="py-2 text-right font-mono-jet text-neutral-400 text-[10px]">{d.today > 0 ? `$${d.today.toFixed(0)}` : "—"}</td>
                  <td className="py-2 text-right font-mono-jet text-[#f6dd8c] font-semibold text-[10px]">${d.week.toFixed(0)}</td>
                  <td className="py-2 text-right font-mono-jet text-white text-[10px]">${d.month.toFixed(0)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}