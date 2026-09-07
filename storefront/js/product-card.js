/* ============================================================================
   CHROMVAULT — PRODUCT CARD  (v2 — premium redesign)
   ----------------------------------------------------------------------------
   One renderer for every product surface (home rails, shop grid, search,
   related). Cards are built as HTML strings for speed on long grids; all
   interaction is delegated from the document in shell.js.

   Design philosophy:
     Image → Product → Price → Action. In under a second.

   Chrome atmosphere: a subtle lit surface behind every product image makes
   the object read like a photographed campaign piece, not a box on a page.

   Sold-out: full overlay on the image — the product is still visible (it
   belongs in the archive) but clearly unavailable.

   CTA: one button, "Add to cart". Slides up on desktop hover; always present
   on touch (a hover-only buy control on mobile is a lost sale).

   Badges: real truths only — % discount, low-stock count, sold-out.
   ========================================================================== */
(function () {
  'use strict';

  var Card = {};

  Card.html = function (p, opts) {
    var o = opts || {};
    var imgs = U.images(p);
    var title = U.text(p.title) || 'Untitled';
    var price = U.price(p);
    var was = U.wasPrice(p);
    var off = U.discountPct(p);
    var stock = U.stock(p);
    var out = stock <= 0;
    var low = U.isLow(p);
    var href = U.plink(p);
    var cat = U.pcat(p);
    var id = U.pid(p);

    /* ── Badges ──────────────────────────────────────────────────────────
       One action-truth badge maximum. Discount % leads (strongest signal),
       low-stock follows, featured last. Sold-out gets the overlay treatment
       on the image instead — it's more visible and harder to overlook. */
    var topBadge = '';
    if (!out) {
      if (off >= 5) {
        topBadge = '<span class="pcard-badge pcard-badge-sale">\u2212' + off + '%</span>';
      } else if (low) {
        topBadge = '<span class="pcard-badge pcard-badge-low">' + stock + ' left</span>';
      } else if (o.showNew && p.isFeatured) {
        topBadge = '<span class="pcard-badge pcard-badge-feat">Featured</span>';
      }
    }

    /* ── Images Scroller ───────────────────────────────────────────────── */
    var primaryImg = '<img class="pcard-img" src="' + U.escAttr(U.img(imgs[0])) + '" alt="' + U.escAttr(title) + '" ' +
               'loading="' + (o.eager ? 'eager' : 'lazy') + '" decoding="async" />';
               
    var imagesHtml = '<div class="pcard-img-scroller">' +
                       '<div class="pcard-img-pane">' + primaryImg + '</div>' +
                       (imgs.length > 1 ? '<div class="pcard-img-pane pcard-img-alt-pane"><img class="pcard-img" src="' + U.escAttr(imgs[1]) + '" alt="" loading="lazy" decoding="async" aria-hidden="true" /></div>' : '') +
                     '</div>';

    /* ── Sold-out overlay ──────────────────────────────────────────────── */
    var soldOutOverlay = out
      ? '<div class="pcard-sold-overlay" aria-hidden="true"><span>Sold out</span></div>'
      : '';

    /* ── Add to cart CTA ─────────────────────────────────────────────────
       Removed per user request. Only available on product details page. */
    var cta = '';

    /* ── Price block ───────────────────────────────────────────────────── */
    var priceHtml =
      '<div class="pcard-prices">' +
        '<span class="price' + (was ? ' price-on-sale' : '') + '">' + U.money(price) + '</span>' +
        (was ? '<span class="price-was">' + U.money(was) + '</span>' : '') +
      '</div>';

    /* ── Assembled card ────────────────────────────────────────────────── */
    return '' +
      '<article class="pcard' + (out ? ' is-out' : '') + '" data-pcard data-id="' + U.escAttr(id) + '">' +

        '<a class="pcard-media" href="' + U.escAttr(href) + '" data-nav ' +
           'tabindex="0" aria-label="View ' + U.escAttr(title) + '">' +
          /* Chrome atmosphere layer — behind the product image */
          '<div class="pcard-bg" aria-hidden="true"></div>' +
          /* Swipable images wrapper */
          imagesHtml +
          /* Cursor-tracked specular — JS sets --mx/--my via chrome-fx.js */
          '<span class="pcard-spec" aria-hidden="true"></span>' +
          /* Sold-out overlay */
          soldOutOverlay +
          /* Badge top-left */
          (topBadge ? '<div class="pcard-flags">' + topBadge + '</div>' : '') +
        '</a>' +

        /* Slide-up CTA */
        cta +

        '<div class="pcard-body">' +
          (cat ? '<span class="pcard-cat">' + U.esc(cat) + '</span>' : '') +
          '<a class="pcard-title" href="' + U.escAttr(href) + '" data-nav>' + U.esc(title) + '</a>' +
          priceHtml +
        '</div>' +

      '</article>';
  };

  Card.grid = function (products, opts) {
    var o = opts || {};
    return products.map(function (p, i) {
      // The first four are above the fold on most viewports — load eagerly so
      // the largest contentful paint isn't held back by the lazy queue.
      return Card.html(p, { eager: o.eager && i < 4, showNew: o.showNew });
    }).join('');
  };

  /* Skeleton placeholders — same aspect ratio as real cards so the layout
     does not jump when the API responds. */
  Card.skeletons = function (n) {
    var one =
      '<div class="sk-card" aria-hidden="true">' +
        '<div class="sk sk-media"></div>' +
        '<div class="sk sk-line w40" style="margin-top:8px"></div>' +
        '<div class="sk sk-line w70"></div>' +
        '<div class="sk sk-line w45"></div>' +
      '</div>';
    return new Array(n || 8).fill(one).join('');
  };

  window.Card = Card;
})();
