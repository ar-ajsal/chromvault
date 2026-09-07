/* ============================================================================
   CHROMORA — UTILITIES
   DOM helpers, escaping, money, product field normalisation.

   Product/category documents come from a WooCommerce migration, so almost
   every field has two or three possible shapes ({en:…} vs string, image array
   vs string, prices.price vs price). Every read goes through a normaliser here
   so no view has to guess. This is the compatibility seam for the whole UI.
   ========================================================================== */
(function () {
  'use strict';

  var U = {};

  /* ── DOM ──────────────────────────────────────────────────────────────── */
  U.$  = function (sel, root) { return (root || document).querySelector(sel); };
  U.$$ = function (sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  };

  U.el = function (tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  };

  U.on = function (node, type, sel, fn) {
    // Delegated listener. Pass 3 args for a direct listener.
    if (typeof sel === 'function') { node.addEventListener(type, sel, fn); return; }
    node.addEventListener(type, function (e) {
      var t = e.target.closest(sel);
      if (t && node.contains(t)) fn.call(t, e, t);
    });
  };

  /* ── Escaping ─────────────────────────────────────────────────────────────
     All product text is rendered through esc(). Titles and descriptions are
     admin-authored, but they still travel through a database and must never be
     able to inject markup into the storefront. */
  var ENT = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  U.esc = function (s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, function (c) { return ENT[c]; });
  };
  // For values interpolated into a JS string inside an attribute.
  U.escAttr = function (s) { return U.esc(s).replace(/\n/g, ' '); };

  /* ── Money ────────────────────────────────────────────────────────────────
     Integer rupees. The backend prices in whole rupees and Razorpay receives
     paise computed server-side, so the UI never needs sub-rupee precision —
     and never does arithmetic that could disagree with the server total. */
  U.money = function (n) {
    var v = Number(n);
    if (!isFinite(v)) v = 0;
    return '₹' + Math.round(v).toLocaleString('en-IN');
  };

  U.num = function (n, d) {
    var v = Number(n);
    return isFinite(v) ? v : (d || 0);
  };

  /* ── i18n-ish object fields ───────────────────────────────────────────────
     Mongo stores title/description/name as { en: "…" } objects, but legacy rows
     are plain strings. Accept both, prefer English, fall back to first value. */
  U.text = function (v) {
    if (v == null) return '';
    if (typeof v === 'string') return v;
    if (typeof v === 'object') {
      if (v.en) return String(v.en);
      for (var k in v) {
        if (Object.prototype.hasOwnProperty.call(v, k) && typeof v[k] === 'string' && v[k]) {
          return String(v[k]);
        }
      }
    }
    return '';
  };

  /* ── Product normaliser ───────────────────────────────────────────────── */
  U.images = function (p) {
    if (!p) return [];
    var img = p.image;
    var out = [];
    if (Array.isArray(img)) out = img.slice();
    else if (typeof img === 'string' && img) out = [img];
    return out.filter(function (s) { return typeof s === 'string' && s.trim(); });
  };

  U.price = function (p) {
    if (!p) return 0;
    var v = (p.prices && p.prices.price != null) ? p.prices.price : p.price;
    return U.num(v, 0);
  };

  U.wasPrice = function (p) {
    if (!p) return 0;
    var v = (p.prices && p.prices.originalPrice != null) ? p.prices.originalPrice : p.originalPrice;
    var was = U.num(v, 0);
    var now = U.price(p);
    // Only a genuine markdown counts. Equal or lower "original" is noise from
    // the import and must not render as a fake discount.
    return was > now ? was : 0;
  };

  U.discountPct = function (p) {
    var was = U.wasPrice(p);
    if (!was) return 0;
    var now = U.price(p);
    return Math.round(((was - now) / was) * 100);
  };

  U.stock = function (p) { return Math.max(0, Math.floor(U.num(p && p.stock, 0))); };
  U.inStock = function (p) { return U.stock(p) > 0; };
  // "Low" is a real threshold on real stock — never a manufactured scarcity cue.
  U.LOW_STOCK = 5;
  U.isLow = function (p) { var s = U.stock(p); return s > 0 && s <= U.LOW_STOCK; };

  U.pid = function (p) { return (p && (p._id || p.id || p.productId)) || ''; };

  U.slug = function (p) {
    if (!p) return '';
    if (p.slug) return String(p.slug);
    return '';
  };

  // Link target for a product. Slug is preferred (clean URL + the backend has
  // a slug endpoint); id is the fallback so a slugless product is still
  // reachable rather than silently unlinkable.
  U.plink = function (p) {
    var s = U.slug(p);
    if (s) return '/product/' + encodeURIComponent(s);
    var id = U.pid(p);
    return id ? '/product/id/' + encodeURIComponent(id) : '/shop';
  };

  U.pcat = function (p) {
    if (!p) return '';
    if (p.category && typeof p.category === 'object') return U.text(p.category.name);
    if (Array.isArray(p.categories) && p.categories.length) {
      var c = p.categories[0];
      if (c && typeof c === 'object') return U.text(c.name);
    }
    return '';
  };

  U.catName = function (c) { return U.text(c && c.name); };
  U.catId = function (c) { return (c && (c._id || c.id)) || ''; };
  U.catImage = function (c) {
    if (!c) return '';
    var v = c.image || c.icon || '';
    return (typeof v === 'string' && /^https?:\/\/|^\//.test(v.trim())) ? v.trim() : '';
  };

  /* ── Placeholder ──────────────────────────────────────────────────────────
     When a product has no image we draw a chrome-toned SVG, inline, rather than
     shipping a stock photo. It is obviously a placeholder to the operator and
     still presentable to a shopper. No fake product photography, ever. */
  U.PLACEHOLDER =
    'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500">' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="0.4" y2="1">' +
      '<stop offset="0" stop-color="#F4F6F8"/><stop offset="0.28" stop-color="#D6DBE1"/>' +
      '<stop offset="0.52" stop-color="#A8AEB8"/><stop offset="0.62" stop-color="#6B7178"/>' +
      '<stop offset="0.8" stop-color="#D6DBE1"/><stop offset="1" stop-color="#C4CBD3"/>' +
      '</linearGradient></defs>' +
      '<rect width="400" height="500" fill="#E8E7E3"/>' +
      '<circle cx="200" cy="238" r="76" fill="url(#g)" opacity="0.92"/>' +
      '<text x="200" y="368" text-anchor="middle" font-family="monospace" font-size="13"' +
      ' letter-spacing="3" fill="#6E6E74">IMAGE PENDING</text></svg>'
    );

  U.img = function (src) {
    return (typeof src === 'string' && src.trim()) ? src.trim() : U.PLACEHOLDER;
  };

  /* ── Timing ───────────────────────────────────────────────────────────── */
  U.debounce = function (fn, ms) {
    var t;
    return function () {
      var a = arguments, self = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(self, a); }, ms);
    };
  };

  U.raf = function (fn) { return requestAnimationFrame(fn); };

  /* ── Query strings ────────────────────────────────────────────────────── */
  U.qs = function (obj) {
    var out = [];
    Object.keys(obj || {}).forEach(function (k) {
      var v = obj[k];
      if (v == null || v === '') return;
      out.push(encodeURIComponent(k) + '=' + encodeURIComponent(v));
    });
    return out.length ? '?' + out.join('&') : '';
  };

  U.parseQs = function (search) {
    var out = {};
    var s = (search || window.location.search || '').replace(/^\?/, '');
    if (!s) return out;
    s.split('&').forEach(function (pair) {
      if (!pair) return;
      var i = pair.indexOf('=');
      var k = i < 0 ? pair : pair.slice(0, i);
      var v = i < 0 ? '' : pair.slice(i + 1);
      try { out[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, ' ')); }
      catch (e) { out[k] = v; }
    });
    return out;
  };

  /* ── Scroll lock ──────────────────────────────────────────────────────────
     Locking <body> loses the scroll position on iOS unless it's restored by
     hand, which is why this keeps a counter and a saved offset. */
  var lockY = 0, lockN = 0;
  U.lock = function () {
    if (lockN++ > 0) return;
    lockY = window.scrollY || 0;
    document.body.style.top = -lockY + 'px';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.classList.add('is-locked');
  };
  U.unlock = function () {
    if (lockN === 0) return;
    if (--lockN > 0) return;
    document.body.classList.remove('is-locked');
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    window.scrollTo(0, lockY);
  };

  /* ── Focus trap ───────────────────────────────────────────────────────────
     Keeps Tab inside an open dialog. Returns a release function. */
  var FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),' +
                  'select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
  U.trap = function (root) {
    function onKey(e) {
      if (e.key !== 'Tab') return;
      var items = U.$$(FOCUSABLE, root).filter(function (n) {
        return n.offsetParent !== null || n === document.activeElement;
      });
      if (!items.length) return;
      var first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    root.addEventListener('keydown', onKey);
    return function () { root.removeEventListener('keydown', onKey); };
  };

  /* ── Toast ────────────────────────────────────────────────────────────────
     Replaces every alert() in the old checkout. Same information, no modal
     interruption mid-form — which matters because the old flow used alert()
     for validation and each one dismissed the keyboard on mobile. */
  U.toast = function (opts) {
    var host = U.$('#toastHost');
    if (!host) return;
    var o = typeof opts === 'string' ? { title: opts } : (opts || {});
    var n = U.el('div', 'toast' + (o.bad ? ' bad' : ''));
    var html = '';
    if (o.image) html += '<img src="' + U.escAttr(U.img(o.image)) + '" alt="" />';
    html += '<div class="grow"><b>' + U.esc(o.title || '') + '</b>' +
            (o.note ? '<span>' + U.esc(o.note) + '</span>' : '') + '</div>';
    if (o.action && o.href) html += '<a href="' + U.escAttr(o.href) + '" data-nav>' + U.esc(o.action) + '</a>';
    else if (o.action) html += '<a href="#" data-toast-act>' + U.esc(o.action) + '</a>';
    n.innerHTML = html;
    host.appendChild(n);

    if (o.onAction) {
      var a = n.querySelector('[data-toast-act]');
      if (a) a.addEventListener('click', function (e) { e.preventDefault(); o.onAction(); kill(); });
    }

    var t = setTimeout(kill, o.ms || (o.bad ? 5200 : 3400));
    function kill() {
      clearTimeout(t);
      if (!n.parentNode) return;
      n.classList.add('out');
      setTimeout(function () { if (n.parentNode) n.parentNode.removeChild(n); }, 240);
    }
    return kill;
  };

  window.U = U;
})();
