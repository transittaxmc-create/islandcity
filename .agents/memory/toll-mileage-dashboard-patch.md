# Patch pendiente: Multi-toll detection + 2026 split IRS rate + Yearly odometer widget

Aplica estos 3 cambios en `artifacts/islandcity-driver-accounting/src/App.tsx`.

---

## 1) Tarifa IRS 2026 dividida (reemplaza el bloque `IRS_MILEAGE_RATES`)

**Buscar:**
```ts
const IRS_MILEAGE_RATES: Record<number, number> = { 2023: 0.655, 2024: 0.670, 2025: 0.700 };
```

**Reemplazar con:**
```ts
// 2026 tuvo un aumento a mitad de ano (anuncio IRS del 13 de julio de 2026):
// Ene 1 - Jun 30, 2026: $0.725/mi . Jul 1 - Dic 31, 2026: $0.76/mi
// No se puede representar como un solo numero - se calcula por rango de fecha.
const IRS_MILEAGE_RATES: Record<number, number> = { 2023: 0.655, 2024: 0.670, 2025: 0.700 }; // 2026 excluido: tarifa dividida, ver getIrsRateForDate()

const IRS_MILEAGE_SPLIT_2026 = [
  { from: "2026-01-01", to: "2026-06-30", rate: 0.725 },
  { from: "2026-07-01", to: "2026-12-31", rate: 0.76 },
];

function getIrsRateForDate(dateStr: string): number | null {
  const year = parseInt(dateStr.slice(0, 4));
  if (year === 2026) {
    const seg = IRS_MILEAGE_SPLIT_2026.find(s => dateStr >= s.from && dateStr <= s.to);
    return seg ? seg.rate : null;
  }
  return IRS_MILEAGE_RATES[year] ?? null;
}

function sumMileageDeduction(entries: { date: string; miles?: number }[]): number {
  return entries.reduce((sum, e) => {
    const rate = getIrsRateForDate(e.date);
    return sum + (rate !== null ? (e.miles ?? 0) * rate : 0);
  }, 0);
}
```

Usa `getIrsRateForDate(trip.date)` donde hoy se use `IRS_RATE_PER_MILE` fijo (calculo de deduccion del turno actual y en Reports/Financial Statement).

---

## 2) Deteccion de peajes multiples + detalle en Notas

**Agregar ref cerca de `lastDetectedPlazaRef`:**
```ts
const tripTollsRef = useRef<{ plaza: string; rate: number }[]>([]);
```

**Reemplazar la logica del `useEffect` de geofencing de peajes por:**
```ts
useEffect(() => {
  if (!gps.lat || !gps.lng) return;
  const GEOFENCE_KM = 0.35;
  for (const plaza of TOLL_PLAZAS) {
    const d = haversineKm(gps.lat, gps.lng, plaza.lat, plaza.lng);
    if (d < GEOFENCE_KM) {
      if (lastDetectedPlazaRef.current === plaza.name) return;
      lastDetectedPlazaRef.current = plaza.name;

      let rate = plaza.rate;
      if (plaza.offPeak !== undefined) {
        const now = new Date();
        const h = now.getHours();
        const dow = now.getDay();
        const isWeekday = dow >= 1 && dow <= 5;
        const isPeak = isWeekday && ((h >= 6 && h < 10) || (h >= 16 && h < 21));
        rate = isPeak ? plaza.rate : plaza.offPeak;
      }

      const already = tripTollsRef.current.some(t => t.plaza === plaza.name);
      if (!already) {
        tripTollsRef.current = [...tripTollsRef.current, { plaza: plaza.name, rate }];
      }

      const tollList = tripTollsRef.current;
      const tollSum = tollList.reduce((s, t) => s + t.rate, 0);

      setTripForm((s) => {
        const next = { ...s, toll: tollSum.toFixed(2) };
        if (tollList.length > 1) {
          const detail = "Peajes: " + tollList.map(t => `${t.plaza} $${t.rate.toFixed(2)}`).join(", ");
          const cleanedNotes = s.notes.replace(/Peajes:.*$/s, "").trim();
          return { ...next, notes: cleanedNotes ? `${cleanedNotes}\n${detail}` : detail };
        }
        return next;
      });

      const at = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
      setDetectedToll({ plaza: plaza.name, rate, at });
      setTollManuallyEdited(false);
      showToast(
        tollList.length > 1
          ? `Peaje #${tollList.length} detectado: ${plaza.name} $${rate.toFixed(2)} . Total $${tollSum.toFixed(2)}`
          : `Toll detected: ${plaza.name} $${rate.toFixed(2)}`
      );
      return;
    }
  }
  lastDetectedPlazaRef.current = null;
}, [gps.lat, gps.lng]); // eslint-disable-line react-hooks/exhaustive-deps
```

**Agregar reset dentro de `resetForm()`:**
```ts
tripTollsRef.current = [];
```

**Agregar tambien dentro de `handleSave()`, despues de guardar `newTrip`:**
```ts
tripTollsRef.current = [];
```

---

## 3) Fila de odometro anual en el Dashboard

**Agregar cerca de `shiftMiles` / `tollsYear`:**
```ts
const milesYear = useMemo(() => {
  const y = currentTime.getFullYear();
  return hoursLog
    .filter(h => new Date(h.date).getFullYear() === y)
    .reduce((sum, h) => sum + (h.miles ?? 0), 0);
}, [hoursLog, currentTime]);

const irsDeductionYear = useMemo(() => {
  const y = currentTime.getFullYear();
  const entries = hoursLog.filter(h => new Date(h.date).getFullYear() === y);
  return sumMileageDeduction(entries);
}, [hoursLog, currentTime]);
```

**Agregar al final de `DashboardContent`, despues de la tarjeta "Odometer This Shift":**
```tsx
<div className="grid grid-cols-2 gap-2 mt-2">
  <div className="rounded-xl p-3" style={{ background: "#080808", border: "1px solid #1a1e1a" }}>
    <p className="text-[9px] tracking-[0.14em] text-neutral-400 font-bold uppercase">ODOM. ANO</p>
    <p className="font-mono-jet text-[20px] font-black text-[#f6dd8c] mt-1">{milesYear.toFixed(1)} <span className="text-[10px] text-neutral-400">mi</span></p>
  </div>
  <div className="rounded-xl p-3" style={{ background: "#080808", border: "1px solid #1a2e1a" }}>
    <p className="text-[9px] tracking-[0.14em] text-neutral-400 font-bold uppercase">DEDUC. IRS ANO</p>
    <p className="font-mono-jet text-[20px] font-black text-[#4ade80] mt-1">${irsDeductionYear.toFixed(2)}</p>
  </div>
</div>
```

---

## Notas
- `TOLL_PLAZAS` ya tiene los precios correctos 2026, no requiere cambios de datos.
- Todo vive ya en localStorage via `trips` y `hoursLog`.
- Verificar que los nombres `TOLL_PLAZAS`/`haversineKm` coincidan con los que ya existen en el archivo actual.