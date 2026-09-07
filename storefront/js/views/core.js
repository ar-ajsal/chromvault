/* ============================================================================
   CHROMORA — VIEW CORE
   ----------------------------------------------------------------------------
   Shared machinery for every route view:

     • the Views namespace itself (each view file augments it)
     • a product registry, so a click on any card can resolve its product
       document synchronously — no fetch between tap and feedback
     • teardown hooks, so a route can clean up listeners/observers it added
     • mount(), which paints #view and then hydrates icons + scroll reveals
     • the three global states (loading / empty / error) every view reuses

   Nothing here fetches. Views do their own I/O and call back in.
   ========================================================================== */
(function () {
  'use strict';

  var Views = window.Views = window.Views || {};

  /* ── Product registry ────────────────────────────────────────────────────
     Every product a view renders is remembered for the session, keyed by id and
     by slug. shell.js's delegated [data-add] handler looks up here, which is
     what makes "Add to cart" instant from a grid, a rail, search, or the PDP.
     Kept as a plain object rather than a Map for older-browser tolerance. */
  var byId = Object.create(null);
  var bySlug = Object.create(null);

  Views.remember = function (list) {
    (Array.isArray(list) ? list : [list]).forEach(function (p) {
      if (!p) return;
      var id = U.pid(p);
      if (id) byId[id] = p;
      var s = U.slug(p);
      if (s) bySlug[s] = p;
    });
  };

  Views.findProduct = function (idOrSlug) {
    var k = String(idOrSlug || '');
    return byId[k] || bySlug[k] || null;
  };

  /* ── Teardown ────────────────────────────────────────────────────────────
     Views register cleanup for anything that outlives their markup: scroll and
     resize listeners, observers, timers, the mobile buy bar. Router.render()
     calls teardown() before painting the next route. */
  var cleanups = [];

  Views.onTeardown = function (fn) {
    if (typeof fn === 'function') cleanups.push(fn);
  };

  Views.teardown = function () {
    var list = cleanups;
    cleanups = [];
    list.forEach(function (fn) {
      try { fn(); } catch (e) { console.warn('Teardown failed:', e); }
    });
    // The buy bar belongs to the product route only.
    var bb = U.$('#buybar');
    if (bb) { bb.classList.remove('on'); bb.innerHTML = ''; }
  };

  /* ── Mount ───────────────────────────────────────────────────────────────
     Single place where view HTML reaches the DOM, so icon hydration and reveal
     observation can never be forgotten. */
  Views.mount = function (html) {
    var view = U.$('#view');
    if (!view) return null;
    view.innerHTML = html;
    Shell.icons(view);
    FX.observe(view);
    return view;
  };

  /* Paint into a sub-region after an async response — same hydration, without
     replacing the whole route. */
  Views.fill = function (target, html) {
    var node = typeof target === 'string' ? U.$(target) : target;
    if (!node) return null;
    node.innerHTML = html;
    Shell.icons(node);
    FX.observe(node);
    return node;
  };

  /* ── Document title / description ────────────────────────────────────────
     Real per-route metadata. Crawlers that execute JS and, more importantly,
     browser history and shared-tab titles all read this. */
  Views.setMeta = function (title, desc) {
    document.title = title ? (title + ' · Chromora') : 'Chromora — Rare Streetwear & Chrome Accessories';
    if (desc) {
      var m = document.querySelector('meta[name="description"]');
      if (m) m.setAttribute('content', desc);
    }
  };

  /* ── Global states ───────────────────────────────────────────────────────
     Loading, empty and error all render through here so they are visually
     consistent and every one of them offers a way forward. */
  Views.stateHtml = function (o) {
    var opt = o || {};
    var acts = (opt.actions || []).map(function (a) {
      if (a.href) {
        return '<a class="btn ' + (a.primary ? 'btn-primary' : 'btn-ghost') + '" href="' +
               U.escAttr(a.href) + '" data-nav>' + U.esc(a.label) + '</a>';
      }
      return '<button class="btn ' + (a.primary ? 'btn-primary' : 'btn-ghost') + '"' +
             (a.act ? ' data-act="' + U.escAttr(a.act) + '"' : '') + '>' + U.esc(a.label) + '</button>';
    }).join('');

    return '' +
      '<div class="state">' +
        '<div class="state-mark" aria-hidden="true"><span data-ic="' + U.escAttr(opt.icon || 'frown') +
          '" data-ic-size="26"></span></div>' +
        '<h3>' + U.esc(opt.title || 'Nothing here') + '</h3>' +
        (opt.note ? '<p>' + U.esc(opt.note) + '</p>' : '') +
        (acts ? '<div class="row">' + acts + '</div>' : '') +
      '</div>';
  };

  /* An API failure is not the shopper's fault and must never be a blank screen:
     say what happened, offer a retry, and keep a path to the catalogue. */
  Views.errorHtml = function (err, retryAct) {
    var offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    return Views.stateHtml({
      icon: offline ? 'plug' : 'warn',
      title: offline ? 'You are offline' : 'Could not load',
      note: offline
        ? 'Reconnect and try again — your cart is saved on this device.'
        : ((err && err.message) || 'The catalogue did not respond.') + ' Please try again.',
      actions: [
        { label: 'Try again', primary: true, act: retryAct || 'retry' },
        { label: 'Go home', href: '/' }
      ]
    });
  };

  Views.notFound = function (path) {
    Views.setMeta('Page not found');
    Views.mount(
      '<div class="wrap">' +
        Views.stateHtml({
          icon: 'frown',
          title: '404 — nothing at this address',
          note: 'The page ' + (path || '') + ' does not exist. It may have been an archived piece that has since sold.',
          actions: [
            { label: 'Shop everything', href: '/shop', primary: true },
            { label: 'Go home', href: '/' }
          ]
        }) +
      '</div>'
    );
  };

  Views.fatal = function (err) {
    Views.setMeta('Something went wrong');
    Views.mount('<div class="wrap">' + Views.errorHtml(err, 'reload') + '</div>');
  };

  /* Section head used by every homepage rail and the shop grid. Keeping it here
     means the page rhythm is defined once. */
  Views.head = function (o) {
    var opt = o || {};
    return '' +
      '<div class="sec-head">' +
        '<div class="sec-head-main">' +
          (opt.eyebrow ? '<span class="eyebrow">' + U.esc(opt.eyebrow) + '</span>' : '') +
          '<h2 class="' + (opt.big ? 'display t-xl' : 'display t-lg') + '">' + U.esc(opt.title || '') + '</h2>' +
          (opt.note ? '<p class="lead" style="font-size:var(--t-sm)">' + U.esc(opt.note) + '</p>' : '') +
        '</div>' +
        (opt.href
          ? '<a class="btn-text" href="' + U.escAttr(opt.href) + '" data-nav>' + U.esc(opt.linkLabel || 'View all') +
            ' <span class="arw">' + ICON('arrow', 14) + '</span></a>'
          : '') +
      '</div>' +
      '<hr class="chrome-rule" />';
  };

  /* Retry / reload buttons rendered by the states above. Delegated once, at the
     document level, so it works no matter which view painted them. */
  U.on(document, 'click', '[data-act="reload"]', function (e) {
    e.preventDefault();
    location.reload();
  });

  U.on(document, 'click', '[data-act="retry"]', function (e) {
    e.preventDefault();
    API.bust();
    Router.render({ scroll: false });
  });
})();
