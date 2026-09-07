/* ============================================================================
   CHROMORA — STATIC DOCUMENTS
   ----------------------------------------------------------------------------
   /track /contact /shipping-policy /returns /privacy /terms /about

   The shipping, returns, privacy and contact copy here is the merchant's own
   published text, carried over verbatim from the live chromora.in pages so the
   migration does not quietly rewrite a policy the customer may have relied on.
   Anything I added is additive and factual: a short "what actually happens at
   checkout" note on the policy pages, stating only things that are true of this
   codebase (shipping is 0 server-side, Razorpay prepaid only, no COD route).

   /track is deliberately NOT a lookup form. There is no public order endpoint —
   GET /v1/orders/:id is protectAdmin — so a "Find shipment" button would be a
   button that cannot work. Instead it hands the shopper their order number on a
   plate and opens WhatsApp or email with it already written out.
   ========================================================================== */
(function () {
  'use strict';

  var Views = window.Views = window.Views || {};

  var CFG = window.CHROMORA_CONFIG || {};
  var C = CFG.CONTACT || {};

  /* ── Contact link helpers ────────────────────────────────────────────────── */

  function waHref(text) {
    if (!C.whatsapp) return '';
    return 'https://wa.me/' + C.whatsapp + (text ? ('?text=' + encodeURIComponent(text)) : '');
  }
  function mailHref(subject, body) {
    if (!C.email) return '';
    var q = [];
    if (subject) q.push('subject=' + encodeURIComponent(subject));
    if (body) q.push('body=' + encodeURIComponent(body));
    return 'mailto:' + C.email + (q.length ? ('?' + q.join('&')) : '');
  }
  function igHref() {
    return C.instagram ? ('https://instagram.com/' + C.instagram) : '';
  }

  /* Reusable "we are reachable" block. Every help document ends with a way to
     talk to a human, because a policy page that dead-ends is a support ticket
     that never gets raised — and an order that gets refunded instead.

     These are all external links with no data-nav, so shell.js's router
     interceptor leaves them alone and the OS opens WhatsApp or the mail app. */
  function helpBlock(subject) {
    var rows = [];
    if (C.whatsapp) {
      rows.push(['phone', 'WhatsApp', C.whatsappLabel || ('+' + C.whatsapp),
                 waHref(subject ? (subject + ' — ') : '')]);
    }
    if (C.instagram) rows.push(['spark', 'Instagram', '@' + C.instagram, igHref()]);
    if (C.email) rows.push(['mail', 'Email', C.email, mailHref(subject || 'Chromora')]);
    if (!rows.length) return '';

    return '' +
      '<div class="helpcard">' +
        '<div class="helpcard-h">' +
          '<span class="eyebrow">Talk to us</span>' +
          (C.replyWithin ? '<p>' + U.esc(C.replyWithin) + '.</p>' : '') +
        '</div>' +
        '<div class="helprows">' +
          rows.map(function (r) {
            return '<a class="helprow" href="' + U.escAttr(r[3]) + '" target="_blank" rel="noopener noreferrer">' +
                     '<span class="trust-ic" data-ic="' + r[0] + '" data-ic-size="16"></span>' +
                     '<span class="grow"><b>' + U.esc(r[1]) + '</b><span>' + U.esc(r[2]) + '</span></span>' +
                     '<span class="arw">' + ICON('arrow', 15) + '</span>' +
                   '</a>';
          }).join('') +
        '</div>' +
      '</div>';
  }

  function list(items) {
    return '<ul>' + items.map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ul>';
  }

  /* ── Documents ───────────────────────────────────────────────────────────── */

  var DOCS = {

    /* ---------------------------------------------------------------- track */
    track: {
      title: 'Track your order',
      desc: 'Find your Chromora order number and get a shipping update.',
      html: function () {
        var p = Router.params();
        var pre = p.order || p.id || '';
        return '' +
          '<h1>Track your order</h1>' +
          '<p class="lead" style="font-size:var(--t-sm);color:var(--ink-3);max-width:52ch">' +
            'Courier tracking is sent out by WhatsApp once your parcel is picked up. ' +
            'If it has not arrived yet, send us your order number and we will find it.' +
          '</p>' +

          '<div class="trackbox">' +
            '<div class="field">' +
              '<label for="trkId">Order number</label>' +
              '<input class="input" id="trkId" type="text" inputmode="latin" autocomplete="off" ' +
                'spellcheck="false" placeholder="From your confirmation screen" ' +
                'value="' + U.escAttr(pre) + '" />' +
              '<span class="field-msg muted" data-msg="trkId">' +
                'Shown on the confirmation screen right after payment.' +
              '</span>' +
            '</div>' +
            '<div class="row" style="gap:var(--s2);flex-wrap:wrap;margin-top:var(--s4)">' +
              (C.whatsapp
                ? '<button class="btn btn-primary" id="trkWa">Ask on WhatsApp</button>'
                : '') +
              (C.email
                ? '<button class="btn btn-ghost" id="trkMail">Email us</button>'
                : '') +
            '</div>' +
          '</div>' +

          '<h2>Where to find your order number</h2>' +
          list([
            'On the confirmation screen shown immediately after a successful payment — it is the <b>Order</b> line at the top of the receipt.',
            'In the Razorpay payment receipt sent to you by SMS or email, quoted as the payment reference.',
            'If you have neither, message us the phone number you checked out with and we will look it up.'
          ]) +

          '<h2>Shipping timeline</h2>' +
          list([
            'Orders are processed within 1–3 business days after confirmation.',
            'Delivery usually takes 4–9 business days depending on location.',
            'Tracking details are shared once the order is shipped.',
            'Delays can happen during holidays, sales, or courier disruption.'
          ]) +
          '<p style="margin-top:var(--s4)">' +
            'Full detail is on the ' +
            '<a class="dlink" href="/shipping-policy" data-nav>shipping policy</a> page.' +
          '</p>' +

          helpBlock('Order tracking');
      },
      wire: function () {
        function ref() {
          var v = (U.$('#trkId') && U.$('#trkId').value || '').trim();
          return v;
        }
        function message() {
          var id = ref();
          return id
            ? ('Hi Chromora, I would like a shipping update on order ' + id + '.')
            : 'Hi Chromora, I would like a shipping update on my order. ';
        }
        function need() {
          // Not a hard requirement — the shop can look an order up by phone —
          // so this nudges rather than blocks.
          if (ref()) return true;
          var m = U.$('[data-msg="trkId"]');
          if (m) {
            m.className = 'field-msg warn';
            m.textContent = 'Add your order number if you have it — it makes this much faster.';
          }
          return true;
        }
        var wa = U.$('#trkWa');
        if (wa) wa.addEventListener('click', function () {
          need();
          window.open(waHref(message()), '_blank', 'noopener');
        });
        var mail = U.$('#trkMail');
        if (mail) mail.addEventListener('click', function () {
          need();
          var id = ref();
          location.href = mailHref('Order tracking' + (id ? (' — ' + id) : ''), message());
        });
        var input = U.$('#trkId');
        if (input) input.addEventListener('input', function () {
          var m = U.$('[data-msg="trkId"]');
          if (m) {
            m.className = 'field-msg muted';
            m.textContent = 'Shown on the confirmation screen right after payment.';
          }
        });
      }
    },

    /* -------------------------------------------------------------- contact */
    contact: {
      title: 'Contact us',
      desc: 'WhatsApp, Instagram or email Chromora — usually answered within 24 hours.',
      html: function () {
        return '' +
          '<h1>Contact us</h1>' +
          '<p class="lead" style="font-size:var(--t-sm);color:var(--ink-3);max-width:52ch">' +
            'For orders, support, or collaborations. WhatsApp is the fastest.' +
          '</p>' +
          helpBlock('Chromora enquiry') +
          '<h2>Before you message</h2>' +
          list([
            'Chasing a parcel? Have your order number ready — see <a class="dlink" href="/track" data-nav>track your order</a>.',
            'Something arrived damaged or wrong? Message us within 48 hours of delivery with your unboxing video or photos, per the <a class="dlink" href="/returns" data-nav>return &amp; replacement policy</a>.',
            'Asking about stock? Pieces are bought in single runs, so if a product page says sold out it is genuinely gone rather than waiting in a warehouse.'
          ]);
      }
    },

    /* ------------------------------------------------------------- shipping */
    shipping: {
      title: 'Shipping policy',
      desc: 'Processing times, delivery estimates and shipping charges for Chromora orders in India.',
      html: function () {
        return '' +
          '<h1>Shipping policy</h1>' +
          list([
            'Orders are processed within 1–3 business days after confirmation.',
            'Delivery usually takes 4–9 business days depending on location.',
            'Free shipping is available on prepaid orders above ₹799.',
            'Orders below ₹799 may include a shipping fee.',
            'COD orders require a ₹160 advance confirmation payment to avoid fake orders and return losses.',
            'Remaining COD amount can be paid during delivery.',
            'Tracking details will be shared once the order is shipped.',
            'Delivery delays may occur during holidays, sales, or courier issues.'
          ]) +

          '<h2>What this website charges today</h2>' +
          '<p>' +
            'Checkout on this site is <b>prepaid only</b>, taken by Razorpay — there is no ' +
            'cash-on-delivery option, so the ₹160 advance above does not apply to an order placed here. ' +
            'No shipping fee is added at checkout either, at any order value: the total shown on the ' +
            'payment screen is the total charged, and it is calculated on our server from live ' +
            'product prices rather than from anything your browser sends.' +
          '</p>' +
          '<p>' +
            'If you would rather arrange cash on delivery, message us before ordering.' +
          '</p>' +

          '<h2>Tracking</h2>' +
          '<p>' +
            'Tracking is sent by WhatsApp once the parcel is picked up. ' +
            '<a class="dlink" href="/track" data-nav>Track your order</a> if it has not reached you.' +
          '</p>' +

          helpBlock('Shipping question');
      }
    },

    /* -------------------------------------------------------------- returns */
    returns: {
      title: 'Return & replacement policy',
      desc: 'Chromora replaces damaged or incorrect items reported within 48 hours with unboxing proof.',
      html: function () {
        return '' +
          '<h1>Return &amp; replacement policy</h1>' +
          '<p>' +
            'Due to hygiene and limited-stock reasons, we do not offer returns or refunds after delivery.' +
          '</p>' +
          '<p>However, replacements are available if:</p>' +
          list([
            'You receive a damaged item.',
            'You receive the wrong product.'
          ]) +
          '<p>To request a replacement:</p>' +
          list([
            'Contact us within 48 hours of delivery.',
            'Share clear unboxing video/photos as proof.'
          ]) +
          '<p>' +
            'Replacement requests without unboxing proof may not be accepted. ' +
            'Customised products are non-returnable and non-refundable. ' +
            'Chromora reserves the right to reject fraudulent claims.' +
          '</p>' +

          '<h2>Why we ask for an unboxing video</h2>' +
          '<p>' +
            'Everything here is bought in a single run, so a damaged piece usually cannot be ' +
            'replaced from stock — it has to be claimed against the courier. That claim needs ' +
            'the parcel on camera from sealed to open. Filming the unboxing takes a minute and ' +
            'is the difference between a replacement and a dead end.' +
          '</p>' +

          helpBlock('Replacement request');
      }
    },

    /* -------------------------------------------------------------- privacy */
    privacy: {
      title: 'Privacy policy',
      desc: 'What Chromora collects, what it is used for, and who it is shared with.',
      html: function () {
        var maps = !!CFG.MAPS_KEY;
        return '' +
          '<h1>Privacy policy</h1>' +
          '<p>We collect basic customer information such as:</p>' +
          list(['Name', 'Address', 'Phone number', 'Email address']) +
          '<p>This information is used only for:</p>' +
          list(['Order processing', 'Shipping', 'Customer support']) +
          '<p>' +
            'We do not sell or share your personal information with third parties except payment ' +
            'gateways and courier services required to complete your order. Payments are securely ' +
            'processed through trusted payment providers. By using this website, you agree to our ' +
            'policies and terms.' +
          '</p>' +

          '<h2>Specifically, on this website</h2>' +
          list([
            '<b>Razorpay</b> takes the payment. Card, UPI and bank details are entered inside Razorpay\'s own window and are never seen by, or stored on, this site.',
            '<b>Your courier</b> receives the name, phone number and delivery address on the parcel, and nothing else.',
            (maps
              ? '<b>Google Maps Places</b> powers the optional "find my address" field at checkout. If you type in that one field, those keystrokes go to Google to fetch suggestions. Leave it alone and type your address in the boxes below it, and nothing is sent to Google.'
              : '<b>No address autocomplete</b> runs at checkout — the address you type stays in your browser until you submit the order.'),
            '<b>Your own device</b> holds your cart (<code>chromora_cart</code>) and, if you complete an order, your delivery details (<code>chromora_details</code>) so you do not retype them next time. Both live in this browser\'s local storage, not on our servers. Clearing your browser data removes them.'
          ]) +

          '<h2>Your order record</h2>' +
          '<p>' +
            'A completed order is stored with the details above plus the items, the amount paid and ' +
            'the Razorpay payment reference — we need it to fulfil the order, to answer a support ' +
            'question about it later, and to keep our accounts. To ask what we hold about you, or to ' +
            'have it removed once any order is closed, message us on any channel below.' +
          '</p>' +

          helpBlock('Privacy request');
      }
    },

    /* ---------------------------------------------------------------- terms */
    terms: {
      title: 'Terms & conditions',
      desc: 'The terms you accept when ordering from Chromora.',
      html: function () {
        return '' +
          '<h1>Terms &amp; conditions</h1>' +
          '<p>' +
            'These terms cover buying from chromora.in. Placing an order means you accept them, ' +
            'along with the ' +
            '<a class="dlink" href="/shipping-policy" data-nav>shipping</a>, ' +
            '<a class="dlink" href="/returns" data-nav>return &amp; replacement</a> and ' +
            '<a class="dlink" href="/privacy" data-nav>privacy</a> policies, which form part of them.' +
          '</p>' +

          '<h2>Products and stock</h2>' +
          list([
            'Stock is bought in single runs. Listings show live stock, and a piece can sell out between you opening the page and reaching checkout.',
            'If an item goes out of stock before your payment is confirmed, the order is not created and you are not charged.',
            'Product photographs are of the actual stock. Screen colour and lighting still vary, so a finish may read slightly differently in person.'
          ]) +

          '<h2>Prices and payment</h2>' +
          list([
            'All prices are in Indian rupees and include applicable taxes.',
            'The amount you are charged is calculated on our server from the live price of each item at the moment you pay. A price shown in your browser is for display; if it has gone stale, the server price is the one that applies.',
            'Payment is prepaid and handled by Razorpay. An order is created only after Razorpay confirms and we verify the payment signature.',
            'If a payment succeeds but the order does not appear, keep the payment reference and send it to us — the payment can be traced and either fulfilled or refunded.'
          ]) +

          '<h2>Delivery</h2>' +
          list([
            'Shipping timelines are estimates given in good faith, not guarantees, and depend on the courier.',
            'The delivery address you enter is the address used. Please check it before paying — once a parcel is handed to the courier we cannot change it.',
            'Repeated refusal of delivery or an unreachable phone number may mean we decline future orders.'
          ]) +

          '<h2>Use of this website</h2>' +
          list([
            'Product images and site content belong to Chromora and may not be reused commercially without permission.',
            'Do not attempt to interfere with the site, its checkout, or other customers\' orders.',
            'We may refuse or cancel an order we believe to be fraudulent, and will refund any amount already taken on a cancelled order.'
          ]) +

          '<h2>Questions and disputes</h2>' +
          '<p>' +
            'Talk to us first — almost everything is fixable in a message. These terms are governed ' +
            'by Indian law.' +
          '</p>' +

          helpBlock('Question about terms');
      }
    },

    /* ---------------------------------------------------------------- about */
    about: {
      title: 'About',
      desc: 'Chromora is an independent archive of rare streetwear and chrome-finished accessories, shipping across India.',
      html: function () {
        return '' +
          '<h1>About Chromora</h1>' +
          '<p class="lead" style="font-size:var(--t-md);color:var(--ink-2);max-width:46ch">' +
            'An independent archive of rare streetwear and chrome-finished accessories.' +
          '</p>' +
          '<p>' +
            'Everything on this site is sourced in single runs — a handful of a piece, sometimes ' +
            'one. Nothing is restocked to order and nothing is drop-shipped, which is why a sold-out ' +
            'listing stays sold out and why the good things go quickly.' +
          '</p>' +
          '<p>' +
            'The selection leans toward pieces that read as objects: hardware finishes, weight in ' +
            'the hand, chrome that actually catches a light. If it looks ordinary in a photograph ' +
            'it does not get bought.' +
          '</p>' +

          '<h2>How ordering works</h2>' +
          list([
            'Prepaid checkout through Razorpay — UPI, cards, net banking and wallets.',
            'Free shipping across India, with tracking sent on WhatsApp once your parcel moves.',
            'Damaged or incorrect items are replaced within 48 hours of delivery with unboxing proof.'
          ]) +
          '<div class="row" style="gap:var(--s3);flex-wrap:wrap;margin-top:var(--s6)">' +
            '<a class="btn btn-primary btn-lg" href="/shop" data-nav>Shop the archive</a>' +
            '<a class="btn btn-ghost btn-lg" href="/shop?sort=new" data-nav>See what just landed</a>' +
          '</div>' +
          helpBlock('Hello');
      }
    }
  };

  /* Legacy/alternate slugs the router maps onto the same document. */
  DOCS['contact-us'] = DOCS.contact;

  /* ── Render ──────────────────────────────────────────────────────────────── */

  Views.doc = function (kind) {
    var doc = DOCS[kind];
    if (!doc) { Views.notFound(location.pathname); return; }

    Views.setMeta(doc.title, doc.desc);

    Views.mount(
      '<div class="wrap wrap-tight">' +
        '<nav class="crumb"><a href="/" data-nav>Home</a><span class="sep">/</span>' +
          '<span>' + U.esc(doc.title) + '</span></nav>' +
        '<article class="doc">' + doc.html() + '</article>' +
      '</div>'
    );

    if (doc.wire) doc.wire();
  };
})();
