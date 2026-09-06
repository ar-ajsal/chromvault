const express = require('express');
const path = require('path');
const fs = require('fs');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

// ─── Environment-based configuration ───────────────────────
// Everything that used to be hardcoded to localhost is now driven by env vars
// so the same code runs in dev and prod. Sensible localhost defaults are kept
// so `node frontendServer.js` still "just works" during development.
const PORT = parseInt(process.env.STOREFRONT_PORT, 10) || 3001;
const ADMIN_PORT = parseInt(process.env.ADMIN_PORT, 10) || 3002;
// Where the storefront/admin should send API calls. In production set this to
// your public backend, e.g. https://api.chromora.in/v1 (no trailing slash).
const API_TARGET = (process.env.API_PROXY_TARGET || 'http://localhost:5000/v1').replace(/\/+$/, '');
// Value injected into served HTML as window.__CHROMORA_API_BASE__ so the
// storefront's config.js can pick it up. Defaults to the same-origin /api proxy
// on the admin server, or leave blank to let config.js use its own heuristic.
const STOREFRONT_API_BASE = process.env.STOREFRONT_API_BASE || '';
const ADMIN_URL = process.env.ADMIN_URL || `http://localhost:${ADMIN_PORT}`;

const staticRoot = path.join(__dirname, '..', 'https___chromora.in_');
const siteRoot = path.join(staticRoot, 'chromora.in');

// Helper to fix URLs by removing index.html from hrefs
function serveFixedHtml(res, filePath) {
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('Not Found');
  }
  let html = fs.readFileSync(filePath, 'utf8');

  // Inject the runtime API base (from env) so config.js resolves the right
  // backend in production without editing shipped JS. Harmless when blank.
  if (STOREFRONT_API_BASE) {
    const inject = `<script>window.__CHROMORA_API_BASE__=${JSON.stringify(STOREFRONT_API_BASE)};</script>`;
    if (/<head[^>]*>/i.test(html)) {
      html = html.replace(/<head[^>]*>/i, (m) => m + inject);
    } else {
      html = inject + html;
    }
  }

  // Strip WooCommerce/Jetpack Analytics to prevent Webpack ChunkLoadError infinite reload loop (blinking)
  html = html.replace(/<script[^>]*id=["']woocommerce-analytics-client-js["'][^>]*><\/script>/gi, '');
  html = html.replace(/<script[^>]*id=["']woocommerce-analytics-js["'][^>]*><\/script>/gi, '');
  
  // Replace dummy static products with backend products on frontend
  const dynamicProductsHtml = `
    <ul class="products columns-4" id="dynamic-products-container"></ul>
    <script>
      document.addEventListener('DOMContentLoaded', () => {
        if (window.chromoraAPI) {
          window.chromoraAPI.renderProducts('#dynamic-products-container');
        }
      });
    </script>
  `;
  html = html.replace(/<ul class="products columns-4">[\s\S]*?<\/ul>/, dynamicProductsHtml);
  
  // Inject single product dynamic script
  const singleProductScript = `
    <script>
      document.addEventListener('DOMContentLoaded', async () => {
        if (window.location.pathname.includes('/product/')) {
          const slug = window.location.pathname.split('/').filter(Boolean).pop();
          if (window.chromoraAPI) {
            const product = await window.chromoraAPI.fetchProductBySlug(slug);
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
                  imgEl.srcset = ''; // Clear srcset so the custom src is used
              }

              const productId = product._id || product.id || slug;
              const title = titleEl ? titleEl.innerText : 'Product';
              
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
  html = html.replace('</body>', singleProductScript + '\\n</body>');

  // Fix local URLs: replace href="some/path/index.html" with href="some/path/"
  html = html.replace(/href=["']([^"']*?)index\.html["']/gi, (match, p1) => {
    // If it's just href="index.html", it becomes href="" which navigates to the same folder.
    // Usually it's better to make it href="/" for root or just let it be.
    if (p1 === '') return `href="/"`;
    return `href="${p1}"`;
  });
  
  res.send(html);
}

// ─── Static Assets First (highest priority) ───────────────────────────────────
app.use('/assets', express.static(path.join(siteRoot, 'assets')));
app.use('/wp-content', express.static(path.join(siteRoot, 'wp-content')));
app.use('/wp-includes', express.static(path.join(siteRoot, 'wp-includes')));

// ─── Named Page Routes ─────────────────────────────────────────────────────────

// Homepage
app.get(['/', '/chromora.in', '/chromora.in/'], (req, res) => {
  serveFixedHtml(res, path.join(siteRoot, 'index.html'));
});

// Shop
app.get(['/shop', '/shop/', '/chromora.in/shop', '/chromora.in/shop/'], (req, res) => {
  serveFixedHtml(res, path.join(siteRoot, 'shop', 'index.html'));
});

// Cart
app.get(['/cart', '/cart/', '/chromora.in/cart', '/chromora.in/cart/'], (req, res) => {
  serveFixedHtml(res, path.join(siteRoot, 'cart', 'index.html'));
});

// Contact
app.get(['/contact-us', '/contact-us/', '/chromora.in/contact-us', '/chromora.in/contact-us/'], (req, res) => {
  const f = path.join(siteRoot, 'contact-us', 'index.html');
  if (fs.existsSync(f)) return serveFixedHtml(res, f);
  serveFixedHtml(res, path.join(siteRoot, 'index.html'));
});

// Policies
const staticPages = ['shipping-policy', 'return-replacement-policy', 'privacy-policy-2', 'track'];
staticPages.forEach(page => {
  app.get([`/${page}`, `/${page}/`, `/chromora.in/${page}`, `/chromora.in/${page}/`], (req, res) => {
    const f = path.join(siteRoot, page, 'index.html');
    if (fs.existsSync(f)) return serveFixedHtml(res, f);
    serveFixedHtml(res, path.join(siteRoot, 'index.html'));
  });
});

// Product category pages
app.get([
  '/product-category/:cat',
  '/product-category/:cat/',
  '/chromora.in/product-category/:cat',
  '/chromora.in/product-category/:cat/'
], (req, res) => {
  const f = path.join(siteRoot, 'product-category', req.params.cat, 'index.html');
  if (fs.existsSync(f)) return serveFixedHtml(res, f);
  serveFixedHtml(res, path.join(siteRoot, 'shop', 'index.html'));
});

// Individual Product Pages → dynamic template
app.get([
  '/product/:slug',
  '/product/:slug/',
  '/chromora.in/product/:slug',
  '/chromora.in/product/:slug/'
], (req, res) => {
  serveFixedHtml(res, path.join(siteRoot, 'product', 'template', 'index.html'));
});

// ─── Admin Panel (Chromora Command Center) ──────────────────────────────────────
// Buildless single-page admin. Static assets are served from command-center/,
// /api is proxied to the backend, and all non-asset paths fall back to
// index.html so the hash router can take over.
const adminRoot = path.join(__dirname, '..', 'admin panel', 'command-center');
const adminApp = express();

// Proxy /api/* → API_TARGET (env-driven; defaults to local backend /v1)
adminApp.use('/api', createProxyMiddleware({
  target: API_TARGET,
  changeOrigin: true,
  pathRewrite: { '^/api': '' }
}));

// Static command-center files: styles.css, *.js, views/*.js, and the PWA
// assets (manifest.webmanifest, service-worker.js, icons, favicon).
adminApp.use(express.static(adminRoot));

// SPA fallback: anything that isn't a real file → index.html (hash router).
// Reject requests that look like a missing asset so we don't return HTML for JS.
adminApp.use((req, res) => {
  if (req.path.match(/\.[a-zA-Z0-9]+$/)) {
    return res.status(404).type('txt').send('Not Found');
  }
  let html = fs.readFileSync(path.join(adminRoot, 'index.html'), 'utf8');

  // Optionally override the admin API base at runtime (defaults to the
  // same-origin "/api" proxy). Set ADMIN_API_BASE only if the admin must talk
  // to a backend on a different origin.
  if (process.env.ADMIN_API_BASE) {
    const base = JSON.stringify(process.env.ADMIN_API_BASE.replace(/\/+$/, ''));
    const inject = `<script>window.__ADMIN_API_BASE__=${base};</script>`;
    html = html.replace(/<head[^>]*>/i, (m) => m + inject);
  }
  res.send(html);
});

adminApp.listen(ADMIN_PORT, () => {
  console.log(`✅ Admin Panel (Command Center) running at ${ADMIN_URL}`);
});

app.use('/admin', (req, res) => res.redirect(ADMIN_URL));

// ─── Full Site Static Files ────────────────────────────────────────────────────
app.use('/chromora.in', express.static(siteRoot));
app.use(express.static(siteRoot));
app.use(express.static(staticRoot));

// ─── Catch-All Fallback ────────────────────────────────────────────────────────
// Catch-All for missing static assets (prevent serving index.html for .js, .css, etc)
app.use((req, res, next) => {
  if (req.path.match(/\.[a-zA-Z0-9]+$/)) {
    return res.status(404).type('txt').send('Not Found');
  }
  next();
});
// Otherwise, fallback to index.html
app.use((req, res) => {
  serveFixedHtml(res, path.join(siteRoot, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Chromora Storefront running at http://localhost:${PORT}`);
  console.log(`   Homepage:     http://localhost:${PORT}/`);
  console.log(`   Shop:         http://localhost:${PORT}/shop`);
  console.log(`   Product:      http://localhost:${PORT}/product/:slug`);
  console.log(`   Cart:         http://localhost:${PORT}/cart`);
  console.log(`   Admin:        http://localhost:${PORT}/admin`);
});
