export type InventoryScope = "user" | "global" | "legacy" | "examples" | "unclassified";

export type InventoryGroup = {
  id: string;
  scope: InventoryScope;
  entity: string;
  key: string;
  physicalKeys: string[];
  sourceFile: string;
  sourceFunction: string;
  recordCount: number;
  monetaryTotal: number | null;
  hoursTotal: number | null;
  minDate: string | null;
  maxDate: string | null;
  rawHash: string;
  normalizedHash: string;
  invalidCount: number;
  duplicateCount: number;
  exampleCount: number;
  examplesExcluded: boolean;
  sampleRecords: Array<{
    id: string;
    date: string | null;
    amount: number | null;
    label: string;
  }>;
  notes: string[];
};

export type InventoryReport = {
  manifestVersion: "phase0-v1";
  readOnly: true;
  generatedAt: string;
  maskedUserId: string;
  serverQueried: false;
  groups: InventoryGroup[];
  warnings: string[];
  summary: {
    groupCount: number;
    userGroupCount: number;
    globalGroupCount: number;
    legacyGroupCount: number;
    exampleCount: number;
    invalidCount: number;
    duplicateCount: number;
  };
};

type RawRecord = Record<string, unknown>;

const USER_KEYS: Array<{
  key: string;
  entity: string;
  sourceFunction: string;
}> = [
  { key: "island-city-trips", entity: "Viajes e ingresos", sourceFunction: "trips / handleSave / syncRemoteTrips" },
  { key: "island-city-expenses", entity: "Gastos", sourceFunction: "expenses / handleSaveExpense" },
  { key: "island-city-hours", entity: "Horas y turnos", sourceFunction: "hoursLog / shift persistence" },
  { key: "island-city-last-saved", entity: "Metadatos locales", sourceFunction: "trip persistence effect" },
  { key: "island-city-trips-count", entity: "Metadatos locales", sourceFunction: "trip persistence effect" },
  { key: "ic-shift-date", entity: "Turnos", sourceFunction: "shift state initializer" },
  { key: "ic-shift-active", entity: "Turnos", sourceFunction: "shift state initializer" },
  { key: "ic-shift-clock-in", entity: "Turnos", sourceFunction: "clockInTime initializer" },
  { key: "ic-shift-break-ms", entity: "Turnos", sourceFunction: "totalBreakMs initializer" },
  { key: "ic-shift-on-break", entity: "Turnos", sourceFunction: "isOnBreak initializer" },
  { key: "ic-shift-break-start", entity: "Turnos", sourceFunction: "breakStart initializer" },
  { key: "ic-last-shift-date", entity: "Turnos", sourceFunction: "lastShiftDate persistence" },
  { key: "ic-shift-miles", entity: "Turnos y millas", sourceFunction: "GPS shift miles" },
  { key: "ic-hourly-goal", entity: "Metas", sourceFunction: "goal initializer / finance persistence" },
  { key: "ic-daily-goal", entity: "Metas", sourceFunction: "dailyGoal initializer / finance persistence" },
  { key: "ic-work-days", entity: "Metas", sourceFunction: "workDays initializer / finance persistence" },
  { key: "ic-day-targets", entity: "Metas", sourceFunction: "dayTargets initializer / finance persistence" },
  { key: "ic-week-overrides", entity: "Planes", sourceFunction: "weekOverrides initializer / finance persistence" },
  { key: "ic-recurring-plan", entity: "Planes", sourceFunction: "recurringPlan initializer / finance persistence" },
  { key: "ic-exp-budgets", entity: "Configuración financiera", sourceFunction: "expBudgets initializer / finance persistence" },
  { key: "ic-custom-exp-types", entity: "Configuración", sourceFunction: "customExpenseTypes persistence" },
  { key: "ic-custom-exp-cats", entity: "Configuración", sourceFunction: "customExpenseCategories persistence" },
  { key: "ic-custom-vendors", entity: "Configuración", sourceFunction: "customVendors persistence" },
  { key: "ic-bank-balance", entity: "Saldo", sourceFunction: "bankBalance initializer / finance persistence" },
  { key: "ic-bank-adj-history", entity: "Movimientos locales", sourceFunction: "bankAdjHistory initializer / finance persistence" },
  { key: "ic-limo-min-hr", entity: "Configuración LimoSys", sourceFunction: "limoMinHourly initializer / settings save" },
  { key: "ic-limo-min-mi", entity: "Configuración LimoSys", sourceFunction: "limoMinPerMile initializer / settings save" },
  { key: "ic-broadcast-history", entity: "Evaluaciones", sourceFunction: "broadcastHistory initializer / evaluation save" },
  { key: "ic-last-cloud-backup", entity: "Metadatos locales", sourceFunction: "cloud backup handler" },
  { key: "ic-last-github-push", entity: "Metadatos locales", sourceFunction: "GitHub push handler" },
];

const GLOBAL_KEYS = [
  { key: "ic-app-version", entity: "Clave global", sourceFunction: "enforceCleanSlate()" },
  { key: "ic-hours-log", entity: "Horas heredadas", sourceFunction: "legacy import compatibility" },
];

const LEGACY_KEYS = [
  { key: "islandcity-driver-ledger-v1", entity: "Registro heredado", sourceFunction: "script.js load() / save()" },
  { key: "islandcity-driver-shift-v1", entity: "Turno heredado", sourceFunction: "script.js loadShift() / saveShift()" },
];

const LEGACY_SOURCE = "artifacts/islandcity-driver-accounting/script.js";
const APP_SOURCE = "artifacts/islandcity-driver-accounting/src/App.tsx";

const isRecord = (value: unknown): value is RawRecord =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const numberValue = (value: unknown): number | null => {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
};

const stringValue = (value: unknown): string => typeof value === "string" ? value : "";

function maskUserId(userId: string): string {
  if (userId.length <= 8) return "••••••••";
  return `${userId.slice(0, 4)}••••${userId.slice(-4)}`;
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (isRecord(value)) {
    return Object.keys(value).sort().reduce<Record<string, unknown>>((result, key) => {
      result[key] = canonicalize(value[key]);
      return result;
    }, {});
  }
  return value;
}

function stableStringify(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

async function hashText(value: string): Promise<string> {
  if (!window.crypto?.subtle) return "unavailable";
  const bytes = new TextEncoder().encode(value);
  const digest = await window.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}

function parsedRecords(value: unknown): RawRecord[] {
  if (Array.isArray(value)) return value.filter(isRecord);
  return isRecord(value) ? [value] : [];
}

function dateCandidates(record: RawRecord): string[] {
  return ["date", "timestamp", "tripDate", "clockIn", "clockOut", "dueDate", "untilDate", "startedAt", "endedAt"]
    .map(key => stringValue(record[key]))
    .filter(value => !Number.isNaN(Date.parse(value)));
}

function amountForRecord(record: RawRecord, entity: string): number | null {
  if (entity === "Viajes e ingresos") {
    const total = numberValue(record.grandTotal);
    if (total !== null) return total;
    const earnings = numberValue(record.earnings) ?? 0;
    const tips = numberValue(record.tips) ?? 0;
    const extra = numberValue(record.extra) ?? 0;
    const otherCash = numberValue(record.otherCash) ?? 0;
    const toll = numberValue(record.toll) ?? 0;
    const fee = numberValue(record.fee) ?? 0;
    if (record.earnings !== undefined || record.tips !== undefined) {
      return earnings + tips + extra + otherCash + toll - fee;
    }
    const grossFare = numberValue(record.grossFare) ?? numberValue(record.fare);
    if (grossFare !== null) {
      return grossFare + (numberValue(record.tip) ?? 0) + (numberValue(record.toll) ?? 0) + (numberValue(record.adjustment) ?? 0);
    }
  }
  if (entity === "Gastos") return numberValue(record.amount);
  if (entity === "Movimientos locales") {
    const previous = numberValue(record.prevBalance);
    const next = numberValue(record.newBalance);
    return previous !== null && next !== null ? next - previous : numberValue(record.amount);
  }
  const legacyFare = numberValue(record.grossFare) ?? numberValue(record.fare);
  if (legacyFare !== null) {
    return legacyFare + (numberValue(record.tip) ?? 0) + (numberValue(record.toll) ?? 0) +
      (numberValue(record.adjustment) ?? 0) - (numberValue(record.platformFee) ?? 0);
  }
  return numberValue(record.amount) ?? numberValue(record.targetAmount) ?? numberValue(record.expenseAmount);
}

function hoursForRecord(record: RawRecord): number | null {
  return numberValue(record.hours);
}

function hasRequiredShape(record: RawRecord, entity: string): boolean {
  if (entity === "Viajes e ingresos") return Boolean(stringValue(record.id) && stringValue(record.date));
  if (entity === "Gastos") return Boolean(stringValue(record.id) && stringValue(record.date) && numberValue(record.amount) !== null);
  if (entity === "Horas y turnos" || entity === "Turnos") {
    return Boolean(stringValue(record.date) || stringValue(record.clockIn) || stringValue(record.startedAt));
  }
  return true;
}

function recordId(record: RawRecord, index: number): string {
  return stringValue(record.id) || `record-${index + 1}`;
}

function detectExamples(records: RawRecord[], key: string): Set<string> {
  if (!LEGACY_KEYS.some(item => item.key === key)) return new Set();
  return new Set(records.flatMap((record, index) => {
    const id = stringValue(record.id);
    const knownTrip = /^t-[1-5]$/.test(id);
    const knownExpense = /^e-[1-3]$/.test(id);
    const knownToll = /^o-[1-3]$/.test(id);
    return knownTrip || knownExpense || knownToll ? [recordId(record, index)] : [];
  }));
}

async function buildGroup(input: {
  key: string;
  raw: string;
  scope: InventoryScope;
  entity: string;
  sourceFile: string;
  sourceFunction: string;
  physicalKey: string;
}): Promise<InventoryGroup> {
  let parsed: unknown = input.raw;
  const notes: string[] = [];
  try {
    parsed = JSON.parse(input.raw);
  } catch {
    notes.push("El valor no es JSON válido; se conserva solo su hash bruto.");
  }

  const records = input.scope === "legacy" && isRecord(parsed)
    ? Object.values(parsed).flatMap(parsedRecords)
    : parsedRecords(parsed);
  const exampleIds = detectExamples(records, input.key);
  const ids = records.map(recordId);
  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
  const duplicateCount = new Set(duplicateIds).size;
  const invalidCount = records.filter(record => !hasRequiredShape(record, input.entity)).length;
  const amounts = records
    .map(record => amountForRecord(record, input.entity))
    .filter((amount): amount is number => amount !== null && Number.isFinite(amount));
  const hours = records
    .map(hoursForRecord)
    .filter((value): value is number => value !== null && value >= 0);
  const dates = records
    .flatMap(dateCandidates)
    .map(value => new Date(value).toISOString())
    .sort();
  const isScalar = records.length === 0 && parsed !== null && parsed !== undefined;
  const monetaryTotal = amounts.length > 0
    ? amounts.reduce((sum, amount) => sum + amount, 0)
    : input.entity === "Saldo" ? numberValue(parsed) : null;
  const sampleRecords = records.slice(0, 5).map((record, index) => ({
    id: recordId(record, index),
    date: dateCandidates(record)[0] ?? null,
    amount: amountForRecord(record, input.entity),
    label: stringValue(record.vendor) || stringValue(record.description) || stringValue(record.platform) || input.entity,
  }));

  if (input.scope === "legacy") {
    notes.push("Clave heredada sin separación por usuario.");
  }
  if (input.scope === "global") {
    notes.push("Clave global; no se atribuye automáticamente al usuario.");
  }
  if (input.entity === "Evaluaciones") {
    notes.push("Historial de evaluaciones; no es contabilidad oficial.");
  }
  if (input.entity === "Saldo") {
    notes.push("El saldo es un snapshot local, no un ledger de movimientos.");
  }
  if (input.entity === "Metadatos locales" || input.entity === "Clave global") {
    notes.push("Metadato técnico; no representa registros financieros.");
  }
  if (exampleIds.size > 0) {
    notes.push("Los registros coincidentes con el seed de script.js quedan excluidos por defecto.");
  }
  if (isScalar && input.entity !== "Clave global" && input.entity !== "Metadatos locales") {
    notes.push("Valor escalar; la cantidad representa una configuración o snapshot.");
  }

  return {
    id: `${input.scope}:${input.key}`,
    scope: input.scope,
    entity: input.entity,
    key: input.key,
    physicalKeys: [input.physicalKey],
    sourceFile: input.sourceFile,
    sourceFunction: input.sourceFunction,
    recordCount: records.length || (input.raw ? 1 : 0),
    monetaryTotal,
    hoursTotal: hours.length > 0 ? hours.reduce((sum, value) => sum + value, 0) : null,
    minDate: dates[0] ?? null,
    maxDate: dates.at(-1) ?? null,
    rawHash: await hashText(input.raw),
    normalizedHash: await hashText(stableStringify(parsed)),
    invalidCount,
    duplicateCount,
    exampleCount: exampleIds.size,
    examplesExcluded: exampleIds.size > 0,
    sampleRecords,
    notes,
  };
}

function readLocalValue(key: string): string | null {
  return window.localStorage.getItem(key);
}

export async function buildLocalInventory(userId: string): Promise<InventoryReport> {
  const prefix = `ic-user:${userId}:`;
  const groups: InventoryGroup[] = [];

  for (const item of USER_KEYS) {
    const physicalKey = prefix + item.key;
    const raw = readLocalValue(physicalKey);
    if (raw !== null) {
      groups.push(await buildGroup({
        ...item,
        raw,
        scope: "user",
        sourceFile: APP_SOURCE,
        physicalKey,
      }));
    }
  }

  const userKeyNames = Object.keys(window.localStorage).filter(key => key.startsWith(prefix));
  const knownUserKeys = new Set(USER_KEYS.map(item => prefix + item.key));
  for (const physicalKey of userKeyNames.filter(key => !knownUserKeys.has(key))) {
    const raw = readLocalValue(physicalKey);
    if (raw === null) continue;
    const logicalKey = physicalKey.slice(prefix.length);
    groups.push(await buildGroup({
      key: logicalKey,
      raw,
      scope: "unclassified",
      entity: "Clave de usuario no clasificada",
      sourceFile: APP_SOURCE,
      sourceFunction: "user-scoped storage scan",
      physicalKey,
    }));
  }

  for (const item of GLOBAL_KEYS) {
    const raw = readLocalValue(item.key);
    if (raw !== null) {
      groups.push(await buildGroup({
        ...item,
        raw,
        scope: "global",
        sourceFile: APP_SOURCE,
        physicalKey: item.key,
      }));
    }
  }

  for (const item of LEGACY_KEYS) {
    const raw = readLocalValue(item.key);
    if (raw !== null) {
      groups.push(await buildGroup({
        ...item,
        raw,
        scope: "legacy",
        sourceFile: LEGACY_SOURCE,
        physicalKey: item.key,
      }));
    }
  }

  const exampleCount = groups.reduce((sum, group) => sum + group.exampleCount, 0);
  const invalidCount = groups.reduce((sum, group) => sum + group.invalidCount, 0);
  const duplicateCount = groups.reduce((sum, group) => sum + group.duplicateCount, 0);

  return {
    manifestVersion: "phase0-v1",
    readOnly: true,
    generatedAt: new Date().toISOString(),
    maskedUserId: maskUserId(userId),
    serverQueried: false,
    groups,
    warnings: [
      "No se consultó servidor, base de datos ni API en esta vista previa.",
      "Las claves globales, heredadas y no clasificadas no se atribuyen automáticamente al usuario.",
      "Los datos de ejemplo detectados en script.js están excluidos por defecto.",
      "Los resultados son un inventario local y no una migración.",
    ],
    summary: {
      groupCount: groups.length,
      userGroupCount: groups.filter(group => group.scope === "user").length,
      globalGroupCount: groups.filter(group => group.scope === "global").length,
      legacyGroupCount: groups.filter(group => group.scope === "legacy").length,
      exampleCount,
      invalidCount,
      duplicateCount,
    },
  };
}

export function inventoryManifestJson(report: InventoryReport): string {
  return JSON.stringify(report, null, 2);
}