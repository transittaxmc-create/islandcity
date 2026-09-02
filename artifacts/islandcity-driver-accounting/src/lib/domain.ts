// ── IslandCity Tip Tracker · domain model ───────────────────────────
// Spec: DOC FINAL DAILY ENTRY + QUEUE + LOGOS
// Formulas: Gross = Earnings + ExtraCash + Tips + Toll
//          Net   = Gross - PlatformFee

export type PlatformType = "RIDESHARE" | "VOUCHER" | "ACCESS";
export type TripStatus = "open" | "posted";

export interface GeoTag {
  address: string;
  businessName: string;
  lat: number;
  lng: number;
  type: string;
  icon: string;
  timestamp: string;
  terminal?: string;
}

export interface TollDetail {
  name: string;
  price: number;
}

export interface EntryRecord {
  id: string;
  datetime: string;
  platform: string;
  platformType: PlatformType;
  earnings: number | null;
  extraCash: number | null;
  tips: number | null;
  toll: number | null;
  tollDetails: TollDetail[];
  platformFee: number | null;
  grossIncome: number;
  netPayout: number;
  pickup: GeoTag;
  dropoff: GeoTag;
  invoiceRef?: string;
  notes: string;
  status: TripStatus;
}

export interface AppState {
  entries: EntryRecord[];
  goal: number;
  autoDownloadJson: boolean;
  refCounter: number;
  closedDays: Record<string, boolean>;
}

// ── Platform dropdown: logos + classification (spec) ────────────────
export interface PlatformDef {
  name: string;
  type: PlatformType;
  logo?: string;
}

export const PLATFORMS: PlatformDef[] = [
  { name: "Uber", type: "RIDESHARE", logo: "uber.png" },
  { name: "Lyft", type: "RIDESHARE", logo: "lyft.png" },
  { name: "Island City Mobility / Transit", type: "RIDESHARE", logo: "islandcity.jpg" },
  { name: "EcoRide", type: "ACCESS", logo: "ecoride.png" },
  { name: "Aki", type: "ACCESS", logo: "aki.png" },
  { name: "Throo", type: "ACCESS", logo: "throo.jpg" },
  { name: "Transittax Luxury", type: "ACCESS", logo: "transittax.png" },
  { name: "Aventus Ride", type: "ACCESS", logo: "aventus.png" },
  { name: "Brakha Group", type: "VOUCHER", logo: "brakha.jpg" },
  { name: "Gallant", type: "VOUCHER", logo: "gallant.png" },
  { name: "CR", type: "VOUCHER", logo: "classicryde.png" },
];

export function platformDef(name: string): PlatformDef | undefined {
  return PLATFORMS.find((x) => x.name === name);
}

export function platformLogo(name: string): string | null {
  const p = platformDef(name);
  return p?.logo ? `${import.meta.env.BASE_URL}logos/${p.logo}` : null;
}

export function platformTypeLabel(type: PlatformType): string {
  if (type === "VOUCHER") return "VOUCHER";
  if (type === "ACCESS") return "ACCESS";
  return "";
}

// ── Formulas (spec) ─────────────────────────────────────────────────
export function calcGross(earnings: number, extraCash: number, tips: number, toll: number): number {
  return earnings + extraCash + tips + toll;
}

export function calcNet(gross: number, fee: number): number {
  return gross - fee;
}

// ── Pure helpers ────────────────────────────────────────────────────
export function fmt(n: number | null | undefined): string {
  if (n == null) return "$0.00";
  return "$" + n.toFixed(2);
}

export function todayStr(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function nowLabel(d = new Date()): string {
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
}

export function headerDateTime(d = new Date()): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) + " " + nowLabel(d);
}

export function uid(): string {
  return Math.random().toString(36).slice(2);
}

export function emptyState(): AppState {
  return { entries: [], goal: 45, autoDownloadJson: true, refCounter: 8821, closedDays: {} };
}
