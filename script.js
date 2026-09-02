const KEY = 'islandcity-driver-ledger-v1';
const SHIFT_KEY = 'islandcity-driver-shift-v1';
const REGISTER_VERSION = 2;
const IRS_MILEAGE_RATE_USD = 0.70;
const LOCATION_CATEGORIES = ['Hospital', 'City', 'Home', 'Suburbs', 'Office', 'Airport', 'Restaurant', 'Train/Bus', 'Hotel', 'Tourist'];
const AIRPORTS = [
  { name: 'JFK Airport', lat: 40.6413, lng: -73.7781 },
  { name: 'LaGuardia Airport', lat: 40.7769, lng: -73.8740 },
  { name: 'Newark Airport', lat: 40.6895, lng: -74.1745 }
];
const now = new Date();
const iso = (offset = 0, hour = 9) => {
  const d = new Date(now);
  d.setDate(d.getDate() + offset);
  d.setHours(hour, offset < 0 ? 30 : 0, 0, 0);
  return d.toISOString();
};
const seed = {
  trips: [
    { id: 't-1', date: iso(0, 7), pickup: 'Harbour Centre', dropoff: 'YVR Terminal', platform: 'IslandCity', distance: 22.4, grossFare: 48.50, tip: 7.50, toll: 4.25, platformFee: 3.00, adjustment: 0, note: 'Airport run', status: 'Reconciled' },
    { id: 't-2', date: iso(0, 10), pickup: 'Kitsilano', dropoff: 'Gastown', platform: 'IslandCity', distance: 8.7, grossFare: 24.00, tip: 0, toll: 0, platformFee: 0, adjustment: 0, note: 'Awaiting invoice and payment details', status: 'Pending' },
    { id: 't-3', date: iso(-1, 8), pickup: 'Coal Harbour', dropoff: 'UBC', platform: 'IslandCity', distance: 14.1, grossFare: 38.25, tip: 0, toll: 0, platformFee: 2.50, adjustment: 1.25, note: 'Adjusted to invoice', status: 'Reconciled' },
    { id: 't-4', date: iso(-2, 18), pickup: 'Richmond Centre', dropoff: 'Yaletown', platform: 'Street hail', distance: 17.8, grossFare: 42.75, tip: 6.25, toll: 0, platformFee: 0, adjustment: 0, note: '', status: 'Closed' },
    { id: 't-5', date: iso(-3, 12), pickup: 'Commercial Drive', dropoff: 'North Vancouver', platform: 'IslandCity', distance: 19.3, grossFare: 51.00, tip: 8.00, toll: 0, platformFee: 3.25, adjustment: 0, note: 'Bridge traffic', status: 'Closed' }
  ],
  expenses: [
    { id: 'e-1', date: iso(0, 6), category: 'Fuel', vendor: 'Petro-Canada · Main St', amount: 63.42, note: '' },
    { id: 'e-2', date: iso(-1, 14), category: 'Maintenance', vendor: 'Harbour Auto Care', amount: 118.00, note: 'Oil + filter' },
    { id: 'e-3', date: iso(-3, 9), category: 'Supplies', vendor: 'Pacific Car Wash', amount: 18.50, note: '' }
  ],
  tolls: [
    { id: 'o-1', date: iso(0, 8), location: 'Oak Street Bridge', amount: 4.25, direction: 'Northbound' },
    { id: 'o-2', date: iso(-1, 19), location: 'Port Mann Crossing', amount: 5.15, direction: 'Westbound' },
    { id: 'o-3', date: iso(-3, 15), location: 'Lions Gate Bridge', amount: 3.75, direction: 'Southbound' }
  ]
};
let db = load();
let currentPage = 'dashboard';
let modalType = 'trip';
let editingId = null;
let reportPeriod = 'week';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const money = n => Number(n || 0).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dateLabel = value => new Date(value).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });
const timeLabel = value => new Date(value).toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit' });
const isToday = date => new Date(date).toDateString() === new Date().toDateString();
const isThisWeek = date => Date.now() - new Date(date).getTime() < 7 * 86400000;
const statusOrder = { Pending: 0, Reconciled: 1, Closed: 2 };
const normalizeTrip = trip => ({
  ...trip,
  grossFare: Number(trip.grossFare ?? trip.fare ?? 0),
  tip: Number(trip.tip || 0),
  toll: Number(trip.toll || 0),
  platformFee: Number(trip.platformFee || 0),
  adjustment: Number(trip.adjustment || 0),
  // Existing records predate the Register workflow, so preserve them as
  // recorded/reconciled. New entries explicitly start as Pending below.
  status: trip.status || 'Reconciled',
});
const isPosted = trip => trip.status === 'Reconciled' || trip.status === 'Closed';
const totalTrip = trip => Number(trip.grossFare || trip.fare || 0) + Number(trip.tip || 0) + Number(trip.toll || 0) + Number(trip.adjustment || 0);
const netTrip = trip => totalTrip(trip) - Number(trip.platformFee || 0);
function load() {
  try {
    const stored = JSON.parse(localStorage.getItem(KEY));
    if (stored?.trips && stored?.expenses && stored?.tolls) {
      const isLegacySample = stored.trips.length === seed.trips.length &&
        stored.trips.every(trip => /^t-[1-5]$/.test(trip.id));
      const isLegacyLedger = stored.registerVersion !== REGISTER_VERSION ||
        stored.trips.some(trip => trip.grossFare === undefined && trip.fare !== undefined) ||
        (isLegacySample && stored.trips.every(trip => trip.status === 'Pending'));
      const trips = stored.trips.map(trip => normalizeTrip(isLegacyLedger ? { ...trip, status: 'Reconciled' } : trip));
      const migrated = { ...stored, registerVersion: REGISTER_VERSION, trips };
      if (isLegacyLedger) localStorage.setItem(KEY, JSON.stringify(migrated));
      return migrated;
    }
  } catch (e) { /* use seed */ }
  return { ...structuredClone(seed), registerVersion: REGISTER_VERSION, trips: seed.trips.map(normalizeTrip) };
}
function save() { localStorage.setItem(KEY, JSON.stringify(db)); }
function loadShift() {
  try {
    const stored = JSON.parse(localStorage.getItem(SHIFT_KEY));
    if (stored && typeof stored === 'object') return stored;
  } catch (e) { /* use an inactive shift */ }
  return { active: false, onBreak: false, clockIn: null, breakStarted: null, breakMs: 0, hours: [] };
}
let shift = loadShift();
let gpsWatchId = null;
let gps = { status: 'inactive', lat: null, lng: null, accuracy: null, address: '', airport: '' };
function saveShift() { localStorage.setItem(SHIFT_KEY, JSON.stringify(shift)); }
function haversineKm(lat1, lng1, lat2, lng2) {
  const toRad = degrees => degrees * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function irsMileageValue(distanceKm) {
  return Number(distanceKm || 0) / 1.609344 * IRS_MILEAGE_RATE_USD;
}
function tripIrsValue(trip) { return irsMileageValue(trip.distance); }
function toast(message, error = false) {
  const el = $('#toast');
  el.textContent = message;
  el.className = `toast show${error ? ' error' : ''}`;
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => el.className = 'toast', 2600);
}
function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}
function activeShiftMs() {
  if (!shift.active || !shift.clockIn) return 0;
  const breakMs = Number(shift.breakMs || 0) +
    (shift.onBreak && shift.breakStarted ? Date.now() - shift.breakStarted : 0);
  return Math.max(0, Date.now() - shift.clockIn - breakMs);
}
function updateShiftUI() {
  const elapsed = activeShiftMs();
  const status = $('#shiftStatus');
  const clock = $('#shiftClock');
  const gpsStatus = $('#gpsStatus');
  if (clock) clock.textContent = formatDuration(elapsed);
  if (status) {
    status.textContent = shift.active ? (shift.onBreak ? 'On break' : 'On route') : 'Off duty';
    status.className = `shift-badge ${shift.active ? 'active' : ''} ${shift.onBreak ? 'break' : ''}`;
  }
  if (gpsStatus) {
    const labels = { active: 'GPS ready', searching: 'Finding GPS', error: 'GPS unavailable', inactive: 'Not active' };
    gpsStatus.textContent = labels[gps.status] || 'Not active';
    gpsStatus.className = `gps-${gps.status}`;
  }
  $$('[data-shift-action]').forEach(button => {
    const action = button.dataset.shiftAction;
    button.disabled = action === 'start' ? shift.active : action === 'break' || action === 'end' ? !shift.active : false;
    if (action === 'break') button.textContent = shift.onBreak ? 'Resume Route' : 'Start Break';
  });
}
function updateGpsLocation(position) {
  gps = {
    ...gps,
    lat: position.coords.latitude,
    lng: position.coords.longitude,
    accuracy: position.coords.accuracy,
    status: 'active'
  };
  const nearest = AIRPORTS
    .map(airport => ({ ...airport, distance: haversineKm(gps.lat, gps.lng, airport.lat, airport.lng) }))
    .sort((a, b) => a.distance - b.distance)[0];
  gps.airport = nearest && nearest.distance <= 15 ? `${nearest.name} · ${nearest.distance.toFixed(1)} km` : '';
  updateShiftUI();
}
function startGPS() {
  if (!navigator.geolocation) {
    gps = { ...gps, status: 'error' };
    updateShiftUI();
    return;
  }
  if (gpsWatchId !== null) navigator.geolocation.clearWatch(gpsWatchId);
  gps = { ...gps, status: 'searching' };
  updateShiftUI();
  gpsWatchId = navigator.geolocation.watchPosition(
    updateGpsLocation,
    () => { gps = { ...gps, status: 'error' }; updateShiftUI(); },
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
  );
}
function stopGPS() {
  if (gpsWatchId !== null) navigator.geolocation.clearWatch(gpsWatchId);
  gpsWatchId = null;
  gps = { ...gps, status: 'inactive' };
  updateShiftUI();
}
function handleShiftAction(action) {
  if (action === 'start' && !shift.active) {
    shift = { ...shift, active: true, onBreak: false, clockIn: Date.now(), breakStarted: null, breakMs: 0 };
    saveShift();
    startGPS();
    toast('Shift started. GPS tracking requested.');
  } else if (action === 'break' && shift.active) {
    if (shift.onBreak && shift.breakStarted) {
      shift = { ...shift, onBreak: false, breakMs: shift.breakMs + Date.now() - shift.breakStarted, breakStarted: null };
      toast('Route resumed.');
    } else {
      shift = { ...shift, onBreak: true, breakStarted: Date.now() };
      toast('Break started.');
    }
    saveShift();
  } else if (action === 'end' && shift.active) {
    const hours = activeShiftMs() / 3600000;
    const entry = { date: new Date().toISOString(), hours, clockIn: new Date(shift.clockIn).toISOString(), clockOut: new Date().toISOString(), breakMs: shift.breakMs + (shift.onBreak && shift.breakStarted ? Date.now() - shift.breakStarted : 0) };
    shift = { active: false, onBreak: false, clockIn: null, breakStarted: null, breakMs: 0, hours: [entry, ...(shift.hours || [])].slice(0, 60) };
    saveShift();
    stopGPS();
    toast(`Shift ended. ${hours.toFixed(2)} active hours saved.`);
  }
  updateShiftUI();
  renderDashboard();
}
function icon(type) {
  const icons = {
    trip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 17h16M5 17l1.4-7.1A2 2 0 0 1 8.36 8.3h7.28a2 2 0 0 1 1.96 1.6L19 17M7 12h10"/></svg>',
    expense: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h4"/></svg>',
    toll: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="8"/><path d="M9 12h6M12 9v6"/></svg>'
  };
  return icons[type];
}
function page(name) {
  currentPage = name;
  $$('.page').forEach(el => el.classList.toggle('active', el.id === `page-${name}`));
  $$('.nav-btn[data-page]').forEach(el => el.classList.toggle('active', el.dataset.page === name));
  if (name === 'dashboard') renderDashboard();
  if (name === 'trips') renderTrips();
  if (name === 'expenses') renderExpenses();
  if (name === 'tolls') renderTolls();
  if (name === 'reports') renderReports();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function filterDate(value, filter) {
  if (filter === 'today') return isToday(value);
  if (filter === 'week') return isThisWeek(value);
  return true;
}
function filterTrip(value, filter) {
  if (['pending', 'reconciled', 'closed'].includes(filter)) return value.status.toLowerCase() === filter;
  return filterDate(value.date, filter);
}
function allCosts(todayOnly = false) {
  return db.expenses.reduce((a, x) => a + Number(x.amount), 0) + db.tolls.reduce((a, x) => a + Number(x.amount), 0);
}
function renderDashboard() {
  const trips = db.trips.filter(x => isToday(x.date) && isPosted(x));
  const pendingTrips = db.trips.filter(x => isToday(x.date) && !isPosted(x));
  const expenses = db.expenses.filter(x => isToday(x.date));
  const tolls = db.tolls.filter(x => isToday(x.date));
  const gross = trips.reduce((a, x) => a + totalTrip(x), 0);
  const costs = expenses.reduce((a, x) => a + Number(x.amount), 0) + tolls.reduce((a, x) => a + Number(x.amount), 0);
  $('#dashNet').textContent = money(gross - costs);
  $('#dashGross').textContent = money(trips.reduce((a, x) => a + Number(x.grossFare || 0), 0));
  $('#dashCosts').textContent = money(costs);
  $('#dashAvg').textContent = money(trips.length ? gross / trips.length : 0);
  $('#dashTolls').textContent = money(tolls.reduce((a, x) => a + Number(x.amount), 0));
  $('#dashTripCount').textContent = `${trips.length} posted · ${pendingTrips.length} pending`;
  $('#dashStatus').textContent = gross - costs > 100 ? 'Strong run' : gross - costs > 0 ? 'On track' : trips.length ? 'Costs exceeding earnings' : 'No posted trips yet';
  const mileageValue = db.trips.filter(x => isToday(x.date)).reduce((a, x) => a + tripIrsValue(x), 0);
  if ($('#dashIrsDeduction')) $('#dashIrsDeduction').textContent = `$${money(mileageValue)}`;
  updateShiftUI();
  const activity = [
    ...db.trips.map(x => ({ ...x, type: 'trip', sort: x.date, title: `${x.pickup} → ${x.dropoff}`, meta: `${dateLabel(x.date)} · ${x.platform} · ${x.status}`, amount: netTrip(x), sign: isPosted(x) ? '+' : '·' })),
    ...db.expenses.map(x => ({ ...x, type: 'expense', sort: x.date, title: x.category, meta: `${dateLabel(x.date)} · ${x.vendor}`, amount: x.amount, sign: '−' })),
    ...db.tolls.map(x => ({ ...x, type: 'toll', sort: x.date, title: x.location, meta: `${dateLabel(x.date)} · ${x.direction}`, amount: x.amount, sign: '−' }))
  ].sort((a, b) => new Date(b.sort) - new Date(a.sort)).slice(0, 5);
  $('#recentActivity').innerHTML = activity.length ? activity.map(x => `<div class="activity-item"><div class="activity-icon ${x.type}">${icon(x.type)}</div><div class="activity-copy"><b>${esc(x.title)}</b><span>${esc(x.meta)}</span></div><div class="activity-amount ${x.sign === '+' ? 'income' : x.sign === '·' ? 'pending-amount' : 'outgoing'}">${x.sign === '·' ? 'Pending' : `${x.sign}$${money(x.amount)}`}</div></div>`).join('') : empty('No activity yet', 'Log your first trip to start the ledger.');
  // Shift hours log
  const shiftLog = $('#shiftLog');
  if (shiftLog) {
    const history = (shift.hours || []).slice(0, 10);
    if (history.length === 0) {
      shiftLog.innerHTML = `<div class="empty-state" style="padding:1.2rem 0"><b>No completed shifts yet</b><p>End a shift to record your active driving hours here.</p></div>`;
    } else {
      const weekMs = 7 * 86400000;
      const weekHours = history.filter(s => Date.now() - new Date(s.date).getTime() < weekMs).reduce((a, s) => a + Number(s.hours || 0), 0);
      shiftLog.innerHTML = `<div class="shift-log-week">This week: <strong>${weekHours.toFixed(2)} active hours</strong></div>` +
        history.map(s => {
          const breakH = (Number(s.breakMs || 0) / 3600000).toFixed(2);
          return `<div class="activity-item"><div class="activity-icon trip"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l2.5 2.5"/></svg></div><div class="activity-copy"><b>${dateLabel(s.date)}</b><span>${new Date(s.clockIn).toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit' })} – ${new Date(s.clockOut).toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit' })}</span></div><div class="activity-amount income">${Number(s.hours).toFixed(2)} h${Number(breakH) > 0 ? ` · ${breakH} h break` : ''}</div></div>`;
        }).join('');
    }
  }
  const dailyTarget = 250;
  $('#glance').innerHTML = [
    ['Posted Gross Earnings', gross, dailyTarget, '$'],
    ['Posted Trips', trips.length, 8, ''],
    ['Pending Trips for Reconciliation', pendingTrips.length, 4, '']
  ].map(([label, value, max, prefix]) => `<div class="overview-row"><div><span>${label}</span><span class="value">${prefix}${prefix ? money(value) : value}</span></div><div class="track"><i style="width:${Math.min(100, Math.max(4, value / max * 100))}%"></i></div></div>`).join('');
}
function empty(title, body) { return `<div class="empty-state">${icon('trip')}<b>${title}</b><p>${body}</p></div>`; }
function esc(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c])); }
function matchesFilter(date, filter) { return filterDate(date, filter); }
function renderTrips() {
  const query = ($('#tripSearch')?.value || '').toLowerCase();
  const filter = $('#tripFilter')?.value || 'all';
  const rows = db.trips.filter(x => filterTrip(x, filter) && `${x.pickup} ${x.dropoff} ${x.platform} ${x.note}`.toLowerCase().includes(query)).sort((a, b) => new Date(b.date) - new Date(a.date));
  const pending = rows.filter(x => x.status === 'Pending').length;
  const posted = rows.filter(isPosted);
  $('#tripShown').textContent = `${rows.length} trip${rows.length === 1 ? '' : 's'}`;
  $('#tripPending').textContent = `${pending} trip${pending === 1 ? '' : 's'}`;
  $('#tripGross').textContent = `$${money(posted.reduce((a, x) => a + netTrip(x), 0))}`;
  $('#tripIrsDeduction').textContent = `$${money(rows.reduce((a, x) => a + tripIrsValue(x), 0))}`;
  $('#tripEntries').innerHTML = rows.length ? rows.map(tripRow).join('') : empty('No trips match', 'Try another filter or add a new trip.');
}
function tripRow(x) {
  const next = x.status === 'Pending' ? 'Reconciled' : x.status === 'Reconciled' ? 'Closed' : null;
  const editButton = x.status === 'Closed' ? `<button class="mini-btn locked" title="Closed entries are locked" aria-label="Closed entry locked">${lock()}</button>` : `<button class="mini-btn" data-edit="trip:${x.id}" title="Edit trip">${pencil()}</button>`;
  const advanceButton = next ? `<button class="status-action" data-status="trip:${x.id}:${next}">${next === 'Closed' ? 'Close book' : 'Reconcile'}</button>` : '<span class="closed-note">Book closed</span>';
  const deleteButton = x.status === 'Closed' ? '' : `<button class="mini-btn delete" data-delete="trip:${x.id}" title="Delete trip">${trash()}</button>`;
  return `<div class="entry-row ${x.status.toLowerCase()}"><div class="entry-main"><div class="entry-title">${icon('trip')}<span>${esc(x.pickup)} → ${esc(x.dropoff)}</span><span class="status-badge ${x.status.toLowerCase()}">${x.status}</span></div><div class="entry-meta"><span>${dateLabel(x.date)} · ${timeLabel(x.date)}</span><em>Platform: ${esc(x.platform)}</em><em>${Number(x.distance || 0).toFixed(1)} km</em><em>Gross Earnings $${money(x.grossFare)}</em><em>Platform Fee −$${money(x.platformFee)}</em><em>IRS Value $${money(tripIrsValue(x))}</em></div></div><div><div class="entry-total ${isPosted(x) ? 'income' : 'pending-total'}">${isPosted(x) ? `+$${money(netTrip(x))}` : 'Pending'}</div><div class="entry-actions">${advanceButton}${editButton}${deleteButton}</div></div></div>`;
}
function renderExpenses() {
  const query = ($('#expenseSearch')?.value || '').toLowerCase();
  const filter = $('#expenseFilter')?.value || 'all';
  const rows = db.expenses.filter(x => matchesFilter(x.date, filter) && `${x.category} ${x.vendor} ${x.note}`.toLowerCase().includes(query)).sort((a, b) => new Date(b.date) - new Date(a.date));
  const total = rows.reduce((a, x) => a + Number(x.amount), 0);
  const categories = rows.reduce((a, x) => { a[x.category] = (a[x.category] || 0) + Number(x.amount); return a; }, {});
  const largest = Object.entries(categories).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
  $('#expenseShown').textContent = `${rows.length} entr${rows.length === 1 ? 'y' : 'ies'}`;
  $('#expenseTotal').textContent = `$${money(total)}`;
  $('#expenseLargest').textContent = largest;
  $('#expenseEntries').innerHTML = rows.length ? rows.map(expenseRow).join('') : empty('No expenses match', 'Capture fuel, maintenance, or supplies as you go.');
}
function expenseRow(x) {
  return `<div class="entry-row"><div class="entry-main"><div class="entry-title">${icon('expense')}<span>${esc(x.category)}</span></div><div class="entry-meta"><span>${dateLabel(x.date)} · ${timeLabel(x.date)}</span><em>${esc(x.vendor)}</em>${x.note ? `<em>${esc(x.note)}</em>` : ''}</div></div><div><div class="entry-total outgoing">−$${money(x.amount)}</div><div class="entry-actions"><button class="mini-btn" data-edit="expense:${x.id}" title="Edit expense">${pencil()}</button><button class="mini-btn delete" data-delete="expense:${x.id}" title="Delete expense">${trash()}</button></div></div></div>`;
}
function renderTolls() {
  const query = ($('#tollSearch')?.value || '').toLowerCase();
  const filter = $('#tollFilter')?.value || 'all';
  const rows = db.tolls.filter(x => matchesFilter(x.date, filter) && `${x.location} ${x.direction}`.toLowerCase().includes(query)).sort((a, b) => new Date(b.date) - new Date(a.date));
  const total = rows.reduce((a, x) => a + Number(x.amount), 0);
  $('#tollShown').textContent = `${rows.length} crossing${rows.length === 1 ? '' : 's'}`;
  $('#tollTotal').textContent = `$${money(total)}`;
  $('#tollAverage').textContent = `$${money(rows.length ? total / rows.length : 0)}`;
  $('#tollEntries').innerHTML = rows.length ? rows.map(tollRow).join('') : empty('No tolls match', 'Add a bridge or road charge when it happens.');
}
function tollRow(x) {
  return `<div class="entry-row"><div class="entry-main"><div class="entry-title">${icon('toll')}<span>${esc(x.location)}</span></div><div class="entry-meta"><span>${dateLabel(x.date)} · ${timeLabel(x.date)}</span><em>${esc(x.direction)}</em></div></div><div><div class="entry-total outgoing">−$${money(x.amount)}</div><div class="entry-actions"><button class="mini-btn" data-edit="toll:${x.id}" title="Edit toll">${pencil()}</button><button class="mini-btn delete" data-delete="toll:${x.id}" title="Delete toll">${trash()}</button></div></div></div>`;
}
function renderReports() {
  const days = reportPeriod === 'week' ? 7 : 30;
  const cutoff = Date.now() - days * 86400000;
  const trips = db.trips.filter(x => new Date(x.date).getTime() >= cutoff && isPosted(x));
  const registerTrips = db.trips.filter(x => new Date(x.date).getTime() >= cutoff);
  const pendingTrips = registerTrips.filter(x => !isPosted(x));
  const expenses = db.expenses.filter(x => new Date(x.date).getTime() >= cutoff);
  const tolls = db.tolls.filter(x => new Date(x.date).getTime() >= cutoff);
  const gross = trips.reduce((a, x) => a + Number(x.grossFare || 0), 0);
  const tips = trips.reduce((a, x) => a + Number(x.tip || 0), 0);
  const tripTolls = trips.reduce((a, x) => a + Number(x.toll || 0), 0);
  const platformFees = trips.reduce((a, x) => a + Number(x.platformFee || 0), 0);
  const adjustments = trips.reduce((a, x) => a + Number(x.adjustment || 0), 0);
  const expenseTotal = expenses.reduce((a, x) => a + Number(x.amount), 0);
  const tollTotal = tolls.reduce((a, x) => a + Number(x.amount), 0);
  const statementNet = gross + tips + tripTolls + adjustments - platformFees - expenseTotal - tollTotal;
  $('#reportNet').textContent = money(statementNet);
  $('#reportNote').textContent = `${pendingTrips.length} pending trip${pendingTrips.length === 1 ? '' : 's'} excluded · posted entries only`;
  $('#reportTrips').textContent = `${trips.length} posted trip${trips.length === 1 ? '' : 's'} · ${trips.reduce((a, x) => a + Number(x.distance || 0), 0).toFixed(1)} km`;
  $('#reportRange').textContent = reportPeriod === 'week' ? 'Last 7 days' : 'Last 30 days';
  const snapshot = [['Gross Fare Revenue', gross, 1], ['Tips and Trip Toll Charges', tips + tripTolls, gross || 1], ['Platform Fees Paid', platformFees, gross || 1], ['Operating Expenses and Tolls', expenseTotal + tollTotal, gross || 1]];
  $('#reportSnapshot').innerHTML = snapshot.map(([label, value, max]) => `<div class="breakdown-row"><label>${label}</label><div class="track"><i style="width:${Math.min(100, Math.max(value ? 7 : 0, value / max * 100))}%"></i></div><b>$${money(value)}</b></div>`).join('');
  const chartDays = reportPeriod === 'week' ? 7 : 14;
  const chart = Array.from({ length: chartDays }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (chartDays - 1 - i)); return d;
  });
  const amounts = chart.map(d => trips.filter(x => new Date(x.date).toDateString() === d.toDateString()).reduce((a, x) => a + totalTrip(x), 0));
  const max = Math.max(...amounts, 1);
  $('#reportChart').innerHTML = chart.map((d, i) => `<div class="bar-col"><div class="bar ${amounts[i] ? '' : 'dim'}" style="height:${Math.max(4, amounts[i] / max * 100)}%;animation-delay:${i * .035}s" title="$${money(amounts[i])}"></div><span>${d.toLocaleDateString('en-CA', { weekday: 'short' }).slice(0, 2)}</span></div>`).join('');
}
function pencil() { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m4 16-.7 4.7L8 20l11.5-11.5a2.1 2.1 0 0 0-3-3L5 17zM14.5 7.5l2 2"/></svg>'; }
function trash() { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 7h14m-9 4v6m4-6v6M8 7l.7-2h6.6l.7 2m-10 0 .7 13h10.6l.7-13"/></svg>'; }
function lock() { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>'; }
function openModal(type, id = null) {
  modalType = type; editingId = id;
  const source = id ? db[`${type}s`].find(x => x.id === id) : null;
  if (type === 'trip' && source?.status === 'Closed') {
    toast('Closed trips are locked. Reopen the book before editing.', true);
    return;
  }
  const title = id ? `Edit ${type === 'toll' ? 'Operating Toll Charge' : type}` : type === 'trip' ? 'Add Trip' : type === 'expense' ? 'Add Operating Expense' : 'Add Operating Toll Charge';
  $('#modalTitle').textContent = title;
  const dateValue = source?.date ? new Date(source.date).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16);
  const tripOptions = db.trips.filter(trip => trip.status !== 'Closed').map(trip => `<option value="${esc(trip.id)}" ${source?.linkedTripId === trip.id ? 'selected' : ''}>${esc(trip.pickup)} → ${esc(trip.dropoff)} · ${trip.status} · ${dateLabel(trip.date)}</option>`).join('');
  const gpsSummary = gps.lat && gps.lng ? `Current GPS · ${gps.lat.toFixed(5)}, ${gps.lng.toFixed(5)}${gps.accuracy ? ` · ±${Math.round(gps.accuracy)} m` : ''}` : 'GPS location not available';
  const fields = type === 'trip' ? `
    <div class="form-row"><div class="form-group"><label for="entryDate">Trip Date and Time</label><input class="field" id="entryDate" type="datetime-local" value="${dateValue}" required></div><div class="form-group"><label for="entryPlatform">Platform</label><select class="select" id="entryPlatform">${['IslandCity', 'Uber', 'Lyft', 'Street hail', 'Private booking', 'Other'].map(x => `<option ${source?.platform === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div></div>
    <div class="form-group"><label for="entryReference">Invoice or Trip Reference <small>optional</small></label><input class="field" id="entryReference" value="${esc(source?.reference || '')}" placeholder="e.g. INV-2026-001"></div>
    <div class="form-row"><div class="form-group"><label for="entryPickup">Pickup Location</label><div class="location-input"><input class="field" id="entryPickup" value="${esc(source?.pickup || '')}" placeholder="e.g. Harbour Centre" required><button type="button" class="location-button" data-location-action="pickup" aria-label="Use current GPS for Pickup Location">GPS</button></div><div class="location-tools"><button type="button" class="location-quick" data-location-menu="pickup">Quick Pickup</button><span id="pickupGpsHint" class="location-hint">${gpsSummary}</span></div></div><div class="form-group"><label for="entryDropoff">Drop-off Location</label><div class="location-input"><input class="field" id="entryDropoff" value="${esc(source?.dropoff || '')}" placeholder="e.g. YVR Terminal" required><button type="button" class="location-button" data-location-action="dropoff" aria-label="Use current GPS for Drop-off Location">GPS</button></div><div class="location-tools"><button type="button" class="location-quick" data-location-menu="dropoff">Quick Drop-off</button><span id="dropoffGpsHint" class="location-hint">${gpsSummary}</span></div></div></div>
    <div class="location-menu" id="locationMenu" hidden></div>
    <div class="form-row"><div class="form-group"><label for="entryFare">Gross Earnings <small>CAD · update during reconciliation</small></label><input class="field amount-field" id="entryFare" type="number" min="0" step=".01" value="${source?.grossFare ?? ''}" placeholder="0.00"></div><div class="form-group"><label for="entryTip">Tip Amount <small>CAD · update on this trip</small></label><input class="field amount-field" id="entryTip" type="number" min="0" step=".01" value="${source?.tip ?? 0}" placeholder="0.00"></div></div>
    <div class="form-row"><div class="form-group"><label for="entryToll">Trip Toll Charge <small>CAD · late tolls update this field</small></label><input class="field amount-field" id="entryToll" type="number" min="0" step=".01" value="${source?.toll ?? 0}" placeholder="0.00"></div><div class="form-group"><label for="entryFee">Platform Fee <small>CAD</small></label><input class="field amount-field" id="entryFee" type="number" min="0" step=".01" value="${source?.platformFee ?? 0}" placeholder="0.00"></div></div>
    <div class="form-row"><div class="form-group"><label for="entryAdjustment">Extra Fee or Adjustment <small>CAD · use a negative value for a deduction</small></label><input class="field amount-field" id="entryAdjustment" type="number" step=".01" value="${source?.adjustment ?? 0}" placeholder="0.00"></div><div class="form-group"><label for="entryDistance">Trip Distance <small>km · used for IRS value</small></label><input class="field amount-field" id="entryDistance" type="number" min="0" step=".1" value="${source?.distance ?? ''}" placeholder="0.0"></div></div>
    <div class="trip-total-preview"><span>Net Earnings Preview</span><strong id="tripNetPreview">$${money(source ? netTrip(source) : 0)}</strong></div>
    <div class="form-row"><div class="form-group"><label for="entryStatus">Register Status</label><select class="select" id="entryStatus">${source ? ['Pending', 'Reconciled', 'Closed'].map(x => `<option ${source.status === x ? 'selected' : ''}>${x}</option>`).join('') : '<option selected>Pending</option>'}</select><small class="field-help">Status advances only in Trip Register: Pending → Reconciled → Closed.</small></div><div class="form-group"><label for="entryNote">Trip Notes <small>optional</small></label><textarea class="field" id="entryNote" placeholder="Invoice, payment, late toll, or route detail">${esc(source?.note || '')}</textarea></div></div>` :
    type === 'expense' ? `
    <div class="form-row"><div class="form-group"><label for="entryDate">Expense Date and Time</label><input class="field" id="entryDate" type="datetime-local" value="${dateValue}" required></div><div class="form-group"><label for="entryCategory">Expense Category</label><select class="select" id="entryCategory">${['Fuel', 'Maintenance', 'Supplies', 'Insurance', 'Parking', 'Other'].map(x => `<option ${source?.category === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div></div>
    <div class="form-group"><label for="entryVendor">Vendor or Expense Description</label><input class="field" id="entryVendor" value="${esc(source?.vendor || '')}" placeholder="e.g. Petro-Canada · Main St" required></div>
    <div class="form-row"><div class="form-group"><label for="entryAmount">Expense Amount <small>CAD</small></label><input class="field amount-field" id="entryAmount" type="number" min="0" step=".01" value="${source?.amount ?? ''}" placeholder="0.00" required></div><div class="form-group"><label for="entryNote">Expense Notes <small>optional</small></label><input class="field" id="entryNote" value="${esc(source?.note || '')}" placeholder="Receipt or business detail"></div></div>` :
    `<div class="form-row"><div class="form-group"><label for="entryDate">Toll Date and Time</label><input class="field" id="entryDate" type="datetime-local" value="${dateValue}" required></div><div class="form-group"><label for="entryDirection">Travel Direction</label><select class="select" id="entryDirection">${['Northbound', 'Southbound', 'Eastbound', 'Westbound'].map(x => `<option ${source?.direction === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div></div>
    <div class="form-group"><label for="entryLinkedTrip">Related Trip Register Entry <small>select this when the toll belongs to an existing trip</small></label><select class="select" id="entryLinkedTrip"><option value="">Unassigned Operating Toll</option>${tripOptions}</select><small class="field-help">A related toll updates the existing trip record. It does not create a duplicate trip.</small></div>
    <div class="form-group"><label for="entryLocation">Toll Location</label><input class="field" id="entryLocation" value="${esc(source?.location || '')}" placeholder="e.g. Oak Street Bridge" required></div>
    <div class="form-group"><label for="entryAmount">Toll Charge Amount <small>CAD</small></label><input class="field amount-field" id="entryAmount" type="number" min="0" step=".01" value="${source?.amount ?? ''}" placeholder="0.00" required></div>`;
  $('#entryForm').innerHTML = `${fields}<div class="form-actions"><button type="button" class="button button-ghost" id="cancelModal">Cancel</button><button type="submit" class="button button-primary">${id ? 'Save Changes' : type === 'trip' ? 'Save Trip' : type === 'expense' ? 'Save Expense' : 'Save Operating Toll'}</button></div>`;
  $('#modalBackdrop').classList.add('open'); $('#modalBackdrop').setAttribute('aria-hidden', 'false');
  $('#entryForm').querySelector('input, select')?.focus();
  $$('input.amount-field', $('#entryForm')).forEach(input => input.addEventListener('input', updateTripPreview));
  $$('[data-location-action]', $('#entryForm')).forEach(button => button.addEventListener('click', () => fillCurrentLocation(button.dataset.locationAction)));
  $$('[data-location-menu]', $('#entryForm')).forEach(button => button.addEventListener('click', () => {
    const menu = $('#locationMenu');
    if (!menu) return;
    const field = button.dataset.locationMenu;
    menu.innerHTML = `<div class="location-menu-label">${field === 'pickup' ? 'Pickup Location Categories' : 'Drop-off Location Categories'}</div><div class="location-category-grid">${LOCATION_CATEGORIES.map(category => `<button type="button" class="location-category" data-location-category="${field}:${esc(category)}">${esc(category)}</button>`).join('')}</div>`;
    menu.hidden = false;
    $$('[data-location-category]', menu).forEach(categoryButton => categoryButton.addEventListener('click', () => {
      const [target, category] = categoryButton.dataset.locationCategory.split(':');
      const input = $(`#entry${target === 'pickup' ? 'Pickup' : 'Dropoff'}`);
      if (input) input.value = category;
      menu.hidden = true;
    }));
  }));
  updateTripPreview();
}
function closeModal() { $('#modalBackdrop').classList.remove('open'); $('#modalBackdrop').setAttribute('aria-hidden', 'true'); editingId = null; }
function updateTripPreview() {
  if (!$('#tripNetPreview')) return;
  const gross = Number($('#entryFare')?.value || 0);
  const tip = Number($('#entryTip')?.value || 0);
  const toll = Number($('#entryToll')?.value || 0);
  const fee = Number($('#entryFee')?.value || 0);
  const adjustment = Number($('#entryAdjustment')?.value || 0);
  $('#tripNetPreview').textContent = `$${money(gross + tip + toll + adjustment - fee)}`;
}
function fillCurrentLocation(field) {
  if (!gps.lat || !gps.lng) {
    startGPS();
    toast('GPS is finding your location. Tap GPS again when ready.');
    return;
  }
  const input = $(`#entry${field === 'pickup' ? 'Pickup' : 'Dropoff'}`);
  if (!input) return;
  input.value = `${field === 'pickup' ? 'Current Pickup' : 'Current Drop-off'} · ${gps.lat.toFixed(5)}, ${gps.lng.toFixed(5)}`;
  input.dataset.gpsLat = gps.lat;
  input.dataset.gpsLng = gps.lng;
  input.dataset.gpsAccuracy = gps.accuracy || '';
  toast(`${field === 'pickup' ? 'Pickup Location' : 'Drop-off Location'} updated from GPS.`);
}
function formSubmit(event) {
  event.preventDefault();
  const wasEditing = Boolean(editingId);
  const value = id => $(`#${id}`).value;
  const base = { id: editingId || `${modalType[0]}-${Date.now()}`, date: new Date(value('entryDate')).toISOString() };
  if (modalType === 'trip') {
    const existing = editingId ? db.trips.find(x => x.id === editingId) : null;
    const reference = value('entryReference').trim().toLowerCase();
    const pickup = value('entryPickup').trim().toLowerCase();
    const dropoff = value('entryDropoff').trim().toLowerCase();
    const platform = value('entryPlatform').trim().toLowerCase();
    const tripDate = new Date(value('entryDate')).getTime();
    const duplicate = !editingId && db.trips.find(trip => {
      if (reference && String(trip.reference || '').trim().toLowerCase() === reference) return true;
      return !reference &&
        String(trip.pickup || '').trim().toLowerCase() === pickup &&
        String(trip.dropoff || '').trim().toLowerCase() === dropoff &&
        String(trip.platform || '').trim().toLowerCase() === platform &&
        Math.abs(new Date(trip.date).getTime() - tripDate) <= 10 * 60 * 1000;
    });
    if (duplicate) {
      toast(`Possible duplicate trip. Edit Trip Register entry ${duplicate.id} instead of creating another.`, true);
      return;
    }
    const nextStatus = editingId ? value('entryStatus') : 'Pending';
    if (existing && statusOrder[nextStatus] > statusOrder[existing.status] + 1) {
      toast(`Move this trip to ${existing.status === 'Pending' ? 'Reconciled' : 'Closed'} first.`, true);
      return;
    }
    if (existing && statusOrder[nextStatus] < statusOrder[existing.status]) {
      toast('Register status only moves forward.', true);
      return;
    }
    Object.assign(base, {
      pickup: value('entryPickup').trim(),
      dropoff: value('entryDropoff').trim(),
      platform: value('entryPlatform'),
      reference: value('entryReference').trim(),
      grossFare: Number(value('entryFare') || 0),
      tip: Number(value('entryTip') || 0),
      toll: Number(value('entryToll') || 0),
      platformFee: Number(value('entryFee') || 0),
      adjustment: Number(value('entryAdjustment') || 0),
      distance: Number(value('entryDistance') || 0),
      pickupGps: {
        lat: Number($('#entryPickup').dataset.gpsLat || existing?.pickupGps?.lat || 0),
        lng: Number($('#entryPickup').dataset.gpsLng || existing?.pickupGps?.lng || 0),
        accuracy: Number($('#entryPickup').dataset.gpsAccuracy || existing?.pickupGps?.accuracy || 0)
      },
      dropoffGps: {
        lat: Number($('#entryDropoff').dataset.gpsLat || existing?.dropoffGps?.lat || 0),
        lng: Number($('#entryDropoff').dataset.gpsLng || existing?.dropoffGps?.lng || 0),
        accuracy: Number($('#entryDropoff').dataset.gpsAccuracy || existing?.dropoffGps?.accuracy || 0)
      },
      note: value('entryNote').trim(),
      status: nextStatus
    });
  }
  if (modalType === 'expense') Object.assign(base, { category: value('entryCategory'), vendor: value('entryVendor').trim(), amount: Number(value('entryAmount')), note: value('entryNote').trim() });
  if (modalType === 'toll') {
    const linkedTripId = value('entryLinkedTrip');
    const amount = Number(value('entryAmount'));
    if (linkedTripId) {
      const trip = db.trips.find(item => item.id === linkedTripId);
      if (!trip) { toast('Select an existing Trip Register entry.', true); return; }
      if (trip.status === 'Closed') { toast('Closed trips cannot be changed.', true); return; }
      trip.toll = amount;
      const detail = `${value('entryLocation').trim()} · ${value('entryDirection')}`;
      trip.note = trip.note ? `${trip.note} | Toll Charge: ${detail}` : `Toll Charge: ${detail}`;
      if (editingId) db.tolls = db.tolls.filter(item => item.id !== editingId);
      save(); closeModal(); toast('Trip Toll Charge updated on the existing Trip Register entry.');
      page('trips');
      return;
    }
    Object.assign(base, { location: value('entryLocation').trim(), direction: value('entryDirection'), amount, linkedTripId: '' });
  }
  const list = db[`${modalType}s`]; const index = list.findIndex(x => x.id === base.id);
  if (index >= 0) list[index] = base; else list.push(base);
  save(); closeModal(); toast(wasEditing ? 'Entry updated' : `${modalType[0].toUpperCase() + modalType.slice(1)} saved`);
  page(currentPage);
}
function deleteEntry(type, id) {
  if (type === 'trip' && db.trips.find(x => x.id === id)?.status === 'Closed') {
    toast('Closed trips are locked and cannot be deleted.', true);
    return;
  }
  const toll = type === 'toll' ? db.tolls.find(x => x.id === id) : null;
  if (!confirm(`Delete this ${type === 'toll' ? 'operating toll charge' : type}? This cannot be undone.`)) return;
  if (toll?.linkedTripId) {
    const trip = db.trips.find(x => x.id === toll.linkedTripId);
    if (trip && trip.status !== 'Closed') trip.toll = 0;
  }
  db[`${type}s`] = db[`${type}s`].filter(x => x.id !== id); save(); toast(`${type[0].toUpperCase() + type.slice(1)} deleted`); page(currentPage);
}
function advanceStatus(id, next) {
  const trip = db.trips.find(x => x.id === id);
  if (!trip || statusOrder[next] !== statusOrder[trip.status] + 1) {
    toast('Status must move from Pending to Reconciled to Closed.', true);
    return;
  }
  trip.status = next;
  if (next === 'Closed') trip.closedAt = new Date().toISOString();
  save();
  toast(next === 'Closed' ? 'Book closed for this trip' : 'Trip reconciled');
  page(currentPage);
}
function exportLedger() {
  const csvCell = v => `"${String(v ?? '').replaceAll('"', '""')}"`;
  const lines = [
    ['Type', 'Date', 'Status', 'Reference', 'Description', 'Gross Earnings (CAD)', 'Tip (CAD)', 'Trip Toll (CAD)', 'Platform Fee (CAD)', 'Adjustment (CAD)', 'Net Earnings (CAD)', 'Distance (km)', 'IRS Mileage Deduction Value (USD)', 'Pickup GPS', 'Drop-off GPS', 'Notes'].join(',')
  ];
  db.trips.forEach(x => {
    const pickupGps = x.pickupGps?.lat ? `${x.pickupGps.lat.toFixed(5)},${x.pickupGps.lng.toFixed(5)}` : '';
    const dropoffGps = x.dropoffGps?.lat ? `${x.dropoffGps.lat.toFixed(5)},${x.dropoffGps.lng.toFixed(5)}` : '';
    lines.push([
      'Trip', csvCell(dateLabel(x.date)), csvCell(x.status), csvCell(x.reference || ''),
      csvCell(`${x.pickup} to ${x.dropoff} · ${x.platform}`),
      Number(x.grossFare).toFixed(2), Number(x.tip).toFixed(2), Number(x.toll).toFixed(2),
      Number(x.platformFee).toFixed(2), Number(x.adjustment).toFixed(2), netTrip(x).toFixed(2),
      Number(x.distance || 0).toFixed(1), tripIrsValue(x).toFixed(2),
      csvCell(pickupGps), csvCell(dropoffGps), csvCell(x.note || '')
    ].join(','));
  });
  db.expenses.forEach(x => lines.push([
    'Operating Expense', csvCell(dateLabel(x.date)), 'Posted', '',
    csvCell(`${x.category} — ${x.vendor}`),
    '', '', '', '', '', (-Number(x.amount)).toFixed(2),
    '', '', '', '', csvCell(x.note || '')
  ].join(',')));
  db.tolls.forEach(x => lines.push([
    'Operating Toll', csvCell(dateLabel(x.date)), 'Posted', '',
    csvCell(`${x.location} · ${x.direction}`),
    '', '', (-Number(x.amount)).toFixed(2), '', '', '',
    '', '', '', '', ''
  ].join(',')));
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' }));
  a.download = `islandcity-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click(); URL.revokeObjectURL(a.href);
  toast('Ledger exported as CSV');
}
function init() {
  $('#topDate').textContent = new Date().toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' });
  $$('.nav-btn[data-page], [data-page-link]').forEach(el => el.addEventListener('click', () => page(el.dataset.page || el.dataset.pageLink)));
  $$('[data-open-modal]').forEach(el => el.addEventListener('click', () => openModal(el.dataset.openModal)));
  $('#closeModal').addEventListener('click', closeModal);
  $('#modalBackdrop').addEventListener('click', e => { if (e.target.id === 'cancelModal') closeModal(); });
  $('#modalBackdrop').addEventListener('click', e => { if (e.target === $('#modalBackdrop')) closeModal(); });
  $('#entryForm').addEventListener('submit', formSubmit);
  $$('[data-shift-action]').forEach(button => button.addEventListener('click', () => handleShiftAction(button.dataset.shiftAction)));
  $('#exportBtn').addEventListener('click', exportLedger);
  $('#resetBtn').addEventListener('click', () => { if (confirm('Reset the ledger to the IslandCity sample data?')) { db = { ...structuredClone(seed), registerVersion: REGISTER_VERSION, trips: seed.trips.map(normalizeTrip) }; save(); toast('Sample ledger restored'); page(currentPage); } });
  ['trip', 'expense', 'toll'].forEach(type => { $(`#${type}Search`)?.addEventListener('input', () => type === 'trip' ? renderTrips() : type === 'expense' ? renderExpenses() : renderTolls()); $(`#${type}Filter`)?.addEventListener('change', () => type === 'trip' ? renderTrips() : type === 'expense' ? renderExpenses() : renderTolls()); });
  $$('.period-btn').forEach(el => el.addEventListener('click', () => { reportPeriod = el.dataset.period; $$('.period-btn').forEach(b => b.classList.toggle('active', b === el)); renderReports(); }));
  document.addEventListener('click', e => {
    const edit = e.target.closest('[data-edit]'); const del = e.target.closest('[data-delete]');
    const status = e.target.closest('[data-status]');
    if (edit) { const [type, id] = edit.dataset.edit.split(':'); openModal(type, id); }
    if (del) { const [type, id] = del.dataset.delete.split(':'); deleteEntry(type, id); }
    if (status) { const [, id, next] = status.dataset.status.split(':'); advanceStatus(id, next); }
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
  window.setInterval(updateShiftUI, 1000);
  renderDashboard();
  updateShiftUI();
}
init();