/* ============================================================================
   CHROMVAULT — CHECKOUT
   ----------------------------------------------------------------------------
   Renders the customer-details form, validates it, and drives the EXISTING
   backend payment flow. It does not price anything and it does not create
   orders on its own:

     1. POST /orders/create-razorpay-order  { cart, currency }
            → the server prices the cart from the database and returns
              { id, amount, currency, key }.  No amount is ever sent up.
     2. Razorpay Checkout opens with that server-created order id.
     3. POST /orders/verify-payment  { razorpay_*, customer, deliveryAddress, cart }
            → the server verifies the HMAC signature, re-prices the cart with
              the same helper used in step 1, and persists the order.

   The cart is cleared in exactly one place: the success branch of step 3.

   Field rules mirror the backend's own validation (orderController.js) so the
   shopper is told about a problem before paying rather than after:
     name    ≥ 3 characters
     phone   /^[6-9]\d{9}$/         — 10 digits, Indian mobile series
     zip     /^\d{6}$/
     address street + city + district + state + zip all required
     email   optional, format-checked when present
   The backend also cross-checks the PIN against the selected state via
   api.postalpincode.in, so this form uses the same lookup to FILL state and
   district from the PIN. That turns a possible rejection into an autofill.
   ========================================================================== */
(function () {
  'use strict';

  var Checkout = {};
  var CFG = window.CHROMVAULT_CONFIG || {};

  var PHONE_RE = /^[6-9]\d{9}$/;
  var PIN_RE = /^\d{6}$/;
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  var SAVE_KEY = 'chromvault_details';

  /* The 28 states and 8 union territories, spelled as api.postalpincode.in and
     Google both return them, so an autofilled value matches a list entry
     exactly. Inlined rather than fetched: 36 strings are not worth a network
     round trip at the most abandonment-prone moment in the funnel. */
  var STATES = [
    'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam',
    'Bihar', 'Chandigarh', 'Chhattisgarh',
    'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa', 'Gujarat',
    'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 'Karnataka',
    'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
    'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab',
    'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
    'Uttarakhand', 'West Bengal'
  ];

  /* District names are NOT bundled. There are ~780 of them, they are revised by
     notification, and a stale hardcoded list would be worse than no list. Two
     real sources are used instead, in order:
       1. the PIN lookup, which returns the actual district for the PIN entered
          (and is what the backend itself checks against), and
       2. the public states-and-districts dataset, loaded lazily, for browsing.
     If neither is reachable the district field accepts typed text — the backend
     requires a non-empty district and cross-checks the STATE, not the district,
     so checkout still completes. */
  var districtData = null;      // { normalisedState: [district, …] }
  var districtLoad = null;

  var rzpLoad = null;
  var mapsLoad = null;

  var C = null;                 // mounted instance

  /* ── Small helpers ───────────────────────────────────────────────────────── */

  function norm(s) {
    return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  }

  function digits(s, max) {
    var d = String(s || '').replace(/\D+/g, '');
    return max ? d.slice(0, max) : d;
  }

  function loadScript(src, id) {
    return new Promise(function (resolve, reject) {
      var existing = id && document.getElementById(id);
      if (existing) {
        if (existing.getAttribute('data-loaded') === '1') { resolve(); return; }
        existing.addEventListener('load', function () { resolve(); });
        existing.addEventListener('error', function () { reject(new Error('Script failed: ' + src)); });
        return;
      }
      var s = document.createElement('script');
      if (id) s.id = id;
      s.src = src;
      s.async = true;
      s.onload = function () { s.setAttribute('data-loaded', '1'); resolve(); };
      s.onerror = function () {
        if (s.parentNode) s.parentNode.removeChild(s);
        reject(new Error('Script failed: ' + src));
      };
      document.head.appendChild(s);
    });
  }

  /* ── Saved details ────────────────────────────────────────────────────────
     A returning shopper should not retype their address. Stored on their own
     device only; nothing here is sent anywhere except with an order they
     submit themselves. */
  function loadSaved() {
    try {
      var raw = JSON.parse(localStorage.getItem(SAVE_KEY));
      return (raw && typeof raw === 'object') ? raw : {};
    } catch (e) { return {}; }
  }

  function saveDetails(f) {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        name: f.name, phone: f.phone, email: f.email,
        street: f.street, city: f.city, district: f.district,
        state: f.state, zip: f.zip
      }));
    } catch (e) { /* private mode — not worth surfacing */ }
  }

  /* ── Searchable select ────────────────────────────────────────────────────
     Text input + filtered listbox. A native <select> cannot be typed into and
     <datalist> behaves inconsistently on mobile; both matter for a list this
     long on a phone. Options are supplied by a function so the district combo
     can change its list when the state changes. */
  function combo(input, listEl, getOptions, onPick) {
    var open = false;
    var active = -1;
    var shown = [];

    function options() {
      try { return getOptions() || []; } catch (e) { return []; }
    }

    function filter(q) {
      var all = options();
      if (!q) return all.slice(0, 60);
      var n = norm(q);
      var starts = [], has = [];
      all.forEach(function (o) {
        var no = norm(o);
        if (no.indexOf(n) === 0) starts.push(o);
        else if (no.indexOf(n) >= 0) has.push(o);
      });
      return starts.concat(has).slice(0, 60);
    }

    function mark(label, q) {
      if (!q) return U.esc(label);
      var i = norm(label).indexOf(norm(q));
      if (i < 0) return U.esc(label);
      return U.esc(label.slice(0, i)) + '<mark>' + U.esc(label.slice(i, i + q.length)) +
             '</mark>' + U.esc(label.slice(i + q.length));
    }

    function render(q) {
      shown = filter(q);
      if (!shown.length) {
        listEl.innerHTML = options().length
          ? '<div class="combo-none">No match. You can type the name in full.</div>'
          : '<div class="combo-none">List unavailable — type the name in full.</div>';
        return;
      }
      listEl.innerHTML = shown.map(function (o, i) {
        return '<button type="button" class="combo-opt" role="option" data-i="' + i + '" ' +
               'aria-selected="' + (i === active ? 'true' : 'false') + '">' + mark(o, q) + '</button>';
      }).join('');
    }

    function show(q) {
      active = -1;
      render(q == null ? input.value.trim() : q);
      listEl.hidden = false;
      open = true;
      input.setAttribute('aria-expanded', 'true');
    }

    function hide() {
      listEl.hidden = true;
      open = false;
      active = -1;
      input.setAttribute('aria-expanded', 'false');
    }

    function highlight(i) {
      active = i;
      U.$$('.combo-opt', listEl).forEach(function (b, j) {
        b.setAttribute('aria-selected', j === i ? 'true' : 'false');
        if (j === i && b.scrollIntoView) b.scrollIntoView({ block: 'nearest' });
      });
    }

    function pick(value) {
      input.value = value;
      hide();
      if (onPick) onPick(value);
    }

    var onFocus = function () { show(''); };
    var onInput = function () { show(); if (onPick) onPick(null, true); };
    var onKey = function (e) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!open) { show(); return; }
        if (!shown.length) return;
        var next = e.key === 'ArrowDown'
          ? (active + 1) % shown.length
          : (active <= 0 ? shown.length - 1 : active - 1);
        highlight(next);
        return;
      }
      if (e.key === 'Enter') {
        if (open && active >= 0 && shown[active]) { e.preventDefault(); pick(shown[active]); }
        else if (open) { hide(); }
        return;
      }
      if (e.key === 'Escape' && open) { e.stopPropagation(); hide(); }
    };
    var onListClick = function (e) {
      var b = e.target.closest('.combo-opt');
      if (!b) return;
      e.preventDefault();
      var i = Number(b.getAttribute('data-i'));
      if (shown[i] != null) pick(shown[i]);
    };
    // A click inside the list must not blur-close it before the click lands.
    var onListDown = function (e) { e.preventDefault(); };
    var onDocDown = function (e) {
      if (!open) return;
      if (e.target === input || listEl.contains(e.target)) return;
      hide();
      // Snap a typed value onto its exact list entry when it matches.
      var exact = null;
      options().some(function (o) { if (norm(o) === norm(input.value)) { exact = o; return true; } return false; });
      if (exact) { input.value = exact; if (onPick) onPick(exact); }
      else if (onPick) onPick(input.value.trim() || null);
    };

    input.addEventListener('focus', onFocus);
    input.addEventListener('input', onInput);
    input.addEventListener('keydown', onKey);
    listEl.addEventListener('click', onListClick);
    listEl.addEventListener('pointerdown', onListDown);
    document.addEventListener('pointerdown', onDocDown, true);

    return {
      set: function (v) { input.value = v || ''; hide(); },
      close: hide,
      isKnown: function () {
        var v = norm(input.value);
        if (!v) return false;
        return options().some(function (o) { return norm(o) === v; });
      },
      hasList: function () { return options().length > 0; },
      destroy: function () {
        input.removeEventListener('focus', onFocus);
        input.removeEventListener('input', onInput);
        input.removeEventListener('keydown', onKey);
        listEl.removeEventListener('click', onListClick);
        listEl.removeEventListener('pointerdown', onListDown);
        document.removeEventListener('pointerdown', onDocDown, true);
      }
    };
  }

  /* ── District dataset (lazy, optional) ───────────────────────────────────── */

  function loadDistricts() {
    if (districtData) return Promise.resolve(districtData);
    if (districtLoad) return districtLoad;
    if (!CFG.STATES_URL) return Promise.reject(new Error('no source'));

    districtLoad = fetch(CFG.STATES_URL, { credentials: 'omit' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (data) {
        var list = (data && data.states) || (Array.isArray(data) ? data : []);
        var map = Object.create(null);
        list.forEach(function (s) {
          if (!s || !s.state || !Array.isArray(s.districts)) return;
          map[norm(s.state)] = s.districts.filter(function (d) { return typeof d === 'string'; });
        });
        districtData = map;
        return map;
      })
      .catch(function (err) {
        districtLoad = null;
        throw err;
      });

    return districtLoad;
  }

  function districtsFor(stateName) {
    if (!districtData || !stateName) return [];
    return districtData[norm(stateName)] || [];
  }

  /* ── Markup ──────────────────────────────────────────────────────────────── */

  function field(o) {
    return '' +
      '<div class="field"' + (o.wrapId ? ' id="' + o.wrapId + '"' : '') + (o.hidden ? ' hidden' : '') + '>' +
        '<label for="' + o.id + '">' + U.esc(o.label) +
          (o.optional ? ' <span class="opt">optional</span>' : '') + '</label>' +
        (o.combo ? '<div class="combo">' : '') +
        (o.textarea
          ? '<textarea class="input" id="' + o.id + '" name="' + o.id + '" rows="3"' +
            (o.autocomplete ? ' autocomplete="' + o.autocomplete + '"' : '') +
            ' placeholder="' + U.escAttr(o.placeholder || '') + '"></textarea>'
          : '<input class="input" id="' + o.id + '" name="' + o.id + '"' +
            ' type="' + (o.type || 'text') + '"' +
            (o.inputmode ? ' inputmode="' + o.inputmode + '"' : '') +
            (o.maxlength ? ' maxlength="' + o.maxlength + '"' : '') +
            ' autocomplete="' + (o.autocomplete || 'off') + '"' +
            (o.combo ? ' role="combobox" aria-expanded="false" aria-autocomplete="list"' +
                       ' aria-controls="' + o.id + 'List"' : '') +
            ' placeholder="' + U.escAttr(o.placeholder || '') + '" />') +
        (o.combo
          ? '<div class="combo-list" id="' + o.id + 'List" role="listbox" ' +
            'aria-label="' + U.escAttr(o.label) + ' suggestions" hidden></div></div>'
          : '') +
        '<span class="field-msg' + (o.hint ? ' muted' : '') + '" data-msg="' + o.id + '" ' +
          (o.live ? 'aria-live="polite" ' : '') + '>' + U.esc(o.hint || '') + '</span>' +
      '</div>';
  }

  function formHtml() {
    return '' +
      '<form class="cform" id="coForm" novalidate autocomplete="on">' +

        field({
          id: 'coFind', wrapId: 'coFindWrap', hidden: true, optional: true,
          label: 'Find your address',
          placeholder: 'Start typing your street or landmark',
          hint: 'Suggestions from Google. Everything stays editable below.'
        }) +

        '<div class="cform-legend">Contact</div>' +

        field({
          id: 'coName', label: 'Full name', autocomplete: 'name',
          placeholder: 'Name for the parcel'
        }) +

        '<div class="form-row two">' +
          field({
            id: 'coPhone', label: 'Mobile number', type: 'tel', inputmode: 'numeric',
            maxlength: 10, autocomplete: 'tel-national', placeholder: '10 digits',
            hint: 'For delivery updates', live: true
          }) +
          field({
            id: 'coEmail', label: 'Email', type: 'email', optional: true,
            autocomplete: 'email', placeholder: 'you@example.com',
            hint: 'For the order receipt'
          }) +
        '</div>' +

        '<div class="cform-legend">Delivery address</div>' +

        field({
          id: 'coStreet', label: 'Address', textarea: true, autocomplete: 'street-address',
          placeholder: 'Flat / house no., building, street, area, landmark',
          hint: 'Include anything a courier needs to find you'
        }) +

        '<div class="form-row two">' +
          field({
            id: 'coZip', label: 'PIN code', type: 'text', inputmode: 'numeric',
            maxlength: 6, autocomplete: 'postal-code', placeholder: '6 digits',
            hint: 'We will fill in your state and district', live: true
          }) +
          field({
            id: 'coCity', label: 'City / town', autocomplete: 'address-level2',
            placeholder: 'City or town'
          }) +
        '</div>' +

        '<div class="form-row two">' +
          field({
            id: 'coState', label: 'State', combo: true, autocomplete: 'off',
            placeholder: 'Type to search'
          }) +
          field({
            id: 'coDistrict', label: 'District', combo: true, autocomplete: 'off',
            placeholder: 'Type to search'
          }) +
        '</div>' +

      '</form>' +

      '<div id="coNotice"></div>' +

      '<div class="paynote" style="margin-top:var(--s4)">' +
        ICON('lock', 18) +
        '<span>Payment is taken by <b>Razorpay</b> — UPI, cards, net banking and wallets. ' +
        'Card details are never seen by this site, and the amount charged is calculated ' +
        'on our server from live prices.</span>' +
      '</div>';
  }

  function footHtml(compact) {
    return '' +
      (compact ? Panel.sumHtml() : '') +
      '<button class="btn btn-primary btn-lg btn-block" id="coPay"' +
        (compact ? ' style="margin-top:var(--s4)"' : '') + '>' +
        'Pay ' + U.money(Cart.subtotal()) + ' securely' +
      '</button>' +
      '<button class="btn btn-ghost btn-block" id="coBack" style="margin-top:var(--s2)">' +
        'Back to cart' +
      '</button>' +
      '<div class="secnote">' + ICON('lock', 12) + '256-bit encrypted · Razorpay</div>';
  }

  /* ── Mount ───────────────────────────────────────────────────────────────── */

  Checkout.mount = function (host, opts) {
    if (!host) return;
    Checkout.destroy();

    var o = opts || {};
    var compact = !!o.footEl;

    host.innerHTML = formHtml();
    var foot = o.footEl || host;
    if (o.footEl) o.footEl.innerHTML = footHtml(true);
    else host.insertAdjacentHTML('beforeend', '<div class="co-foot">' + footHtml(false) + '</div>');

    Shell.icons(host);
    if (o.footEl) Shell.icons(o.footEl);

    C = {
      host: host, foot: foot, opts: o, compact: compact,
      busy: false, place: null, pending: null, combos: {}, offs: []
    };

    wire();
    return C;
  };

  Checkout.destroy = function () {
    if (!C) return;
    Object.keys(C.combos).forEach(function (k) {
      if (C.combos[k] && C.combos[k].destroy) C.combos[k].destroy();
    });
    C.offs.forEach(function (fn) { try { fn(); } catch (e) {} });
    C = null;
  };

  function $f(id) { return U.$('#' + id); }
  function msgEl(id) { return U.$('[data-msg="' + id + '"]'); }

  function say(id, text, level) {
    var m = msgEl(id);
    if (!m) return;
    m.className = 'field-msg' + (level ? ' ' + level : '');
    m.textContent = text || '';
  }

  function mark(id, ok) {
    var i = $f(id);
    if (!i) return;
    i.classList.toggle('is-bad', ok === false);
    if (ok === true) i.setAttribute('data-valid', 'true');
    else i.removeAttribute('data-valid');
  }

  /* ── Wiring ──────────────────────────────────────────────────────────────── */

  function wire() {
    var saved = loadSaved();

    // Prefill from the last completed checkout on this device.
    [['coName', 'name'], ['coPhone', 'phone'], ['coEmail', 'email'],
     ['coStreet', 'street'], ['coZip', 'zip'], ['coCity', 'city']].forEach(function (pair) {
      var i = $f(pair[0]);
      if (i && saved[pair[1]]) i.value = saved[pair[1]];
    });

    /* State combo. Changing it always clears the district — a district from the
       previous state would be silently wrong and the backend would reject it. */
    var stateInput = $f('coState');
    var districtInput = $f('coDistrict');

    C.combos.state = combo(
      stateInput,
      U.$('#coStateList'),
      function () { return STATES; },
      function (value, typing) {
        if (typing) { mark('coState', null); say('coState', ''); return; }
        onStateChosen(value);
      }
    );

    C.combos.district = combo(
      districtInput,
      U.$('#coDistrictList'),
      function () { return districtsFor(stateInput.value); },
      function (value, typing) {
        if (typing) { mark('coDistrict', null); say('coDistrict', ''); return; }
        validateDistrict();
      }
    );

    if (saved.state) { C.combos.state.set(saved.state); onStateChosen(saved.state, saved.district); }

    // Name
    on($f('coName'), 'blur', validateName);
    on($f('coName'), 'input', function () { if ($f('coName').classList.contains('is-bad')) validateName(); });

    // Phone — numeric only, live length feedback.
    var phone = $f('coPhone');
    on(phone, 'input', function () {
      var d = digits(phone.value, 10);
      if (phone.value !== d) phone.value = d;
      if (d.length === 10) validatePhone();
      else if (d.length === 0) { mark('coPhone', null); say('coPhone', 'For delivery updates', 'muted'); }
      else { mark('coPhone', null); say('coPhone', (10 - d.length) + ' more digit' + (d.length === 9 ? '' : 's'), 'muted'); }
    });
    on(phone, 'blur', validatePhone);

    on($f('coEmail'), 'blur', validateEmail);
    on($f('coStreet'), 'blur', validateStreet);
    on($f('coCity'), 'blur', validateCity);

    // PIN — numeric only; a complete PIN triggers the postal lookup.
    var zip = $f('coZip');
    on(zip, 'input', function () {
      var d = digits(zip.value, 6);
      if (zip.value !== d) zip.value = d;
      if (d.length === 6) lookupPin(d);
      else {
        mark('coZip', null);
        say('coZip', d.length ? (6 - d.length) + ' more digit' + (d.length === 5 ? '' : 's') : 'We will fill in your state and district', 'muted');
      }
    });
    on(zip, 'blur', function () { if (zip.value.length && zip.value.length < 6) validateZip(); });
    if (saved.zip && PIN_RE.test(saved.zip)) mark('coZip', true);

    // Pay / back
    var pay = $f('coPay');
    if (pay) on(pay, 'click', function (e) { e.preventDefault(); submit(); });

    var back = $f('coBack');
    if (back) on(back, 'click', function (e) {
      e.preventDefault();
      if (C.busy) return;
      if (C.opts.onBack) C.opts.onBack();
      else Router.go('/cart');
    });

    // Enter anywhere in the form means "pay", except inside the address box.
    var form = $f('coForm');
    if (form) on(form, 'submit', function (e) { e.preventDefault(); submit(); });
    if (form) on(form, 'keydown', function (e) {
      if (e.key !== 'Enter') return;
      if (e.target && e.target.tagName === 'TEXTAREA') return;
      if (e.target && e.target.getAttribute('role') === 'combobox') return;
      e.preventDefault();
      submit();
    });

    // Optional extras, both non-blocking.
    loadDistricts().catch(function () { /* free-text district; see note above */ });
    initMaps();
  }

  function on(node, type, fn) {
    if (!node) return;
    node.addEventListener(type, fn);
    if (C) C.offs.push(function () { node.removeEventListener(type, fn); });
  }

  function onStateChosen(value, presetDistrict) {
    var stateInput = $f('coState');
    var districtInput = $f('coDistrict');
    if (!stateInput || !districtInput) return;

    if (!value) { mark('coState', false); say('coState', 'Choose your state', 'bad'); return; }

    var known = C.combos.state.isKnown();
    mark('coState', known);
    say('coState', known ? '' : 'Not an Indian state or union territory', known ? '' : 'bad');

    // The district belongs to the state. Reset unless we are restoring a pair.
    if (presetDistrict) {
      C.combos.district.set(presetDistrict);
      validateDistrict();
    } else if (districtInput.value) {
      var stillValid = districtsFor(value).some(function (d) { return norm(d) === norm(districtInput.value); });
      if (!stillValid) {
        C.combos.district.set('');
        mark('coDistrict', null);
        say('coDistrict', 'Choose a district in ' + value, 'muted');
      }
    }

    // The dataset may still be in flight; refresh the hint once it lands.
    loadDistricts().then(function () {
      if (!C) return;
      var list = districtsFor(stateInput.value);
      if (list.length && !districtInput.value) {
        say('coDistrict', list.length + ' districts', 'muted');
      }
    }).catch(function () {});
  }

  /* PIN lookup. Advisory for the shopper and load-bearing for conversion: the
     backend rejects a PIN whose state does not match, so filling both from the
     PIN response removes the most common cause of a failed submit. */
  var pinSeq = 0;
  function lookupPin(pin) {
    if (!PIN_RE.test(pin)) return;
    var seq = ++pinSeq;
    mark('coZip', null);
    say('coZip', 'Checking PIN…', 'muted');

    if (!CFG.PINCODE_URL) { mark('coZip', true); say('coZip', ''); return; }

    fetch(CFG.PINCODE_URL + encodeURIComponent(pin), { credentials: 'omit' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!C || seq !== pinSeq) return;
        var rec = Array.isArray(data) ? data[0] : null;
        if (!rec || rec.Status !== 'Success' || !rec.PostOffice || !rec.PostOffice.length) {
          mark('coZip', false);
          say('coZip', 'No Indian PIN code matches ' + pin, 'bad');
          return;
        }
        var po = rec.PostOffice[0];
        mark('coZip', true);

        var stateInput = $f('coState');
        var districtInput = $f('coDistrict');
        var cityInput = $f('coCity');
        var filled = [];

        var stateMatch = null;
        STATES.some(function (s) { if (norm(s) === norm(po.State)) { stateMatch = s; return true; } return false; });
        var stateName = stateMatch || po.State;

        if (stateName && norm(stateInput.value) !== norm(stateName)) {
          C.combos.state.set(stateName);
          mark('coState', true);
          say('coState', '');
          filled.push('state');
        }
        if (po.District && norm(districtInput.value) !== norm(po.District)) {
          C.combos.district.set(po.District);
          mark('coDistrict', true);
          say('coDistrict', '');
          filled.push('district');
        }
        if (cityInput && !cityInput.value.trim()) {
          // Block/taluk is the nearest thing the postal API gives to a town.
          cityInput.value = po.Block && po.Block !== 'NA' ? po.Block : (po.District || '');
          if (cityInput.value) { mark('coCity', true); filled.push('city'); }
        }

        say('coZip', filled.length
          ? (po.District ? po.District + ', ' + stateName + ' — filled in below' : 'PIN verified')
          : (po.District ? po.District + ', ' + stateName : 'PIN verified'), 'ok');
      })
      .catch(function () {
        if (!C || seq !== pinSeq) return;
        // The lookup is a convenience. A 6-digit PIN is still acceptable — the
        // backend runs the same check and has the final say.
        mark('coZip', true);
        say('coZip', 'Could not verify the PIN right now — check your state and district below', 'warn');
      });
  }

  /* ── Google Places (optional) ─────────────────────────────────────────────
     Layered on top of the manual form, never in place of it. The field only
     appears once the library is actually usable, so a missing key, a blocked
     script or a revoked API all end in the same harmless state: the shopper
     types their address, exactly as before. Nothing about checkout depends on
     this succeeding. */
  function initMaps() {
    var key = CFG.MAPS_KEY;
    if (!key) return;
    if (!('IntersectionObserver' in window)) return;

    loadMaps(key).then(function () {
      if (!C) return;
      var places = window.google && window.google.maps && window.google.maps.places;
      if (!places || !places.Autocomplete) return;

      var input = $f('coFind');
      var wrap = U.$('#coFindWrap');
      if (!input || !wrap) return;

      var ac = new places.Autocomplete(input, {
        componentRestrictions: { country: 'in' },
        fields: ['address_components', 'formatted_address', 'geometry', 'place_id', 'name'],
        types: ['geocode']
      });

      ac.addListener('place_changed', function () {
        if (!C) return;
        var place = ac.getPlace();
        if (!place || !place.address_components) return;
        applyPlace(place);
      });

      // Enter in the suggestion box must not submit the checkout.
      on(input, 'keydown', function (e) { if (e.key === 'Enter') e.preventDefault(); });

      wrap.hidden = false;
    }).catch(function () {
      /* Silent by design: the shopper never asked for this field. */
    });
  }

  function loadMaps(key) {
    if (window.google && window.google.maps && window.google.maps.places) return Promise.resolve();
    if (mapsLoad) return mapsLoad;

    mapsLoad = new Promise(function (resolve, reject) {
      var cb = '__chromvaultMapsReady';
      window[cb] = function () { resolve(); };
      var src = 'https://maps.googleapis.com/maps/api/js' +
        '?key=' + encodeURIComponent(key) +
        '&libraries=places&language=en&region=IN&loading=async&callback=' + cb;
      loadScript(src, 'google-maps-sdk').catch(reject);
      // Never leave the form waiting on a third party.
      setTimeout(function () { reject(new Error('Maps timed out')); }, 8000);
    }).catch(function (e) { mapsLoad = null; throw e; });

    return mapsLoad;
  }

  function applyPlace(place) {
    var part = Object.create(null);
    (place.address_components || []).forEach(function (c) {
      (c.types || []).forEach(function (t) { if (!part[t]) part[t] = c.long_name; });
    });

    var street = [
      part.premise, part.street_number, part.route,
      part.sublocality_level_2, part.sublocality_level_1 || part.sublocality,
      part.neighborhood
    ].filter(Boolean).filter(function (v, i, a) { return a.indexOf(v) === i; }).join(', ');

    var city = part.locality || part.postal_town || part.administrative_area_level_3 ||
               part.administrative_area_level_2 || '';
    var district = part.administrative_area_level_3 || part.administrative_area_level_2 || '';
    var state = part.administrative_area_level_1 || '';
    var zip = digits(part.postal_code, 6);

    var streetEl = $f('coStreet');
    if (streetEl && street) {
      // Never overwrite something the shopper typed; prepend instead.
      var typed = streetEl.value.trim();
      streetEl.value = typed && norm(typed).indexOf(norm(street)) < 0 ? (typed + ', ' + street) : street;
      validateStreet();
    }

    var cityEl = $f('coCity');
    if (cityEl && city) { cityEl.value = city; validateCity(); }

    if (state) {
      var m = null;
      STATES.some(function (s) { if (norm(s) === norm(state)) { m = s; return true; } return false; });
      C.combos.state.set(m || state);
      onStateChosen(m || state, district || undefined);
    }

    var zipEl = $f('coZip');
    if (zipEl && PIN_RE.test(zip)) { zipEl.value = zip; lookupPin(zip); }

    // Kept only when Google actually supplied them; the shopper's own text
    // remains the address of record.
    C.place = {
      placeId: place.place_id || '',
      lat: place.geometry && place.geometry.location ? place.geometry.location.lat() : null,
      lng: place.geometry && place.geometry.location ? place.geometry.location.lng() : null,
      formatted: place.formatted_address || ''
    };

    var find = $f('coFind');
    if (find) find.value = '';
    U.toast({ title: 'Address filled in', note: 'Check it over and edit anything that is off.' });
  }

  /* ── Validation ──────────────────────────────────────────────────────────── */

  function validateName() {
    var v = ($f('coName').value || '').trim().replace(/\s+/g, ' ');
    $f('coName').value = v;
    if (v.length < 3) {
      mark('coName', false);
      say('coName', v ? 'Please enter your full name (at least 3 characters)' : 'Your name is required', 'bad');
      return false;
    }
    mark('coName', true); say('coName', '');
    return true;
  }

  function validatePhone() {
    var v = digits($f('coPhone').value, 10);
    $f('coPhone').value = v;
    if (!v) { mark('coPhone', false); say('coPhone', 'A mobile number is required for delivery', 'bad'); return false; }
    if (v.length !== 10) { mark('coPhone', false); say('coPhone', 'Enter all 10 digits', 'bad'); return false; }
    if (!PHONE_RE.test(v)) {
      mark('coPhone', false);
      say('coPhone', 'Indian mobile numbers start with 6, 7, 8 or 9', 'bad');
      return false;
    }
    mark('coPhone', true); say('coPhone', '');
    return true;
  }

  function validateEmail() {
    var v = ($f('coEmail').value || '').trim();
    $f('coEmail').value = v;
    if (!v) { mark('coEmail', null); say('coEmail', 'For the order receipt', 'muted'); return true; }
    if (!EMAIL_RE.test(v)) { mark('coEmail', false); say('coEmail', 'Check this email address', 'bad'); return false; }
    mark('coEmail', true); say('coEmail', '');
    return true;
  }

  /* Address text is deliberately permissive. Real Indian addresses carry flat
     numbers, block letters, slashes, hyphens, "c/o", landmarks and commas —
     a restrictive pattern here would reject valid addresses, so only the
     minimum is enforced: enough characters to be a real address. */
  function validateStreet() {
    var v = ($f('coStreet').value || '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
    $f('coStreet').value = v;
    if (v.length < 10) {
      mark('coStreet', false);
      say('coStreet', v ? 'Please add a little more detail — house or flat number and street' : 'Your address is required', 'bad');
      return false;
    }
    if (v.length > 500) {
      mark('coStreet', false);
      say('coStreet', 'That is longer than a courier label allows (500 characters max)', 'bad');
      return false;
    }
    mark('coStreet', true); say('coStreet', '');
    return true;
  }

  function validateCity() {
    var v = ($f('coCity').value || '').trim().replace(/\s+/g, ' ');
    $f('coCity').value = v;
    if (v.length < 2) {
      mark('coCity', false);
      say('coCity', v ? 'Check your city or town' : 'City or town is required', 'bad');
      return false;
    }
    mark('coCity', true); say('coCity', '');
    return true;
  }

  function validateZip() {
    var v = digits($f('coZip').value, 6);
    $f('coZip').value = v;
    if (!v) { mark('coZip', false); say('coZip', 'A 6-digit PIN code is required', 'bad'); return false; }
    if (!PIN_RE.test(v)) { mark('coZip', false); say('coZip', 'A PIN code is exactly 6 digits', 'bad'); return false; }
    return true;
  }

  function validateState() {
    var v = ($f('coState').value || '').trim();
    if (!v) { mark('coState', false); say('coState', 'Choose your state', 'bad'); return false; }
    if (!C.combos.state.isKnown()) {
      mark('coState', false);
      say('coState', 'Pick your state from the list', 'bad');
      return false;
    }
    mark('coState', true); say('coState', '');
    return true;
  }

  function validateDistrict() {
    var v = ($f('coDistrict').value || '').trim().replace(/\s+/g, ' ');
    $f('coDistrict').value = v;
    if (!v) { mark('coDistrict', false); say('coDistrict', 'Choose your district', 'bad'); return false; }

    var list = districtsFor($f('coState').value);
    if (list.length && !C.combos.district.isKnown()) {
      mark('coDistrict', false);
      say('coDistrict', 'Pick a district in ' + $f('coState').value, 'bad');
      return false;
    }
    if (!list.length && v.length < 3) {
      mark('coDistrict', false);
      say('coDistrict', 'Enter your district in full', 'bad');
      return false;
    }
    mark('coDistrict', true); say('coDistrict', '');
    return true;
  }

  /* Order matters: the first failure is what gets focused, so it runs top to
     bottom in the same order the fields appear. */
  function validateAll() {
    var checks = [
      ['coName', validateName], ['coPhone', validatePhone], ['coEmail', validateEmail],
      ['coStreet', validateStreet], ['coZip', validateZip], ['coCity', validateCity],
      ['coState', validateState], ['coDistrict', validateDistrict]
    ];
    var firstBad = null;
    checks.forEach(function (c) {
      var ok = c[1]();
      if (!ok && !firstBad) firstBad = c[0];
    });
    return firstBad;
  }

  function values() {
    return {
      name: ($f('coName').value || '').trim(),
      phone: digits($f('coPhone').value, 10),
      email: ($f('coEmail').value || '').trim(),
      street: ($f('coStreet').value || '').trim(),
      city: ($f('coCity').value || '').trim(),
      district: ($f('coDistrict').value || '').trim(),
      state: ($f('coState').value || '').trim(),
      zip: digits($f('coZip').value, 6)
    };
  }

  /* ── Notices ─────────────────────────────────────────────────────────────── */

  function notice(o) {
    var box = U.$('#coNotice');
    if (!box) return;
    if (!o) { box.innerHTML = ''; return; }
    box.innerHTML =
      '<div class="paynote ' + (o.level || 'warn') + '" style="margin-top:var(--s4)">' +
        ICON(o.icon || 'warn', 18) +
        '<span class="paynote-b">' +
          (o.title ? '<b>' + U.esc(o.title) + '</b>' : '') +
          '<span>' + U.esc(o.text || '') + '</span>' +
          (o.action ? '<button class="btn btn-ghost" id="coNoticeAct">' + U.esc(o.action) + '</button>' : '') +
        '</span>' +
      '</div>';
    if (o.action && o.onAction) {
      var b = U.$('#coNoticeAct');
      if (b) b.addEventListener('click', function (e) { e.preventDefault(); o.onAction(); });
    }
    box.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function busy(state, label) {
    if (!C) return;
    C.busy = state;
    var pay = $f('coPay');
    var back = $f('coBack');
    if (pay) {
      pay.disabled = state;
      pay.classList.toggle('is-busy', state);
      pay.setAttribute('aria-busy', state ? 'true' : 'false');
      if (!state) pay.textContent = 'Pay ' + U.money(Cart.subtotal()) + ' securely';
      else if (label) pay.setAttribute('aria-label', label);
    }
    if (back) back.disabled = state;
    U.$$('#coForm .input').forEach(function (i) { i.disabled = state; });
  }

  /* ── Submit ──────────────────────────────────────────────────────────────── */

  function submit() {
    if (!C || C.busy) return;                       // duplicate-submit guard

    var items = Cart.payload();
    if (!items.length) {
      notice({ level: 'bad', icon: 'bag', title: 'Your cart is empty', text: 'Add something before paying.' });
      return;
    }

    var firstBad = validateAll();
    if (firstBad) {
      var el = $f(firstBad);
      if (el) { el.focus(); el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
      notice({ level: 'bad', title: 'Check the highlighted field', text: 'We need this to get your parcel to you.' });
      return;
    }

    notice(null);
    var f = values();
    busy(true, 'Preparing payment');

    // Step 1 — the server prices the cart and creates the Razorpay order.
    API.createOrder(items)
      .then(function (order) {
        if (!C) return null;
        if (!order || (!order.id && !order.order_id)) {
          throw new Error('The payment gateway did not return an order. Please try again.');
        }
        if (window.Razorpay) return order;
        return loadScript(CFG.RAZORPAY_SDK, 'razorpay-sdk')
          .catch(function () {
            throw new Error('Could not reach the payment gateway. Check your connection and try again.');
          })
          .then(function () {
            if (!window.Razorpay) throw new Error('The payment gateway failed to start. Please try again.');
            return order;
          });
      })
      .then(function (order) {
        if (!C || !order) return;
        openRazorpay(order, items, f);
      })
      .catch(function (err) {
        if (!C) return;
        busy(false);
        notice({
          level: 'bad',
          title: 'Payment could not be started',
          text: (err && err.message) || 'Something went wrong. Please try again.',
          action: 'Try again',
          onAction: submit
        });
      });
  }

  function openRazorpay(order, items, f) {
    var n = Cart.count();
    var rzp = new window.Razorpay({
      key: order.key || 'rzp_test_TaKxdzjE7H8ign',
      amount: order.amount,               // paise, from the server
      currency: order.currency || 'INR',
      order_id: order.order_id || order.id, // server-created order ID
      name: 'Chromvault',
      description: n + (n === 1 ? ' piece' : ' pieces'),
      image: '/icon-192x192.png',
      prefill: { name: f.name, contact: f.phone, email: f.email || '' },
      notes: { pin: f.zip, city: f.city },
      theme: { color: '#0A0A0B' },
      modal: {
        escape: false,
        ondismiss: function () {
          if (!C) return;
          busy(false);
          notice({
            level: 'warn', icon: 'card',
            title: 'Payment not completed',
            text: 'Nothing has been charged and your cart is untouched. You can pay whenever you are ready.',
            action: 'Pay now', onAction: submit
          });
        }
      },
      handler: function (resp) { verify(resp, items, f); }
    });

    rzp.on('payment.failed', function (e) {
      if (!C) return;
      var d = (e && e.error) || {};
      busy(false);
      notice({
        level: 'bad', icon: 'card',
        title: 'Payment failed',
        text: (d.description || 'Your bank declined the payment.') +
              ' Nothing was charged and your cart is saved.' +
              (d.payment_id ? ' Reference: ' + d.payment_id : ''),
        action: 'Try again', onAction: submit
      });
    });

    rzp.open();
  }

  /* Step 3 — verification and order creation. Until this succeeds there is no
     order, so the cart must survive. */
  function verify(resp, items, f) {
    if (!C) return;
    busy(true, 'Confirming your order');
    notice({ level: 'ok', icon: 'check', title: 'Payment received', text: 'Confirming your order — do not close this window.' });

    var payload = {
      razorpay_order_id: resp.razorpay_order_id,
      razorpay_payment_id: resp.razorpay_payment_id,
      razorpay_signature: resp.razorpay_signature,
      customerName: f.name,
      phone: f.phone,
      deliveryAddress: {
        street: f.street,
        city: f.city,
        district: f.district,
        state: f.state,
        zip: f.zip,
        country: 'India'
      },
      // No price, total, discount or shippingFee: the server recomputes all of
      // them from the database with the same helper that priced step 1.
      cart: items
    };
    if (f.email) payload.email = f.email;

    // Coordinates only when Google actually returned them for this address.
    if (C.place && C.place.placeId) {
      payload.deliveryAddress.placeId = C.place.placeId;
      if (C.place.lat != null) payload.deliveryAddress.lat = C.place.lat;
      if (C.place.lng != null) payload.deliveryAddress.lng = C.place.lng;
    }

    API.verifyPayment(payload).then(function (r) {
      var order = (r && r.order) || null;
      saveDetails(f);
      Cart.clear();          // the only place the cart is cleared
      API.bust();            // stock changed, so cached lists must re-fetch
      if (!C) return;
      var done = C.opts.onSuccess;
      busy(false);
      if (done) done(order);
      else Router.go('/');
    }).catch(function (err) {
      if (!C) return;
      busy(false);
      // The money has left the customer's account. Do NOT clear the cart, and
      // give them the payment reference plus a retry — /verify-payment is
      // idempotent on paymentReference, so retrying is safe and will return the
      // order if it was in fact created.
      notice({
        level: 'bad', icon: 'warn',
        title: 'Payment went through, order not yet confirmed',
        text: 'Your payment succeeded but we could not record the order: ' +
              ((err && err.message) || 'the server did not respond') +
              '. Nothing has been lost. Retry below — and keep this payment reference: ' +
              resp.razorpay_payment_id,
        action: 'Retry confirmation',
        onAction: function () { verify(resp, items, f); }
      });
    });
  }

  /* ── Confirmation ────────────────────────────────────────────────────────── */

  Checkout.doneHtml = function (order) {
    if (!order) {
      return '' +
        '<div class="done">' +
          '<div class="done-mark">' + ICON('check', 30) + '</div>' +
          '<h3>Order placed</h3>' +
          '<p>Your payment went through and your order is confirmed. ' +
          'Check your email for the receipt.</p>' +
        '</div>';
    }

    var lines = Array.isArray(order.cart) ? order.cart : [];
    var addr = order.deliveryAddress || {};
    var when = order.createdAt ? new Date(order.createdAt) : new Date();

    var rows = [
      ['Order', order.orderId || '—'],
      ['Placed', when.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })],
      ['Payment', (order.paymentStatus || 'Paid') + ' · ' + (order.paymentMethod || 'Razorpay')],
      ['Reference', order.paymentReference || '—'],
      ['Status', order.status || 'Confirmed']
    ];

    var money = [
      ['Subtotal', U.money(U.num(order.subTotal, 0))]
    ];
    if (U.num(order.discount, 0) > 0) money.push(['Discount', '−' + U.money(order.discount)]);
    money.push(['Shipping', U.num(order.shippingFee, 0) > 0 ? U.money(order.shippingFee) : 'Free']);

    return '' +
      '<div class="done">' +
        '<div class="done-mark">' + ICON('check', 30) + '</div>' +
        '<h3>Order confirmed</h3>' +
        '<p>Payment received. Keep your order number — it is all you need to ask us anything.</p>' +

        '<div class="receipt">' +
          rows.map(function (r) {
            return '<div class="receipt-r"><span>' + U.esc(r[0]) + '</span><b>' + U.esc(r[1]) + '</b></div>';
          }).join('') +
        '</div>' +

        (lines.length
          ? '<div class="receipt">' +
              lines.map(function (l) {
                var name = U.text(l.name) || 'Item';
                return '<div class="receipt-r">' +
                         '<span>' + U.esc(name) + (l.variant ? ' · ' + U.esc(l.variant) : '') +
                           ' × ' + U.num(l.quantity, 1) + '</span>' +
                         '<b>' + U.money(U.num(l.price, 0) * U.num(l.quantity, 1)) + '</b>' +
                       '</div>';
              }).join('') +
              money.map(function (r) {
                return '<div class="receipt-r"><span>' + U.esc(r[0]) + '</span><b>' + U.esc(r[1]) + '</b></div>';
              }).join('') +
              '<div class="receipt-r"><span>Total paid</span><b>' + U.money(U.num(order.total, 0)) + '</b></div>' +
            '</div>'
          : '') +

        (addr.street
          ? '<div class="receipt">' +
              '<div class="receipt-r"><span>Delivering to</span><b>' + U.esc(order.customerName || '') + '</b></div>' +
              '<div class="receipt-r"><span>Address</span><b style="max-width:60%">' +
                U.esc([addr.street, addr.city, addr.district, addr.state, addr.zip].filter(Boolean).join(', ')) +
              '</b></div>' +
              '<div class="receipt-r"><span>Phone</span><b>' + U.esc(order.phone || '') + '</b></div>' +
            '</div>'
          : '') +

        /* The tracking link carries the order number so /track opens with it
           already in the field — the shopper never has to copy it by hand. */
        '<p style="margin-top:var(--s5)">We pack and dispatch within two working days. ' +
        'Track progress any time on the <a href="/track' +
        (order.orderId ? ('?order=' + encodeURIComponent(order.orderId)) : '') +
        '" data-nav style="color:var(--ink);text-decoration:underline">order tracking page</a>.</p>' +
      '</div>';
  };

  window.Checkout = Checkout;
})();
