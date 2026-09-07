/* ============================================================================
   CHROMVAULT — SHOP / CATEGORY / SEARCH
   ----------------------------------------------------------------------------
   One view serves /shop, /shop?category=…, /shop?q=…, /shop?sale=1 and the
   legacy /product-category/:category URL shape.

   What the backend can and cannot do (verified against productController):
     • server-side  → page, limit (max 100), category (id), title (search)
     • NOT server-side → sort, price range, sale filter
   Ordering is always createdAt desc.

   So: category and search are pushed to the API, and sort/sale are applied to
   the set that has been loaded. That is an honest constraint, and it is why
   "Load more" accumulates rather than replacing — sorting a growing accumulated
   set stays correct, whereas sorting one arbitrary page would silently lie about
   "cheapest first".
   ========================================================================== */
(function () {
  'use strict';

  var Views = window.Views = window.Views || {};

  var PER = 24;

  // Route-scoped state. Reset on every entry to the view.
  var S = null;

  var SORTS = [
    { v: 'new',   label: 'Newest' },
    { v: 'price', label: 'Price: low to high' },
    { v: 'price-desc', label: 'Price: high to low' },
    { v: 'off',   label: 'Biggest reduction' },
    { v: 'name',  label: 'A – Z' }
  ];

  Views.shop = function (opts) {
    var o = opts || {};
    var q = Router.params();

    S = {
      token: Router.token(),
      // categoryParam arrives from /product-category/:x, which may be an id or a
      // name-slug. It is resolved against the real category list below.
      categoryParam: o.categoryParam || '',
      category: q.category || '',
      q: q.q || '',
      sort: q.sort || 'new',
      sale: q.sale === '1' || q.sale === 'true',
      page: 1,
      pages: 1,
      total: 0,
      loaded: [],
      loading: false,
      done: false
    };

    Views.mount(shellHtml());
    wire();

    // A legacy /product-category/:x URL needs the category list before it can
    // resolve to an id, so it waits; every other entry loads immediately.
    if (S.categoryParam) resolveCategoryThenLoad();
    else load(true);
  };

  /* ── Chrome ──────────────────────────────────────────────────────────────── */

  function heading() {
    if (S.q) return 'Search: “' + S.q + '”';
    if (S.sale) return 'Sale';
    var c = currentCategory();
    if (c) return U.catName(c);
    if (S.sort === 'new') return 'New in';
    return 'Everything';
  }

  function currentCategory() {
    if (!S.category) return null;
    var hit = null;
    Shell.categories().some(function (c) {
      if (U.catId(c) === S.category) { hit = c; return true; }
      return false;
    });
    return hit;
  }

  function crumbHtml() {
    var parts = ['<a href="/" data-nav>Home</a>', '<span class="sep">/</span>'];
    var c = currentCategory();
    if (S.q || S.sale || c) {
      parts.push('<a href="/shop" data-nav>Shop</a>', '<span class="sep">/</span>');
    }
    parts.push('<span>' + U.esc(heading()) + '</span>');
    return '<nav class="crumb" aria-label="Breadcrumb">' + parts.join('') + '</nav>';
  }

  function shellHtml() {
    var title = heading();
    Views.setMeta(
      title,
      S.q ? ('Search results for ' + S.q + ' at Chromvault.')
          : 'Browse rare streetwear and chrome-finished accessories at Chromvault. Limited single-run pieces, shipped across India.'
    );

    return '' +
      '<div class="wrap shop-head">' +
        crumbHtml() +
        '<h1 class="display t-xl" id="shopTitle">' + U.esc(title) + '</h1>' +
        '<div class="shop-filters" id="shopFilters"></div>' +
      '</div>' +
      '<div class="shop-bar">' +
        '<div class="wrap shop-bar-in">' +
          '<span class="shop-count" id="shopCount">Loading…</span>' +
          '<label class="row" style="gap:var(--s2)">' +
            '<span class="sr-only">Sort products</span>' +
            '<select class="sortsel" id="shopSort">' +
              SORTS.map(function (s) {
                return '<option value="' + s.v + '"' + (s.v === S.sort ? ' selected' : '') + '>' +
                       U.esc(s.label) + '</option>';
              }).join('') +
            '</select>' +
          '</label>' +
        '</div>' +
      '</div>' +
      '<div class="wrap">' +
        '<div class="pgrid" id="shopGrid">' + Card.skeletons(12) + '</div>' +
        '<div id="shopMore" style="display:flex;justify-content:center;margin-top:var(--s7)"></div>' +
      '</div>';
  }

  /* Filter chips: real categories plus the two filters the client can honestly
     apply (sale, in-stock). Nothing invented. */
  function paintFilters() {
    var host = U.$('#shopFilters');
    if (!host) return;

    var cats = Shell.categories();
    var chips = '<a class="chip" href="/shop" data-nav aria-pressed="' +
                (!S.category && !S.sale ? 'true' : 'false') + '">All</a>';

    chips += cats.map(function (c) {
      var id = U.catId(c);
      return '<a class="chip" href="/shop?category=' + encodeURIComponent(id) + '" data-nav aria-pressed="' +
             (S.category === id ? 'true' : 'false') + '">' + U.esc(U.catName(c)) + '</a>';
    }).join('');

    chips += '<a class="chip" href="/shop?sale=1" data-nav aria-pressed="' + (S.sale ? 'true' : 'false') +
             '">Sale</a>';

    Views.fill(host, '<div class="chip-strip">' + chips + '</div>');
  }

  function wire() {
    var sel = U.$('#shopSort');
    if (sel) {
      sel.addEventListener('change', function () {
        S.sort = this.value;
        syncUrl();
        // Sorting is local to what is loaded; if more pages exist, pull them in
        // so "cheapest first" means cheapest overall, not cheapest on page one.
        if (!S.done && S.loaded.length < Math.min(S.total, 100)) loadRest();
        else paintGrid();
      });
    }

    var onCats = function () {
      if (Router.stale(S.token)) return;
      paintFilters();
      var h = U.$('#shopTitle');
      if (h) h.textContent = heading();
    };
    document.addEventListener('chromvault:categories', onCats);
    Views.onTeardown(function () {
      document.removeEventListener('chromvault:categories', onCats);
      S = null;
    });

    paintFilters();
  }

  function syncUrl() {
    Router.setQuery({
      category: S.category || '',
      q: S.q || '',
      sort: S.sort === 'new' ? '' : S.sort,
      sale: S.sale ? '1' : ''
    });
  }

  /* ── Data ────────────────────────────────────────────────────────────────── */

  function resolveCategoryThenLoad() {
    var apply = function () {
      var want = String(S.categoryParam);
      var hit = null;
      Shell.categories().some(function (c) {
        var id = U.catId(c);
        var name = U.catName(c);
        if (id === want || slugify(name) === slugify(want)) { hit = c; return true; }
        return false;
      });
      if (hit) S.category = U.catId(hit);
      // If it does not resolve, the request falls back to the full catalogue
      // rather than 404-ing a link that may simply predate a category rename.
      load(true);
    };

    if (Shell.categories().length) { apply(); return; }

    var onCats = function () {
      document.removeEventListener('chromvault:categories', onCats);
      if (Router.stale(S && S.token)) return;
      apply();
    };
    document.addEventListener('chromvault:categories', onCats);
    Views.onTeardown(function () { document.removeEventListener('chromvault:categories', onCats); });
  }

  function slugify(s) {
    return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  function load(first) {
    if (!S || S.loading || S.done) return;
    S.loading = true;
    paintMore();

    var t = S.token;
    API.products({
      page: S.page,
      limit: PER,
      category: S.category || undefined,
      title: S.q || undefined
    }).then(function (r) {
      if (!S || Router.stale(t)) return;
      S.loading = false;
      S.total = r.total;
      S.pages = r.pages;
      Views.remember(r.products);
      S.loaded = S.loaded.concat(r.products);
      if (S.page >= r.pages || !r.products.length) S.done = true;
      else S.page += 1;
      paintGrid();
      paintMore();
      // A sort other than newest needs the whole (capped) result set to be
      // truthful, so fetch it up front on first load.
      if (first && S.sort !== 'new' && !S.done) loadRest();
    }).catch(function (err) {
      if (!S || Router.stale(t)) return;
      S.loading = false;
      if (first) Views.fill('#shopGrid', '');
      var host = first ? U.$('#shopGrid').parentNode : U.$('#shopMore');
      Views.fill(host, Views.errorHtml(err));
      var c = U.$('#shopCount');
      if (c) c.textContent = 'Unavailable';
    });
  }

  /* Pull remaining pages (bounded) so client-side sorting is honest. Capped at
     ~100 items, which matches the API's own per-request ceiling; beyond that the
     shopper is filtering, not browsing. */
  function loadRest() {
    if (!S || S.done || S.loading) return;
    var t = S.token;
    S.loading = true;
    paintMore();

    var next = function () {
      if (!S || Router.stale(t) || S.done || S.loaded.length >= 100) {
        if (S && !Router.stale(t)) { S.loading = false; paintGrid(); paintMore(); }
        return;
      }
      API.products({
        page: S.page,
        limit: PER,
        category: S.category || undefined,
        title: S.q || undefined
      }).then(function (r) {
        if (!S || Router.stale(t)) return;
        Views.remember(r.products);
        S.loaded = S.loaded.concat(r.products);
        S.total = r.total;
        S.pages = r.pages;
        if (S.page >= r.pages || !r.products.length) S.done = true;
        else S.page += 1;
        next();
      }).catch(function () {
        if (!S || Router.stale(t)) return;
        S.loading = false;
        paintGrid();
        paintMore();
      });
    };
    next();
  }

  /* ── Render ──────────────────────────────────────────────────────────────── */

  function visibleSet() {
    var list = S.loaded.slice();

    if (S.sale) {
      list = list.filter(function (p) { return U.wasPrice(p) > 0; });
    }

    switch (S.sort) {
      case 'price':
        list.sort(function (a, b) { return U.price(a) - U.price(b); });
        break;
      case 'price-desc':
        list.sort(function (a, b) { return U.price(b) - U.price(a); });
        break;
      case 'off':
        list.sort(function (a, b) { return U.discountPct(b) - U.discountPct(a); });
        break;
      case 'name':
        list.sort(function (a, b) {
          return U.text(a.title).localeCompare(U.text(b.title));
        });
        break;
      default:
        break; // 'new' is the API's own order
    }

    // Sold-out pieces sink to the bottom in every ordering: they are real (the
    // archive shows what existed) but they must never head the grid.
    var inStock = list.filter(U.inStock);
    var out = list.filter(function (p) { return !U.inStock(p); });
    return inStock.concat(out);
  }

  function paintGrid() {
    if (!S) return;
    var list = visibleSet();
    var grid = U.$('#shopGrid');
    if (!grid) return;

    if (!list.length) {
      Views.fill(grid.parentNode, emptyHtml());
      return;
    }

    Views.fill(grid, Card.grid(list, { eager: true, showNew: true }));
    paintCount(list.length);
  }

  function paintCount(shown) {
    var el = U.$('#shopCount');
    if (!el) return;
    // When a client-side filter is active the API total no longer describes what
    // is on screen, so the label reflects what the shopper can actually see.
    if (S.sale || S.done) {
      el.textContent = shown + (shown === 1 ? ' piece' : ' pieces');
    } else {
      el.textContent = shown + ' of ' + S.total;
    }
  }

  function paintMore() {
    var host = U.$('#shopMore');
    if (!host) return;

    if (S.loading) {
      host.innerHTML = '<button class="btn btn-ghost is-busy" disabled>Loading…</button>';
      return;
    }
    if (S.done || S.sale) { host.innerHTML = ''; return; }

    host.innerHTML = '<button class="btn btn-ghost" id="shopMoreBtn">Load more</button>';
    var btn = U.$('#shopMoreBtn');
    if (btn) btn.addEventListener('click', function () { load(false); });
  }

  function emptyHtml() {
    if (S.q) {
      return Views.stateHtml({
        icon: 'search',
        title: 'No match for “' + S.q + '”',
        note: 'Try a shorter phrase, or browse the full archive.',
        actions: [{ label: 'Shop everything', href: '/shop', primary: true }]
      });
    }
    if (S.sale) {
      return Views.stateHtml({
        icon: 'spark',
        title: 'Nothing is marked down right now',
        note: 'Prices here are single-run prices. Reductions appear when a piece has been repriced.',
        actions: [{ label: 'Shop everything', href: '/shop', primary: true }]
      });
    }
    var c = currentCategory();
    return Views.stateHtml({
      icon: 'box',
      title: c ? ('Nothing in ' + U.catName(c) + ' yet') : 'No pieces listed',
      note: 'This part of the archive is empty at the moment.',
      actions: [{ label: 'Shop everything', href: '/shop', primary: true }]
    });
  }
})();
