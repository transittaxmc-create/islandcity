# MASTER PROJECT SPECIFICATION — ISLAND CITY TIP TRACKER / DAILY ENTRY / REGISTER APP

> Fuente de verdad entregada por el usuario (2026-09-01). Supercede donde conflicte
> con EI Program v2.0 (Netlify) y con `.agents/memory/project-master-plan.md`.
> NOTA: la sección de QUEUE/RECEIPTS llegó truncada en la conversación — pedir al
> usuario la parte faltante (PAGE 2 QUEUE + lógica de escaneo OCR).

PURPOSE OF THIS DOCUMENT:
This is the complete support document of everything discussed and concluded for this app. Analyze it fully. This is pure layout and logic. Use it to understand what we are building, how each section works, and ensure your build contemplates all of it. This is the single source of truth.

PROJECT OVERVIEW:
App for a NYC driver (5 boroughs + NJ + CT) to track income and spend while driving. Must be pa-pa-pa fast, one page, no scrolling, large touch targets 60px-64px for thumb, elegant dark mode #000 / #0A0A0A / #1A1A1A with gold #FFD700 / #332F1A and neon green #00FF6A. Usable while driving without looking much.

DESIGN SYSTEM:
Background #0A0A0A, text white 20px bold, yellow accent #FFD700, orange #FF8C00 for pending, green #00FF6A / #4ADE80 for PAID. Buttons 60-64px high. Circular icons with yellow border. Paperclip 📎 for receipts. Tabs: Daily Entry / Queue / Ledger (Register All Expenses).

PAGE 1: DAILY ENTRY - CONSTITUTION OF 4 IMAGES - MAIN INCOME ENTRY

A) TOP HEADER:
- Tabs Daily Entry / Queue / Ledger
- DAILY ENTRY title + NET TRIP TOTAL $0.00 gold large
- DateTime auto: Aug 28, 2026 11:37 PM
- GRAND TOTAL = GROSS + TOLLS + EXTRA CASH + TIPS - PLATFORM FEE (gold bar)

B) FARE TYPE:
Options: Uber (black UBER logo no white border), Lyft (pink lyft large), Gallant Luxury Service 212-304-0707 (gold selected). Color distinguishes.

C) REVENUE SOURCE / PAYING PLATFORM - DROPDOWN WITH LOGOS - CRITICAL:
Dropdown large with border gold and ▼. Must show logos intact with effect. Complete list:
Uber, Lyft, Empower, Island City Transit, Via, Curb, Arro, Juno, Gett, Revel, Local Ride, Gataxi (Voucher), Aki Technology / All Technology (ACCESS-A-RIDE), TBZI Luxury, Gallant / Gallant VOUCHER, Aventus Ride, Classic Ryde, EcoRide, Transit Tax, Throo, Brakha Group, JBE Uber, Other.
User will add more later. Each logo important for OCR and fee logic.

D) GROSS FARE / GROSS REVENUE / INGRESO ($) - Gold border, $0.00 default. Main fare without extras. Required, if $0.00 block POST.

E) ORIGIN & DESTINATION - GPS AUTO:
- ORIGIN: Pickup Location - lat/lng 40.6682, -73.3841 + green GPS button + accuracy ±7m + address West Granada Avenue, Copiague + red dot 📍 + CAPTURE button. Text "GPS tag automático"
- DESTINATION: Drop-off Location - Street, City + blue GPS button
- Logic: navigator.geolocation.getCurrentPosition/watchPosition enableHighAccuracy:true. Saves lat,lng,accuracy, reverse address. If accuracy >20m yellow warning but saves. Optional manual entry.

F) TRIP MILEAGE - START TRACKING:
- Blue button START TRACKING ▶ + 0.00 mi + pencil ✏️ + "Tap before you start driving"
- Logic: On tap, starts watchPosition every 5s, haversine distance accumulation to totalMiles. On stop saves final miles. Manual edit via pencil.

G) ADDITIONAL INCOME & DEDUCTIONS - 4 GREEN BOXES with gold border #332F1A background #0A0A0A:
1. TIPS (GRATUITY) $0.00 - Cash tip from passenger, adds directly to NET TOTAL, no fee.
2. OTHER CASH INCOME = CASH REC ($) $0.00 - Other cash income outside app, adds directly.
3. TOLL REIMB. GPS AUTO $0.00 with green pill GPS AUTO - Auto-filled by toll detection system (see tolls logic). Reimbursement income.
4. PLATFORM COMM. = PLATFORM FEE $0.00 - Commission taken by platform, subtracts.

Formula Daily Entry:
NET TRIP TOTAL = GROSS FARE + TIPS + OTHER CASH + TOLL REIMB - PLATFORM COMM

H) FOOTER:
- REF Invoice / reference - Auto REF: IC-8821 + AUTO • 8822 total gold
- NOTE: Surge, traffic...
- + GRABAR EN DISCO yellow button 64px - On tap saves trip as trip_YYYY-MM-DD_IC-XXXX.json with original+enhanced+OCR JSON to localStorage/disk, pushes to Queue, updates Dashboard

[SECCIÓN TRUNCADA EN LA CONVERSACIÓN — PAGE 2 QUEUE (Quick/Full Edit/Delete) + RECEIPTS/OCR]

...(continúa con el flujo E-ZPass)...

E-ZPass transaction to top linear list, rendered IDENTICAL to other rows: E-Z icon + E-ZPass NY + $42.50 + 📎 + PAGADO green
3. Show footer: All expenses settled • No pending items + Settlement complete • Updated Date
Result: No bottom panel, clean register all linear.

STATE C - NEXT DAY CYCLE (PANEL RE-OPENS):
Next end-of-day close generates new POR PAGAR transaction.
Bottom panel OPENS AGAIN automatically for new scan.
Loop: Open -> Paid -> Disappear -> New Day -> Open.

Visibility Rule Code:
const pendingEzPass = transactions.filter(t => t.type === 'EZPASS_DAILY' && t.status === 'POR_PAGAR');
if (pendingEzPass.length > 0) {
  showBottomPanel = true;
  renderBottomPanel(pendingEzPass[0]);
} else {
  showBottomPanel = false;
  renderAllTransactionsLinearAtTop();
}

Spend Formula:
TOTAL SPEND = sum of all PAID + PAGADO
REAL PROFIT = GRAND TOTAL (Income from Daily Entry) - TOTAL SPEND (Expenses from Ledger)

DASHBOARD / HOURLY ADVISOR / RUEDA CENTRADA v6.2:
- Calculates: HoursWorked = Now - StartTrackingTime
- $/hr AHORA = GRAND TOTAL TODAY / HoursWorked -> Display centered above wheel $65.40
- Wheel SVG pivot 150,140 exact center, arcs around same point, centered mx-auto max-w-300px h-160px, number text-center w-full mb-8px
- TARGET VS ACTUAL: Compare $/hr actual vs target ($45/hr). Green if above, orange/red if below.
- PERFORMANCE HISTORY: Last 7 days $/hr chart
- ADVISOR PANEL: If $/hr < target, advise "Move to Manhattan" / "Activate Lyft" using GPS + history
- GPS tolls + TomTom integration, START green pulsing button

TOLLS / GPS AUTO DETECTION LOGIC:
Method v8.0 offline no API:
1. navigator.geolocation.watchPosition enableHighAccuracy:true every 2-3s lat/lng
2. Fixed list coords for all tolls: RFK 40.7812,-73.9515, Verrazzano 40.6066,-74.0444, Henry Hudson 40.8777,-73.8866, GWB/Lincoln/Holland, Bayonne/Goethals/Outerbridge, Cross Bay/Marine Parkway + NJ + CT + 5 boroughs
3. Haversine calc if distance <300m bridge or <500m tunnel => mark crossed
4. Anti-repeat: localStorage lastTollTimes cooldown 24h per toll
5. Peak/Off-peak: Weekdays 6AM-10AM and 4PM-8PM, Weekends 11AM-9PM. Peak $16.79, Off $14.79 (2026)
6. Auto-action: auto-fill TOLLS field in Daily Entry + notification "Toll detectado: Verrazzano $6.55 E-ZPass" + vibration
Pricing: Must use discounted E-ZPass prices NOT Pay by Mail $10.17/$22.38. 2025 prices: RFK $6.55, Verrazzano $6.55 with rebate $2.75, Henry Hudson $3.42, GWB/Lincoln/Holland $16.06 peak 2025 / $16.79 peak 2026, Cross Bay $2.45. Update for 2025-2026 discounted with device 20-26, different for 20-25.

Method v8.1 TomTom optional:
Map Matching corrects GPS to road, Geofencing polygon exact entry/exit + direction (one-way for Verrazzano and NJ one-way tolls), Toll Costs API returns exact E-ZPass price using API key.

FILE SYSTEM & AUDIT:
- Save per receipt: original + enhanced + OCR JSON
- Paperclip opens both images
- Export audit report
- Invoice REF auto increment

GLOBAL ACCEPTANCE CRITERIA:
AC1 Daily Entry fields large 60px, distinguishable by border color, fits one screen no long scroll, elegant.
AC2 Platform dropdown shows all logos intact.
AC3 GPS auto fills Origin/Destination and Tolls, works offline.
AC4 Toll detection no duplicate within 24h, peak pricing correct, discounted E-ZPass not Pay by Mail.
AC5 When E-ZPass POR PAGAR bottom panel VISIBLE with orange badge and waiting box.
AC6 When E-ZPass PAGADO bottom panel COMPLETELY GONE and transaction appears linear at top with PAGADO green + paperclip.
AC7 Normal receipts always create linear PAID rows at top instantly.
AC8 Panel auto opens on End of Day and auto closes on payment scan, no manual close button.
AC9 Dashboard $/hr calculation correct, wheel centered perfectly with number.
AC10 All data saved to disk for audit.

