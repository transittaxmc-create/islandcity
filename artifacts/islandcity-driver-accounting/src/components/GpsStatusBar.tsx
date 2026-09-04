// ── IslandCity · GPS status bar (lives in app header) ──────────────────
// Shows: pulsing dot = active · street · city · accuracy. Updates live.

import { MapPin } from "lucide-react";
import { useGpsLocationLabel } from "../hooks/useGpsLocationLabel";

export function GpsStatusBar() {
  const { street, city, isActive, hasFix, error, accuracy } = useGpsLocationLabel();

  if (error) {
    return (
      <div className="flex items-center gap-1.5 truncate px-1 text-[10px] font-black tracking-wider text-[#f87171]">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#f87171]" />
        <span className="truncate">GPS ERROR</span>
      </div>
    );
  }

  if (!hasFix) {
    return (
      <div className="flex items-center gap-1.5 truncate px-1 text-[10px] font-black tracking-wider text-[#F5D78E]">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#F5D78E]" />
        <span className="truncate">GPS · BUSCANDO...</span>
      </div>
    );
  }

  if (!street && !city) {
    return (
      <div className="flex items-center gap-1.5 truncate px-1 text-[10px] font-black tracking-wider text-[#22FF88]">
        <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-[#22FF88]" />
        <span className="truncate">GPS · ACTIVO{accuracy != null ? ` · ±${Math.round(accuracy)}m` : ""}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 truncate px-1 text-[10px] font-black tracking-wider">
      <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-[#22FF88]" />
      <MapPin size={10} strokeWidth={2.5} className="shrink-0 text-[#22FF88]" />
      <span className="truncate text-neutral-300" style={{ letterSpacing: "0.04em" }}>
        {street}{city ? ` \u00b7 ${city}` : ""}
      </span>
      {accuracy != null && (
        <span className="ml-0.5 shrink-0 text-neutral-500">\u00b1{Math.round(accuracy)}m</span>
      )}
    </div>
  );
}
