const KEY = 'islandcity-driver-ledger-v1';
const now = new Date();
const iso = (offset = 0, hour = 9) => {
  const d = new Date(now);
  d.setDate(d.getDate() + offset);
  d.setHours(hour, offset < 0 ? 30 : 0, 0, 0);
  return d.toISOString();
};
const seed = {
  trips: [
    { id: 't-1', date: iso(0, 7), pickup: 'Harbour Centre', dropoff: 'YVR Terminal', platform: 'IslandCity', distance: 22.4, fare: 48.50, tip: 7.50, note: 'Airport run' },
    { id: 't-2', date: iso(0, 10), pickup: 'Kitsilano', dropoff: 'Gastown', platform: 'IslandCity', distance: 8.7, fare: 24.00, tip: 4.00, note: '' },
    { id: 't-3', date: iso(-1, 8), pickup: 'Coal Harbour', dropoff: 'UBC', platform: 'IslandCity', distance: 14.1, fare: 38.25, tip: 0, note: '' },
    { id: 't-4', date: iso(-2, 18), pickup: 'Richmond Centre', dropoff: 'Yaletown', platform: 'Street hail', distance: 17.8, fare: 42.75, tip: 6.25, note: '' },
    { id: 't-5', date: iso(-3, 12), pickup: 'Commercial Drive', dropoff: 'North Vancouver', platform: 'IslandCity', distance: 19.3, fare: 51.00, tip: 8.00, note: 'Bridge traffic' }
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
const totalTrip = trip => Number(trip.fare || 0) + Number(trip.tip || 0);
function load() {
  try {
    const stored = JSON.parse(localStorage.getItem(KEY));
    if (stored?.trips && stored?.expenses && stored?.tolls) return stored;
  } catch (e) { /* use seed */ }
  return structuredClone(seed);
}
function save() { localStorage.setItem(KEY, JSON.stringify(db)); }
function toast(message, error = false) {
  const el = $('#toast');
  el.textContent = message;
  el.className = `toast show${error ? ' error' : ''}`;
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => el.className = 'toast', 2600);
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
function allCosts(todayOnly = false) {
  return db.expenses.reduce((a, x) => a + Number(x.amount), 0) + db.tolls.reduce((a, x) => a + Number(x.amount), 0);
}
function renderDashboard() {
  const trips = db.trips.filter(x => isToday(x.date));
  const expenses = db.expenses.filter(x => isToday(x.date));
  const tolls = db.tolls.filter(x => isToday(x.date));
  const gross = trips.reduce((a, x) => a + totalTrip(x), 0);
  const costs = expenses.reduce((a, x) => a + Number(x.amount), 0) + tolls.reduce((a, x) => a + Number(x.amount), 0);
  $('#dashNet').textContent = money(gross - costs);
  $('#dashGross').textContent = money(gross);
  $('#dashCosts').textContent = money(costs);
  $('#dashAvg').textContent = money(trips.length ? gross / trips.length : 0);
  $('#dashTolls').textContent = money(tolls.reduce((a, x) => a + Number(x.amount), 0));
  $('#dashTripCount').textContent = `${trips.length} trip${trips.length === 1 ? '' : 's'} logged`;
  $('#dashStatus').textContent = gross - costs > 100 ? 'Strong run' : gross - costs > 0 ? 'On track' : 'Start your run';
  const activity = [
    ...db.trips.map(x => ({ ...x, type: 'trip', sort: x.date, title: `${x.pickup} → ${x.dropoff}`, meta: `${dateLabel(x.date)} · ${x.platform}`, amount: totalTrip(x), sign: '+' })),
    ...db.expenses.map(x => ({ ...x, type: 'expense', sort: x.date, title: x.category, meta: `${dateLabel(x.date)} · ${x.vendor}`, amount: x.amount, sign: '−' })),
    ...db.tolls.map(x => ({ ...x, type: 'toll', sort: x.date, title: x.location, meta: `${dateLabel(x.date)} · ${x.direction}`, amount: x.amount, sign: '−' }))
  ].sort((a, b) => new Date(b.sort) - new Date(a.sort)).slice(0, 5);
  $('#recentActivity').innerHTML = activity.length ? activity.map(x => `<div class="activity-item"><div class="activity-icon ${x.type}">${icon(x.type)}</div><div class="activity-copy"><b>${esc(x.title)}</b><span>${esc(x.meta)}</span></div><div class="activity-amount ${x.sign === '+' ? 'income' : 'outgoing'}">${x.sign}$${money(x.amount)}</div></div>`).join('') : empty('No activity yet', 'Log your first trip to start the ledger.');
  const dailyTarget = 250;
  $('#glance').innerHTML = [
    ['Gross fares', gross, dailyTarget, '$'],
    ['Trips completed', trips.length, 8, ''],
    ['Net after costs', Math.max(0, gross - costs), dailyTarget * .8, '$']
  ].map(([label, value, max, prefix]) => `<div class="overview-row"><div><span>${label}</span><span class="value">${prefix}${prefix ? money(value) : value}</span></div><div class="track"><i style="width:${Math.min(100, Math.max(4, value / max * 100))}%"></i></div></div>`).join('');
}
function empty(title, body) { return `<div class="empty-state">${icon('trip')}<b>${title}</b><p>${body}</p></div>`; }
function esc(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c])); }
function matchesFilter(date, filter) { return filterDate(date, filter); }
function renderTrips() {
  const query = ($('#tripSearch')?.value || '').toLowerCase();
  const filter = $('#tripFilter')?.value || 'all';
  const rows = db.trips.filter(x => matchesFilter(x.date, filter) && `${x.pickup} ${x.dropoff} ${x.platform}`.toLowerCase().includes(query)).sort((a, b) => new Date(b.date) - new Date(a.date));
  $('#tripShown').textContent = `${rows.length} trip${rows.length === 1 ? '' : 's'}`;
  $('#tripGross').textContent = `$${money(rows.reduce((a, x) => a + totalTrip(x), 0))}`;
  $('#tripDistance').textContent = `${rows.reduce((a, x) => a + Number(x.distance || 0), 0).toFixed(1)} km`;
  $('#tripEntries').innerHTML = rows.length ? rows.map(tripRow).join('') : empty('No trips match', 'Try another filter or add a new trip.');
}
function tripRow(x) {
  return `<div class="entry-row"><div class="entry-main"><div class="entry-title">${icon('trip')}<span>${esc(x.pickup)} → ${esc(x.dropoff)}</span></div><div class="entry-meta"><span>${dateLabel(x.date)} · ${timeLabel(x.date)}</span><em>${esc(x.platform)}</em><em>${Number(x.distance).toFixed(1)} km</em></div></div><div><div class="entry-total income">+$${money(totalTrip(x))}</div><div class="entry-actions"><button class="mini-btn" data-edit="trip:${x.id}" title="Edit trip">${pencil()}</button><button class="mini-btn delete" data-delete="trip:${x.id}" title="Delete trip">${trash()}</button></div></div></div>`;
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
  const trips = db.trips.filter(x => new Date(x.date).getTime() >= cutoff);
  const expenses = db.expenses.filter(x => new Date(x.date).getTime() >= cutoff);
  const tolls = db.tolls.filter(x => new Date(x.date).getTime() >= cutoff);
  const gross = trips.reduce((a, x) => a + totalTrip(x), 0);
  const expenseTotal = expenses.reduce((a, x) => a + Number(x.amount), 0);
  const tollTotal = tolls.reduce((a, x) => a + Number(x.amount), 0);
  $('#reportNet').textContent = money(gross - expenseTotal - tollTotal);
  $('#reportNote').textContent = `${gross - expenseTotal - tollTotal >= 0 ? 'Positive' : 'Review costs'} net for selected period`;
  $('#reportTrips').textContent = `${trips.length} trip${trips.length === 1 ? '' : 's'} · ${trips.reduce((a, x) => a + Number(x.distance || 0), 0).toFixed(1)} km`;
  $('#reportRange').textContent = reportPeriod === 'week' ? 'Last 7 days' : 'Last 30 days';
  const snapshot = [['Gross fares', gross, 1], ['Operating expenses', expenseTotal, gross || 1], ['Tolls', tollTotal, gross || 1]];
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
function openModal(type, id = null) {
  modalType = type; editingId = id;
  const source = id ? db[`${type}s`].find(x => x.id === id) : null;
  const title = id ? `Edit ${type}` : `Log a ${type}`;
  $('#modalTitle').textContent = title.charAt(0).toUpperCase() + title.slice(1);
  const dateValue = source?.date ? new Date(source.date).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16);
  const fields = type === 'trip' ? `
    <div class="form-row"><div class="form-group"><label for="entryDate">Date and time</label><input class="field" id="entryDate" type="datetime-local" value="${dateValue}" required></div><div class="form-group"><label for="entryPlatform">Platform</label><select class="select" id="entryPlatform"><option ${source?.platform === 'IslandCity' ? 'selected' : ''}>IslandCity</option><option ${source?.platform === 'Street hail' ? 'selected' : ''}>Street hail</option><option ${source?.platform === 'Private booking' ? 'selected' : ''}>Private booking</option></select></div></div>
    <div class="form-row"><div class="form-group"><label for="entryPickup">Pickup point</label><input class="field" id="entryPickup" value="${esc(source?.pickup || '')}" placeholder="e.g. Harbour Centre" required></div><div class="form-group"><label for="entryDropoff">Drop-off point</label><input class="field" id="entryDropoff" value="${esc(source?.dropoff || '')}" placeholder="e.g. YVR Terminal" required></div></div>
    <div class="form-row"><div class="form-group"><label for="entryFare">Fare <small>CAD</small></label><input class="field" id="entryFare" type="number" min="0" step=".01" value="${source?.fare ?? ''}" placeholder="0.00" required></div><div class="form-group"><label for="entryTip">Tip <small>optional</small></label><input class="field" id="entryTip" type="number" min="0" step=".01" value="${source?.tip ?? 0}" placeholder="0.00"></div></div>
    <div class="form-row"><div class="form-group"><label for="entryDistance">Distance <small>km</small></label><input class="field" id="entryDistance" type="number" min="0" step=".1" value="${source?.distance ?? ''}" placeholder="0.0"></div><div class="form-group"><label for="entryNote">Note <small>optional</small></label><input class="field" id="entryNote" value="${esc(source?.note || '')}" placeholder="Anything to remember?"></div></div>` :
    type === 'expense' ? `
    <div class="form-row"><div class="form-group"><label for="entryDate">Date and time</label><input class="field" id="entryDate" type="datetime-local" value="${dateValue}" required></div><div class="form-group"><label for="entryCategory">Category</label><select class="select" id="entryCategory">${['Fuel', 'Maintenance', 'Supplies', 'Insurance', 'Parking', 'Other'].map(x => `<option ${source?.category === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div></div>
    <div class="form-group"><label for="entryVendor">Vendor or description</label><input class="field" id="entryVendor" value="${esc(source?.vendor || '')}" placeholder="e.g. Petro-Canada · Main St" required></div>
    <div class="form-row"><div class="form-group"><label for="entryAmount">Amount <small>CAD</small></label><input class="field" id="entryAmount" type="number" min="0" step=".01" value="${source?.amount ?? ''}" placeholder="0.00" required></div><div class="form-group"><label for="entryNote">Note <small>optional</small></label><input class="field" id="entryNote" value="${esc(source?.note || '')}" placeholder="Receipt or detail"></div></div>` :
    `<div class="form-row"><div class="form-group"><label for="entryDate">Date and time</label><input class="field" id="entryDate" type="datetime-local" value="${dateValue}" required></div><div class="form-group"><label for="entryDirection">Direction</label><select class="select" id="entryDirection">${['Northbound', 'Southbound', 'Eastbound', 'Westbound'].map(x => `<option ${source?.direction === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div></div>
    <div class="form-group"><label for="entryLocation">Toll location</label><input class="field" id="entryLocation" value="${esc(source?.location || '')}" placeholder="e.g. Oak Street Bridge" required></div>
    <div class="form-group"><label for="entryAmount">Amount <small>CAD</small></label><input class="field" id="entryAmount" type="number" min="0" step=".01" value="${source?.amount ?? ''}" placeholder="0.00" required></div>`;
  $('#entryForm').innerHTML = `${fields}<div class="form-actions"><button type="button" class="button button-ghost" id="cancelModal">Cancel</button><button type="submit" class="button button-primary">${id ? 'Save changes' : `Save ${type}`}</button></div>`;
  $('#modalBackdrop').classList.add('open'); $('#modalBackdrop').setAttribute('aria-hidden', 'false');
  $('#entryForm').querySelector('input, select')?.focus();
}
function closeModal() { $('#modalBackdrop').classList.remove('open'); $('#modalBackdrop').setAttribute('aria-hidden', 'true'); editingId = null; }
function formSubmit(event) {
  event.preventDefault();
  const wasEditing = Boolean(editingId);
  const value = id => $(`#${id}`).value;
  const base = { id: editingId || `${modalType[0]}-${Date.now()}`, date: new Date(value('entryDate')).toISOString() };
  if (modalType === 'trip') Object.assign(base, { pickup: value('entryPickup').trim(), dropoff: value('entryDropoff').trim(), platform: value('entryPlatform'), fare: Number(value('entryFare')), tip: Number(value('entryTip') || 0), distance: Number(value('entryDistance') || 0), note: value('entryNote').trim() });
  if (modalType === 'expense') Object.assign(base, { category: value('entryCategory'), vendor: value('entryVendor').trim(), amount: Number(value('entryAmount')), note: value('entryNote').trim() });
  if (modalType === 'toll') Object.assign(base, { location: value('entryLocation').trim(), direction: value('entryDirection'), amount: Number(value('entryAmount')) });
  const list = db[`${modalType}s`]; const index = list.findIndex(x => x.id === base.id);
  if (index >= 0) list[index] = base; else list.push(base);
  save(); closeModal(); toast(wasEditing ? 'Entry updated' : `${modalType[0].toUpperCase() + modalType.slice(1)} saved`);
  page(currentPage);
}
function deleteEntry(type, id) {
  if (!confirm(`Delete this ${type}? This cannot be undone.`)) return;
  db[`${type}s`] = db[`${type}s`].filter(x => x.id !== id); save(); toast(`${type[0].toUpperCase() + type.slice(1)} deleted`); page(currentPage);
}
function exportLedger() {
  const lines = ['Type,Date,Description,Amount CAD'];
  db.trips.forEach(x => lines.push(`Trip,${dateLabel(x.date)},"${x.pickup} to ${x.dropoff}",${totalTrip(x).toFixed(2)}`));
  db.expenses.forEach(x => lines.push(`Expense,${dateLabel(x.date)},"${x.category} - ${x.vendor}",-${Number(x.amount).toFixed(2)}`));
  db.tolls.forEach(x => lines.push(`Toll,${dateLabel(x.date)},"${x.location}",-${Number(x.amount).toFixed(2)}`));
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' })); a.download = 'islandcity-ledger.csv'; a.click(); URL.revokeObjectURL(a.href); toast('Ledger exported as CSV');
}
function init() {
  $('#topDate').textContent = new Date().toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' });
  $$('.nav-btn[data-page], [data-page-link]').forEach(el => el.addEventListener('click', () => page(el.dataset.page || el.dataset.pageLink)));
  $$('[data-open-modal]').forEach(el => el.addEventListener('click', () => openModal(el.dataset.openModal)));
  $('#closeModal').addEventListener('click', closeModal);
  $('#modalBackdrop').addEventListener('click', e => { if (e.target.id === 'cancelModal') closeModal(); });
  $('#modalBackdrop').addEventListener('click', e => { if (e.target === $('#modalBackdrop')) closeModal(); });
  $('#entryForm').addEventListener('submit', formSubmit);
  $('#exportBtn').addEventListener('click', exportLedger);
  $('#resetBtn').addEventListener('click', () => { if (confirm('Reset the ledger to the IslandCity sample data?')) { db = structuredClone(seed); save(); toast('Sample ledger restored'); page(currentPage); } });
  ['trip', 'expense', 'toll'].forEach(type => { $(`#${type}Search`)?.addEventListener('input', () => type === 'trip' ? renderTrips() : type === 'expense' ? renderExpenses() : renderTolls()); $(`#${type}Filter`)?.addEventListener('change', () => type === 'trip' ? renderTrips() : type === 'expense' ? renderExpenses() : renderTolls()); });
  $$('.period-btn').forEach(el => el.addEventListener('click', () => { reportPeriod = el.dataset.period; $$('.period-btn').forEach(b => b.classList.toggle('active', b === el)); renderReports(); }));
  document.addEventListener('click', e => {
    const edit = e.target.closest('[data-edit]'); const del = e.target.closest('[data-delete]');
    if (edit) { const [type, id] = edit.dataset.edit.split(':'); openModal(type, id); }
    if (del) { const [type, id] = del.dataset.delete.split(':'); deleteEntry(type, id); }
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
  renderDashboard();
}
init();