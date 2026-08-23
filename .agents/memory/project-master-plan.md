# IslandCity — Plan Maestro, Bitácora de Requisitos y Seguimiento

> **Fuente de verdad del proyecto.** Este documento preserva las instrucciones, decisiones y estado acordados con el usuario. Antes de proponer, editar o marcar una función como terminada, revisar este archivo. Después de cada decisión o cambio validado, actualizarlo para que el seguimiento no dependa de recordar conversaciones anteriores.

---

## 1. Identidad y objetivo

- Marca: **Island City Transit Services / Island City Transit Co.**
- Producto: app web móvil para registrar y administrar ingresos, viajes, horas, GPS, millas, peajes, gastos, metas y reportes de un conductor de transporte/rideshare en Long Island y NYC.
- Prioridad central: permitir entrada de datos precisa y muy rápida cuando el conductor está detenido o solo tiene unos segundos disponibles.
- El usuario quiere que el proyecto se lleve hasta completarse, con seguimiento continuo y una sola fuente organizada de requisitos.

---

## 2. Plataforma actual y despliegue

- Repositorio: `transittaxmc-create/islandcity`
- Aplicación pública: `https://transittaxmc-create.github.io/islandcity/`
- Hosting: **GitHub Pages**.
- Despliegue: **GitHub Actions**, workflow `.github/workflows/deploy-driver-accounting.yml`.
- Rama de publicación: `main`.
- No usar ni asumir Replit; el usuario confirmó que **ya no usa Replit**.
- GitHub Pages es frontend estático. API keys/secretos nunca se deben guardar en el código, en el repositorio o en el navegador.
- Si se necesita una integración protegida (por ejemplo TomTom), usar Cloudflare Worker o backend seguro equivalente. Cloudflare está conectado para el usuario.

---

## 3. Principios de diseño y uso

- Pantalla oscura, profesional: negro predominante, oro, verde, blanco; alto contraste y letras legibles.
- Campos sin valores prellenados: deben mostrar **placeholders claros** para indicar qué se escribe en cada uno.
- Evitar formularios densos o información mezclada.
- La app debe ser fácil de escanear con una mirada corta y usar con pocos toques.
- Navegación deseada: Dashboard, Trips (Daily Entry / Queue / Ledger), Expenses, Finance, Reports, AI.
- El usuario considera **Daily Entry** la pantalla que más usará; debe tener prioridad en UX y rapidez.
- Register/Queue debe permitir revisar, completar y corregir cada transacción sin perder información.

---

## 4. Diseño visual de referencia recibido

El usuario entregó capturas de referencia para:

1. **Daily Entry**: selección de plataforma con logos, Gross Fare grande, GPS pickup y drop-off, campos de peaje, entradas adicionales, invoice/ref y notas.
2. **Selector de Revenue Source**: agrupación por Rideshare, Voucher, Access-A-Ride y Other.
3. **Queue/Register**: tarjetas de viaje, totales superiores, botones Quick / Full Edit / Delete y acción de mover a Ledger.
4. **Dashboard**: medidor semicircular de ingresos por hora con zonas de colores, panel Target vs. Actual, duración de turno, viajes, Clock In, historial de últimas horas y panel asesor.
5. **Trip Locations**: botones separados Capture para Pickup y Drop-off, y la dirección/ubicación mostrada junto a cada botón.

Estas imágenes son la referencia visual de producto; no son prueba de que una función esté implementada hasta verificarla en el código y en la app publicada.

---

## 5. Estado del código verificado

### 5.1 Datos y almacenamiento

- [x] Viajes, gastos y horas se guardan localmente (`localStorage`).
- [x] Cada viaje actual puede guardar: referencia, earnings, tips, extras, other cash, toll, fee, plataforma, pickup, drop-off, notas, fecha/hora, GPS y millas.
- [x] Hay backup en la nube/código previsto en la app actual; verificar su comportamiento real antes de depender de él.
- [x] Queue/Register y Ledger están separados.
- [x] Queue tiene tarjetas de viaje y acciones Quick, Full Edit y Delete.
- [x] Ledger muestra viajes publicados.
- [ ] No considerar una tarea completa solo porque existe en el código: comprobar build, GitHub Pages y teléfono real.

### 5.2 Logos de plataformas

- [x] Logos encontrados en `public/logos/`: Uber, Lyft, Gallant, Empower, TBZI, Aventus, Classic Ryde, EcoRide, Aki, Island City, Throo, Transit Tax, Brakha y otros.
- [x] `platformMeta` de la app actual ya referencia logos para las plataformas principales.
- [x] Throo ya está en la lista del selector, dentro de Other; no requiere añadirse como plataforma nueva.
- [ ] Después del siguiente deploy, comprobar en teléfono que no aparezcan círculos con `?` y que los assets se carguen desde GitHub Pages.

### 5.3 GPS, millas y ubicaciones

- [x] GPS nativo con `navigator.geolocation`.
- [x] `watchPosition` para rastrear millas durante turno y flujo de tracking por viaje.
- [x] El tracking de turno comienza con Clock In/START y termina con Clock Out/END.
- [x] Las millas de turno se guardan al hacer Clock Out en `hoursLog`.
- [x] Hay filtros de precisión GPS y movimientos/saltos improbables.
- [x] Reverse geocoding actual usa Nominatim mediante `reverseGeocodeRich`.
- [x] Hay lógica existente de proximidad/detección de aeropuertos: JFK, LGA, EWR e ISP.
- [ ] Pickup: al tocar el botón GPS/Capture, capturar posición nueva y mostrar dirección/ubicación comercial; si está en aeropuerto, mostrar cuál; si está en hospital, mostrar el hospital cuando la fuente lo identifique.
- [ ] Drop-off: el mismo comportamiento independiente para la ubicación final.
- [ ] Cada ubicación capturada debe persistir dentro de la transacción y mostrarse en Register.

### 5.4 TomTom

- El usuario entregó una API key de TomTom en el chat. **No almacenar ni repetir esa key en este documento, archivos, commits, Issues o frontend.**
- [ ] El patch inicial bajo Issue #2 asumía un api-server; debe ser adaptado porque el despliegue real es GitHub Pages estático.
- [ ] Arquitectura correcta: Cloudflare Worker como proxy seguro.
- [ ] Guardar `TOMTOM_API_KEY` como secreto de Cloudflare Worker.
- [ ] El frontend debe llamar al Worker para reverse geocoding TomTom.
- [ ] Mantener Nominatim como fallback automático si TomTom, Worker, red o key falla.
- [ ] Posible fase posterior: TomTom Search/Autocomplete para direcciones escritas manualmente.

### 5.5 Peajes / E-ZPass

- [x] La app tiene `TOLL_PLAZAS` con geofencing aproximado de 350 m.
- [x] Hay tarifas 2026 cargadas para MTA y Port Authority.
- [x] Ejemplo confirmado: Queens-Midtown Tunnel E-ZPass $7.46 en 2026.
- [x] Las plazas de Port Authority incorporan lógica peak/off-peak en el código actual.
- [x] Los tolls de los viajes se guardan y se usan para totales de semana/mes/año.
- [ ] Requisito clave: si un viaje pasa por **un** peaje, colocar automáticamente ese precio en Toll.
- [ ] Si un viaje pasa por **más de un** peaje, sumar todos los valores automáticamente en Toll.
- [ ] Cuando haya 2 o más peajes en un viaje, escribir automáticamente en Notes el desglose de nombre de plaza y precio de cada peaje.
- [ ] Cuando solo haya 1 peaje, no ensuciar Notes con el detalle (el valor en Toll basta).
- [ ] Reiniciar el acumulador temporal de peajes al guardar o cancelar un viaje.
- [ ] Permitir revisión/edición manual del valor de Toll y notas en Daily Entry y Register.

### 5.6 Millas, deducción IRS y años

- [x] El usuario quiere millas acumuladas desde Clock In durante todo el turno.
- [x] Requisito: mostrar millas del día/turno y total acumulado del año, con fines de Financial Statement y taxes.
- [ ] Requisito: guardar esas millas y usar los registros guardados para reporte financiero posterior.
- [ ] Tarifa IRS de negocio 2026 debe aplicarse por fecha: $0.725/mi del 1 ene al 30 jun de 2026; $0.76/mi del 1 jul al 31 dic de 2026. No representar 2026 con una sola tarifa.
- [ ] Aplicar el cálculo según fecha a cada turno/entrada relevante y en Financial Statement/Reports.
- [ ] En la parte baja del Dashboard, cerca del odómetro, colocar una línea o pequeños cuadros compactos que muestren:
  - Odometer / miles this shift o today.
  - ODOM. AÑO / millas acumuladas del año.
  - DEDUC. IRS AÑO / deducción acumulada aplicando tarifa correcta por fecha.
- [ ] Mantener ese bloque compacto, técnico y visualmente discreto.

### 5.7 Dashboard

- [x] Dashboard actual tiene acumulado de hoy (`grossToday`), total semanal, medidor SVG de $/hora, metas, GPS, datos de peajes y odómetro de turno.
- [ ] El Dashboard debe usar la referencia del medidor/ruedita de colores del usuario.
- [ ] El gauge debe calcular automáticamente cuánto se gana por hora usando ingresos de hoy y tiempo activo de Clock In menos breaks.
- [ ] Cada transacción guardada debe actualizar acumulado diario y, por ende, la tasa por hora del gauge.
- [ ] El Dashboard debe mostrar total de hoy y acumulado semanal.
- [ ] Agregar/ajustar bloque Target vs. Actual, incluyendo al menos meta semanal por hora, tasa actual y última hora si hay datos suficientes.
- [ ] Agregar bloque de turno: tiempo activo, cantidad de viajes y hora de Clock In.
- [ ] Agregar Performance History de últimas 8 horas en barras de color, derivada de viajes/horas reales.
- [ ] Confirmar rangos finales del gauge antes de deploy. Referencia extraída de imagen: $0-45 rojo, $45-58 naranja, $58-68 amarillo, $68-80 verde, $80-90 azul. No cambiar sin confirmación del usuario.
- [ ] Mantener panel de asesor/recomendación como componente secundario, no sustituir los números principales.

### 5.8 Daily Entry

- [x] Ya existen selección de plataforma/logo, Gross Fare grande, ingresos adicionales/deducciones, Toll, referencias e Notes.
- [x] Ya hay botones GPS separados para Origin/Pickup y Destination/Drop-off.
- [x] Ya se persisten campos de viaje al guardar.
- [ ] La pantalla debe ser la más simple, rápida y legible de toda la app.
- [ ] Iniciar con todos los campos vacíos; usar placeholders explicativos, sin valores residuales.
- [ ] Revisar cada campo uno por uno con el usuario antes de considerar Daily Entry finalizado.
- [ ] Campos requeridos a preservar/validar: tipo de tarifa, revenue source, gross fare, tips, extra, other cash si aplica, commission/fee, toll, origin/pickup, destination/drop-off, trip miles, invoice/reference, notes, fecha y hora.
- [ ] Invoice/reference debe formar parte de cada transacción y verse después en Register.
- [ ] Pickup/drop-off capturados por GPS deben completar el campo con la dirección y datos de ubicación ricos disponibles.
- [ ] Al detectar múltiples peajes, Toll y Notes deben completarse según sección Peajes.

### 5.9 Register / Queue

- [x] Muestra pendientes, total pendiente y total del día en cabecera/sticky summary.
- [x] Acciones existentes: Quick, Full Edit, Delete, selección y publicación a Ledger.
- [ ] Cada tarjeta debe ser una representación completa y editable de lo entrado en Daily Entry.
- [ ] Datos a mostrar y poder corregir: invoice/reference, plataforma, pickup, drop-off, coordenadas/GPS cuando existan, fare, tips, extras, other cash, toll(s), fee, millas, fecha/hora y notes.
- [ ] Mantener total de Register claramente visible arriba.
- [ ] Considerar totales útiles adicionales: viajes pendientes, total de hoy y total general pendiente; no añadir métricas que reduzcan claridad.
- [ ] Validar Full Edit para que abre/edita todos los campos; Quick para correcciones rápidas.

### 5.10 Financial Statement y Reports

- [ ] Deben usar datos conservados en localStorage/backup: viajes, ingresos, peajes, gastos, horas, millas y deducciones.
- [ ] Tolls, total de millas anual y cálculo de deducción IRS deben aparecer en reporte financiero futuro.
- [ ] Mantener trazabilidad: cada transacción debe conservar ruta, importes, tolls y notas necesarios para auditoría/revisión.
- [ ] Antes de usar para impuestos reales, revisar las reglas/impuestos con profesional fiscal; la app debe reflejar datos y cálculos, no sustituir asesoría fiscal.

---

## 6. Archivos e Issues creados en este seguimiento

### Issue #1 — Multi-toll, IRS 2026 y odómetro anual

- Issue GitHub: #1.
- Archivo: `.agents/memory/toll-mileage-dashboard-patch.md`.
- Estado: **instrucciones documentadas; no aplicar/confirmar como terminado hasta modificar código, compilar y probar**.
- Incluye: multi-toll, notes para 2+ peajes, IRS 2026 por rango de fechas, widget anual de odómetro/deducción.

### Issue #2 — TomTom Reverse Geocoding

- Issue GitHub: #2.
- Archivo: `.agents/memory/tomtom-geocoding-patch.md`.
- Estado: **requiere revisión/adaptación a Cloudflare Worker antes de aplicar**.
- Nunca insertar clave TomTom en patch, repo o frontend.
- Conserva Nominatim como fallback.

---

## 7. Orden acordado de trabajo

1. Mantener y actualizar esta bitácora al acordar requisitos o completar tareas.
2. Completar la revisión/terminación de Dashboard: gauge de referencia, datos diarios/semanales, turno, historial y odómetro anual.
3. Aplicar y validar multi-toll + IRS 2026 por fecha + odómetro anual (Issue #1) en una rama de trabajo.
4. Revisar Daily Entry campo por campo con el usuario; asegurar GPS pickup/drop-off y placeholders claros.
5. Completar Register editable para que reproduzca todos los datos de Daily Entry.
6. Crear Cloudflare Worker para TomTom, configurar secreto y probar fallback (Issue #2 adaptado).
7. Desplegar por GitHub Actions/GitHub Pages y probar en teléfono real: logos, GPS, locations, peajes, millas, persistencia y edición de transacciones.
8. Completar Financial Statement y Reports a partir de datos reales almacenados.

---

## 8. Regla de cierre y validación

Una tarea solo puede marcarse `[x]` cuando se cumpla todo lo siguiente:

1. El requisito está implementado en código.
2. El build termina sin errores.
3. GitHub Actions despliega correctamente a GitHub Pages.
4. El usuario verifica la función o UI en el teléfono/link público.
5. Se actualiza esta bitácora y el Issue asociado con resultado, fecha y cualquier ajuste acordado.

---

## 9. Registro de decisiones de esta conversación

- Se confirmó que el proyecto activo es la app publicada en GitHub Pages, no un prototipo antiguo pegado en chat.
- Se identificó que el código simple antiguo era una versión previa y no debe guiar el trabajo actual.
- Se confirmó que Throo ya figura como plataforma existente.
- Se confirmó que el sistema actual tiene logos en el repo, pero deben validarse en el deploy.
- Se acordó priorizar Dashboard, luego Daily Entry y Register, sin perder los datos necesarios para reportes/taxes.
- Se acordó usar un documento maestro persistente en GitHub para evitar perder contexto entre sesiones.
