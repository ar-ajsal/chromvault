/* ============================================================================
   CHROMVAULT — SHELL
   ----------------------------------------------------------------------------
   Everything that persists across routes: icon hydration, header state, nav
   (built from real backend categories), search overlay, mobile menu, footer,
   cart badge, and the global delegated click handlers.
   ========================================================================== */
(function () {
  'use strict';

  var Shell = {};
  var cats = [];          // real categories from the API
  var searchOpen = false;
  var releaseSearchTrap = null;
  var releaseNavTrap = null;

  /* ── Icon hydration ──────────────────────────────────────────────────────
     Any element with data-ic gets its sprite injected. Cheap, and keeps the
     markup free of inline SVG noise. */
  Shell.icons = function (root) {
    U.$$('[data-ic]', root || document).forEach(function (n) {
      var name = n.getAttribute('data-ic');
      if (!name || n.getAttribute('data-ic-done') === '1') return;
      var size = n.getAttribute('data-ic-size');
      // Preserve existing children (e.g. the cart count badge).
      n.insertAdjacentHTML('afterbegin', ICON(name, size ? Number(size) : 20));
      n.setAttribute('data-ic-done', '1');
    });
  };

  /* ── Header ──────────────────────────────────────────────────────────── */
  function initHeader() {
    var hdr = U.$('#hdr');
    if (!hdr) return;
    var last = 0;
    var onScroll = function () {
      var y = window.scrollY || 0;
      if ((y > 8) !== (last > 8)) hdr.classList.toggle('is-stuck', y > 8);
      last = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ── Ticker ──────────────────────────────────────────────────────────────
     Copy only states things that are true of the actual system: Razorpay is the
     only payment path, shipping is computed as free by the backend, and stock
     is finite per piece. No invented promises. */
  function initTicker() {
    var items = [
      'Single-run pieces',
      'Free shipping across India',
      'Secure payments via Razorpay',
      'Rare imports · restocked never'
    ];
    FX.marquee(U.$('#tickerTrack'), items.map(function (t) {
      return '<span>' + U.esc(t) + '</span>';
    }).join(''));
  }

  /* ── Navigation ──────────────────────────────────────────────────────────
     Built from real categories. Fixed entries are only those that map to a real
     query the backend can answer:
       SHOP  → /shop
       NEW   → /shop?sort=new   (createdAt desc — the API's default order)
       SALE  → /shop?sale=1     (filtered client-side on real originalPrice)
     No invented category names. */
  function navItems() {
    var items = [
      { href: '/shop', label: 'Shop' },
      { href: '/shop?sort=new', label: 'New' }
    ];
    // Up to three real categories inline; the rest live in the mobile menu and
    // on the shop page filters, so the desktop bar never overflows.
    cats.slice(0, 3).forEach(function (c) {
      items.push({ href: '/shop?category=' + encodeURIComponent(U.catId(c)), label: U.catName(c) });
    });
    items.push({ href: '/shop?sale=1', label: 'Sale', hot: true });
    return items;
  }

  Shell.renderNav = function () {
    var nav = U.$('#mainnav');
    if (nav) {
      nav.innerHTML = navItems().map(function (i) {
        return '<a class="navlink' + (i.hot ? ' hot' : '') + '" href="' + U.escAttr(i.href) + '" data-nav>' +
               U.esc(i.label) + '</a>';
      }).join('');
    }

    var body = U.$('#mnavBody');
    if (body) {
      var main = [
        { href: '/shop', label: 'Shop all' },
        { href: '/shop?sort=new', label: 'New in' },
        { href: '/shop?sale=1', label: 'Sale' }
      ];
      var html = main.map(function (i) {
        return '<a class="mnav-link" href="' + U.escAttr(i.href) + '" data-nav>' + U.esc(i.label) + '</a>';
      }).join('');

      if (cats.length) {
        html += '<div class="mnav-sub"><h4 class="label" style="margin-bottom:4px">Categories</h4>' +
          cats.map(function (c) {
            return '<a href="/shop?category=' + encodeURIComponent(U.catId(c)) + '" data-nav>' +
                   U.esc(U.catName(c)) + '</a>';
          }).join('') + '</div>';
      }

      html += '<div class="mnav-sub">' +
        '<a href="/track" data-nav>Track order</a>' +
        '<a href="/contact" data-nav>Contact</a>' +
        '<a href="/shipping-policy" data-nav>Shipping</a>' +
        '<a href="/returns" data-nav>Returns</a>' +
        '</div>';

      body.innerHTML = html;
    }

    Shell.markActive();
  };

  Shell.markActive = function () {
    var here = location.pathname + location.search;
    U.$$('#mainnav .navlink').forEach(function (a) {
      var href = a.getAttribute('href');
      a.classList.toggle('is-on', href === here);
    });
  };

  Shell.categories = function () { return cats; };

  /* ── Mobile menu ─────────────────────────────────────────────────────── */
  function openNav() {
    var m = U.$('#mnav'), s = U.$('#mnavScrim'), btn = U.$('#menuBtn');
    if (!m) return;
    m.classList.add('open');
    m.setAttribute('aria-hidden', 'false');
    if (s) s.classList.add('open');
    if (btn) btn.setAttribute('aria-expanded', 'true');
    U.lock();
    releaseNavTrap = U.trap(m);
    var first = m.querySelector('a, button');
    if (first) first.focus();
  }
  function closeNav() {
    var m = U.$('#mnav'), s = U.$('#mnavScrim'), btn = U.$('#menuBtn');
    if (!m || !m.classList.contains('open')) return;
    m.classList.remove('open');
    m.setAttribute('aria-hidden', 'true');
    if (s) s.classList.remove('open');
    if (btn) { btn.setAttribute('aria-expanded', 'false'); btn.focus(); }
    U.unlock();
    if (releaseNavTrap) { releaseNavTrap(); releaseNavTrap = null; }
  }
  Shell.closeNav = closeNav;

  /* ── Search ──────────────────────────────────────────────────────────────
     Queries the real /products?title= endpoint. Debounced, and the in-flight
     query is stamped so a slow earlier response can't overwrite a newer one. */
  var searchSeq = 0;

  function openSearch() {
    var s = U.$('#searchScrim'), i = U.$('#searchInput');
    if (!s) return;
    searchOpen = true;
    s.classList.add('open');
    U.lock();
    releaseSearchTrap = U.trap(s);
    if (i) { i.value = ''; setTimeout(function () { i.focus(); }, 60); }
    renderSearchIdle();
  }

  function closeSearch() {
    var s = U.$('#searchScrim');
    if (!s || !searchOpen) return;
    searchOpen = false;
    s.classList.remove('open');
    U.unlock();
    if (releaseSearchTrap) { releaseSearchTrap(); releaseSearchTrap = null; }
    var btn = U.$('#searchBtn');
    if (btn) btn.focus();
  }
  Shell.closeSearch = closeSearch;

  function renderSearchIdle() {
    var box = U.$('#searchResults');
    if (!box) return;
    if (!cats.length) { box.innerHTML = ''; return; }
    box.innerHTML =
      '<div class="search-sec">Browse</div>' +
      cats.slice(0, 6).map(function (c) {
        return '<a class="sres" href="/shop?category=' + encodeURIComponent(U.catId(c)) + '" data-nav>' +
                 '<div class="grow"><div class="sres-t">' + U.esc(U.catName(c)) + '</div></div>' +
                 '<span class="sres-m">Category</span>' +
               '</a>';
      }).join('');
  }

  var runSearch = U.debounce(function (q) {
    var box = U.$('#searchResults');
    if (!box) return;
    var seq = ++searchSeq;

    if (!q) { renderSearchIdle(); return; }

    box.innerHTML = '<div class="search-sec">Searching…</div>';

    API.products({ title: q, limit: 8 }).then(function (r) {
      if (seq !== searchSeq) return; // a newer query has superseded this one
      if (!r.products.length) {
        box.innerHTML =
          '<div class="search-sec">No match</div>' +
          '<div style="padding:0 var(--s4) var(--s4)">' +
            '<p style="font-size:var(--t-sm);color:var(--ink-3)">Nothing found for “' + U.esc(q) + '”.</p>' +
          '</div>' +
          '<div class="search-foot"><a class="btn-text" href="/shop" data-nav>Browse everything ' +
            '<span class="arw">' + ICON('arrow', 14) + '</span></a></div>';
        return;
      }
      box.innerHTML =
        '<div class="search-sec">' + r.products.length + ' of ' + r.total + '</div>' +
        r.products.map(function (p) {
          var imgs = U.images(p);
          return '<a class="sres" href="' + U.escAttr(U.plink(p)) + '" data-nav>' +
                   '<img src="' + U.escAttr(U.img(imgs[0])) + '" alt="" loading="lazy" />' +
                   '<div class="grow">' +
                     '<div class="sres-t">' + U.esc(U.text(p.title)) + '</div>' +
                     '<div class="sres-m">' + U.esc(U.pcat(p) || 'Chromvault') +
                       (U.inStock(p) ? '' : ' · Sold out') + '</div>' +
                   '</div>' +
                   '<span class="price">' + U.money(U.price(p)) + '</span>' +
                 '</a>';
        }).join('') +
        '<div class="search-foot"><a class="btn-text" href="/shop?q=' + encodeURIComponent(q) +
          '" data-nav>See all results <span class="arw">' + ICON('arrow', 14) + '</span></a></div>';
    }).catch(function () {
      if (seq !== searchSeq) return;
      box.innerHTML = '<div class="search-sec">Search unavailable</div>' +
        '<div style="padding:0 var(--s4) var(--s4)"><p style="font-size:var(--t-sm);color:var(--ink-3)">' +
        'Couldn’t reach the catalogue. Check your connection and try again.</p></div>';
    });
  }, 260);

  /* ── Cart badge ──────────────────────────────────────────────────────── */
  function paintBadge(bump) {
    var n = Cart.count();
    var el = U.$('#cartCount');
    if (!el) return;
    el.textContent = n > 99 ? '99+' : String(n);
    el.classList.toggle('on', n > 0);
    if (bump && n > 0) {
      el.classList.remove('bump');
      void el.offsetWidth;              // restart the animation
      el.classList.add('bump');
    }
    var btn = U.$('#cartBtn');
    if (btn) btn.setAttribute('aria-label', n ? ('Open cart, ' + n + ' item' + (n === 1 ? '' : 's')) : 'Open cart');
  }
  Shell.paintBadge = paintBadge;

  /* ── Footer ─────────────────────────────────────────────────────────────
     Editorial minimal footer: Instagram icon, email signup, mega wordmark,
     copyright, and policy links. Light warm background so the wordmark
     reads in pure ink — the brand, not the content, is the statement. */
  function renderFooter() {
    var f = U.$('#ftr');
    if (!f) return;

    var C = (window.CHROMVAULT_CONFIG && window.CHROMVAULT_CONFIG.CONTACT) || {};
    var igHref = C.instagram
      ? 'https://instagram.com/' + encodeURIComponent(C.instagram)
      : 'https://instagram.com/';

    f.innerHTML =
      '<div class="ftr-inner">' +

        /* Instagram icon — centered, top of footer */
        '<div class="ftr-social">' +
          '<a class="ftr-ig" href="#" aria-label="Chromvault on Instagram">' +
            '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
              '<rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>' +
              '<path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>' +
              '<line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>' +
            '</svg>' +
          '</a>' +
        '</div>' +

        /* Email signup */
        '<div class="ftr-signup">' +
          '<p class="ftr-signup-label">Exclusive insider access</p>' +
          '<form class="ftr-form" id="ftrForm" novalidate>' +
            '<input class="ftr-input" id="ftrEmail" type="email" placeholder="Email address" autocomplete="email" aria-label="Your email address" required />' +
            '<button class="ftr-ok" type="submit" aria-label="Subscribe">OK</button>' +
          '</form>' +
          '<div class="ftr-rule" aria-hidden="true"></div>' +
        '</div>' +

        /* Mega wordmark */
        '<div class="ftr-wordmark" aria-label="Chromvault">CHROMVAULT</div>' +

        /* Bottom meta */
        '<div class="ftr-meta">' +
          '<span>\u00a9 ' + new Date().getFullYear() + ' Chromvault</span>' +
          '<div class="ftr-meta-links">' +
            '<a href="/terms" data-nav>Terms and Policies</a>' +
            '<a href="/privacy" data-nav>Privacy</a>' +
            '<a href="/shipping-policy" data-nav>Shipping</a>' +
          '</div>' +
        '</div>' +

      '</div>';

    /* Newsletter submit — toast confirmation only; no backend route yet.
       When an operator connects a mailing list the handler here is the only
       place that needs changing. */
    var form = U.$('#ftrForm');
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var input = U.$('#ftrEmail');
        var val = input ? input.value.trim() : '';
        if (!val || !/^[^@]+@[^@]+\.[^@]+$/.test(val)) {
          U.toast({ title: 'Enter a valid email address', bad: true });
          return;
        }
        if (input) input.value = '';
        U.toast({ title: 'You\u2019re on the list', note: 'We\u2019ll be in touch.' });
      });
    }
  }

  /* ── Global delegated handlers ───────────────────────────────────────── */
  function initEvents() {
    // Header controls
    var mb = U.$('#menuBtn'); if (mb) mb.addEventListener('click', openNav);
    var mc = U.$('#mnavClose'); if (mc) mc.addEventListener('click', closeNav);
    var ms = U.$('#mnavScrim'); if (ms) ms.addEventListener('click', closeNav);
    var sb = U.$('#searchBtn'); if (sb) sb.addEventListener('click', openSearch);

    var ss = U.$('#searchScrim');
    if (ss) {
      // Click on the backdrop (not the panel) closes.
      ss.addEventListener('click', function (e) {
        if (!e.target.closest('.search-panel')) closeSearch();
      });
    }
    var si = U.$('#searchInput');
    if (si) {
      si.addEventListener('input', function () { runSearch(this.value.trim()); });
      si.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          var q = this.value.trim();
          if (q) { closeSearch(); Router.go('/shop?q=' + encodeURIComponent(q)); }
        }
      });
    }

    var cb = U.$('#cartBtn');
    if (cb) cb.addEventListener('click', function () { Panel.open('cart'); });

    // Keyboard: Esc closes the topmost layer; / focuses search.
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (searchOpen) { closeSearch(); return; }
        if (Panel.isOpen()) { Panel.close(); return; }
        closeNav();
        return;
      }
      if (e.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) {
        e.preventDefault();
        openSearch();
      }
    });

    // Add-to-cart from any product card, anywhere. Resolving the product from
    // the view's own cache keeps the click synchronous — no fetch round-trip
    // between tap and feedback.
    U.on(document, 'click', '[data-add]', function (e, btn) {
      e.preventDefault();
      var id = btn.getAttribute('data-add');
      var p = Views.findProduct(id);
      if (!p) { U.toast({ title: 'Item unavailable', bad: true }); return; }
      var r = Cart.add(p, 1);
      if (!r.ok) { U.toast({ title: r.reason, bad: true }); return; }
      paintBadge(true);
      U.toast({
        title: 'Added to cart',
        note: U.text(p.title),
        image: U.images(p)[0],
        action: 'View cart',
        onAction: function () { Panel.open('cart'); }
      });
      if (r.capped) {
        U.toast({ title: 'Limited to available stock (' + r.stock + ')', bad: true });
      }
    });

    // Internal navigation. Everything routed carries data-nav.
    U.on(document, 'click', 'a[data-nav]', function (e, a) {
      var href = a.getAttribute('href');
      if (!href || href.charAt(0) !== '/') return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      closeNav();
      closeSearch();
      Panel.close();
      Router.go(href);
    });

    // Cart badge follows the store, not the caller.
    Cart.onChange(function () { paintBadge(false); });

    /* Broken images, everywhere, once. A dead Cloudinary URL or a stale scraped
       path would otherwise show the browser's broken-image glyph in the middle
       of a product grid. Image 'error' events do not bubble, but they do
       capture, so a single listener on document covers every <img> on the site
       including ones rendered long after boot. The data-imgfail guard stops a
       loop if the placeholder itself ever failed. */
    document.addEventListener('error', function (e) {
      var el = e.target;
      if (!el || el.tagName !== 'IMG') return;
      if (el.getAttribute('data-imgfail') === '1') return;
      el.setAttribute('data-imgfail', '1');
      // The alternate hover image is decorative — drop it rather than show a
      // placeholder sliding over a photo that loaded perfectly well.
      if (el.classList.contains('alt')) { el.remove(); return; }
      el.src = U.PLACEHOLDER;
    }, true);
  }

  /* ── Boot ────────────────────────────────────────────────────────────── */
  Shell.init = function () {
    Shell.icons();
    initHeader();
    initTicker();
    initEvents();
    paintBadge(false);
    renderFooter();
    Shell.renderNav();

    // Categories drive nav, footer and shop filters. A failure here must not
    // block the catalogue, so the shell renders with fixed links and moves on.
    API.categories().then(function (list) {
      cats = list;
      Shell.renderNav();
      renderFooter();
      Shell.icons();
      document.dispatchEvent(new CustomEvent('chromvault:categories'));
    }).catch(function (err) {
      console.warn('Categories unavailable:', err && err.message);
      document.dispatchEvent(new CustomEvent('chromvault:categories'));
    });
  };

  window.Shell = Shell;
})();
