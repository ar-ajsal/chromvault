/* ============================================================================
   CHROMVAULT — CART & CHECKOUT PAGES
   ----------------------------------------------------------------------------
   The full-page counterparts of the drawer:

     /cart       → items, summary, continue-to-checkout
     /checkout   → the same summary beside Checkout's form

   Both reuse Panel's line and summary builders and Checkout's form, so there is
   exactly one implementation of a cart line and one implementation of the
   checkout form in the storefront. The drawer is the fast path; these pages
   exist because a cart URL is something people bookmark, share between their
   phone and laptop, and land on from a payment redirect.
   ========================================================================== */
(function () {
  'use strict';

  var Views = window.Views = window.Views || {};

  var S = null;

  /* The completed order for this session. Kept so a refresh or a Back-then-
     Forward on /checkout shows the receipt again instead of an empty cart —
     the order exists on the server either way, but the shopper should not have
     to hunt for their order number. */
  var lastOrder = null;
  var lastOrderAt = 0;

  Views.cart = function (opts) {
    var o = opts || {};
    var step = o.step === 'details' ? 'details' : 'cart';

    S = { token: Router.token(), step: step };
    Views.onTeardown(function () {
      if (window.Checkout && Checkout.destroy) Checkout.destroy();
      if (S && S.off) S.off();
      S = null;
    });

    // A receipt outranks everything: if this session just completed an order and
    // the cart is empty, /checkout shows what happened.
    if (step === 'details' && lastOrder && !Cart.items().length &&
        (Date.now() - lastOrderAt) < 60 * 60 * 1000) {
      paintDone(lastOrder);
      return;
    }

    if (step === 'details' && !Cart.items().length) {
      // Nothing to pay for. Send them to the cart rather than showing a form
      // that cannot be submitted.
      Router.go('/cart', { replace: true });
      return;
    }

    if (step === 'details') paintCheckout();
    else paintCart();

    /* React to cart changes from anywhere — the drawer, another tab, a toast
       undo. On the details step the form is left alone (re-rendering it would
       throw away half-typed input); only the total and the pay button refresh. */
    S.off = Cart.onChange(function () {
      if (!S) return;
      if (S.step === 'cart') { paintCart(); return; }
      if (!Cart.items().length) { Router.go('/cart', { replace: true }); return; }
      refreshAside();
    });
  };

  /* ── /cart ───────────────────────────────────────────────────────────────── */

  function paintCart() {
    var items = Cart.items();
    Views.setMeta(items.length ? ('Cart · ' + Cart.count() + ' item' + (Cart.count() === 1 ? '' : 's')) : 'Cart',
      'Review your Chromvault cart and check out securely with Razorpay.');

    if (!items.length) {
      Views.mount('<div class="wrap" style="padding-top:var(--s7)">' + Panel.emptyHtml() + '</div>');
      return;
    }

    Views.mount(
      '<div class="wrap">' +
        heading('Cart', Cart.count() + (Cart.count() === 1 ? ' piece' : ' pieces') + ' held for you') +
        '<div class="cartpage">' +
          '<div class="cartpage-main">' +
            Panel.itemsHtml(items) +
            '<div class="cartpage-foot">' +
              '<a class="btn-text" href="/shop" data-nav>' +
                '<span class="arw" style="transform:rotate(180deg);display:inline-flex">' + ICON('arrow', 14) + '</span> ' +
                'Keep shopping' +
              '</a>' +
              '<button class="citem-x" data-cclear>Clear cart</button>' +
            '</div>' +
          '</div>' +
          '<aside class="cartpage-aside">' +
            '<div class="cartbox" id="cartAside">' + asideHtml() + '</div>' +
            trustHtml() +
          '</aside>' +
        '</div>' +
      '</div>'
    );
  }

  function asideHtml() {
    return '' +
      '<h3 class="cartbox-h">Summary</h3>' +
      Panel.sumHtml() +
      '<button class="btn btn-primary btn-lg btn-block" data-pstep="checkout" style="margin-top:var(--s4)">' +
        'Continue to checkout' +
      '</button>' +
      '<div class="secnote">' + ICON('lock', 12) + 'Razorpay · UPI, cards, net banking</div>';
  }

  function trustHtml() {
    var rows = [
      ['truck', 'Free shipping', 'Across India, no minimum order.'],
      ['lock', 'Secure payment', 'Handled end to end by Razorpay.'],
      ['box', 'Single-run stock', 'Held while it is in your cart, not reserved.']
    ];
    return '<div class="cartbox cartbox-trust">' + rows.map(function (r) {
      return '<div class="trust-r">' +
               '<span class="trust-ic" data-ic="' + r[0] + '" data-ic-size="17"></span>' +
               '<span><b>' + U.esc(r[1]) + '</b><span>' + U.esc(r[2]) + '</span></span>' +
             '</div>';
    }).join('') + '</div>';
  }

  /* ── /checkout ───────────────────────────────────────────────────────────── */

  function paintCheckout() {
    Views.setMeta('Checkout', 'Secure Razorpay checkout — free shipping across India.');

    Views.mount(
      '<div class="wrap">' +
        heading('Checkout', 'Delivery details, then payment') +
        '<nav class="crumb" style="margin-bottom:var(--s5)">' +
          '<a href="/cart" data-nav>Cart</a><span class="sep">/</span><span>Details &amp; payment</span>' +
        '</nav>' +
        '<div class="cartpage">' +
          '<div class="cartpage-main" id="coHost"></div>' +
          '<aside class="cartpage-aside">' +
            '<div class="cartbox">' +
              '<h3 class="cartbox-h">Order</h3>' +
              '<div class="cartlines">' + Panel.itemsHtml(Cart.items()) + '</div>' +
              '<div id="coFoot"></div>' +
            '</div>' +
            trustHtml() +
          '</aside>' +
        '</div>' +
      '</div>'
    );

    Checkout.mount(U.$('#coHost'), {
      footEl: U.$('#coFoot'),
      onBack: function () { Router.go('/cart'); },
      onSuccess: function (order) {
        lastOrder = order;
        lastOrderAt = Date.now();
        paintDone(order);
      }
    });
  }

  /* Only the money and the pay button change when the cart moves underneath an
     open checkout form. */
  function refreshAside() {
    var lines = U.$('.cartlines');
    if (lines) Views.fill(lines, Panel.itemsHtml(Cart.items()));
    var pay = U.$('#coPay');
    if (pay && !pay.disabled) pay.textContent = 'Pay ' + U.money(Cart.subtotal()) + ' securely';
    var sum = U.$('#coFoot .sumtotal .price');
    if (sum) sum.textContent = U.money(Cart.subtotal());
    var sub = U.$('#coFoot .sumrow .v');
    if (sub) sub.textContent = U.money(Cart.subtotal());
  }

  /* ── Confirmation ────────────────────────────────────────────────────────── */

  function paintDone(order) {
    Views.setMeta('Order confirmed', 'Your Chromvault order is confirmed.');
    if (window.Checkout && Checkout.destroy) Checkout.destroy();

    var track = '/track' + (order && order.orderId
      ? ('?order=' + encodeURIComponent(order.orderId)) : '');

    Views.mount(
      '<div class="wrap">' +
        '<div class="donepage">' +
          Checkout.doneHtml(order) +
          '<div class="row" style="justify-content:center;gap:var(--s3);margin-top:var(--s6);flex-wrap:wrap">' +
            '<a class="btn btn-primary btn-lg" href="/shop" data-nav>Continue shopping</a>' +
            '<a class="btn btn-ghost btn-lg" href="' + U.escAttr(track) + '" data-nav>Track this order</a>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  /* ── Shared bits ─────────────────────────────────────────────────────────── */

  function heading(title, note) {
    return '' +
      '<div class="stack" style="gap:var(--s2);padding-top:clamp(var(--s5),4vw,var(--s7));margin-bottom:var(--s5)">' +
        '<h1 class="display t-xl" style="text-transform:uppercase;letter-spacing:-0.03em;line-height:0.94">' +
          U.esc(title) +
        '</h1>' +
        '<p class="eyebrow">' + U.esc(note) + '</p>' +
      '</div>';
  }
})();
