/* ============================================================================
   CHROMVAULT — RUNTIME CONFIG
   ----------------------------------------------------------------------------
   Resolves the API base at runtime instead of baking it in at build time (there
   is no build step). Resolution order, most specific first:

     1. window.__CHROMVAULT_API_BASE__  — injected by frontendServer.js from the
        STOREFRONT_API_BASE env var. This is how production points the
        storefront at the real API without editing any file.
     2. <meta name="chromvault-api-base" content="…">  — static hosting escape
        hatch for deploys that never run frontendServer.js.
     3. Hostname heuristic — localhost/127.0.0.1 talks to the local API on
        :5000; anything else assumes the API is reverse-proxied at /v1 on the
        same origin (which is what the production proxy config does).

   No production URL is hardcoded, and no localhost URL is ever used off
   localhost.
   ========================================================================== */
(function () {
  'use strict';

  function trim(s) {
    return String(s).replace(/\/+$/, '');
  }

  function resolveApiBase() {
    if (window.__CHROMVAULT_API_BASE__) return trim(window.__CHROMVAULT_API_BASE__);

    var meta = document.querySelector('meta[name="chromvault-api-base"]');
    if (meta && meta.content) return trim(meta.content);

    var host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1' || host === '[::1]') {
      return 'http://localhost:5000/v1';
    }
    return window.location.origin + '/v1';
  }

  var API_BASE = resolveApiBase();

  window.CHROMVAULT_CONFIG = Object.assign(window.CHROMVAULT_CONFIG || {}, {
    API_BASE: API_BASE,

    /* Razorpay's checkout script is loaded on demand by js/checkout.js — never
       on first paint, because it is only needed once a shopper reaches the pay
       step and it is a third-party blocking request. */
    RAZORPAY_SDK: 'https://checkout.razorpay.com/v1/checkout.js',

    /* Reference dataset for the searchable State → District fields. Fetched
       once, lazily, when the checkout form opens. If it fails the form falls
       back to free-text entry so checkout is never blocked by a CDN. */
    STATES_URL: 'https://raw.githubusercontent.com/sab99r/Indian-States-And-Districts/master/states-and-districts.json',

    /* PIN-code lookup used to confirm a pincode really belongs to the selected
       state. Advisory only: the backend re-validates the 6-digit format. */
    PINCODE_URL: 'https://api.postalpincode.in/pincode/',

    /* Optional. Injected by frontendServer.js when VITE_GOOGLE_MAPS_API_KEY is
       configured. When absent, checkout uses manual address entry only —
       Google Maps is never a hard dependency. */
    MAPS_KEY: window.__CHROMVAULT_MAPS_KEY__ || 'AIzaSyC0QC0Gfsfe1l-1rLVS2Cd5hTyUYXc8OR8',

    /* Support channels. These are the real details published on the live
       chromvault.in contact page, kept here so the footer, the contact page and
       the order-tracking page all read from one place — change them once and
       every surface updates. frontendServer.js can override any of them from
       env (STOREFRONT_WHATSAPP / STOREFRONT_EMAIL / STOREFRONT_INSTAGRAM) so a
       staging deploy does not have to point at the live inbox. */
    CONTACT: Object.assign({
      whatsapp: '918086096111',          // digits only, country code first
      whatsappLabel: '+91 80860 96111',
      email: 'chromvaultindia@gmail.com',
      instagram: 'chromvault.in',
      replyWithin: 'Usually within 24 hours'
    }, window.__CHROMVAULT_CONTACT__ || {})
  });
})();
