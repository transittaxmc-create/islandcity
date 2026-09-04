// IslandCity Driver Accounting — Service Worker
// Cache-first for app shell, network-first for API calls.
// Falls back to cached shell when offline so the app always loads.

const CACHE_VERSION = 'ic-v4'; // bump on each deploy so clients pick up the new shell
const CACHE_NAME = `islandcity-app-${CACHE_VERSION}`;

// ── Install: open cache and pre-cache the app shell ──────────────
self.addEventListener('install', event => {
  self.skipWaiting(); // activate immediately, don't wait for old tabs to close
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      // Pre-cache the root document so the app works offline from first visit
      cache.add(new Request(self.registration.scope, { cache: 'reload' }))
    ).catch(() => {/* ignore pre-cache failures in dev mode */})
  );
});

// ── Activate: clean old caches and claim all clients ─────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k.startsWith('islandcity-app-') && k !== CACHE_NAME)
            .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch: route strategy by request type ────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests from same origin
  if (request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  // Skip Vite HMR and internal module paths (dev mode)
  const p = url.pathname;
  if (p.startsWith('/@') || p.startsWith('/node_modules/') || p.includes('__vite')) return;

  // ── API calls: network-first, return JSON error when offline ──
  if (p.startsWith('/api/') || p.includes('/api/')) {
    event.respondWith(
      fetch(request.clone())
        .catch(() => new Response(
          JSON.stringify({ error: 'offline', message: 'No internet connection. Data is saved locally.' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        ))
    );
    return;
  }

  // ── Navigations (app shell HTML): network-first ─────────────────
  // Fresh deployments must show immediately when online; cache is the
  // offline fallback only. (Cache-first here caused stale UI after deploys.)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request.clone()).then(response => {
        if (response.ok && response.type !== 'opaque') {
          const clone = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => cache.put(request, clone))
            .catch(() => {});
        }
        return response;
      }).catch(() =>
        caches.match(request).then(cached =>
          cached ?? caches.match(self.registration.scope).then(root =>
            root ?? new Response('IslandCity is offline. Please reconnect.', {
              status: 503, headers: { 'Content-Type': 'text/plain' },
            })
          )
        )
      )
    );
    return;
  }

  // ── App shell (CSS/JS/assets): cache-first, revalidate in background ──
  event.respondWith(
    caches.match(request).then(cached => {
      // Serve from cache immediately if available
      const networkFetch = fetch(request.clone()).then(response => {
        // Cache successful same-origin responses
        if (response.ok && response.type !== 'opaque') {
          const clone = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => cache.put(request, clone))
            .catch(() => {});
        }
        return response;
      }).catch(() => {
        // Network failed — fall back to root page (app shell) for navigation requests
        if (request.mode === 'navigate') {
          return caches.match(self.registration.scope)
            .then(r => r ?? new Response('IslandCity is offline. Please reconnect.', {
              status: 503, headers: { 'Content-Type': 'text/plain' }
            }));
        }
        // For assets, return a basic 503
        return new Response('Offline', { status: 503 });
      });

      // Return cached version immediately; update cache in background (stale-while-revalidate)
      return cached ?? networkFetch;
    })
  );
});
