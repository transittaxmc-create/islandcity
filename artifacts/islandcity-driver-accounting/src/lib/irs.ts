// ── IRS Standard Mileage Rates — Business use only ──────────────────
// Source: irs.gov/tax-professionals/standard-mileage-rates
// Updated: Aug 2026. Update annually when IRS announces new rates.

export interface IrsRateEntry {
  full?: number;
  h1?: number;
  h2?: number;
}

export const IRS_RATES: Record<number, IrsRateEntry> = {
  2024: { full: 0.67 },
  2025: { full: 0.7 },
  // Mid-year increase Jul 1, 2026
  2026: { h1: 0.725, h2: 0.76 },
  // Placeholders — UPDATE when IRS announces future rates
  2027: { full: 0.76 },
  2028: { full: 0.76 },
};

const FALLBACK_RATE = 0.76;

export function irsRate(now = new Date()): number {
  const y = now.getFullYear();
  const m = now.getMonth(); // 0-indexed; 6 === July
  const r = IRS_RATES[y];
  if (!r) return FALLBACK_RATE;
  if (r.h1 != null && r.h2 != null) return m >= 6 ? r.h2 : r.h1;
  return r.full ?? FALLBACK_RATE;
}

export function irsRatePeriod(now = new Date()): string {
  const y = now.getFullYear();
  const m = now.getMonth();
  const r = IRS_RATES[y];
  if (!r) return String(y);
  if (r.h1 != null && r.h2 != null) return m >= 6 ? y + " H2 (Jul-Dec)" : y + " H1 (Jan-Jun)";
  return String(y);
}

export function irsRateLabel(): string {
  // Human table for the UI: "2024: 67¢ | 2025: 70¢ | 2026 H1: 72.5¢ H2: 76¢ | 2027: pending"
  const parts: string[] = [];
  const keys = Object.keys(IRS_RATES).map(Number).sort((a, b) => a - b);
  for (const y of keys) {
    const r = IRS_RATES[y];
    if (r.h1 != null && r.h2 != null) {
      parts.push(`${y} H1: ${(r.h1 * 100).toFixed(1).replace(/\.0$/, "")}¢ H2: ${(r.h2 * 100).toFixed(1).replace(/\.0$/, "")}¢`);
    } else if (r.full != null) {
      const isPlaceholder = y >= 2027;
      parts.push(`${y}: ${isPlaceholder ? "pending" : (r.full * 100).toFixed(1).replace(/\.0$/, "") + "¢"}`);
    }
  }
  return parts.join(" | ");
}
