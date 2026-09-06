/* Chromora Admin PWA service worker.
 *
 * Strategy:
 *   - Precache the app shell + hashed build assets so the dashboard is
 *     installable and loads offline.
 *   - NEVER cache API traffic ("/api/…"): those requests are authenticated and
 *     must always hit the network so the admin sees live, correct data.
 *   - App code (JS/CSS): network-first with a cache fallback. The command-center
 *     is buildless, so these URLs are NOT content-hashed (core.js, app.js …);
 *     cache-first would pin stale admin code forever. Network-first keeps the
 *     dashboard fresh online and still works offline from the last good copy.
 *   - Images/fonts: cache-first (rarely change, safe to serve from cache).
 *   - Navigations: network-first with an offline fallback to the cached shell,
 *     so a fresh deploy is picked up immediately when online.
 */
const CACHE_VERSION = 'chromora-admin-v3';
const SHELL_URLS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) =>
      // addAll is atomic; if one fails nothing is cached. Shell URLs are known-good.
      cache.addAll(SHELL_URLS).catch(() => {})
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return; // never touch mutations

  const url = new URL(request.url);

  // Only handle same-origin requests; let cross-origin (fonts CDN, etc.) pass through.
  if (url.origin !== self.location.origin) return;

  // API traffic must never be cached or served stale.
  if (url.pathname.startsWith('/api')) return;

  // App navigations → network-first, fall back to cached shell when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put('/index.html', copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match('/index.html').then((r) => r || caches.match('/')))
    );
    return;
  }

  // App code (un-hashed JS/CSS) → network-first so admin updates are picked up.
  // Falls back to the cached copy when offline.
  if (/\.(?:js|css)$/.test(url.pathname)) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Images/fonts → cache-first (rarely change).
  if (/\/assets\//.test(url.pathname) || /\.(?:png|jpg|jpeg|svg|ico|webp|woff2?)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy)).catch(() => {});
          }
          return res;
        });
      })
    );
  }
});
