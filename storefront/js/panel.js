/* ============================================================================
   CHROMVAULT — PANEL (cart + checkout drawer)
   ----------------------------------------------------------------------------
   The drawer is the primary cart surface: it opens over whatever the shopper is
   browsing, so adding an item never costs them their place in the grid. The
   /cart and /checkout routes render the SAME line and summary markup as a full
   page (see views/cart.js) by calling the builders exported here — there is one
   implementation of a cart line in this codebase, not two.

   Steps: cart → details → done.

   Pricing shown here is a DISPLAY subtotal. The amount actually charged is
   computed by the backend in computeOrderPricing() and returned with the
   Razorpay order; nothing in this file can influence it.
   ========================================================================== */
(function () {
  'use strict';

  var Panel = {};

  var state = { open: false, step: 'cart', order: null };
  var releaseTrap = null;
  var unsubscribe = null;
  var lastFocus = null;

  var el = {};
  function refs() {
    el.scrim = U.$('#panelScrim');
    el.panel = U.$('#panel');
    el.title = U.$('#panelTitle');
    el.steps = U.$('#panelSteps');
    el.body = U.$('#panelBody');
    el.foot = U.$('#panelFoot');
  }

  /* ── Shared builders (used by the drawer AND the /cart page) ─────────────── */

  Panel.itemsHtml = function (items) {
    return items.map(function (i) {
      var href = i.slug ? ('/product/' + encodeURIComponent(i.slug)) : ('/product/id/' + encodeURIComponent(i._id));
      var atMax = i.stock != null && i.quantity >= i.stock;
      return '' +
        '<div class="citem" data-line="' + U.escAttr(i.key) + '">' +
          '<img class="citem-img" src="' + U.escAttr(U.img(i.image)) + '" alt="" loading="lazy" />' +
          '<div class="citem-b">' +
            '<a class="citem-t" href="' + U.escAttr(href) + '" data-nav>' + U.esc(i.title) + '</a>' +
            (i.variant ? '<span class="field-msg muted">' + U.esc(i.variant) + '</span>' : '') +
            '<div class="citem-r">' +
              '<div class="qty">' +
                '<button data-cq="-1" data-key="' + U.escAttr(i.key) + '" aria-label="Decrease quantity"' +
                  (i.quantity <= 1 ? ' disabled' : '') + '>' + ICON('minus', 15) + '</button>' +
                '<output>' + i.quantity + '</output>' +
                '<button data-cq="1" data-key="' + U.escAttr(i.key) + '" aria-label="Increase quantity"' +
                  (atMax ? ' disabled' : '') + '>' + ICON('plus', 15) + '</button>' +
              '</div>' +
              '<span class="price">' + U.money(i.price * i.quantity) + '</span>' +
            '</div>' +
            (atMax && i.stock != null
              ? '<span class="field-msg warn">All ' + i.stock + ' in stock are in your cart</span>'
              : '') +
          '</div>' +
          '<button class="citem-x" data-crm="' + U.escAttr(i.key) + '" ' +
                  'aria-label="Remove ' + U.escAttr(i.title) + '">Remove</button>' +
        '</div>';
    }).join('');
  };

  /* Subtotal only. Shipping is free (computeShipping() returns 0 server-side)
     and there is no coupon system, so total === subtotal. Both lines are shown
     anyway so the shopper can see there is nothing added at the end. */
  Panel.sumHtml = function () {
    var sub = Cart.subtotal();
    return '' +
      '<div class="sumrow"><span>Subtotal</span><span class="v">' + U.money(sub) + '</span></div>' +
      '<div class="sumrow free"><span>Shipping</span><span class="v">Free</span></div>' +
      '<div class="sumtotal"><b>Total</b><span class="price">' + U.money(sub) + '</span></div>';
  };

  Panel.emptyHtml = function () {
    return Views.stateHtml({
      icon: 'bag',
      title: 'Your cart is empty',
      note: 'Pieces are single-run — when something catches your eye it is worth taking.',
      actions: [
        { label: 'Shop the archive', href: '/shop', primary: true },
        { label: 'See what just landed', href: '/shop?sort=new' }
      ]
    });
  };

  /* ── Drawer ──────────────────────────────────────────────────────────────── */

  Panel.isOpen = function () { return state.open; };

  Panel.open = function (step, opts) {
    refs();
    if (!el.panel) return;
    var o = opts || {};

    state.step = step || 'cart';
    if (o.order) state.order = o.order;

    // Going to checkout with nothing in the cart is a dead end — fall back.
    if (state.step === 'checkout' && !Cart.items().length) state.step = 'cart';

    if (!state.open) {
      lastFocus = document.activeElement;
      state.open = true;
      el.panel.classList.add('open');
      el.panel.setAttribute('aria-hidden', 'false');
      if (el.scrim) el.scrim.classList.add('open');
      U.lock();
      releaseTrap = U.trap(el.panel);
      // Re-render on any cart mutation, wherever it came from.
      unsubscribe = Cart.onChange(function () {
        if (state.step === 'cart') Panel.render();
      });
    }

    Panel.render();

    var first = el.panel.querySelector('.panel-body a, .panel-body button, .panel-body input');
    if (first) setTimeout(function () { first.focus(); }, 120);
  };

  Panel.close = function () {
    refs();
    if (!state.open || !el.panel) return;
    state.open = false;
    el.panel.classList.remove('open');
    el.panel.setAttribute('aria-hidden', 'true');
    if (el.scrim) el.scrim.classList.remove('open');
    U.unlock();
    if (releaseTrap) { releaseTrap(); releaseTrap = null; }
    if (unsubscribe) { unsubscribe(); unsubscribe = null; }
    if (Checkout && Checkout.destroy) Checkout.destroy();
    // Leaving the confirmation resets the drawer so the next open is a cart.
    if (state.step === 'done') { state.step = 'cart'; state.order = null; }
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) {} }
  };

  Panel.render = function () {
    refs();
    if (!el.body) return;

    if (state.step === 'done') { renderDone(); return; }
    if (state.step === 'checkout') { renderCheckout(); return; }
    renderCart();
  };

  function setHead(title, stepIndex) {
    if (el.title) el.title.textContent = title;
    if (el.steps) {
      el.steps.innerHTML = [0, 1, 2].map(function (i) {
        return '<i class="' + (i < stepIndex ? 'done' : (i === stepIndex ? 'on' : '')) + '"></i>';
      }).join('');
    }
  }

  function renderCart() {
    var items = Cart.items();
    setHead(items.length ? ('Cart · ' + Cart.count()) : 'Cart', 0);

    if (!items.length) {
      el.body.innerHTML = Panel.emptyHtml();
      el.foot.innerHTML = '';
      Shell.icons(el.body);
      return;
    }

    el.body.innerHTML =
      Panel.itemsHtml(items) +
      '<div class="row" style="justify-content:flex-end;margin-top:var(--s5)">' +
        '<button class="citem-x" data-cclear>Clear cart</button>' +
      '</div>';

    el.foot.innerHTML =
      Panel.sumHtml() +
      '<button class="btn btn-primary btn-lg btn-block" data-pstep="checkout" style="margin-top:var(--s4)">' +
        'Checkout' +
      '</button>' +
      '<div class="secnote">' + ICON('lock', 12) + 'Razorpay · UPI, cards, net banking</div>';

    Shell.icons(el.body);
    Shell.icons(el.foot);
  }

  function renderCheckout() {
    setHead('Checkout', 1);
    el.body.innerHTML = '';
    el.foot.innerHTML = '';
    Checkout.mount(el.body, {
      footEl: el.foot,
      onBack: function () { Panel.open('cart'); },
      onSuccess: function (order) { Panel.open('done', { order: order }); }
    });
  }

  function renderDone() {
    setHead('Order placed', 2);
    el.body.innerHTML = Checkout.doneHtml(state.order);
    el.foot.innerHTML =
      '<a class="btn btn-primary btn-lg btn-block" href="/shop" data-nav>Continue shopping</a>';
    Shell.icons(el.body);
  }

  /* ── Delegated interactions ──────────────────────────────────────────────────
     Bound once at the document level so the very same buttons work inside the
     drawer and on the /cart page without either surface knowing about the
     other. */
  U.on(document, 'click', '[data-cq]', function (e, btn) {
    e.preventDefault();
    var key = btn.getAttribute('data-key');
    var d = Number(btn.getAttribute('data-cq'));
    var before = Cart.qtyOf(key);
    Cart.bump(key, d);
    var after = Cart.qtyOf(key);
    if (after === before && d > 0) {
      U.toast({ title: 'No more stock available for this piece', bad: true });
    }
  });

  U.on(document, 'click', '[data-crm]', function (e, btn) {
    e.preventDefault();
    var key = btn.getAttribute('data-crm');
    var items = Cart.items();
    var line = null;
    items.some(function (i) { if (i.key === key) { line = i; return true; } return false; });
    Cart.remove(key);
    if (line) {
      // Removal is undoable: an accidental tap must not cost a sale.
      U.toast({
        title: 'Removed',
        note: line.title,
        action: 'Undo',
        onAction: function () {
          Cart.add({
            _id: line._id,
            title: line.title,
            image: [line.image],
            slug: line.slug,
            prices: { price: line.price },
            stock: line.stock == null ? line.quantity : line.stock
          }, line.quantity, line.variant);
          Shell.paintBadge(true);
        }
      });
    }
  });

  U.on(document, 'click', '[data-cclear]', function (e) {
    e.preventDefault();
    var snapshot = Cart.items();
    if (!snapshot.length) return;
    Cart.clear();
    U.toast({
      title: 'Cart cleared',
      action: 'Undo',
      onAction: function () {
        snapshot.forEach(function (line) {
          Cart.add({
            _id: line._id,
            title: line.title,
            image: [line.image],
            slug: line.slug,
            prices: { price: line.price },
            stock: line.stock == null ? line.quantity : line.stock
          }, line.quantity, line.variant);
        });
        Shell.paintBadge(true);
      }
    });
  });

  // Step buttons work from the drawer footer and from the cart page footer.
  U.on(document, 'click', '[data-pstep]', function (e, btn) {
    e.preventDefault();
    var step = btn.getAttribute('data-pstep');
    if (step === 'checkout' && !Cart.items().length) {
      U.toast({ title: 'Your cart is empty', bad: true });
      return;
    }
    // On the /cart page, advancing goes to the /checkout route so the step is
    // linkable and the Back button behaves; in the drawer it swaps in place.
    if (location.pathname.replace(/\/$/, '') === '/cart' && !state.open) {
      Router.go('/checkout');
      return;
    }
    Panel.open(step);
  });

  var closeBtn = null;
  function initClose() {
    refs();
    closeBtn = U.$('#panelClose');
    if (closeBtn) closeBtn.addEventListener('click', function () { Panel.close(); });
    if (el.scrim) el.scrim.addEventListener('click', function () { Panel.close(); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initClose);
  } else {
    initClose();
  }

  window.Panel = Panel;
})();
