const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3001;

const staticRoot = path.join(__dirname, '..', 'https___chromora.in_');
const siteRoot = path.join(staticRoot, 'chromora.in');

// Helper to fix URLs by removing index.html from hrefs
function serveFixedHtml(res, filePath) {
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('Not Found');
  }
  let html = fs.readFileSync(filePath, 'utf8');
  
  // Strip WooCommerce/Jetpack Analytics to prevent Webpack ChunkLoadError infinite reload loop (blinking)
  html = html.replace(/<script[^>]*id=["']woocommerce-analytics-client-js["'][^>]*><\/script>/gi, '');
  html = html.replace(/<script[^>]*id=["']woocommerce-analytics-js["'][^>]*><\/script>/gi, '');
  
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
});
