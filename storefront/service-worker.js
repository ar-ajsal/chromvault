/* ============================================================================
   CHROMVAULT STOREFRONT — SERVICE WORKER
   ----------------------------------------------------------------------------
   Scope: the customer site only. The admin Command Center is a separate
   application with its own service worker ('chromvault-admin-v3'), so two rules
   are absolute here:

     1. Every cache this worker creates is prefixed 'chromvault-store-'.
     2. Cleanup only ever deletes keys carrying that prefix. Anything else in
        caches.keys() — the admin's caches included — is left alone.

   The admin worker's activate step deletes every cache that is not its own
   version, so if the two ever share an origin, the storefront's caches would be
   collateral damage. Today they do not (3001 vs 3002 in development, and
   /admin is a cross-origin redirect in production), and if that ever changes
   the fix belongs in the admin worker, not here.

   What is deliberately NEVER cached:
     · /api and /v1 — the catalogue, cart pricing, Razorpay order creation and
       payment verification. A stale price or a replayed payment response is
       worse than an error message, so these always go straight to the network.
     · Anything that is not a GET.
     · Range requests (partial video/audio) — the Cache API cannot serve them.
     · /admin — belongs to another application.

   Caching strategy, by request type:
     navigations  → network first, cached app shell as the offline fallback
     same-origin
     css/js/font  → stale-while-revalidate (instant, updates on the next visit)
     images       → cache first, capped, survives version bumps
   ========================================================================== */

'use strict';

var PREFIX = 'chromvault-store-';
var VERSION = 'v2';

var SHELL_CACHE = PREFIX + 'shell-' + VERSION;
var ASSET_CACHE = PREFIX + 'assets-' + VERSION;
/* Images are content-addressed by Cloudinary URL and are the most expensive
   thing to refetch, so this cache is intentionally not version-scoped — a code
   deploy should not make every product photo download again. */
var IMAGE_CACHE = PREFIX + 'images-v1';

var CURRENT = [SHELL_CACHE, ASSET_CACHE, IMAGE_CACHE];

/* The single cache key the app shell lives under. Every customer route returns
   the same HTML document, so one entry covers /, /shop, /product/:slug and the
   rest — whichever route the visitor happened to arrive on. */
var SHELL_KEY = '/index.html';

var IMAGE_LIMIT = 80;   // entries; oldest are trimmed first

/* Precached at install. Kept to the files that must exist for the site to draw
   at all — the CSS layer and the first two scripts. Everything else arrives
   through the runtime cache on first use, which keeps install fast and, more
   importantly, keeps a single missing file from failing the whole install. */
var PRECACHE = [
  '/css/tokens.css',
  '/css/base.css',
  '/css/components.css',
  '/css/layout.css',
  '/assets/js/config.js',
  '/js/icons.js',
  '/js/util.js'
];

/* ── Install ─────────────────────────────────────────────────────────────────
   addAll() is all-or-nothing: one 404 and the worker never installs, leaving the
   site with no offline support and a console error on every load. Adding each
   entry separately and settling means a renamed file degrades to "not
   precached" instead of "PWA broken". */
self.addEventListener('install', function (event) {
  event.waitUntil(
    Promise.all([
      caches.open(ASSET_CACHE).then(function (cache) {
        return Promise.all(PRECACHE.map(function (url) {
          return cache.add(new Request(url, { cache: 'reload' })).catch(function (err) {
            console.warn('[sw] precache skipped', url, err && err.message);
          });
        }));
      }),
      // Warm the shell so the very first offline navigation has something.
      fetch('/', { cache: 'reload' }).then(function (res) {
        if (res && res.ok) {
          return caches.open(SHELL_CACHE).then(function (c) {
            return c.put(SHELL_KEY, res.clone());
          });
        }
      }).catch(function () { /* offline at install time; runtime will fill it */ })
    ]).then(function () { return self.skipWaiting(); })
  );
});

/* ── Activate ────────────────────────────────────────────────────────────────
   Prefix-scoped cleanup. Note the two conditions: the key must be ours AND not
   current. A key we do not recognise is never touched. */
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (key) {
        if (key.indexOf(PREFIX) !== 0) return null;      // not ours — hands off
        if (CURRENT.indexOf(key) !== -1) return null;    // still in use
        return caches.delete(key);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

/* Lets a new worker take over without waiting for every tab to close. The page
   does not currently send this, but an operator can from DevTools. */
self.addEventListener('message', function (event) {
  if (event.data === 'skipWaiting' || (event.data && event.data.type === 'SKIP_WAITING')) {
    self.skipWaiting();
  }
});

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function isApi(url) {
  return url.pathname.indexOf('/api') === 0 ||
         url.pathname.indexOf('/v1') === 0;
}

function isAdmin(url) {
  return url.pathname === '/admin' || url.pathname.indexOf('/admin/') === 0;
}

function isStaticAsset(url) {
  return /\.(?:css|js|mjs|woff2?|ttf|otf|webmanifest|ico|svg)$/i.test(url.pathname);
}

function isImage(request, url) {
  if (request.destination === 'image') return true;
  return /\.(?:png|jpe?g|webp|avif|gif)$/i.test(url.pathname);
}

/* Keeps the image cache from growing without bound. Cache API preserves
   insertion order, so the head of keys() is the oldest entry. */
function trimCache(name, limit) {
  return caches.open(name).then(function (cache) {
    return cache.keys().then(function (keys) {
      if (keys.length <= limit) return;
      return Promise.all(keys.slice(0, keys.length - limit).map(function (k) {
        return cache.delete(k);
      }));
    });
  });
}

/* The last-resort offline page. Plain inline HTML — reaching for a cached file
   here would be one more thing that can be missing at the moment it is needed.
   Status 503 so a proxy or crawler does not treat it as real content. */
function offlineShell() {
  return new Response(
    '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<meta name="theme-color" content="#F2F1EE"><title>Offline — Chromvault</title>' +
    '<style>html{color-scheme:light}body{margin:0;min-height:100vh;display:grid;' +
    'place-items:center;background:#F2F1EE;color:#0A0A0B;text-align:center;' +
    'padding:24px;font:400 16px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",' +
    'Roboto,Helvetica,Arial,sans-serif}h1{font-size:22px;letter-spacing:-0.02em;' +
    'margin:0 0 8px;text-transform:uppercase}p{margin:0 0 20px;color:#54555A;' +
    'max-width:34ch}button{font:inherit;font-weight:600;padding:12px 22px;' +
    'border:0;border-radius:999px;background:#0A0A0B;color:#F2F1EE;cursor:pointer}' +
    '</style></head><body><div><h1>You are offline</h1>' +
    '<p>Chromvault needs a connection to show live stock and prices.</p>' +
    '<button onclick="location.reload()">Try again</button></div></body></html>',
    { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}

/* ── Fetch ───────────────────────────────────────────────────────────────── */

self.addEventListener('fetch', function (event) {
  var request = event.request;

  // Non-GET (the Razorpay order POST, payment verification) is never touched.
  if (request.method !== 'GET') return;

  // Range requests cannot be satisfied from the Cache API.
  if (request.headers.has('range')) return;

  var url;
  try { url = new URL(request.url); } catch (e) { return; }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // Live data and the admin application both bypass the worker entirely.
  if (url.origin === self.location.origin && (isApi(url) || isAdmin(url))) return;

  /* Navigations: network first. Online shoppers always get the current shell —
     which carries the injected API base and Maps key — and the cached copy only
     appears when the network genuinely fails. */
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then(function (res) {
        if (res && res.ok && res.type === 'basic') {
          var copy = res.clone();
          caches.open(SHELL_CACHE).then(function (c) { c.put(SHELL_KEY, copy); });
        }
        return res;
      }).catch(function () {
        return caches.open(SHELL_CACHE)
          .then(function (c) { return c.match(SHELL_KEY); })
          .then(function (hit) { return hit || offlineShell(); });
      })
    );
    return;
  }

  /* Same-origin CSS, JS and fonts: stale-while-revalidate. The page paints from
     cache immediately and the next visit gets whatever changed. Versioned query
     strings (?v=1) are part of the cache key, so a bump is still an instant
     hard update. */
  if (url.origin === self.location.origin && isStaticAsset(url)) {
    event.respondWith(
      caches.open(ASSET_CACHE).then(function (cache) {
        return cache.match(request).then(function (hit) {
          var network = fetch(request).then(function (res) {
            if (res && res.ok) cache.put(request, res.clone());
            return res;
          });
          if (hit) {
            // Revalidation continues after the response is handed back.
            event.waitUntil(network.catch(function () {}));
            return hit;
          }
          return network.catch(function () {
            // No cache, no network: let the failure surface to the page, which
            // has its own error states, rather than inventing a response.
            return Response.error();
          });
        });
      })
    );
    return;
  }

  /* Images, including cross-origin Cloudinary product photography: cache first.
     Cross-origin <img> loads are opaque (status 0, type 'opaque'), which is
     still cacheable and still renders — so opaque responses are stored, but
     only when they came from a real image request. */
  if (isImage(request, url)) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(function (cache) {
        return cache.match(request).then(function (hit) {
          if (hit) return hit;
          return fetch(request).then(function (res) {
            var keep = res && (res.ok || res.type === 'opaque');
            if (keep) {
              cache.put(request, res.clone()).then(function () {
                return trimCache(IMAGE_CACHE, IMAGE_LIMIT);
              }).catch(function () {});
            }
            return res;
          }).catch(function () {
            /* Shell installs one capture-phase 'error' listener that swaps any
               failed <img> for the inline chrome placeholder, so surfacing the
               failure here is handled in the page rather than papered over with
               a substitute image the shopper might mistake for the product. */
            return Response.error();
          });
        });
      })
    );
    return;
  }

  // Everything else (cross-origin scripts, fonts, analytics) is left to the
  // browser's own HTTP cache.
});
