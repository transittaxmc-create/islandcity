// ── IslandCity Tip Tracker · domain model ───────────────────────────
// Source of truth: .agents/memory/SPEC-MASTER-tip-tracker.md (PHASE 1)
// NET TRIP TOTAL = GROSS FARE + TIPS + OTHER CASH + TOLL REIMB − PLATFORM COMM

export type TripStatus = "queued" | "posted";
export type TxStatus = "PAID" | "POR_PAGAR" | "PAGADO";
export type TxType = "RECEIPT" | "EZPASS_DAILY";

export interface GeoTag {
  text: string;
  lat: number | null;
  lng: number | null;
  acc: number | null;
}

export interface ReceiptMeta {
  id: string;
  kind: "original" | "enhanced";
  photoKey: string; // IndexedDB key
  ocr?: { amount?: number; vendor?: string; raw?: string };
}

export interface Trip {
  id: string;
  ref: string; // IC-8821
  fareType: "UBER" | "LYFT" | "GALLANT";
  platform: string;
  gross: number;
  tips: number;
  cashRec: number;
  tollReimb: number;
  comm: number;
  /** net = gross + tips + cashRec + tollReimb − comm */
  net: number;
  date: string; // local NY business day, YYYY-MM-DD
  displayTime: string;
  timestamp: number;
  origin: GeoTag;
  destination: GeoTag;
  tripMiles: number;
  notes: string;
  receipts: ReceiptMeta[];
  status: TripStatus;
}

export interface LedgerTx {
  id: string;
  type: TxType;
  title: string; // "E-ZPass NY" or vendor / receipt name
  amount: number;
  status: TxStatus;
  date: string;
  displayTime: string;
  notes: string;
  photoKey?: string; // receipt photo in IndexedDB
  sourceDate?: string; // day the E-ZPass tolls were driven
}

export interface TollHit {
  id: string;
  name: string;
  amount: number;
  timestamp: number;
  date: string;
  displayTime: string;
  lat: number;
  lng: number;
  peak: boolean;
}

export interface AppState {
  trips: Trip[];
  txs: LedgerTx[];
  tollLog: TollHit[];
  lastTollTimes: Record<string, number>;
  shiftStartedAt: number | null;
  shiftLog: Record<string, { startedAt: number; endedAt?: number }>;
  goal: number; // $/hr target — spec: 45
  autoDownloadJson: boolean;
  refCounter: number; // next IC number
  closedDays: Record<string, boolean>;
}

export function emptyState(): AppState {
  return {
    trips: [],
    txs: [],
    tollLog: [],
    lastTollTimes: {},
    shiftStartedAt: null,
    shiftLog: {},
    goal: 45,
    autoDownloadJson: true,
    refCounter: 8821,
    closedDays: {},
  };
}

// ── Fare type selector (visual, logo/color distinguished) ───────────
export const FARE_TYPES: { key: Trip["fareType"]; label: string }[] = [
  { key: "UBER", label: "UBER" },
  { key: "LYFT", label: "LYFT" },
  { key: "GALLANT", label: "Gallant Luxury 212-304-0707" },
];

// ── Revenue source platforms — FINAL LIST (14, grouped) ─────────────
// GROUP A RIDESHARE: no pill · GROUP B: pill VOUCHER ·
// GROUP C: pills ACCESS-A-RIDE + VOUCHER · GROUP D: Other
export type PlatformGroup = "rideshare" | "voucher" | "access" | "other";

export interface PlatformDef {
  name: string;
  group: PlatformGroup;
  alias?: string; // display name in Register (e.g. Classy Ride)
  logo?: string; // file under /logos/ (20×20 mini logo)
}

export const PLATFORMS: PlatformDef[] = [
  { name: "Uber", group: "rideshare", logo: "uber.png" },
  { name: "Lyft", group: "rideshare", logo: "lyft.png" },
  { name: "Island City Transit", group: "rideshare", logo: "islandcity.jpg" },
  { name: "Aventus Ride", group: "voucher", logo: "aventus.png" },
  { name: "Classic Ryde", group: "voucher", alias: "Classy Ride", logo: "classicryde.png" },
  { name: "EcoRide", group: "voucher", logo: "ecoride.png" },
  { name: "Local Ride", group: "voucher" },
  { name: "Throo", group: "voucher", logo: "throo.jpg" },
  { name: "Transit Tax", group: "voucher", logo: "transittax.png" },
  { name: "Brakha Group", group: "voucher", logo: "brakha.jpg" },
  { name: "TBZI Luxury", group: "voucher", logo: "tbzi.jpg" },
  { name: "Aki Technology", group: "access", logo: "aki.png" },
  { name: "All Technology", group: "access" },
  { name: "Other", group: "other" },
];

export function platformDef(name: string): PlatformDef | undefined {
  return PLATFORMS.find((x) => x.name === name);
}

export function platformDisplay(name: string): string {
  const p = platformDef(name);
  return p?.alias ?? name;
}

export function platformPills(name: string): string[] {
  const p = platformDef(name);
  if (!p) return [];
  if (p.group === "access") return ["ACCESS-A-RIDE", "VOUCHER"];
  if (p.group === "voucher") return ["VOUCHER"];
  return [];
}

export function platformLogo(name: string): string | null {
  const p = platformDef(name);
  return p?.logo ? `${import.meta.env.BASE_URL}logos/${p.logo}` : null;
}

// ── Formula (spec) ──────────────────────────────────────────────────
export function calcNet(gross: number, tips: number, cashRec: number, tollReimb: number, comm: number): number {
  return (gross || 0) + (tips || 0) + (cashRec || 0) + (tollReimb || 0) - (comm || 0);
}

// ── Pure helpers ────────────────────────────────────────────────────
export function fmt(n: number | undefined | null): string {
  return "$" + (Number(n) || 0).toFixed(2);
}

/** Local business day (NOT UTC — a 8 PM NY trip belongs to today). */
export function todayStr(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function tripDate(t: Trip): string {
  return t.date || todayStr();
}

export function nowLabel(d = new Date()): string {
  return (
    d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }) +
    " - " +
    d.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit" })
  );
}

export function fmtDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export function headerDateTime(d = new Date()): string {
  return (
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
    " " +
    d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })
  );
}

export function uid(): string {
  return Math.random().toString(36).slice(2);
}

// ── Daily Entry form draft (inputs held as strings) ─────────────────
export interface EntryDraft {
  fareType: Trip["fareType"];
  platform: string;
  gross: string;
  tips: string;
  cashRec: string;
  tollReimb: string;
  comm: string;
  origin: string;
  originTag: string; // "lat,lng" appended for audit
  destination: string;
  destTag: string;
  miles: string;
  notes: string;
}

export function emptyEntryDraft(): EntryDraft {
  return {
    fareType: "UBER",
    platform: "Uber",
    gross: "",
    tips: "0",
    cashRec: "0",
    tollReimb: "0",
    comm: "0",
    origin: "",
    originTag: "",
    destination: "",
    destTag: "",
    miles: "0",
    notes: "",
  };
}

/** parse an EntryDraft into numbers */
export function draftNums(d: EntryDraft) {
  const gross = parseFloat(d.gross) || 0;
  const tips = parseFloat(d.tips) || 0;
  const cashRec = parseFloat(d.cashRec) || 0;
  const tollReimb = parseFloat(d.tollReimb) || 0;
  const comm = parseFloat(d.comm) || 0;
  const miles = parseFloat(d.miles) || 0;
  return { gross, tips, cashRec, tollReimb, comm, miles };
}
