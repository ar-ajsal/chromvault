/* ============================================================================
   CHROMORA — API CLIENT
   ----------------------------------------------------------------------------
   Thin wrapper over the existing backend. No endpoints were added or changed:

     GET  /products?page&limit&category&title   → { products, totalDoc, page, limit, pages }
     GET  /products/slug/:slug                  → product | 404
     GET  /category/all                         → { categories }
     POST /orders/create-razorpay-order         → { id, amount, currency, key }
     POST /orders/verify-payment                → { success, order }

   Everything is a public read except the two order endpoints, which are public
   by design (guest checkout via Razorpay).
   ========================================================================== */
(function () {
  'use strict';

  var BASE = (window.CHROMORA_CONFIG && window.CHROMORA_CONFIG.API_BASE) ||
    ((location.hostname === 'localhost' || location.hostname === '127.0.0.1')
      ? 'http://localhost:5000/v1'
      : location.origin + '/v1');

  /* In-memory cache. Product lists and the category list are read on nearly
     every navigation; caching them for the session makes back-navigation
     instant without a service worker caching API responses (which it must not
     do — stock and price would go stale). */
  var cache = Object.create(null);
  var inflight = Object.create(null);

  function req(path, opts) {
    var o = opts || {};
    var url = BASE + path;
    var init = {
      method: o.method || 'GET',
      headers: o.body ? { 'Content-Type': 'application/json' } : undefined,
      body: o.body ? JSON.stringify(o.body) : undefined,
      // No credentials: these are public endpoints and sending cookies
      // cross-origin would break the CORS allowlist.
      credentials: 'omit'
    };

    return fetch(url, init).then(function (res) {
      var ct = res.headers.get('content-type') || '';
      var parse = ct.indexOf('application/json') >= 0
        ? res.json().catch(function () { return {}; })
        : res.text().then(function (t) { return { message: t }; });

      return parse.then(function (data) {
        if (!res.ok) {
          var err = new Error((data && data.message) || ('Request failed (' + res.status + ')'));
          err.status = res.status;
          err.data = data;
          throw err;
        }
        return data;
      });
    });
  }

  // Deduplicate identical concurrent GETs and cache the result.
  function cachedGet(key, path) {
    if (cache[key]) return Promise.resolve(cache[key]);
    if (inflight[key]) return inflight[key];
    inflight[key] = req(path)
      .then(function (data) { cache[key] = data; delete inflight[key]; return data; })
      .catch(function (e) { delete inflight[key]; throw e; });
    return inflight[key];
  }

  var API = {
    base: BASE,

    /* ── Products ───────────────────────────────────────────────────────── */
    products: function (o) {
      var q = o || {};
      var params = {
        page: q.page || 1,
        limit: q.limit || 24
      };
      if (q.category) params.category = q.category;
      if (q.title) params.title = q.title;

      var path = '/products' + U.qs(params);
      var key = 'p:' + path;

      return cachedGet(key, path).then(function (data) {
        // The controller returns a wrapper, but tolerate a bare array in case
        // an older deploy is on the other end.
        var list = Array.isArray(data) ? data : (data && data.products) || [];
        return {
          products: list.filter(visible),
          total: U.num(data && data.totalDoc, list.length),
          pages: U.num(data && data.pages, 1),
          page: U.num(data && data.page, params.page),
          limit: U.num(data && data.limit, params.limit)
        };
      });
    },

    productBySlug: function (slug) {
      return cachedGet('s:' + slug, '/products/slug/' + encodeURIComponent(slug));
    },

    /* No public GET /products/:id exists (that route is POST + protectAdmin),
       so an id-addressed product is resolved by scanning the public list. Used
       only as a fallback for products that have no slug. */
    productById: function (id) {
      var key = 'i:' + id;
      if (cache[key]) return Promise.resolve(cache[key]);
      return API.products({ limit: 100 }).then(function (r) {
        var hit = null;
        r.products.some(function (p) {
          if (U.pid(p) === id) { hit = p; return true; }
          return false;
        });
        if (!hit) {
          var e = new Error('Product not found');
          e.status = 404;
          throw e;
        }
        cache[key] = hit;
        return hit;
      });
    },

    /* ── Categories ─────────────────────────────────────────────────────── */
    categories: function () {
      return cachedGet('cats', '/category/all').then(function (data) {
        var list = Array.isArray(data) ? data : (data && data.categories) || [];
        return list.filter(visible).filter(function (c) { return !!U.catName(c); });
      });
    },

    /* ── Orders (existing contract, unchanged) ───────────────────────────
       createOrder sends the CART, never an amount. The server prices the order
       from the database and returns the authoritative Razorpay amount. This is
       the payment-integrity guarantee and must not be "optimised" away. */
    createOrder: function (cart) {
      return req('/orders/create-razorpay-order', {
        method: 'POST',
        body: { cart: cart, currency: 'INR' }
      });
    },

    verifyPayment: function (payload) {
      return req('/orders/verify-payment', { method: 'POST', body: payload });
    },

    /* ── Cache control ────────────────────────────────────────────────────
       Called after a successful order so stock counts re-fetch. */
    bust: function () {
      cache = Object.create(null);
      inflight = Object.create(null);
    }
  };

  // Hidden records must never reach the storefront. The admin sets
  // status:'hide' to unpublish, and the public list endpoint does not filter.
  function visible(doc) {
    return !doc || doc.status !== 'hide';
  }

  window.API = API;
})();
