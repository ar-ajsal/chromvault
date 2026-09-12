/* ============================================================================
   CHROMVAULT — PRODUCT DETAIL
   ----------------------------------------------------------------------------
   The conversion page. Structure:

     gallery (4:5 bed + thumb rail)   |   info column (sticky on desktop)
                                          title · price · stock
                                          variant options (only when real)
                                          qty + Add to cart + Buy now
                                          accordion: details / description / shipping
     related pieces from the same category

   Resolution order for a route: the in-memory registry (instant, populated by
   any grid the shopper already saw) → GET /products/slug/:slug → the id
   fallback. A miss renders a "may have sold" state, not a bare 404, because in
   a single-run archive that is usually what actually happened.
   ========================================================================== */
(function () {
  'use strict';

  var Views = window.Views = window.Views || {};

  var S = null;

  Views.product = function (opts) {
    var o = opts || {};
    var key = o.slug || o.id || '';

    S = {
      token: Router.token(),
      key: key,
      product: null,
      qty: 1,
      variant: '',
      imgIndex: 0
    };
    Views.onTeardown(function () { S = null; });

    // Anything the shopper has already seen paints with zero latency.
    var known = Views.findProduct(key);
    if (known) { paint(known); return; }

    Views.mount(skeletonHtml());

    var t = S.token;
    var fetch = o.slug ? API.productBySlug(o.slug) : API.productById(o.id);

    fetch.then(function (doc) {
      if (!S || Router.stale(t)) return;
      // The slug endpoint returns the document directly; tolerate a wrapper.
      var p = (doc && doc.product) ? doc.product : doc;
      if (!p || !U.pid(p)) { gone(); return; }
      if (p.status === 'hide') { gone(); return; }
      Views.remember(p);
      paint(p);
    }).catch(function (err) {
      if (!S || Router.stale(t)) return;
      if (err && err.status === 404) { gone(); return; }
      Views.setMeta('Product unavailable');
      Views.mount('<div class="wrap" style="padding-top:var(--s7)">' + Views.errorHtml(err) + '</div>');
    });
  };

  /* ── States ──────────────────────────────────────────────────────────────── */

  function skeletonHtml() {
    return '' +
      '<div class="wrap pdp-wrap">' +
        '<div class="pdp">' +
          '<div class="gal">' +
            '<div class="sk gal-sk" style="aspect-ratio:1/1;"></div>' +
            '<div class="gal-thumbs">' +
              new Array(4).fill('<div class="sk" style="width:66px;height:82px;border-radius:var(--r-2);flex:none"></div>').join('') +
            '</div>' +
          '</div>' +
          '<div class="pdp-info">' +
            '<div class="sk sk-line w40"></div>' +
            '<div class="sk sk-line" style="height:38px"></div>' +
            '<div class="sk sk-line w40"></div>' +
            '<div class="sk sk-line" style="height:52px;margin-top:var(--s4)"></div>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function gone() {
    Views.setMeta('Piece not found');
    Views.mount(
      '<div class="wrap" style="padding-top:var(--s7)">' +
        Views.stateHtml({
          icon: 'box',
          title: 'This piece is no longer listed',
          note: 'Stock here is a single run — once a piece sells it is removed. ' +
                'The rest of the archive is still open.',
          actions: [
            { label: 'Shop everything', href: '/shop', primary: true },
            { label: 'See what just landed', href: '/shop?sort=new' }
          ]
        }) +
      '</div>'
    );
  }

  /* ── Paint ───────────────────────────────────────────────────────────────── */

  function paint(p) {
    S.product = p;
    S.variant = '';
    S.imgIndex = 0;
    S.qty = 1;

    var title = U.text(p.title) || 'Untitled';
    var desc = plain(U.text(p.description)).slice(0, 300);
    Views.setMeta(title, desc || ('Buy ' + title + ' at Chromvault — limited single-run stock, free shipping across India.'));

    Views.mount(
      '<div class="wrap pdp-wrap">' +
        crumb(p) +
        '<div class="pdp">' +
          galleryHtml(p) +
          infoHtml(p) +
        '</div>' +
      '</div>' +
      '<div id="pdpReviews" class="wrap" style="margin-top:var(--s6)"></div>' +
      '<div id="pdpRelated"></div>'
    );

    wire(p);
    paintBuyBar(p);
    loadReviews(p);
    loadRelated(p);
  }

  function crumb(p) {
    var cat = U.pcat(p);
    return '' +
      '<nav class="crumb pdp-crumb" aria-label="Breadcrumb">' +
        '<a href="/" data-nav>Home</a><span class="sep">/</span>' +
        '<a href="/shop" data-nav>Shop</a>' +
        (cat ? '<span class="sep">/</span><span>' + U.esc(cat) + '</span>' : '') +
      '</nav>';
  }

  /* ── Gallery ─────────────────────────────────────────────────────────────── */

  function galleryHtml(p) {
    var imgs = U.images(p);
    var title = U.text(p.title) || 'Product';
    var main = U.img(imgs[0]);

    var thumbs = imgs.length > 1
      ? '<div class="gal-thumbs" role="tablist" aria-label="Product images">' +
          imgs.map(function (src, i) {
            return '<button class="gal-thumb" role="tab" data-thumb="' + i + '" ' +
                   'aria-selected="' + (i === 0 ? 'true' : 'false') + '" ' +
                   'aria-label="Image ' + (i + 1) + ' of ' + imgs.length + '">' +
                     '<img src="' + U.escAttr(src) + '" alt="" loading="lazy" decoding="async" />' +
                   '</button>';
          }).join('') +
        '</div>'
      : '';

    return '' +
      '<div class="gal">' +
        '<div class="gal-main">' +
          '<img id="galMain" src="' + U.escAttr(main) + '" alt="' + U.escAttr(title) + '" ' +
               'fetchpriority="high" decoding="async" />' +
        '</div>' +
        thumbs +
      '</div>';
  }

  /* ── Info column ─────────────────────────────────────────────────────────── */

  function infoHtml(p) {
    var title = U.text(p.title) || 'Untitled';
    var price = U.price(p);
    var was = U.wasPrice(p);
    var off = U.discountPct(p);
    var stock = U.stock(p);
    var cat = U.pcat(p);

    var stockLine;
    if (stock <= 0) stockLine = '<span class="pdp-stock out"><span class="dot"></span>Sold out</span>';
    else if (U.isLow(p)) stockLine = '<span class="pdp-stock low"><span class="dot"></span>Only ' + stock + ' left</span>';
    else stockLine = '<span class="pdp-stock ok"><span class="dot"></span>In stock</span>';

    var badges = '';
    if (off >= 5) badges += '<span class="badge badge-ink">-' + off + '% off</span>';
    if (p.isFeatured && stock > 0) badges += '<span class="badge badge-metal">Featured</span>';

    return '' +
      '<div class="pdp-info">' +
        '<div class="stack" style="gap:var(--s3)">' +
          (cat
            ? '<a class="eyebrow" href="/shop" data-nav style="color:var(--ink-3)">' + U.esc(cat) + '</a>'
            : '<span class="eyebrow">Chromvault</span>') +
          '<h1 class="pdp-title">' + U.esc(title) + '</h1>' +
        '</div>' +

        '<div class="pdp-price">' +
          '<span class="price">' + U.money(price) + '</span>' +
          (was ? '<span class="price-was">' + U.money(was) + '</span>' : '') +
          (badges ? '<span class="row" style="gap:6px">' + badges + '</span>' : '') +
        '</div>' +

        stockLine +
        variantHtml(p) +
        actionsHtml(p) +
        accordionHtml(p) +
      '</div>';
  }

  /* Variant options. The catalogue's `variants` array is an untyped object list
     inherited from the import, and the backend has no per-variant price or
     stock, so a selector is rendered ONLY when an entry exposes a plain
     human-readable label. The chosen label travels to the order as the
     `variant` string the Order model already stores — no client-side price is
     ever derived from it, because the server would not honour it. */
  function variantHtml(p) {
    if (!p || !Array.isArray(p.variants) || !p.variants.length) return '';
    var isGrouped = p.variants.some(function(v) { return v && v.group && Array.isArray(v.options); });
    
    if (isGrouped) {
      return p.variants.map(function(v, groupIdx) {
        if (!v.group || !Array.isArray(v.options) || v.options.length < 1) return '';
        return '' +
          '<div class="opt-group">' +
            '<div class="opt-head">' +
              '<span class="label">' + U.esc(v.group) + '</span>' +
              '<span class="opt" style="all:unset;font-size:var(--t-xs);color:var(--ink-4)" id="optHint_' + groupIdx + '">' + U.esc(v.options[0]) + '</span>' +
            '</div>' +
            '<div class="opt-vals" data-group-idx="' + groupIdx + '">' +
              v.options.map(function(opt, i) {
                return '<button class="opt" data-opt-val="' + U.escAttr(opt) + '" data-opt-group="' + U.escAttr(v.group) + '" aria-pressed="' +
                       (i === 0 ? 'true' : 'false') + '">' + U.esc(opt) + '</button>';
              }).join('') +
            '</div>' +
          '</div>';
      }).join('');
    }

    var vals = variantValues(p);
    if (vals.length < 2) return '';

    return '' +
      '<div class="opt-group">' +
        '<div class="opt-head">' +
          '<span class="label">Option</span>' +
          '<span class="opt" style="all:unset;font-size:var(--t-xs);color:var(--ink-4)" id="optHint">Select one</span>' +
        '</div>' +
        '<div class="opt-vals" id="optVals">' +
          vals.map(function (v, i) {
            return '<button class="opt" data-opt="' + U.escAttr(v) + '" aria-pressed="' +
                   (i === 0 ? 'true' : 'false') + '">' + U.esc(v) + '</button>';
          }).join('') +
        '</div>' +
      '</div>';
  }

  function variantValues(p) {
    if (!p || !Array.isArray(p.variants) || !p.variants.length) return [];
    var out = [];
    p.variants.forEach(function (v) {
      var label = '';
      if (typeof v === 'string') label = v;
      else if (v && typeof v === 'object') {
        label = U.text(v.name) || U.text(v.title) || U.text(v.label) ||
                (typeof v.size === 'string' ? v.size : '') ||
                (typeof v.color === 'string' ? v.color : '');
      }
      label = String(label || '').trim();
      if (label && label.length <= 40 && out.indexOf(label) < 0) out.push(label);
    });
    return out;
  }

  /* ── Actions ─────────────────────────────────────────────────────────────── */

  function actionsHtml(p) {
    var stock = U.stock(p);

    if (stock <= 0) {
      return '' +
        '<div class="pdp-actions">' +
          '<button class="btn btn-lg btn-block" disabled>Sold out</button>' +
          '<p class="field-msg muted">Single-run stock. This piece will not be restocked — ' +
            'browse the rest of the archive for what is still available.</p>' +
          '<a class="btn btn-ghost btn-block" href="/shop" data-nav>Shop everything</a>' +
        '</div>';
    }

    return '' +
      '<div class="pdp-actions">' +
        '<div class="pdp-actions-row">' +
          '<div class="qty" style="border-radius:0;">' +
            '<button data-qty="-1" aria-label="Decrease quantity" data-ic="minus" data-ic-size="16"></button>' +
            '<output id="pdpQty" aria-live="polite">1</output>' +
            '<button data-qty="1" aria-label="Increase quantity" data-ic="plus" data-ic-size="16"></button>' +
          '</div>' +
          '<button class="btn btn-lg" id="pdpAdd" style="background:#333;color:#fff;box-shadow:none;border-radius:0;">' + ICON('bag', 18) + ' Add to cart</button>' +
        '</div>' +
        '<button class="btn btn-lg btn-block" id="pdpBuy" style="background:#000;color:#fff;box-shadow:none;border-radius:0;">Buy it now</button>' +
        '<div class="secnote">' + ICON('lock', 12) + 'Secure checkout · Razorpay</div>' +
      '</div>';
  }

  /* ── Accordion ───────────────────────────────────────────────────────────── */

  function accordionHtml(p) {
    var items = [];

    var body = descriptionHtml(p);
    if (body) items.push({ label: 'DESCRIPTION', html: body });

    items.push({ label: 'PRODUCT DETAILS', html: detailsHtml(p) });
    items.push({
      label: 'CARE INSTRUCTIONS',
      html: '<p>Wipe with a clean, dry cloth when needed. Keep away from water and harsh chemicals to preserve the finish.</p>'
    });

    var banner = 
      '<div style="border: 1px solid var(--ink-hair); border-radius: var(--r-2); padding: var(--s4); display: flex; align-items: center; justify-content: center; gap: var(--s3); margin-bottom: var(--s6);">' +
        '<div style="color:var(--ink)">' + ICON('truck', 24) + '</div>' +
        '<div style="display:flex;flex-direction:column;">' +
          '<span style="font-size:var(--t-xs);color:var(--ink-3);">Expected delivery</span>' +
          '<b style="font-size:15px;">Ships in 3-5 Days</b>' +
        '</div>' +
      '</div>';

    var acc = '<div class="acc">' + items.map(function (it, i) {
      var open = !!it.open;
      return '' +
        '<div class="acc-item">' +
          '<button class="acc-btn" aria-expanded="' + (open ? 'true' : 'false') + '" data-acc="' + i + '">' +
            '<span style="font-family:var(--f-display);font-weight:800;font-size:15px;letter-spacing:0.02em;">' + U.esc(it.label) + '</span>' +
            '<span class="ic">' + ICON('chevD', 20) + '</span>' +
          '</button>' +
          '<div class="acc-panel" data-open="' + (open ? 'true' : 'false') + '" data-acc-panel="' + i + '">' +
            '<div><div class="acc-body">' + it.html + '</div></div>' +
          '</div>' +
        '</div>';
    }).join('') + '</div>';

    // SVG for shield-check
    var shieldCheck = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>';
    // SVG for ribbon-check
    var badgeCheck = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"/><path d="m9 12 2 2 4-4"/></svg>';

    var badges = 
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--s3);margin-top:var(--s7);">' +
        trustBadge(ICON('lock', 20), 'Secure Payment') +
        trustBadge(shieldCheck, 'SSL Encrypted') +
        trustBadge(ICON('truck', 20), 'Express Shipping') +
        trustBadge(badgeCheck, 'Cult Approved') +
      '</div>';

    return banner + acc + badges;
  }

  function trustBadge(icon, text) {
    return '<div style="background:var(--paper-sink);border-radius:var(--r-2);padding:10px 14px;display:flex;align-items:center;gap:12px;font-size:14px;"><span style="color:var(--ink);display:flex;">' + icon + '</span><span>' + text + '</span></div>';
  }

  /* Descriptions arrive from a WooCommerce import and may carry markup. Rather
     than injecting stored HTML into the page (an XSS vector through the admin
     and the import alike), block tags become paragraph breaks and everything
     else is stripped, then escaped. */
  function descriptionHtml(p) {
    var text = plain(U.text(p.description));
    if (!text) return '';
    return text.split('\n').filter(Boolean).map(function (para) {
      return '<p>' + U.esc(para) + '</p>';
    }).join('');
  }

  function plain(html) {
    if (!html) return '';
    return String(html)
      .replace(/<\s*(br|\/p|\/div|\/li|\/h[1-6])\s*\/?>/gi, '\n')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#0?39;|&apos;/gi, "'")
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{2,}/g, '\n')
      .trim();
  }

  function detailsHtml(p) {
    var rows = [];
    if (p.sku) rows.push(['SKU', String(p.sku)]);
    var cat = U.pcat(p);
    if (cat) rows.push(['Category', cat]);
    var stock = U.stock(p);
    rows.push(['Availability', stock > 0 ? (stock + ' in stock') : 'Sold out']);
    if (Array.isArray(p.tag) && p.tag.length) {
      rows.push(['Tags', p.tag.filter(function (t) { return typeof t === 'string'; }).slice(0, 8).join(', ')]);
    }
    return '<div class="receipt" style="margin-top:0">' + rows.map(function (r) {
      return '<div class="receipt-r"><span>' + U.esc(r[0]) + '</span><b>' + U.esc(r[1]) + '</b></div>';
    }).join('') + '</div>';
  }

  /* ── Interaction ─────────────────────────────────────────────────────────── */

  function wire(p) {
    var view = U.$('#view');
    if (!view) return;
    var imgs = U.images(p);
    var stock = U.stock(p);
    var isGrouped = p.variants && p.variants.some(function(v) { return v && v.group && Array.isArray(v.options); });
    if (isGrouped) {
      S.variantSelections = {};
      p.variants.forEach(function(v) {
        if (v.group && Array.isArray(v.options) && v.options.length > 0) {
          S.variantSelections[v.group] = v.options[0];
        }
      });
    } else {
      var vals = variantValues(p);
      if (vals.length >= 2) S.variant = vals[0];
    }

    // Gallery
    U.on(view, 'click', '[data-thumb]', function (e, btn) {
      var i = Number(btn.getAttribute('data-thumb'));
      var src = imgs[i];
      if (!src) return;
      S.imgIndex = i;
      var main = U.$('#galMain');
      if (main) main.src = src;
      U.$$('[data-thumb]', view).forEach(function (b) {
        b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
      });
    });

    // Mobile swipe for gallery
    var galMain = U.$('#galMain');
    if (galMain && imgs.length > 1) {
      var touchStartX = 0;
      var touchStartY = 0;
      galMain.addEventListener('touchstart', function (e) {
        if (e.touches && e.touches[0]) {
          touchStartX = e.touches[0].clientX;
          touchStartY = e.touches[0].clientY;
        }
      }, { passive: true });
      galMain.addEventListener('touchend', function (e) {
        if (e.changedTouches && e.changedTouches[0]) {
          var dx = e.changedTouches[0].clientX - touchStartX;
          var dy = e.changedTouches[0].clientY - touchStartY;
          if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
            var next = dx < 0
              ? (S.imgIndex + 1) % imgs.length
              : (S.imgIndex - 1 + imgs.length) % imgs.length;
            var targetBtn = U.$('[data-thumb="' + next + '"]', view);
            if (targetBtn) targetBtn.click();
          }
        }
      }, { passive: true });
    }

    // Broken remote images (Cloudinary miss, dead scraped URL) are handled by
    // the single capture-phase listener in Shell — see initEvents.

    // Grouped Variant
    U.on(view, 'click', '[data-opt-val]', function (e, btn) {
      var group = btn.getAttribute('data-opt-group');
      var val = btn.getAttribute('data-opt-val');
      S.variantSelections[group] = val;
      
      var parent = btn.closest('.opt-vals');
      U.$$('[data-opt-val]', parent).forEach(function (b) {
        b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
      });
      var groupIdx = parent.getAttribute('data-group-idx');
      var hint = U.$('#optHint_' + groupIdx);
      if (hint) hint.textContent = val;
    });

    // Legacy Variant
    U.on(view, 'click', '[data-opt]', function (e, btn) {
      if (btn.hasAttribute('data-opt-val')) return;
      S.variant = btn.getAttribute('data-opt') || '';
      var parent = btn.closest('.opt-vals');
      U.$$('[data-opt]', parent).forEach(function (b) {
        b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
      });
      var hint = U.$('#optHint');
      if (hint) hint.textContent = S.variant;
    });

    // Quantity, bounded by real stock
    U.on(view, 'click', '[data-qty]', function (e, btn) {
      var d = Number(btn.getAttribute('data-qty'));
      var next = Math.max(1, Math.min(stock, S.qty + d));
      if (next === S.qty) return;
      S.qty = next;
      var out = U.$('#pdpQty');
      if (out) out.textContent = String(S.qty);
      syncQtyButtons(stock);
      paintBuyBar(p);
    });
    syncQtyButtons(stock);

    // Add / Buy
    var add = U.$('#pdpAdd');
    if (add) add.addEventListener('click', function () { addToCart(p, false); });

    var buy = U.$('#pdpBuy');
    if (buy) buy.addEventListener('click', function () { addToCart(p, true); });

    // Accordion
    U.on(view, 'click', '[data-acc]', function (e, btn) {
      var i = btn.getAttribute('data-acc');
      var open = btn.getAttribute('aria-expanded') === 'true';

      // Close all accordions first to ensure only one is open
      U.$$('[data-acc]', view).forEach(function (b) {
        b.setAttribute('aria-expanded', 'false');
      });
      U.$$('[data-acc-panel]', view).forEach(function (p) {
        p.setAttribute('data-open', 'false');
      });

      // If it wasn't already open, open it
      if (!open) {
        btn.setAttribute('aria-expanded', 'true');
        var panel = U.$('[data-acc-panel="' + i + '"]', view);
        if (panel) panel.setAttribute('data-open', 'true');
      }
    });
  }

  function syncQtyButtons(stock) {
    var dec = U.$('[data-qty="-1"]');
    var inc = U.$('[data-qty="1"]');
    if (dec) dec.disabled = S.qty <= 1;
    if (inc) inc.disabled = S.qty >= stock;
  }

  function addToCart(p, thenCheckout) {
    var finalVariant = S.variant;
    if (S.variantSelections) {
      var parts = [];
      for (var k in S.variantSelections) {
        parts.push(k + ': ' + S.variantSelections[k]);
      }
      finalVariant = parts.join(', ');
    }
    var r = Cart.add(p, S.qty, finalVariant);
    if (!r.ok) { U.toast({ title: r.reason, bad: true }); return; }

    Shell.paintBadge(true);

    if (thenCheckout) {
      // Buy now goes straight to the details step; the cart step would be an
      // extra tap for a shopper who has already decided.
      Panel.open('checkout');
      return;
    }

    U.toast({
      title: S.qty > 1 ? ('Added ' + S.qty + ' to cart') : 'Added to cart',
      note: U.text(p.title),
      image: U.images(p)[0],
      action: 'Checkout',
      onAction: function () { Panel.open('cart'); }
    });
    if (r.capped) U.toast({ title: 'Limited to available stock (' + r.stock + ')', bad: true });
  }

  /* ── Mobile buy bar ──────────────────────────────────────────────────────── */

  function paintBuyBar(p) {
    var bar = U.$('#buybar');
    if (!bar) return;
    var stock = U.stock(p);

    if (stock <= 0) {
      bar.innerHTML =
        '<div class="buybar-p"><span class="price">' + U.money(U.price(p)) + '</span>' +
        '<span>' + U.esc(U.text(p.title)) + '</span></div>' +
        '<a class="btn btn-ghost" href="/shop" data-nav>Shop archive</a>';
    } else {
      bar.innerHTML =
        '<div class="buybar-p"><span class="price">' + U.money(U.price(p) * S.qty) + '</span>' +
        '<span>' + U.esc(U.text(p.title)) + '</span></div>' +
        '<button class="btn btn-primary" id="barAdd">Add to cart</button>';
      var b = U.$('#barAdd');
      if (b) b.addEventListener('click', function () { addToCart(p, false); });
    }
    Shell.icons(bar);
    bar.classList.add('on');
  }

  /* ── Related ─────────────────────────────────────────────────────────────── */

  function loadRelated(p) {
    var host = U.$('#pdpRelated');
    if (!host) return;
    var t = S.token;
    var catId = (p.category && (p.category._id || p.category)) || null;
    if (catId && typeof catId === 'object') catId = null;

    API.products({ limit: 12, category: catId || undefined }).then(function (r) {
      if (!S || Router.stale(t)) return;
      var id = U.pid(p);
      var list = r.products.filter(function (x) { return U.pid(x) !== id; }).slice(0, 8);
      if (!list.length) { host.innerHTML = ''; return; }
      Views.remember(list);
      Views.fill(host,
        '<section class="section"><div class="wrap">' +
          Views.head({
            eyebrow: catId ? 'More from this category' : 'More from the archive',
            title: 'You may also like',
            href: '/shop',
            linkLabel: 'Shop all'
          }) +
          '<div class="rail" id="pdpRelatedRail">' + Card.grid(list, {}) + '</div>' +
        '</div></section>'
      );

      var rail = U.$('#pdpRelatedRail', host);
      if (rail) {
        var timer;
        var startScroll = function() {
          clearInterval(timer);
          timer = setInterval(function() {
            if (!document.body.contains(rail)) {
              clearInterval(timer);
              return;
            }
            if (rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 10) {
              rail.scrollTo({ left: 0, behavior: 'smooth' });
            } else {
              var card = rail.firstElementChild;
              var w = card ? card.offsetWidth + parseInt(window.getComputedStyle(rail).gap || 24) : 300;
              rail.scrollBy({ left: w, behavior: 'smooth' });
            }
          }, 3500);
        };
        startScroll();

        rail.addEventListener('mouseenter', function() { clearInterval(timer); });
        rail.addEventListener('mouseleave', startScroll);
        rail.addEventListener('touchstart', function() { clearInterval(timer); }, { passive: true });
      }
    }).catch(function () {
      // Related products are a nicety; a failure here must not disturb the PDP.
      if (host) host.innerHTML = '';
    });
  }

  /* ── Reviews ─────────────────────────────────────────────────────────────── */

  function loadReviews(p) {
    var host = U.$('#pdpReviews');
    if (!host) return;
    var t = S.token;
    var pid = U.pid(p);

    API.get('/reviews/' + pid).then(function (r) {
      if (!S || Router.stale(t)) return;
      var reviews = (r && r.reviews) || [];
      if (!reviews.length) { host.innerHTML = ''; return; }

      var sum = 0;
      reviews.forEach(function(rev) { sum += rev.rating; });
      var avg = (sum / reviews.length).toFixed(1);

      var starsHtml = '';
      var numStars = Math.round(avg);
      for (var i = 1; i <= 5; i++) {
        starsHtml += '<span style="color:' + (i <= numStars ? '#FFD700' : 'var(--ink-hair)') + ';font-size:18px">★</span>';
      }

      var html = '<section class="section" style="padding-bottom:var(--s3);"><div class="wrap">' +
        Views.head({ eyebrow: 'Verified Buyers', title: 'Customer Reviews' }) +
        '<div style="display:flex;align-items:center;gap:12px;margin-bottom:var(--s5)">' +
          '<div style="font-size:32px;font-weight:700;font-family:var(--f-display)">' + avg + '</div>' +
          '<div>' +
            '<div style="display:flex;gap:2px">' + starsHtml + '</div>' +
            '<div style="color:var(--ink-3);font-size:13px;margin-top:4px">Based on ' + reviews.length + ' review' + (reviews.length === 1 ? '' : 's') + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="rail rail--marquee" style="gap:16px">' +
        reviews.map(function(rev) {
          var revStars = '';
          for (var i = 1; i <= 5; i++) {
            revStars += '<span style="color:' + (i <= rev.rating ? '#FFD700' : 'var(--ink-hair)') + ';font-size:14px">★</span>';
          }
          var name = rev.customerName || 'Verified Buyer';
          var initials = name.split(' ').slice(0,2).map(function(w){ return w[0]; }).join('').toUpperCase();
          return '<div style="background:var(--paper);border:1px solid var(--paper-edge);border-radius:var(--r-2);padding:24px;width:320px;flex:none;display:flex;flex-direction:column">' +
            '<div style="display:flex;gap:2px;margin-bottom:16px">' + revStars + '</div>' +
            '<p style="color:var(--ink-2);line-height:1.6;font-size:14px;margin:0 0 24px;flex:1">"' + U.esc(rev.text) + '"</p>' +
            '<div style="display:flex;align-items:center;gap:12px">' +
              '<div style="width:36px;height:36px;border-radius:50%;background:var(--warn-soft);color:var(--warn);display:flex;align-items:center;justify-content:center;font-size:13px;font-family:var(--f-mono);font-weight:600;flex:none">' + initials + '</div>' +
              '<div style="font-size:14px;font-weight:500;color:var(--ink)">' + U.esc(name) + '</div>' +
            '</div>' +
          '</div>';
        }).join('') +
        '</div></div></section>';
        
      Views.fill(host, html);

      var rail = host.querySelector('.rail');
      if (rail) {
        var isDown = false;
        var paused = false;
        
        // Clone for seamless loop
        if (rail.scrollWidth > rail.clientWidth) {
          Array.from(rail.children).forEach(function(c) {
            rail.appendChild(c.cloneNode(true));
          });
        }
        
        rail.addEventListener('mousedown', function() { isDown = true; });
        rail.addEventListener('mouseup', function() { isDown = false; });
        rail.addEventListener('mouseleave', function() { isDown = false; paused = false; });
        rail.addEventListener('mouseenter', function() { paused = true; });
        rail.addEventListener('touchstart', function() { isDown = true; });
        rail.addEventListener('touchend', function() { isDown = false; });
        
        function autoScroll() {
          if (!isDown && !paused && rail && document.body.contains(rail)) {
            rail.scrollLeft += 1.5;
            if (rail.scrollLeft >= rail.scrollWidth / 2) {
              rail.scrollLeft -= rail.scrollWidth / 2;
            }
          }
          if (document.body.contains(rail)) {
            requestAnimationFrame(autoScroll);
          }
        }
        requestAnimationFrame(autoScroll);
      }
    }).catch(function (e) {
      console.warn('Failed to load reviews:', e);
      if (host) host.innerHTML = '';
    });
  }

})();
