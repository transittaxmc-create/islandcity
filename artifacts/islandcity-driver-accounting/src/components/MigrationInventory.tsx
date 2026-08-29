import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  ChevronDown,
  Clipboard,
  Download,
  Fingerprint,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import {
  buildLocalInventory,
  inventoryManifestJson,
  type InventoryGroup,
  type InventoryReport,
  type InventoryScope,
} from "@/lib/migrationInventory";

type Props = { userId: string };

const scopeLabels: Record<InventoryScope, string> = {
  user: "Usuario actual",
  global: "Global",
  legacy: "Heredado",
  examples: "Ejemplos",
  unclassified: "No atribuible",
};

const scopeStyles: Record<InventoryScope, string> = {
  user: "border-[#d9b64f]/30 bg-[#d9b64f]/[0.06]",
  global: "border-[#fb923c]/30 bg-[#fb923c]/[0.05]",
  legacy: "border-[#a78bfa]/30 bg-[#a78bfa]/[0.05]",
  examples: "border-[#f87171]/30 bg-[#f87171]/[0.05]",
  unclassified: "border-[#64748b]/40 bg-[#64748b]/[0.05]",
};

function formatMoney(value: number | null): string {
  if (value === null) return "—";
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function shortHash(hash: string): string {
  if (hash === "unavailable") return hash;
  return `${hash.slice(0, 12)}…${hash.slice(-8)}`;
}

function GroupCard({ group }: { group: InventoryGroup }) {
  const [open, setOpen] = useState(false);
  const hasWarnings = group.invalidCount > 0 || group.duplicateCount > 0 || group.exampleCount > 0;

  return (
    <div className={`rounded-2xl border p-4 ${scopeStyles[group.scope]}`}>
      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        className="w-full text-left"
        aria-expanded={open}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black uppercase tracking-[0.16em] text-[#f6dd8c]">
                {group.entity}
              </span>
              {group.examplesExcluded && (
                <span className="rounded-full bg-[#f87171]/15 px-2 py-0.5 text-[8px] font-bold text-[#fca5a5]">
                  EJEMPLOS EXCLUIDOS
                </span>
              )}
            </div>
            <p className="mt-1 truncate font-mono text-[10px] text-neutral-300">{group.key}</p>
            <p className="mt-1 text-[9px] text-neutral-500">{scopeLabels[group.scope]} · {group.sourceFunction}</p>
          </div>
          <ChevronDown size={16} className={`shrink-0 text-neutral-500 transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Metric label="Registros" value={String(group.recordCount)} />
          <Metric label="Total" value={formatMoney(group.monetaryTotal)} />
          <Metric label="Horas" value={group.hoursTotal === null ? "—" : group.hoursTotal.toFixed(2)} />
          <Metric label="Inválidos" value={String(group.invalidCount)} danger={group.invalidCount > 0} />
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[9px] text-neutral-500">
          <span>Fechas: {formatDate(group.minDate)} → {formatDate(group.maxDate)}</span>
          <span>Duplicados: {group.duplicateCount}</span>
          <span>Ejemplos: {group.exampleCount}</span>
        </div>
      </button>

      {open && (
        <div className="mt-4 border-t border-white/10 pt-4">
          <div className="grid gap-3 text-[9px] text-neutral-400">
            <div>
              <p className="mb-1 uppercase tracking-[0.14em] text-neutral-600">Origen</p>
              <p className="break-all">{group.sourceFile}</p>
              <p className="break-all text-neutral-600">{group.physicalKeys.join(", ")}</p>
            </div>
            <div>
              <p className="mb-1 uppercase tracking-[0.14em] text-neutral-600">Hashes</p>
              <p className="break-all"><span className="text-neutral-600">Bruto:</span> {shortHash(group.rawHash)}</p>
              <p className="break-all"><span className="text-neutral-600">Normalizado:</span> {shortHash(group.normalizedHash)}</p>
            </div>
            {group.sampleRecords.length > 0 && (
              <div>
                <p className="mb-1 uppercase tracking-[0.14em] text-neutral-600">Muestra de registros</p>
                <div className="space-y-1">
                  {group.sampleRecords.map(record => (
                    <div key={record.id} className="flex items-center justify-between gap-2 rounded-lg bg-black/30 px-2 py-1.5">
                      <span className="truncate">{record.id} · {record.label}</span>
                      <span className="shrink-0 font-mono text-[#f6dd8c]">{formatMoney(record.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {group.notes.length > 0 && (
              <div className="space-y-1 text-[#fbbf24]">
                {group.notes.map(note => <p key={note}>• {note}</p>)}
              </div>
            )}
            {hasWarnings && (
              <div className="flex items-center gap-2 rounded-lg border border-[#fbbf24]/20 bg-[#fbbf24]/5 p-2 text-[#fbbf24]">
                <AlertTriangle size={13} />
                <span>Revisar antes de considerar cualquier futura migración.</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, danger = false }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="rounded-xl bg-black/30 px-2.5 py-2">
      <p className="text-[8px] uppercase tracking-[0.12em] text-neutral-600">{label}</p>
      <p className={`mt-1 font-mono text-[13px] font-bold ${danger ? "text-[#fca5a5]" : "text-white"}`}>{value}</p>
    </div>
  );
}

function Section({
  title,
  icon,
  groups,
}: {
  title: string;
  icon: React.ReactNode;
  groups: InventoryGroup[];
}) {
  return (
    <section className="mt-6">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-[#f6dd8c]">{icon}</span>
        <h2 className="text-[11px] font-black uppercase tracking-[0.16em] text-neutral-300">{title}</h2>
        <span className="rounded-full bg-white/5 px-2 py-0.5 text-[9px] text-neutral-500">{groups.length}</span>
      </div>
      {groups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#252525] px-4 py-5 text-center text-[10px] text-neutral-600">
          No se detectaron claves en esta categoría.
        </div>
      ) : (
        <div className="space-y-3">{groups.map(group => <GroupCard key={group.id} group={group} />)}</div>
      )}
    </section>
  );
}

export default function MigrationInventory({ userId }: Props) {
  const [report, setReport] = useState<InventoryReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = () => {
    setLoading(true);
    setError(null);
    void buildLocalInventory(userId)
      .then(setReport)
      .catch(() => setError("No se pudo leer el inventario local. Los datos no fueron modificados."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    refresh();
  }, [userId]);

  const manifest = useMemo(() => report ? inventoryManifestJson(report) : "", [report]);

  const copyManifest = async () => {
    if (!manifest || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(manifest);
      setNotice("Manifiesto copiado localmente");
    } catch {
      setNotice("El navegador no permitió copiar el manifiesto");
    }
    window.setTimeout(() => setNotice(null), 2500);
  };

  const downloadManifest = () => {
    if (!manifest) return;
    const blob = new Blob([manifest], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "islandcity-inventory-manifest.json";
    link.click();
    URL.revokeObjectURL(url);
    setNotice("Manifiesto generado localmente; no se envió al servidor");
    window.setTimeout(() => setNotice(null), 3000);
  };

  const userGroups = report?.groups.filter(group => group.scope === "user") ?? [];
  const globalGroups = report?.groups.filter(group => group.scope === "global") ?? [];
  const legacyGroups = report?.groups.filter(group => group.scope === "legacy" && group.exampleCount === 0) ?? [];
  const exampleGroups = report?.groups.filter(group => group.scope === "legacy" && group.exampleCount > 0) ?? [];
  const unclassifiedGroups = report?.groups.filter(group => group.scope === "unclassified") ?? [];

  return (
    <div className="pb-8">
      <div className="rounded-3xl border border-[#d9b64f]/25 bg-gradient-to-br from-[#1b1400] via-[#0c0c0c] to-black p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[#f6dd8c]">
              <Fingerprint size={18} />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Fase 0</span>
            </div>
            <h1 className="mt-2 text-[25px] font-black tracking-tight text-white">Inventario de datos</h1>
            <p className="mt-1 text-[11px] text-neutral-400">Vista previa de migración</p>
          </div>
          <span className="flex items-center gap-1 rounded-full border border-[#4ade80]/25 bg-[#4ade80]/10 px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.12em] text-[#86efac]">
            <LockKeyhole size={11} />
            Solo lectura
          </span>
        </div>
        <div className="mt-5 rounded-2xl border border-[#f6dd8c]/15 bg-black/30 p-3 text-[10px] leading-relaxed text-[#f6dd8c]">
          Esta pantalla no sube, migra, borra ni modifica datos. Es solo una vista previa.
        </div>
        <div className="mt-3 flex items-center gap-2 text-[9px] text-neutral-500">
          <ShieldCheck size={13} className="text-[#4ade80]" />
          <span>Usuario: {report?.maskedUserId ?? "••••••••"}</span>
          <span>·</span>
          <span>Servidor: no consultado</span>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 py-16 text-[11px] text-neutral-500">
          <RefreshCw size={15} className="animate-spin text-[#f6dd8c]" />
          Leyendo claves locales sin modificarlas…
        </div>
      )}

      {error && (
        <div className="mt-5 rounded-2xl border border-[#f87171]/30 bg-[#f87171]/10 p-4 text-[11px] text-[#fca5a5]">
          {error}
        </div>
      )}

      {!loading && report && (
        <>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <Metric label="Grupos detectados" value={String(report.summary.groupCount)} />
            <Metric label="Claves del usuario" value={String(report.summary.userGroupCount)} />
            <Metric label="Ejemplos excluidos" value={String(report.summary.exampleCount)} danger={report.summary.exampleCount > 0} />
            <Metric label="Inválidos / duplicados" value={`${report.summary.invalidCount} / ${report.summary.duplicateCount}`} danger={report.summary.invalidCount + report.summary.duplicateCount > 0} />
          </div>

          <Section title="Datos del usuario actual" icon={<CheckCircle2 size={15} />} groups={userGroups} />
          <Section title="Claves globales" icon={<Archive size={15} />} groups={globalGroups} />
          <Section title="Claves heredadas" icon={<Archive size={15} />} groups={legacyGroups} />
          <Section title="Datos de ejemplo excluidos" icon={<AlertTriangle size={15} />} groups={exampleGroups} />
          <Section title="No atribuible automáticamente" icon={<LockKeyhole size={15} />} groups={unclassifiedGroups} />

          <section className="mt-6 rounded-2xl border border-[#2e2e2e] bg-[#0b0b0b] p-4">
            <div className="flex items-center gap-2 text-[#f6dd8c]">
              <Fingerprint size={15} />
              <h2 className="text-[11px] font-black uppercase tracking-[0.16em]">Manifiesto local</h2>
            </div>
            <p className="mt-2 text-[10px] leading-relaxed text-neutral-500">
              El manifiesto se genera en este navegador con los conteos, fechas, advertencias y hashes anteriores. No se guarda ni se envía a ningún servidor.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" onClick={copyManifest} className="flex h-10 items-center justify-center gap-2 rounded-xl border border-[#2e2e2e] bg-[#151515] text-[10px] font-bold text-neutral-300 hover:border-[#f6dd8c]/40">
                <Clipboard size={14} /> Copiar JSON
              </button>
              <button type="button" onClick={downloadManifest} className="flex h-10 items-center justify-center gap-2 rounded-xl border border-[#d9b64f]/30 bg-[#d9b64f]/10 text-[10px] font-bold text-[#f6dd8c] hover:bg-[#d9b64f]/15">
                <Download size={14} /> Descargar local
              </button>
            </div>
            <button type="button" onClick={refresh} className="mt-2 flex h-9 w-full items-center justify-center gap-2 rounded-xl text-[10px] font-bold text-neutral-500 hover:text-neutral-300">
              <RefreshCw size={13} /> Volver a leer sin modificar
            </button>
          </section>

          <div className="mt-4 rounded-2xl border border-[#fbbf24]/20 bg-[#fbbf24]/5 p-4 text-[10px] leading-relaxed text-[#fbbf24]">
            {report.warnings.map(warning => <p key={warning}>• {warning}</p>)}
          </div>
        </>
      )}

      {notice && (
        <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full border border-[#4ade80]/30 bg-[#10251a] px-4 py-2 text-[10px] font-bold text-[#86efac] shadow-xl">
          {notice}
        </div>
      )}
    </div>
  );
}