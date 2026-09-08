/* ============================================================================
   CHROMVAULT — ROUTER + BOOT
   ----------------------------------------------------------------------------
   A History-API router. Every internal <a> carries data-nav and is intercepted
   in shell.js, which calls Router.go(). Direct entry and refresh work because
   frontendServer.js serves index.html for any non-asset path.

   Route table is ordered: the first pattern that matches wins.

     /                                  home
     /shop                              shop (query: category, q, sort, sale, page)
     /product-category/:category        shop, pre-filtered (legacy URL shape kept
                                        so old links and any indexed pages live)
     /product/:slug                     product detail
     /product/id/:id                    product detail, id fallback for slugless
     /cart                              cart (opens the panel over home)
     /track /contact /contact-us …      static documents
     *                                  not found

   Views own their own rendering; the router only decides who renders and
   guarantees exactly one view is active at a time (a stale async response from
   a previous route must never paint over the current one — hence the token).
   ========================================================================== */
(function () {
  'use strict';

  var Router = {};
  var token = 0;          // increments on every navigation
  var current = null;     // { path, search }

  /* ── Route table ───────────────────────────────────────────────────────── */
  var ROUTES = [
    { re: /^\/$/,                              fn: function () { return Views.home(); } },
    { re: /^\/shop\/?$/,                       fn: function () { return Views.shop(); } },
    { re: /^\/product-category\/([^/]+)\/?$/,  fn: function (m) { return Views.shop({ categoryParam: dec(m[1]) }); } },
    { re: /^\/product\/id\/([^/]+)\/?$/,       fn: function (m) { return Views.product({ id: dec(m[1]) }); } },
    { re: /^\/product\/([^/]+)\/?$/,           fn: function (m) { return Views.product({ slug: dec(m[1]) }); } },
    { re: /^\/cart\/?$/,                       fn: function () { return Views.cart(); } },
    { re: /^\/checkout\/?$/,                   fn: function () { return Views.cart({ step: 'details' }); } },
    { re: /^\/(track|order-tracking)\/?$/,     fn: function () { return Views.doc('track'); } },
    { re: /^\/(contact|contact-us)\/?$/,       fn: function () { return Views.doc('contact'); } },
    { re: /^\/(shipping-policy|shipping)\/?$/, fn: function () { return Views.doc('shipping'); } },
    { re: /^\/(returns|return-replacement-policy|returns-policy)\/?$/, fn: function () { return Views.doc('returns'); } },
    { re: /^\/(privacy|privacy-policy|privacy-policy-2)\/?$/, fn: function () { return Views.doc('privacy'); } },
    { re: /^\/(terms|terms-conditions|terms-and-conditions)\/?$/, fn: function () { return Views.doc('terms'); } },
    { re: /^\/about\/?$/,                      fn: function () { return Views.doc('about'); } },
    { re: /^\/review\/?$/,                     fn: function () { return Views.review(); } }
  ];

  function dec(s) {
    try { return decodeURIComponent(s); } catch (e) { return s; }
  }

  /* ── Navigation ────────────────────────────────────────────────────────── */

  /* go(href) pushes a new entry. Same-URL navigation is a no-op except when it
     is a query-only change on the shop page, where it means "filters changed". */
  Router.go = function (href, opts) {
    var o = opts || {};
    var url = new URL(href, location.origin);
    var next = url.pathname + url.search;
    var here = location.pathname + location.search;

    if (next === here && !o.force) {
      // Re-clicking the current link should still close overlays and jump up.
      window.scrollTo({ top: 0, behavior: 'auto' });
      return;
    }

    if (o.replace) history.replaceState({}, '', next);
    else history.pushState({}, '', next);

    Router.render({ scroll: o.scroll !== false });
  };

  /* Replace the query string without a history entry. Used by shop filters so
     the Back button returns to the previous PAGE, not the previous filter — and
     so a filtered view is still copy-pasteable. */
  Router.setQuery = function (params) {
    var qs = U.qs(params);
    history.replaceState({}, '', location.pathname + qs);
  };

  Router.token = function () { return token; };
  Router.stale = function (t) { return t !== token; };

  Router.params = function () { return U.parseQs(location.search); };

  Router.render = function (opts) {
    var o = opts || {};
    var path = location.pathname.replace(/\/{2,}/g, '/');
    var t = ++token;

    current = { path: path, search: location.search };

    // Tear down anything route-scoped from the previous view before painting.
    Views.teardown();

    var view = U.$('#view');
    if (!view) return;

    var matched = null;
    var args = null;
    for (var i = 0; i < ROUTES.length; i++) {
      var m = path.match(ROUTES[i].re);
      if (m) { matched = ROUTES[i]; args = m; break; }
    }

    if (o.scroll !== false) window.scrollTo(0, 0);

    try {
      if (matched) matched.fn(args);
      else Views.notFound(path);
    } catch (err) {
      console.error('Route render failed:', err);
      Views.fatal(err);
    }

    Shell.markActive();
    Shell.closeSearch();
    if (t !== token) return; // a nested navigation happened during render
  };

  window.addEventListener('popstate', function () {
    Router.render({ scroll: true });
  });

  window.Router = Router;

  /* ── Boot ────────────────────────────────────────────────────────────────
     Order matters: the shell wires global handlers and starts the category
     fetch, then the first route renders. Views that need categories listen for
     the 'chromvault:categories' event rather than waiting on it, so the first
     paint is never blocked by the category request. */
  function boot() {
    if (typeof Lenis !== 'undefined') {
      var lenis = new Lenis();
      function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
      }
      requestAnimationFrame(raf);
    }
    Shell.init();
    Router.render({ scroll: false });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
