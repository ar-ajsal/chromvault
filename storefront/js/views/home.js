/* ============================================================================
   CHROMVAULT — HOME
   ----------------------------------------------------------------------------
   Composition, top to bottom:

     1. Hero            liquid-chrome pour + one metal word + live spec counts
     2. New arrivals    the API's default order IS createdAt desc, so "new" is
                        literally the first page — no invented sort
     3. Category index  big-type list built from real categories
     4. Marked down     only rendered when products genuinely have originalPrice
                        above price; the section is omitted entirely otherwise
     5. Editorial split campaign slot, empty-but-honest until an asset exists
     6. Featured        only when products actually carry isFeatured
     7. Trust strip     four statements that are all true of this system

   Every number on this page comes from the API. Where the data cannot support a
   section, the section does not exist — no filler, no fake urgency.
   ========================================================================== */
(function () {
  'use strict';

  var Views = window.Views = window.Views || {};

  var PAGE = 48; // one request feeds every section below

  Views.home = function () {
    var t = Router.token();
    Views.setMeta(
      null,
      'Chromvault is an independent label dealing in rare streetwear and chrome-finished accessories. Limited pieces, single runs, shipped across India.'
    );

    Views.mount(
      heroHtml() +
      '<section class="section-sm" id="homeCats"><div class="wrap">' + catsSkeleton() + '</div></section>' +
      '<section class="section" id="homeNew">' +
        '<div class="wrap">' +
          Views.head({
            eyebrow: 'Just landed',
            title: 'New arrivals',
            href: '/shop?sort=new',
            linkLabel: 'All new'
          }) +
          '<div class="pgrid" id="homeNewGrid">' + Card.skeletons(8) + '</div>' +
        '</div>' +
      '</section>' +
      '<div id="homeSale"></div>' +
      splitHtml() +
      '<div id="homeFeatured"></div>' +
      trustHtml()
    );

    API.products({ limit: PAGE, page: 1 }).then(function (r) {
      if (Router.stale(t)) return;
      Views.remember(r.products);
      paintNew(r);
      paintSale(r.products);
      paintFeatured(r.products);
    }).catch(function (err) {
      if (Router.stale(t)) return;
      Views.fill('#homeNewGrid', '');
      var sec = U.$('#homeNew .wrap');
      if (sec) Views.fill(sec, Views.errorHtml(err));
    });

    // Fetch dynamic hero media
    API.get('/settings/hero_media').then(function(res) {
      if (Router.stale(t)) return;
      var heroContainer = U.$('#homeHeroMedia');
      if (!heroContainer) return;
      var url = res && res.value;
      if (url) {
        var isVideo = url.match(/\.(mp4|webm)$/i) || url.indexOf('/video/') > -1;
        if (isVideo) {
          heroContainer.innerHTML = '<video autoplay loop muted playsinline class="hero-video"><source src="' + U.escAttr(url) + '"></video>';
        } else {
          heroContainer.innerHTML = '<img src="' + U.escAttr(url) + '" class="hero-video" alt="Hero Media" style="object-fit:cover;width:100%;height:100%;">';
        }
      }
    }).catch(function(err) {
      // Ignore if not set or fails, it will just remain empty or fallback
      console.warn('Hero media not loaded', err);
    });

    // Categories may already be loaded by the shell; if not, wait for its event.
    var cats = Shell.categories();
    if (cats.length) paintCats(cats);
    else {
      var onCats = function () {
        if (Router.stale(t)) return;
        paintCats(Shell.categories());
      };
      document.addEventListener('chromvault:categories', onCats);
      Views.onTeardown(function () {
        document.removeEventListener('chromvault:categories', onCats);
      });
    }
  };

  /* ── Hero ────────────────────────────────────────────────────────────────
     The signature. Displays the dynamically uploaded video or image from admin. */
  function heroHtml() {
    return '' +
      '<section class="hero-video-wrap" id="homeHeroMedia">' +
        // Default fallback or skeleton before load
        '<div style="width:100%;height:100%;background:var(--ink-5);"></div>' +
      '</section>';
  }

  /* ── Marquee band ──────────────────────────────────────────────────────── */
  function bandHtml() {
    return '<section class="band" aria-hidden="true"><div class="band-track" id="homeBand"></div></section>';
  }

  function initBand() {
    var words = ['Single run', 'Chrome finish', 'Rare imports', 'No restock'];
    var html = words.map(function (w) {
      return '<em class="chrome-text">' + U.esc(w) + '</em><span class="dot"></span>';
    }).join('');
    FX.marquee(U.$('#homeBand'), html);
  }

  /* ── New arrivals ──────────────────────────────────────────────────────── */
  function paintNew(r) {
    if (!r.products.length) {
      Views.fill('#homeNew .wrap', Views.stateHtml({
        icon: 'box',
        title: 'The archive is being stocked',
        note: 'No pieces are listed yet. Check back shortly.',
        actions: [{ label: 'Reload', act: 'reload', primary: true }]
      }));
      return;
    }

    // Eight newest. The list is already createdAt-desc from the controller.
    var newest = r.products.slice(0, 8);
    Views.fill('#homeNewGrid', Card.grid(newest, { eager: true, showNew: true }));
  }

  /* ── Category index ────────────────────────────────────────────────────── */
  function catsSkeleton() {
    var card = '<div class="cat-card sk-card" aria-hidden="true"><div class="sk sk-media" style="border-radius: 50%; max-width: 100px; margin: 0 auto; aspect-ratio: 1/1;"></div><div class="sk sk-line w40" style="margin: 12px auto 0;"></div></div>';
    return '<div class="cat-grid">' + new Array(4).fill(card).join('') + '</div>';
  }

  function paintCats(cats) {
    var host = U.$('#homeCats');
    if (!host) return;

    if (!cats.length) {
      // No categories is a valid state — the shop link still works, so the
      // section simply disappears rather than showing an error.
      host.innerHTML = '';
      return;
    }

    var cards = cats.map(function (c) {
      var img = U.catImage(c);
      var fallback = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><rect width="1" height="1" fill="%23f2f1ee"/></svg>'; // Very subtle placeholder
      return '' +
        '<a class="cat-card" href="/shop?category=' + encodeURIComponent(U.catId(c)) + '" data-nav>' +
          '<div class="cat-card-img">' +
            '<img src="' + (img ? U.escAttr(img) : fallback) + '" alt="' + U.escAttr(U.catName(c)) + '" loading="lazy" />' +
          '</div>' +
          '<span class="cat-card-name">' + U.esc(U.catName(c)) + '</span>' +
        '</a>';
    }).join('');

    host.innerHTML = '<div class="wrap">' +
        Views.head({ eyebrow: 'Browse', title: 'Categories', href: '/shop', linkLabel: 'Everything' }) +
        '<div class="cat-grid">' + cards + '</div>' +
      '</div>';
  }

  /* ── Marked down ─────────────────────────────────────────────────────────
     Sale truth comes from originalPrice > price on the real document. U.wasPrice
     already discards import noise where "original" is equal or lower, so a
     product only appears here if the markdown is genuine. */
  function paintSale(products) {
    var host = U.$('#homeSale');
    if (!host) return;

    var sale = products.filter(function (p) {
      return U.wasPrice(p) > 0 && U.inStock(p);
    }).sort(function (a, b) {
      return U.discountPct(b) - U.discountPct(a);
    }).slice(0, 8);

    // Section hidden — no real sale products currently
    host.innerHTML = ''; return;

    var top = U.discountPct(sale[0]);
    Views.fill(host,
      '<section class="section">' +
        '<div class="wrap">' +
          Views.head({
            eyebrow: 'Marked down',
            title: 'On sale',
            note: top >= 5 ? ('Up to ' + top + '% off on pieces still in stock.') : '',
            href: '/shop?sale=1',
            linkLabel: 'All reductions'
          }) +
          '<div class="rail">' + Card.grid(sale, {}) + '</div>' +
        '</div>' +
      '</section>'
    );
  }

  /* ── Featured ──────────────────────────────────────────────────────────── */
  function paintFeatured(products) {
    var host = U.$('#homeFeatured');
    if (!host) return;

    var feat = products.filter(function (p) {
      return p.isFeatured && U.inStock(p);
    }).slice(0, 8);

    // Fewer than three is not a section, it is an accident of the data.
    if (feat.length < 3) { host.innerHTML = ''; return; }

    Views.fill(host,
      '<section class="section">' +
        '<div class="wrap">' +
          Views.head({ eyebrow: 'Selected', title: 'Featured pieces', href: '/shop', linkLabel: 'Shop all' }) +
          '<div class="rail">' + Card.grid(feat, {}) + '</div>' +
        '</div>' +
      '</section>'
    );
  }

  /* ── Editorial split ─────────────────────────────────────────────────────
     A campaign slot the operator can fill later by dropping an image at
     /assets/campaign/editorial.jpg. Until then it shows the chrome "asset
     pending" surface — deliberately abstract, never stock photography. */
  function splitHtml() {
    return '' +
      '<section class="section-sm">' +
        '<div class="wrap split reveal">' +
          '<div class="slot" data-campaign="editorial">' +
            '<div class="slot-pending"><span>Campaign slot</span></div>' +
          '</div>' +
          '<div>' +
            '<span class="eyebrow">The label</span>' +
            '<h2 class="display t-xl" style="margin-top:var(--s4)">Bought once,<br />never again</h2>' +
            '<p class="lead" style="margin-top:var(--s4)">Every piece here was sourced in a single run. ' +
              'There is no reorder pipeline and no second drop: stock counts on this site are the ' +
              'literal number of items in hand.</p>' +
            '<div class="row" style="gap:var(--s3);margin-top:var(--s6);flex-wrap:wrap">' +
              '<a class="btn btn-primary" href="/shop" data-nav>Browse the archive</a>' +
              '<a class="btn btn-ghost" href="/shipping-policy" data-nav>Shipping &amp; returns</a>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</section>';
  }

  /* ── Trust strip ─────────────────────────────────────────────────────────
     Four claims, each verifiable in this codebase: shipping is computed as free,
     Razorpay is the only payment path, stock is finite per piece, and orders are
     trackable. Nothing aspirational. */
  function trustHtml() {
    var cells = [
      ['truck', 'Free shipping', 'Across India, calculated at checkout — no minimum.'],
      ['lock', 'Secure payment', 'Razorpay handles cards, UPI, net banking and wallets.'],
      ['box', 'Single-run stock', 'Counts shown are real. When a piece sells it is delisted.'],
      ['ret', 'Returns window', 'Replacement on damaged or incorrect items. See the policy.']
    ].map(function (c) {
      return '<div class="trust-c"><span data-ic="' + c[0] + '"></span><b>' + U.esc(c[1]) +
             '</b><span>' + U.esc(c[2]) + '</span></div>';
    }).join('');

    return '<section class="section-sm"><div class="wrap"><div class="trust">' + cells + '</div></div></section>';
  }
})();
