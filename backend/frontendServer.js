/* ============================================================================
   CHROMVAULT — FRONT-END SERVER
   ----------------------------------------------------------------------------
   Two applications live here, on two ports:

     :3001  the customer storefront  (storefront/ — the buildless SPA)
     :3002  the admin Command Center (admin panel/command-center/)

   The storefront is mounted by exactly one of two functions, chosen once at
   boot from STOREFRONT_LEGACY:

     mountStorefront()        the new SPA. The default.
     mountLegacyStorefront()  the original HTTrack scrape of chromvault.in, kept
                              verbatim as a rollback path.

   They are mutually exclusive by construction rather than by route ordering, so
   there is no arrangement of environment variables that produces a half-new,
   half-old site — the failure mode that "just add the new routes above the old
   ones" invites.

   Rollback is one variable:  STOREFRONT_LEGACY=1 node frontendServer.js
   ========================================================================== */

require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const express = require('express');
const path = require('path');
const fs = require('fs');
const { createProxyMiddleware } = require('http-proxy-middleware');

/* ── Configuration ───────────────────────────────────────────────────────────
   Nothing production-specific is hardcoded. Every value has a localhost default
   so `node frontendServer.js` works from a fresh clone. */

const PORT = parseInt(process.env.STOREFRONT_PORT, 10) || 3001;
const ADMIN_PORT = parseInt(process.env.ADMIN_PORT, 10) || 3002;

// Where API calls are forwarded. Include the version segment.
const API_TARGET = (process.env.API_PROXY_TARGET || 'http://localhost:5000/v1').replace(/\/+$/, '');

/* What the browser is told to use as its API base, injected into the shell as
   window.__CHROMVAULT_API_BASE__ (see storefront/assets/js/config.js).

   The default is the relative '/v1', which this server proxies to API_TARGET.
   Same-origin means no preflight, no CORS_ORIGINS to keep in sync, and no
   chance of a mixed-content error behind TLS. Set STOREFRONT_API_BASE to an
   absolute URL only if the API is fronted separately — in which case the
   backend's CORS_ORIGINS must include the storefront origin. */
const STOREFRONT_API_BASE = process.env.STOREFRONT_API_BASE || '/v1';

const ADMIN_URL = process.env.ADMIN_URL || `http://localhost:${ADMIN_PORT}`;

const LEGACY = process.env.STOREFRONT_LEGACY === '1';

/* Optional. Absent is a supported state: checkout falls back to manual address
   entry, and the privacy page stops claiming Google receives anything. The key
   is read from the environment and injected at request time — never written
   into a shipped file. */
const MAPS_KEY = process.env.VITE_GOOGLE_MAPS_API_KEY || '';

const IS_PROD = process.env.NODE_ENV === 'production';

const storefrontRoot = path.join(__dirname, '..', 'storefront');
const legacyRoot = path.join(__dirname, '..', 'https___chromvault.in_');
const legacySiteRoot = path.join(legacyRoot, 'chromvault.in');
const adminRoot = path.join(__dirname, '..', 'admin panel', 'command-center');

const app = express();
app.disable('x-powered-by');

/* ── Safe injection ──────────────────────────────────────────────────────────
   Config values reach the page inside a <script> block, and some of them come
   from environment variables an operator controls. JSON.stringify alone is not
   enough: a value containing "</script>" would close the block early. Escaping
   < > & as unicode escapes keeps the payload valid JSON and inert as HTML. */
function jsonForScript(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

/* ── Storefront: the new SPA ───────────────────────────────────────────────── */

/* Customer route shapes. This mirrors the ROUTES table in
   storefront/js/app.js and exists for one reason: to answer with the right HTTP
   status. The SPA renders its own not-found view either way, but a crawler,
   a monitor and a browser's error console all deserve a real 404 rather than a
   200 on a URL that does not exist.

   backend/tests/storefront.test.js walks this list against a live server, so
   the two tables cannot silently drift apart. */
const CUSTOMER_ROUTES = [
  /^\/$/,
  /^\/shop\/?$/,
  /^\/product-category\/[^/]+\/?$/,
  /^\/product\/id\/[^/]+\/?$/,
  /^\/product\/[^/]+\/?$/,
  /^\/cart\/?$/,
  /^\/checkout\/?$/,
  /^\/(?:track|order-tracking)\/?$/,
  /^\/(?:contact|contact-us)\/?$/,
  /^\/(?:shipping-policy|shipping)\/?$/,
  /^\/(?:returns|return-replacement-policy|returns-policy)\/?$/,
  /^\/(?:privacy|privacy-policy|privacy-policy-2)\/?$/,
  /^\/(?:terms|terms-conditions|terms-and-conditions)\/?$/,
  /^\/about\/?$/
];

/* WordPress plumbing that the scrape exposed and the new site has no analogue
   for. 410 Gone (not 404) tells crawlers to drop these permanently, which is
   what we want for /feed and /wp-json. */
const RETIRED_PATHS = [
  /^\/wp-json(?:\/|$)/,
  /^\/wp-includes(?:\/|$)/,
  /^\/xmlrpc\.php$/i,
  /^\/wp-login\.php$/i,
  /^\/feed\/?$/,
  /^\/comments(?:\/|$)/,
  /^\/my-account(?:\/|$)/,
  /^\/\$\{i\}(?:\/|$)/          // an HTTrack artefact: a literal ${i} directory
];

function isCustomerRoute(pathname) {
  return CUSTOMER_ROUTES.some((re) => re.test(pathname));
}

/* A path that looks like a file must never be answered with HTML. Returning the
   SPA shell for a missing .js is how you get "Uncaught SyntaxError: Unexpected
   token '<'" and an hour of confusion. */
function looksLikeAsset(pathname) {
  return /\.[a-zA-Z0-9]{1,8}$/.test(pathname);
}

let shellCache = null;

function readShell() {
  // Re-read every request outside production so editing index.html does not
  // need a restart; cache it in production where the file cannot change.
  if (IS_PROD && shellCache) return shellCache;
  const html = fs.readFileSync(path.join(storefrontRoot, 'index.html'), 'utf8');
  if (IS_PROD) shellCache = html;
  return html;
}

/* Contact details. config.js already ships the real published ones; these
   overrides exist so a staging deploy can point at a test inbox instead of the
   live one. Only keys actually set are sent, so a partial override merges
   rather than blanking the rest. */
function contactOverrides() {
  const map = {
    whatsapp: process.env.STOREFRONT_WHATSAPP,
    whatsappLabel: process.env.STOREFRONT_WHATSAPP_LABEL,
    email: process.env.STOREFRONT_EMAIL,
    instagram: process.env.STOREFRONT_INSTAGRAM
  };
  const out = {};
  Object.keys(map).forEach((k) => {
    if (map[k]) out[k] = String(map[k]).trim();
  });
  return out;
}

function injectConfig(html) {
  const lines = [];
  if (STOREFRONT_API_BASE) {
    lines.push(`window.__CHROMVAULT_API_BASE__=${jsonForScript(STOREFRONT_API_BASE)};`);
  }
  if (MAPS_KEY) {
    lines.push(`window.__CHROMVAULT_MAPS_KEY__=${jsonForScript(MAPS_KEY)};`);
  }
  const contact = contactOverrides();
  if (Object.keys(contact).length) {
    lines.push(`window.__CHROMVAULT_CONTACT__=${jsonForScript(contact)};`);
  }
  if (!lines.length) return html;

  // Must land before config.js runs, so immediately after <head>.
  const block = `<script>${lines.join('')}</script>`;
  return /<head[^>]*>/i.test(html)
    ? html.replace(/<head[^>]*>/i, (m) => m + block)
    : block + html;
}

function sendShell(res, status) {
  let html;
  try {
    html = injectConfig(readShell());
  } catch (err) {
    console.error('Storefront shell is unreadable:', err.message);
    return res.status(500).type('txt')
      .send('Storefront is misconfigured: storefront/index.html could not be read.');
  }
  res.status(status)
    // The shell carries the injected API base and Maps key, so it must never be
    // held in a shared cache. Versioned ?v= query strings handle JS and CSS.
    .set('Cache-Control', 'no-store, must-revalidate')
    .type('html')
    .send(html);
}

function mountStorefront() {
  /* 1. Canonical URLs, before anything can serve a body.
        The scrape lived under /chromvault.in/, and those paths are in browser
        histories and possibly in search results. 301 keeps them working. */
  app.use((req, res, next) => {
    if (req.path === '/chromvault.in' || req.path.startsWith('/chromvault.in/')) {
      const rest = req.path.slice('/chromvault.in'.length) || '/';
      const qs = req.originalUrl.slice(req.path.length);
      return res.redirect(301, rest + qs);
    }
    // /index.html is the shell's real filename; / is its address.
    if (req.path === '/index.html') return res.redirect(301, '/');
    next();
  });

  /* 2. Retired WordPress surface. /wp-admin redirects rather than 410s because
        the operator is the only one who ever typed it, and they want the admin. */
  app.use((req, res, next) => {
    if (/^\/wp-admin(?:\/|$)/.test(req.path)) return res.redirect(302, ADMIN_URL);
    if (RETIRED_PATHS.some((re) => re.test(req.path))) {
      return res.status(410).type('txt')
        .send('Gone. This address belonged to the previous WordPress site.');
    }
    next();
  });

  /* 3. API proxy. Same-origin /v1 → the backend, so the browser makes no
        cross-origin request and the backend sees no Origin header. */
  app.use('/v1', createProxyMiddleware({
    target: API_TARGET,
    changeOrigin: true,
    // Express has already stripped the '/v1' mount prefix from req.url, so the
    // proxy appends the remainder to API_TARGET (which ends in /v1) directly.
    // No pathRewrite is needed or wanted here.
    on: {
      error: (err, req, res) => {
        console.error(`[proxy] ${req.method} ${req.originalUrl} → ${API_TARGET}: ${err.message}`);
        if (res && !res.headersSent && res.status) {
          res.status(502).type('json').send(JSON.stringify({
            message: 'The catalogue service is unreachable. Please try again.'
          }));
        }
      }
    }
  }));

  /* 4. The service worker. Served explicitly, ahead of express.static, so the
        no-cache header is guaranteed — a service worker that gets cached for a
        year cannot be updated, and browsers only bypass their own HTTP cache for
        it once every 24 hours. */
  app.get('/service-worker.js', (req, res) => {
    res.set('Cache-Control', 'no-cache')
      .set('Service-Worker-Allowed', '/')
      .type('application/javascript')
      .sendFile(path.join(storefrontRoot, 'service-worker.js'));
  });

  /* 5. The shell, at its canonical address. Registered before express.static so
        the injected config is never bypassed by static file resolution. */
  app.get('/', (req, res) => sendShell(res, 200));

  /* 6. Real files. index:false stops serve-static answering '/' with the raw,
        un-injected index.html. */
  app.use(express.static(storefrontRoot, {
    index: false,
    etag: true,
    lastModified: true,
    redirect: false,
    setHeaders: (res, filePath) => {
      if (/\.(?:png|jpe?g|webp|avif|gif|ico|woff2?)$/i.test(filePath)) {
        // Icons and fonts are stable; their names change when they do.
        res.set('Cache-Control', 'public, max-age=2592000');   // 30 days
      } else if (/\.webmanifest$/i.test(filePath)) {
        res.set('Cache-Control', 'public, max-age=3600');
      } else {
        // CSS and JS carry a ?v= query string, but relying on the operator to
        // bump it is a footgun. Revalidate instead: a 304 costs one round trip
        // and a stale script costs a broken checkout.
        res.set('Cache-Control', 'no-cache');
      }
    }
  }));

  /* 7. Legacy image compatibility. If the production database still holds
        WordPress-relative image paths (/wp-content/uploads/…) rather than
        Cloudinary URLs, those images keep resolving. Scoped to uploads/ only —
        the themes, plugins and scripts under wp-content are not served.
        Mounted only when the directory actually exists, so a deployment that
        drops the scrape entirely does not gain a broken route. */
  const uploadsDir = path.join(legacySiteRoot, 'wp-content', 'uploads');
  if (fs.existsSync(uploadsDir)) {
    app.use('/wp-content/uploads', express.static(uploadsDir, {
      index: false,
      redirect: false,
      maxAge: '30d'
    }));
  }

  /* 8. Everything left over. An asset-looking path is a genuine 404; a route
        shape the SPA knows gets the shell with 200; anything else gets the shell
        with 404 so the status is honest while the customer still sees a styled
        page with navigation instead of bare text. */
  app.use((req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return res.status(405).type('txt').send('Method Not Allowed');
    }
    if (looksLikeAsset(req.path)) {
      return res.status(404).type('txt').send('Not Found');
    }
    sendShell(res, isCustomerRoute(req.path) ? 200 : 404);
  });
}

/* ── Storefront: the legacy scrape (rollback only) ────────────────────────────
   Preserved as it was, including the WooCommerce hydration shims. Reachable
   only via STOREFRONT_LEGACY=1. Nothing in here is on the default path. */

function serveFixedHtml(res, filePath) {
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('Not Found');
  }
  let html = fs.readFileSync(filePath, 'utf8');

  if (STOREFRONT_API_BASE) {
    const inject = `<script>window.__CHROMVAULT_API_BASE__=${jsonForScript(STOREFRONT_API_BASE)};</script>`;
    html = /<head[^>]*>/i.test(html)
      ? html.replace(/<head[^>]*>/i, (m) => m + inject)
      : inject + html;
  }

  // Strip WooCommerce/Jetpack analytics: they throw a Webpack ChunkLoadError
  // against the scraped bundle and reload in a loop.
  html = html.replace(/<script[^>]*id=["']woocommerce-analytics-client-js["'][^>]*><\/script>/gi, '');
  html = html.replace(/<script[^>]*id=["']woocommerce-analytics-js["'][^>]*><\/script>/gi, '');

  const dynamicProductsHtml = `
    <ul class="products columns-4" id="dynamic-products-container"></ul>
    <script>
      document.addEventListener('DOMContentLoaded', () => {
        if (window.chromvaultAPI) {
          window.chromvaultAPI.renderProducts('#dynamic-products-container');
        }
      });
    </script>
  `;
  html = html.replace(/<ul class="products columns-4">[\s\S]*?<\/ul>/, dynamicProductsHtml);

  const singleProductScript = `
    <script>
      document.addEventListener('DOMContentLoaded', async () => {
        if (window.location.pathname.includes('/product/')) {
          const slug = window.location.pathname.split('/').filter(Boolean).pop();
          if (window.chromvaultAPI) {
            const product = await window.chromvaultAPI.fetchProductBySlug(slug);
            if (product) {
              const titleEl = document.querySelector('h1.product_title');
              if (titleEl) {
                  titleEl.innerText = (typeof product.title === 'object' ? product.title.en : product.title) || 'Product';
              }

              const price = product.prices?.price ?? product.price ?? 0;
              const originalPrice = product.prices?.originalPrice ?? product.originalPrice ?? price;
              const priceEl = document.querySelector('p.price');
              if (priceEl) {
                  priceEl.innerHTML = originalPrice > price
                    ? \`<del aria-hidden="true"><span class="woocommerce-Price-amount amount"><bdi><span class="woocommerce-Price-currencySymbol">&#8377;</span>\${originalPrice}</bdi></span></del>
                       <ins><span class="woocommerce-Price-amount amount"><bdi><span class="woocommerce-Price-currencySymbol">&#8377;</span>\${price}</bdi></span></ins>\`
                    : \`<span class="woocommerce-Price-amount amount"><bdi><span class="woocommerce-Price-currencySymbol">&#8377;</span>\${price}</bdi></span>\`;
              }

              const image = Array.isArray(product.image) ? product.image[0] : (product.image || '/wp-content/uploads/woocommerce-placeholder.png');
              const imgEl = document.querySelector('.woocommerce-product-gallery__image img, img.wp-post-image');
              if (imgEl) {
                  imgEl.src = image;
                  imgEl.srcset = '';
              }

              const productId = product._id || product.id || slug;

              const formCart = document.querySelector('form.cart');
              if (formCart) {
                  formCart.innerHTML = \`
                      <div style="display: flex; gap: 15px; width: 100%; margin-top: 20px;">
                          <a
                              href="#"
                              data-product_id="\${productId}"
                              class="button single_add_to_cart_button ajax_add_to_cart"
                              style="flex: 1; text-align: center; border-radius: 0; background-color: #fff; color: #000; border: 2px solid #000; text-transform: uppercase; font-weight: bold; padding: 15px; font-family: sans-serif; letter-spacing: 1px;"
                          >Add to Cart</a>
                          <a
                              href="/cart/"
                              data-product_id="\${productId}"
                              class="button single_buy_now_button"
                              style="flex: 1; text-align: center; border-radius: 0; background-color: #000; color: #fff; border: 2px solid #000; text-transform: uppercase; font-weight: bold; padding: 15px; font-family: sans-serif; letter-spacing: 1px;"
                          >Buy Now</a>
                      </div>
                  \`;
              }
            }
          }
        }
      });
    </script>
  `;
  html = html.replace('</body>', singleProductScript + '\n</body>');

  html = html.replace(/href=["']([^"']*?)index\.html["']/gi, (match, p1) => {
    if (p1 === '') return 'href="/"';
    return `href="${p1}"`;
  });

  res.set('Cache-Control', 'no-store').send(html);
}

function mountLegacyStorefront() {
  console.warn('⚠  STOREFRONT_LEGACY=1 — serving the archived scrape, not storefront/.');

  app.use('/assets', express.static(path.join(legacySiteRoot, 'assets')));
  app.use('/wp-content', express.static(path.join(legacySiteRoot, 'wp-content')));
  app.use('/wp-includes', express.static(path.join(legacySiteRoot, 'wp-includes')));

  app.get(['/', '/chromvault.in', '/chromvault.in/'], (req, res) => {
    serveFixedHtml(res, path.join(legacySiteRoot, 'index.html'));
  });

  app.get(['/shop', '/shop/', '/chromvault.in/shop', '/chromvault.in/shop/'], (req, res) => {
    serveFixedHtml(res, path.join(legacySiteRoot, 'shop', 'index.html'));
  });

  app.get(['/cart', '/cart/', '/chromvault.in/cart', '/chromvault.in/cart/'], (req, res) => {
    serveFixedHtml(res, path.join(legacySiteRoot, 'cart', 'index.html'));
  });

  app.get(['/contact-us', '/contact-us/', '/chromvault.in/contact-us', '/chromvault.in/contact-us/'], (req, res) => {
    const f = path.join(legacySiteRoot, 'contact-us', 'index.html');
    if (fs.existsSync(f)) return serveFixedHtml(res, f);
    serveFixedHtml(res, path.join(legacySiteRoot, 'index.html'));
  });

  ['shipping-policy', 'return-replacement-policy', 'privacy-policy-2', 'track'].forEach((page) => {
    app.get([`/${page}`, `/${page}/`, `/chromvault.in/${page}`, `/chromvault.in/${page}/`], (req, res) => {
      const f = path.join(legacySiteRoot, page, 'index.html');
      if (fs.existsSync(f)) return serveFixedHtml(res, f);
      serveFixedHtml(res, path.join(legacySiteRoot, 'index.html'));
    });
  });

  app.get([
    '/product-category/:cat', '/product-category/:cat/',
    '/chromvault.in/product-category/:cat', '/chromvault.in/product-category/:cat/'
  ], (req, res) => {
    const f = path.join(legacySiteRoot, 'product-category', req.params.cat, 'index.html');
    if (fs.existsSync(f)) return serveFixedHtml(res, f);
    serveFixedHtml(res, path.join(legacySiteRoot, 'shop', 'index.html'));
  });

  app.get([
    '/product/:slug', '/product/:slug/',
    '/chromvault.in/product/:slug', '/chromvault.in/product/:slug/'
  ], (req, res) => {
    serveFixedHtml(res, path.join(legacySiteRoot, 'product', 'template', 'index.html'));
  });

  app.use('/chromvault.in', express.static(legacySiteRoot));
  app.use(express.static(legacySiteRoot));
  app.use(express.static(legacyRoot));

  app.use((req, res, next) => {
    if (looksLikeAsset(req.path)) {
      return res.status(404).type('txt').send('Not Found');
    }
    next();
  });
  app.use((req, res) => {
    serveFixedHtml(res, path.join(legacySiteRoot, 'index.html'));
  });
}

/* ── Admin Command Center (unchanged) ────────────────────────────────────────
   Buildless single-page admin on its own port. Static assets from
   command-center/, /api proxied to the backend, and non-asset paths fall back
   to index.html so the hash router takes over. This app is deliberately
   untouched by the storefront migration. */
function startAdminServer() {
  const adminApp = express();
  adminApp.disable('x-powered-by');

  adminApp.use('/api', createProxyMiddleware({
    target: API_TARGET,
    changeOrigin: true,
    pathRewrite: { '^/api': '' }
  }));

  adminApp.use(express.static(adminRoot));

  adminApp.use((req, res) => {
    if (looksLikeAsset(req.path)) {
      return res.status(404).type('txt').send('Not Found');
    }
    let html;
    try {
      html = fs.readFileSync(path.join(adminRoot, 'index.html'), 'utf8');
    } catch (err) {
      console.error('Admin shell is unreadable:', err.message);
      return res.status(500).type('txt').send('Admin panel is misconfigured.');
    }

    // Optional override; defaults to the same-origin "/api" proxy above.
    if (process.env.ADMIN_API_BASE) {
      const base = jsonForScript(process.env.ADMIN_API_BASE.replace(/\/+$/, ''));
      const inject = `<script>window.__ADMIN_API_BASE__=${base};</script>`;
      html = html.replace(/<head[^>]*>/i, (m) => m + inject);
    }
    res.set('Cache-Control', 'no-store').send(html);
  });

  return adminApp.listen(ADMIN_PORT, () => {
    console.log(`✅ Admin Panel (Command Center) running at ${ADMIN_URL}`);
  });
}

/* ── Boot ────────────────────────────────────────────────────────────────────
   Order matters only here: the admin redirect is registered before the
   storefront's catch-all so /admin never falls through to the SPA shell. */

startAdminServer();

app.use('/admin', (req, res) => res.redirect(ADMIN_URL));

if (LEGACY) mountLegacyStorefront();
else mountStorefront();

const server = app.listen(PORT, () => {
  const origin = `http://localhost:${PORT}`;
  console.log(`✅ Chromvault Storefront running at ${origin}`);
  console.log(`   Serving:      ${LEGACY ? 'legacy scrape (rollback mode)' : 'storefront/ (SPA)'}`);
  console.log(`   API base:     ${STOREFRONT_API_BASE}  →  ${API_TARGET}`);
  console.log(`   Google Maps:  ${MAPS_KEY ? 'key configured (address autocomplete on)' : 'not configured (manual address entry)'}`);
  console.log(`   Home:         ${origin}/`);
  console.log(`   Shop:         ${origin}/shop`);
  console.log(`   Product:      ${origin}/product/:slug`);
  console.log(`   Cart:         ${origin}/cart`);
  console.log(`   Checkout:     ${origin}/checkout`);
  console.log(`   Admin:        ${origin}/admin  →  ${ADMIN_URL}`);
});

module.exports = { app, server };
