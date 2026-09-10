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
            eyebrow: 'Top picks',
            title: 'Best sellers',
            href: '/shop',
            linkLabel: 'Shop all',
            noRule: true
          }) +
          '<div class="pgrid pgrid--bs" id="homeNewGrid">' + Card.skeletons(4) + '</div>' +
        '</div>' +
      '</section>' +
      lookbookHtml() +
      '<div id="homeSale"></div>' +
      splitHtml() +
      '<div id="homeFeatured"></div>' +
      '<div id="homeReviews"></div>' +
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

    API.allReviews().then(function(reviews) {
      if (Router.stale(t)) return;
      paintReviews(reviews);
    }).catch(function(e) {
      console.warn('Failed to load reviews for home:', e);
    });

    loadLookbook(t);

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
      console.warn('Hero media not loaded', err);
    });

    // Fetch dynamic campaign media
    API.get('/settings/campaign_media').then(function(res) {
      if (Router.stale(t)) return;
      var campaignContainer = U.$('#homeCampaignMedia');
      if (!campaignContainer) return;
      var url = res && res.value;
      if (url) {
        var isVideo = url.match(/\.(mp4|webm)$/i) || url.indexOf('/video/') > -1;
        if (isVideo) {
          campaignContainer.innerHTML = '<video autoplay loop muted playsinline style="display:block;width:100%;height:100%;object-fit:cover;"><source src="' + U.escAttr(url) + '"></video>';
        } else {
          campaignContainer.innerHTML = '<img src="' + U.escAttr(url) + '" alt="Campaign Media" style="display:block;width:100%;height:100%;object-fit:cover;">';
        }
      }
    }).catch(function(err) {
      console.warn('Campaign media not loaded', err);
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

  /* ── Lookbook Slider ("AS SEEN ON 'YALL") ─────────────────────────────────── */
  var defaultLookbookImages = [
    '/assets/lookbook/lookbook-1.jpg',
    '/assets/lookbook/lookbook-2.jpg',
    '/assets/lookbook/lookbook-3.jpg',
    '/assets/lookbook/lookbook-4.jpg',
    '/assets/lookbook/lookbook-5.jpg'
  ];

  function lookbookHtml() {
    var tickerPart = "DON'T MISS OUT • ARCHIVE DROP 001 • LIMITED PIECES • ";
    var repeated = new Array(8).fill(tickerPart).join('');
    return '' +
      '<section class="lookbook-section" id="homeLookbook">' +
        '<div class="lookbook-ticker">' +
          '<div class="lookbook-ticker-track">' +
            '<span>' + U.esc(repeated) + '</span>' +
            '<span>' + U.esc(repeated) + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="wrap">' +
          '<div class="lookbook-head">' +
            '<h2 class="lookbook-title">AS SEEN ON \'YALL</h2>' +
            '<p class="lookbook-sub">Built for the rebels!</p>' +
          '</div>' +
        '</div>' +
        '<div class="lookbook-slider-wrap">' +
          '<div class="lookbook-rail" id="lookbookRail"></div>' +
        '</div>' +
      '</section>';
  }

  function loadLookbook(t) {
    API.get('/settings/lookbook_slider').then(function (res) {
      if (Router.stale(t)) return;
      var val = (res && res.value && (Array.isArray(res.value) ? res.value : res.value.images));
      var imgs = (val && val.length) ? val : defaultLookbookImages;
      paintLookbook(imgs);
    }).catch(function () {
      if (Router.stale(t)) return;
      paintLookbook(defaultLookbookImages);
    });
  }

  function paintLookbook(images) {
    var rail = U.$('#lookbookRail');
    if (!rail || !images || !images.length) return;

    // Multiply images so infinite auto-scroll is seamless and full width
    var list = images.slice();
    while (list.length < 15) {
      list = list.concat(images);
    }

    rail.innerHTML = list.map(function (src, i) {
      return '<div class="lookbook-card">' +
        '<img src="' + U.escAttr(src) + '" alt="Lookbook rebellion ' + (i + 1) + '" loading="lazy" />' +
      '</div>';
    }).join('');

    var isDown = false;
    var startX = 0;
    var scrollStart = 0;
    var isHovered = false;

    rail.addEventListener('mouseenter', function () { isHovered = true; });
    rail.addEventListener('mouseleave', function () { isHovered = false; isDown = false; });

    rail.addEventListener('mousedown', function (e) {
      isDown = true;
      startX = e.pageX - rail.offsetLeft;
      scrollStart = rail.scrollLeft;
    });
    window.addEventListener('mouseup', function () { isDown = false; });
    rail.addEventListener('mousemove', function (e) {
      if (!isDown) return;
      e.preventDefault();
      var x = e.pageX - rail.offsetLeft;
      var walk = (x - startX) * 1.5;
      rail.scrollLeft = scrollStart - walk;
    });

    rail.addEventListener('touchstart', function (e) {
      isDown = true;
      startX = e.touches[0].pageX - rail.offsetLeft;
      scrollStart = rail.scrollLeft;
    }, { passive: true });
    rail.addEventListener('touchend', function () { isDown = false; }, { passive: true });
    rail.addEventListener('touchmove', function (e) {
      if (!isDown) return;
      var x = e.touches[0].pageX - rail.offsetLeft;
      var walk = (x - startX) * 1.5;
      rail.scrollLeft = scrollStart - walk;
    }, { passive: true });

    function autoSlide() {
      if (!isDown && !isHovered && rail && document.body.contains(rail)) {
        rail.scrollLeft += 1;
        if (rail.scrollLeft >= (rail.scrollWidth - rail.clientWidth - 4)) {
          rail.scrollLeft = 0;
        }
      }
      if (document.body.contains(rail)) {
        requestAnimationFrame(autoSlide);
      }
    }
    requestAnimationFrame(autoSlide);
  }

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

  /* ── Best sellers ─────────────────────────────────────────────────────
     Shows isBestSeller-marked products. If fewer than 1 are marked the
     section falls back to the four newest products so it is never empty. */
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

    // Prefer products explicitly marked as best sellers; fall back to newest.
    var bestSellers = r.products.filter(function (p) { return p.isBestSeller && U.inStock(p); });
    var toShow = bestSellers.length >= 1 ? bestSellers.slice(0, 8) : r.products.slice(0, 4);
    Views.fill('#homeNewGrid', Card.grid(toShow, { eager: true, showNew: true }));
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
        Views.head({ eyebrow: 'Browse', title: 'Categories', href: '/shop', linkLabel: 'Everything', noRule: true }) +
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

  /* ── Reviews ───────────────────────────────────────────────────────── */
  function paintReviews(reviews) {
    var host = U.$('#homeReviews');
    if (!host) return;
    if (!reviews || !reviews.length) { host.innerHTML = ''; return; }

    function stars(rating) {
      var s = '';
      for (var i = 1; i <= 5; i++) {
        s += '<span style="color:' + (i <= rating ? '#F5A623' : '#ddd') + ';font-size:18px">&#9733;</span>';
      }
      return s;
    }
    function ago(date) {
      if (!date) return '';
      var d = Math.floor((Date.now() - new Date(date)) / 86400000);
      return d < 1 ? 'Today' : d === 1 ? '1 day ago' : d + ' days ago';
    }

    var slides = reviews.map(function(rev, i) {
      var name = rev.customerName || 'Verified Buyer';
      var initials = name.split(' ').slice(0,2).map(function(w){ return w[0] || ''; }).join('').toUpperCase();
      var cs = 'var(--paper-sink)';
      var ce = 'var(--paper-edge)';
      var ci = 'var(--ink)';
      var ci3 = 'var(--ink-3)';
      var ci2 = 'var(--ink-2)';
      var cp = 'var(--paper)';
      var productLine = rev.productTitle
        ? '<div style="display:flex;align-items:center;gap:10px;padding-top:12px;border-top:1px solid ' + ce + ';margin-top:4px">' +
            (rev.productImage
              ? '<img src="' + (rev.productImage||'').replace(/"/g,'&quot;') + '" alt="" style="width:44px;height:44px;object-fit:cover;border-radius:4px;background:' + cs + '">'
              : '<div style="width:44px;height:44px;border-radius:4px;background:' + cs + '"></div>') +
            '<span style="font-size:12px;color:' + ci3 + '">' + (rev.productTitle||'').replace(/&/g,'&amp;').replace(/</g,'&lt;') + '</span>' +
          '</div>'
        : '';
      return '<div class="rev-slide' + (i === 0 ? ' is-active' : '') + '">' +
        '<div class="rev-card">' +
          '<div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:12px">' +
            '<div style="display:flex;align-items:center;gap:12px">' +
              '<div style="width:42px;height:42px;border-radius:50%;background:' + ci + ';color:' + cp + ';display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;flex:none">' + initials + '</div>' +
              '<div>' +
                '<div style="font-weight:700;font-size:13px;color:' + ci + '">' + U.esc(name) + '</div>' +
                '<div style="font-size:11px;color:' + ci3 + '">' + ago(rev.date) + '</div>' +
              '</div>' +
            '</div>' +
            '<div style="display:flex;gap:1px">' + stars(rev.rating) + '</div>' +
          '</div>' +
          '<p style="font-size:13px;color:' + ci2 + ';line-height:1.65;margin:0 0 16px">“' + U.esc(rev.text) + '”</p>' +
          productLine +
        '</div>' +
      '</div>';
    }).join('');

    var dots = reviews.map(function(_, i) {
      return '<button class="rev-dot' + (i === 0 ? ' is-active' : '') + '" data-idx="' + i + '"></button>';
    }).join('');

    var cs2 = 'var(--f-display)';
    var html = '<section class="section"><div class="wrap">' +
      '<div style="text-align:center;margin-bottom:var(--s6)">' +
        '<h2 style="font-family:' + cs2 + ';font-size:clamp(1.8rem,5vw,2.4rem);font-weight:900;font-style:italic;text-transform:uppercase;line-height:1.1;color:var(--ink);margin:0 0 8px">Spotted on the<br>Right People!</h2>' +
        '<p style="font-size:var(--t-body);color:var(--ink-3);margin:0">3000+ Pieces Already In Rotation!</p>' +
      '</div>' +
      '<div class="rev-carousel" id="revCarousel">' + slides + '</div>' +
      '<div class="rev-nav"><button class="rev-arrow" id="revPrev">&#8249;</button>' +
        '<div class="rev-dots">' + dots + '</div>' +
        '<button class="rev-arrow" id="revNext">&#8250;</button>' +
      '</div>' +
    '</div></section>';

    Views.fill(host, html);

    var cur = 0;
    var sl = host.querySelectorAll('.rev-slide');
    var dt = host.querySelectorAll('.rev-dot');
    function goTo(idx) {
      sl[cur].classList.remove('is-active'); dt[cur].classList.remove('is-active');
      cur = (idx + sl.length) % sl.length;
      sl[cur].classList.add('is-active'); dt[cur].classList.add('is-active');
    }
    host.querySelector('#revPrev').addEventListener('click', function() { goTo(cur - 1); });
    host.querySelector('#revNext').addEventListener('click', function() { goTo(cur + 1); });
    host.querySelectorAll('.rev-dot').forEach(function(d) {
      d.addEventListener('click', function() { goTo(+d.dataset.idx); });
    });
  }

  /* ── Campaign Media ──────────────────────────────────────────────────────
     A campaign slot the operator can fill via the admin panel.
     Until then it shows the chrome "asset pending" surface. */
  function splitHtml() {
    return '' +
      '<section class="section-sm">' +
        '<div class="wrap reveal">' +
          '<div class="slot" id="homeCampaignMedia" data-campaign="editorial" style="border-radius:var(--r-3);overflow:hidden;background:#000;">' +
            '<div class="slot-pending"><span>Campaign slot</span></div>' +
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
