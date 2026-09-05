const express = require('express');
const path = require('path');
const fs = require('fs');
const { createProxyMiddleware } = require('http-proxy-middleware');

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

// ─── Admin Panel ───────────────────────────────────────────────────────────────
const adminRoot = path.join(__dirname, '..', 'admin panel', 'dashtar-admin.netlify.app');
const adminApp = express();

const customOrdersRoot = path.join(__dirname, 'custom-orders');
adminApp.use('/orders', express.static(customOrdersRoot));

// Proxy /api/* → http://localhost:5000/v1/*
adminApp.use('/api', createProxyMiddleware({
  target: 'http://localhost:5000/v1',
  changeOrigin: true,
  pathRewrite: { '^/api': '' }
}));

adminApp.use(express.static(adminRoot));

// Redirect individual order detail pages to our custom orders dashboard
adminApp.get('/order/:id', (req, res) => {
  res.redirect('/orders');
});

adminApp.use((req, res, next) => {
  if (req.path.match(/\.[a-zA-Z0-9]+$/)) {
    return res.status(404).type('txt').send('Not Found');
  }
  next();
});

adminApp.use((req, res) => {
  let html = fs.readFileSync(path.join(adminRoot, 'index.html'), 'utf8');
  // Inject script to force full page reload for Custom Orders dashboard and hide Delivery Boys
  const interceptScript = `
    <style>
      a[href*="/delivery-boys"], 
      a[href*="/delivery-boy"],
      a[href*="/shipments"] { 
        display: none !important; 
      }
    </style>
    </style>
    <script>
      document.addEventListener('click', function(e) {
        let el = e.target.closest('a');
        if (el && el.getAttribute('href') === '/orders') {
          e.preventDefault();
          e.stopPropagation();
          window.location.href = '/orders';
        }
      }, true);

      // --- CUSTOM SEARCH MODAL FOR MISSING SIDEBAR ---
      function showCustomSearch() {
         if (document.getElementById('custom-nav-modal')) return;
         const modal = document.createElement('div');
         modal.id = 'custom-nav-modal';
         modal.innerHTML = \`
           <div style="position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.5); z-index:99999; display:flex; justify-content:center; align-items:flex-start; padding-top:10vh;">
             <div style="background:#fff; width:500px; border-radius:8px; padding:20px; box-shadow:0 10px 25px rgba(0,0,0,0.2);">
               <h3 style="margin-top:0; margin-bottom:15px; font-family:sans-serif; color:#111;">Menu Search</h3>
               <input type="text" id="custom-nav-input" placeholder="Search menu (e.g. Products, Orders)..." style="width:100%; padding:12px; border:1px solid #ccc; border-radius:6px; font-size:16px; margin-bottom:15px; outline:none;" autocomplete="off" />
               <ul id="custom-nav-list" style="list-style:none; padding:0; margin:0; max-height:350px; overflow-y:auto; font-family:sans-serif;">
                 <li><a href="/dashboard" style="display:block; padding:12px; color:#333; text-decoration:none; border-bottom:1px solid #eee;">📊 Dashboard</a></li>
                 <li><a href="/products" style="display:block; padding:12px; color:#333; text-decoration:none; border-bottom:1px solid #eee;">🛍️ Products</a></li>
                 <li><a href="/product/add" style="display:block; padding:12px; color:#333; text-decoration:none; border-bottom:1px solid #eee;">➕ Add Product</a></li>
                 <li><a href="/category" style="display:block; padding:12px; color:#333; text-decoration:none; border-bottom:1px solid #eee;">📁 Categories</a></li>
                 <li><a href="/orders" style="display:block; padding:12px; color:#333; text-decoration:none; border-bottom:1px solid #eee;">📦 Orders</a></li>
                 <li><a href="/customers" style="display:block; padding:12px; color:#333; text-decoration:none; border-bottom:1px solid #eee;">👥 Customers</a></li>
                 <li><a href="/coupons" style="display:block; padding:12px; color:#333; text-decoration:none; border-bottom:1px solid #eee;">🎟️ Coupons</a></li>
                 <li><a href="/staff" style="display:block; padding:12px; color:#333; text-decoration:none; border-bottom:1px solid #eee;">🧑‍💼 Our Staff</a></li>
                 <li><a href="/settings" style="display:block; padding:12px; color:#333; text-decoration:none; border-bottom:1px solid #eee;">⚙️ Settings</a></li>
               </ul>
             </div>
           </div>
         \`;
         document.body.appendChild(modal);
         
         const input = document.getElementById('custom-nav-input');
         input.focus();
         
         input.addEventListener('input', (e) => {
           const term = e.target.value.toLowerCase();
           const links = modal.querySelectorAll('li');
           links.forEach(li => {
             if (li.textContent.toLowerCase().includes(term)) {
               li.style.display = 'block';
             } else {
               li.style.display = 'none';
             }
           });
         });
         
         modal.addEventListener('click', (e) => {
           if (e.target === modal.firstElementChild) {
             modal.remove();
           }
         });
         
         const closeHandler = (e) => {
           if (e.key === 'Escape') {
             modal.remove();
             document.removeEventListener('keydown', closeHandler);
           }
         };
         document.addEventListener('keydown', closeHandler);
      }

      document.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
          e.preventDefault();
          showCustomSearch();
        }
      });

      document.addEventListener('click', (e) => {
        const searchDiv = e.target.closest('.relative');
        if (searchDiv && searchDiv.querySelector('input[type="search"]')) {
           e.preventDefault();
           e.stopPropagation();
           showCustomSearch();
        }
      }, true);
    </script>
  `;
  html = html.replace('</body>', interceptScript + '</body>');
  res.send(html);
});

adminApp.listen(3002, () => {
  console.log(`✅ Admin Panel running at http://localhost:3002`);
});

app.use('/admin', (req, res) => res.redirect('http://localhost:3002'));

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
