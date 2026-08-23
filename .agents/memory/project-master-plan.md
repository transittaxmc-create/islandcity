# IslandCity — Plan Maestro y Seguimiento de Implementación

> Este archivo es la fuente de verdad para requisitos, decisiones y estado de implementación del proyecto. Actualizarlo en cada cambio funcional aprobado o completado.

## Objetivo del producto

App web móvil para Island City Transit Services, diseñada para uso rápido y muy legible durante turnos de conducción. Registra viajes, ingresos, peajes, GPS, millas, gastos, horas, metas y datos necesarios para reportes financieros y de taxes.

## Plataforma y despliegue

- Repositorio: `transittaxmc-create/islandcity`
- App pública: `https://transittaxmc-create.github.io/islandcity/`
- Hosting: GitHub Pages
- Despliegue: GitHub Actions (`.github/workflows/deploy-driver-accounting.yml`)
- Rama de despliegue: `main`
- Importante: GitHub Pages es frontend estático; secretos/API keys no deben estar en código ni en el navegador.

## Principios de UX

- Prioridad: entrada de datos rápida, clara y segura mientras el conductor está detenido o tiene solo segundos disponibles.
- Tipografía grande, alto contraste, campos con placeholders claros y sin datos prellenados.
- Colores profesionales y cómodos para la vista: negro, oro, verde y blanco.
- Navegación organizada: Dashboard, Trips (Daily Entry / Queue / Ledger), Expenses, Finance, Reports, AI.
- El Daily Entry debe ser la pantalla más rápida y simple de usar.

## Estado de funciones existentes (verificado)

### Datos y persistencia
- [x] Viajes, gastos y horas en localStorage.
- [x] Backup de datos/nube presente en el código actual.
- [x] Queue/Register y Ledger separados.
- [x] Cards de viaje con acciones Quick, Full Edit y Delete.

### GPS y ubicaciones
- [x] GPS nativo del navegador (`watchPosition`) para tracking de turno.
- [x] Tracking de millas de turno desde Clock In hasta Clock Out.
- [x] Tracking opcional de millas por viaje.
- [x] Filtro de precisión GPS y filtro de saltos irreales.
- [x] Reverse geocoding actual con Nominatim.
- [x] Detección de aeropuertos/ubicaciones cercanas existente en lógica actual.
- [ ] Integrar TomTom de manera segura mediante backend/Cloudflare Worker; GitHub Pages no puede guardar la key de TomTom.

### Peajes
- [x] Lista de plazas de peaje con geofencing de 350 m.
- [x] Tarifas 2026 en el código, incl. Queens-Midtown Tunnel a $7.46 con E-ZPass.
- [x] Lógica peak/off-peak para plazas Port Authority.
- [ ] Soportar múltiples peajes en el mismo viaje: sumar todos en Toll, y solo con 2+ escribir el desglose de plaza + importe en Notes.
- [x] Totales Week / Month / Year ya se derivan de los tolls guardados por viaje.

### Millas e IRS
- [x] Millas de turno se guardan en `hoursLog` al hacer Clock Out.
- [ ] Aplicar tarifa IRS 2026 por fecha: $0.725/mi para 2026-01-01 a 2026-06-30 y $0.76/mi para 2026-07-01 a 2026-12-31.
- [ ] Agregar una fila pequeña al final del Dashboard: odómetro/millas del año y deducción IRS del año.
- [ ] Usar los cálculos por fecha en Financial Statement/Reports.

### Dashboard
- [x] Dashboard existente con medidor SVG de $/hora, acumulado de hoy, total semanal, metas, GPS y datos de peajes.
- [ ] Ajustar visualmente el medidor para igualar la referencia aprobada: dial/arco de colores, información de meta vs actual, turno, viajes, hora de Clock In e historial de rendimiento.
- [ ] Confirmar rangos finales del medidor antes de modificarlo. Referencia visual propuesta: $0-45 rojo, $45-58 naranja, $58-68 amarillo, $68-80 verde, $80-90 azul.
- [ ] Añadir fila anual de odómetro/deducción IRS al final del Dashboard.

### Daily Entry
- [x] Selección de tipo/fuente de ingreso con logos.
- [x] Campo Gross Fare grande, referencia/invoice, ingresos adicionales, comisión, peaje y notas.
- [x] Botón GPS separado para Pickup/Origin y Drop-off/Destination.
- [x] Guarda plataformas, importes, peajes, GPS, millas, rutas, referencia y notas con el viaje.
- [ ] Revisar con el usuario cada campo y placeholder para asegurar la máxima rapidez y claridad.
- [ ] Al pulsar Pickup: capturar GPS y mostrar dirección/ubicación comercial, aeropuerto u hospital si aplica.
- [ ] Al pulsar Drop-off: capturar GPS y mostrar dirección/ubicación comercial, aeropuerto u hospital si aplica.
- [ ] Mantener campos inicialmente vacíos y placeholders que indiquen claramente qué ingresar.

### Register / Queue
- [x] Muestra viajes pendientes y total superior.
- [x] Incluye Quick, Full Edit y Delete.
- [x] Permite modificación de datos clave en línea.
- [ ] Asegurar que cada entrada muestre y permita editar todos los datos de la transacción: invoice/ref, plataforma, pickup, drop-off, GPS, precio/fare, tips, extras, tolls, fees, millas y notas.
- [ ] Revisar el diseño final de cada card para que reproduzca la información de Daily Entry de forma editable y legible.

### Logos
- [x] Archivos de logos existentes en `public/logos/` para Uber, Lyft, Gallant, Empower, TBZI, Aventus, Classic Ryde, EcoRide, Aki, Island City, Throo y otros.
- [ ] Verificar tras el próximo despliegue que la app publicada muestre todos los logos y no signos `?`.

## Tareas ya documentadas

### Issue #1
Archivo: `.agents/memory/toll-mileage-dashboard-patch.md`
Issue: GitHub #1

- Multi-toll detection y total automático.
- Detalle de los peajes en Notes solo si existen 2 o más en el mismo viaje.
- Tarifa IRS 2026 dividida por fecha.
- Fila anual de odómetro y deducción IRS en Dashboard.

### Issue #2
Archivo: `.agents/memory/tomtom-geocoding-patch.md`
Issue: GitHub #2

- La solución de ese patch debe adaptarse: GitHub Pages no tiene API server seguro.
- Implementar un Cloudflare Worker como proxy de TomTom.
- Guardar `TOMTOM_API_KEY` como secreto de Cloudflare Worker, nunca en GitHub ni frontend.
- El frontend de GitHub Pages debe llamar al Worker; si falla, usar Nominatim.

## Próximo orden de trabajo

1. Aplicar y probar Issue #1 en una rama de trabajo; validar build y GitHub Pages.
2. Revisar Dashboard según imagen de referencia y confirmar rangos del gauge.
3. Revisar Daily Entry campo por campo con el usuario y finalizar interacción rápida de Pickup/Drop-off.
4. Completar Register editable con todos los datos de la transacción.
5. Crear Cloudflare Worker y configurar secreto TomTom; adaptar Issue #2 y probar fallback a Nominatim.
6. Validar logos, GPS, peajes y persistencia en teléfono real.
7. Completar Financial Statement/Reports usando viajes, gastos, millas y peajes almacenados.

## Regla de mantenimiento

Antes de marcar una tarea como completa:
- Implementar en una rama de trabajo.
- Verificar build sin errores.
- Confirmar que GitHub Pages se actualizó.
- Probar visual y funcionalmente en teléfono.
- Actualizar este archivo y el Issue correspondiente con resultado, fecha y cualquier decisión nueva.
