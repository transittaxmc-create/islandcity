# Patch: Integracion TomTom Reverse Geocoding (con fallback a Nominatim)

## Antes de aplicar: configurar el secreto

Agrega la variable de entorno TOMTOM_API_KEY en el panel de Secrets del entorno donde corre el api-server (Replit Secrets u otro). Nunca pegar la key en el codigo ni en este archivo.

---

## 1) Nueva ruta de servidor: artifacts/api-server/src/routes/geocode.ts

Sigue el mismo patron que voice-parse.ts / receipt-scan.ts (la key vive solo en el servidor):

```ts
import { Router } from "express";

const router = Router();

router.post("/geocode", async (req, res) => {
  const { lat, lng } = req.body as { lat: number; lng: number };
  if (lat === undefined || lng === undefined) {
    return res.status(400).json({ error: "lat/lng required" });
  }

  const key = process.env.TOMTOM_API_KEY;
  if (!key) {
    return res.status(200).json({ label: null, source: "none", error: "TOMTOM_API_KEY not set" });
  }

  try {
    const url = `https://api.tomtom.com/search/2/reverseGeocode/${lat},${lng}.json?key=${key}&radius=100`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`TomTom ${r.status}`);
    const data = await r.json();
    const addr = data?.addresses?.[0]?.address;
    if (!addr) throw new Error("No address in TomTom response");
    const label = addr.freeformAddress || [addr.streetName, addr.municipality].filter(Boolean).join(", ");
    return res.json({ label, source: "tomtom", raw: addr });
  } catch (err) {
    return res.status(200).json({ label: null, source: "none", error: err instanceof Error ? err.message : "TomTom error" });
  }
});

export default router;
```

Registrar esta ruta junto a las demas (/api/voice-parse, /api/receipt-scan, etc.) en el archivo principal del api-server.

---

## 2) Cliente: modificar reverseGeocodeRich en App.tsx

Envolver la funcion existente asi (TomTom primero via servidor, fallback a la logica Nominatim actual sin cambios):

```ts
async function reverseGeocodeRich(lat: number, lng: number, signal?: AbortSignal): Promise<string> {
  try {
    const r = await fetch("/api/geocode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat, lng }),
      signal,
    });
    if (r.ok) {
      const data = await r.json();
      if (data.label) {
        const coord = `${lat.toFixed(5)},${lng.toFixed(5)}`;
        return `${data.label} . ${coord}`;
      }
    }
  } catch {
    // sigue a Nominatim
  }

  // Fallback: logica Nominatim EXISTENTE - no tocar nada de aqui abajo,
  // es exactamente el codigo actual de reverseGeocodeRich.
}
```

---

## Resultado esperado

- Direcciones de pickup/drop-off mas precisas cuando TomTom responda.
- Si la key falta o TomTom falla, la app sigue igual con Nominatim, sin downtime.
- La key nunca se expone en el navegador ni en el repositorio.

## Pendiente

Si luego se quiere el TomTom Search/Autocomplete API para autocompletar direcciones al escribir, es una ruta adicional separada con el mismo patron de seguridad.