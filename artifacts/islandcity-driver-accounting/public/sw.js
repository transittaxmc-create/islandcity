// IslandCity Driver Accounting — Service Worker
// Network-first for navigations/API calls, cache-first for versioned assets.
// This prevents an installed iPhone PWA from pinning an old deployment while
// preserving an offline shell and cached static assets.

const CACHE_VERSION = 'ic-v2';
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
      .then(keys => {
        const obsoleteKeys = keys.filter(
          key => key.startsWith('islandcity-app-') && key !== CACHE_NAME
        );

        return Promise.all(obsoleteKeys.map(key => caches.delete(key)))
          .then(() => obsoleteKeys.length > 0);
      })
      .then(hadObsoleteCache =>
        self.clients.claim().then(() => hadObsoleteCache)
      )
      .then(hadObsoleteCache => {
        if (!hadObsoleteCache) return;

        // Existing standalone iPhone PWAs can remain open across deployments.
        // Reload them once after replacing an older cache so they adopt the
        // newly published HTML and hashed JavaScript bundle immediately.
        return self.clients
          .matchAll({ type: 'window', includeUncontrolled: true })
          .then(clients => Promise.all(
            clients.map(client => client.navigate(client.url).catch(() => undefined))
          ));
      })
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

  // ── Navigations: network-first so every launch sees the latest publish ──
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(new Request(request, { cache: 'no-store' }))
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => cache.put(request, clone))
              .catch(() => {});
          }
          return response;
        })
        .catch(() =>
          caches.match(request).then(response =>
            response ??
            caches.match(self.registration.scope).then(shell =>
              shell ?? new Response('IslandCity is offline. Please reconnect.', {
                status: 503,
                headers: { 'Content-Type': 'text/plain' }
              })
            )
          )
        )
    );
    return;
  }

  // ── Hashed CSS/JS/images: cache-first with background refresh ─
  event.respondWith(
    caches.match(request).then(cached => {
      const networkFetch = fetch(request.clone()).then(response => {
        if (response.ok && response.type !== 'opaque') {
          const clone = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => cache.put(request, clone))
            .catch(() => {});
        }
        return response;
      }).catch(() => new Response('Offline', { status: 503 }));

      return cached ?? networkFetch;
    })
  );
});
