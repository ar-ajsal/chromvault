/* ============================================================================
   CHROMORA — CART STORE
   ----------------------------------------------------------------------------
   Same localStorage key ('chromora_cart') and same item shape as the previous
   storefront, so a shopper mid-session keeps their cart across the redesign.

   The cart holds a DISPLAY price only. It is never the basis for what is
   charged: /orders/create-razorpay-order re-prices every line from the database.
   ========================================================================== */
(function () {
  'use strict';

  var KEY = 'chromora_cart';
  var subs = [];

  /* Line identity. A product with no chosen option keys on its id alone, so
     every existing call site that passes an id keeps working unchanged. When an
     option IS chosen, the same product can legitimately appear twice, so the
     option is folded into the line key. `_id` stays pure for the server. */
  function lineKey(id, variant) {
    return variant ? (String(id) + '::' + variant) : String(id);
  }

  function read() {
    try {
      var raw = JSON.parse(localStorage.getItem(KEY));
      if (!Array.isArray(raw)) return [];
      // Defensive: drop anything without an id, and clamp quantities. A corrupt
      // entry here would otherwise fail server-side pricing with a confusing
      // "product no longer available".
      return raw.filter(function (i) {
        return i && (i._id || i.id);
      }).map(function (i) {
        var id = String(i._id || i.id);
        var variant = typeof i.variant === 'string' ? i.variant : '';
        return {
          _id: id,
          key: lineKey(id, variant),
          variant: variant,
          title: U.text(i.title) || i.name || 'Product',
          image: typeof i.image === 'string' ? i.image : '',
          slug: i.slug || '',
          price: U.num(i.price, 0),
          quantity: Math.max(1, Math.min(99, Math.floor(U.num(i.quantity, 1)))),
          stock: i.stock == null ? null : U.num(i.stock, 0)
        };
      });
    } catch (e) {
      return [];
    }
  }

  function write(items) {
    try { localStorage.setItem(KEY, JSON.stringify(items)); }
    catch (e) { /* private mode / quota — cart stays in memory for this page */ }
    emit();
  }

  function emit() {
    var snap = Cart.items();
    subs.forEach(function (fn) { try { fn(snap); } catch (e) { console.error(e); } });
  }

  var Cart = {
    items: read,

    count: function () {
      return read().reduce(function (n, i) { return n + i.quantity; }, 0);
    },

    /* Subtotal shown in the UI. Matches the server's computeOrderPricing()
       exactly for the current rules: shipping is 0 and discount is 0, so
       total === subTotal. If the backend ever adds real shipping or coupons,
       the panel reads the server's numbers at the create-order step. */
    subtotal: function () {
      return read().reduce(function (n, i) { return n + (i.price * i.quantity); }, 0);
    },

    /* Lookups take a LINE key. For a product with no chosen option that is
       simply its id, which is what every card and grid already passes. */
    has: function (key) {
      return read().some(function (i) { return i.key === String(key); });
    },

    qtyOf: function (key) {
      var hit = null;
      read().some(function (i) { if (i.key === String(key)) { hit = i; return true; } return false; });
      return hit ? hit.quantity : 0;
    },

    /* Add from a product document. Respects real stock: never lets the cart
       exceed what exists, because the server would reject the order at pay time
       and the shopper would hit the failure after entering their address. */
    add: function (product, qty, variant) {
      var id = U.pid(product);
      if (!id) return { ok: false, reason: 'This item cannot be added right now.' };

      var stock = U.stock(product);
      if (stock <= 0) return { ok: false, reason: 'Sold out.' };

      var opt = typeof variant === 'string' ? variant.trim().slice(0, 60) : '';
      var key = lineKey(id, opt);
      var want = Math.max(1, Math.floor(U.num(qty, 1)));
      var items = read();
      var existing = null;
      items.some(function (i) { if (i.key === key) { existing = i; return true; } return false; });

      // Stock is per product, not per option, so every line of the same product
      // counts against the same pool.
      var have = items.reduce(function (n, i) {
        return i._id === id ? n + i.quantity : n;
      }, 0);
      if (have >= stock) {
        return { ok: false, reason: 'Only ' + stock + ' in stock — already in your cart.' };
      }

      var room = stock - have;
      var take = Math.min(room, want);
      var capped = take < want;

      if (existing) {
        existing.quantity = existing.quantity + take;
        existing.price = U.price(product);
        existing.stock = stock;
      } else {
        items.push({
          _id: id,
          key: key,
          variant: opt,
          title: U.text(product.title) || 'Product',
          image: U.images(product)[0] || '',
          slug: U.slug(product),
          price: U.price(product),
          quantity: take,
          stock: stock
        });
      }
      write(items);
      return { ok: true, capped: capped, stock: stock, quantity: take };
    },

    setQty: function (key, qty) {
      var items = read();
      var n = Math.floor(U.num(qty, 1));
      var out = [];
      items.forEach(function (i) {
        if (i.key !== String(key)) { out.push(i); return; }
        if (n <= 0) return; // dropping to zero removes the line
        var cap = i.stock == null ? 99 : Math.max(1, i.stock);
        i.quantity = Math.max(1, Math.min(cap, n));
        out.push(i);
      });
      write(out);
    },

    bump: function (key, delta) {
      Cart.setQty(key, Cart.qtyOf(key) + delta);
    },

    remove: function (key) {
      write(read().filter(function (i) { return i.key !== String(key); }));
    },

    clear: function () {
      try { localStorage.removeItem(KEY); } catch (e) {}
      emit();
    },

    /* Payload for the order endpoints. Shape is unchanged from the previous
       checkout, with the addition of the `variant` string the Order model
       already stores. The server resolves each _id and ignores the price we
       send — it re-prices every line from the database. */
    payload: function () {
      return read().map(function (i) {
        return {
          _id: i._id,
          name: i.title,
          title: i.title,
          image: i.image || '',
          slug: i.slug || '',
          variant: i.variant || '',
          quantity: i.quantity,
          price: i.price
        };
      });
    },

    onChange: function (fn) {
      subs.push(fn);
      return function () { subs = subs.filter(function (f) { return f !== fn; }); };
    }
  };

  // Keep multiple tabs consistent.
  window.addEventListener('storage', function (e) {
    if (e.key === KEY) emit();
  });

  window.Cart = Cart;
})();
