/* ============================================================================
   CHROMORA — CHROME FX
   ----------------------------------------------------------------------------
   Two effects, both compositor-only, both optional:

     1. Scroll reveal (IntersectionObserver → class toggle)
     2. Specular highlight tracking on product cards (CSS custom props)

   Everything degrades to "no effect" rather than "broken layout", and all of it
   is disabled under prefers-reduced-motion. Nothing here is required for the
   page to function or for a shopper to buy.
   ========================================================================== */
(function () {
  'use strict';

  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  var FX = {};

  /* ── Scroll reveal ─────────────────────────────────────────────────────── */
  var io = null;
  if (!reduced && 'IntersectionObserver' in window) {
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('in');
        io.unobserve(en.target);
      });
    }, {
      // Fire slightly before the element is fully in view so the motion has
      // finished by the time the shopper's eye lands on it.
      rootMargin: '0px 0px -8% 0px',
      threshold: 0.05
    });
  }

  FX.observe = function (root) {
    var nodes = U.$$('.reveal:not(.in)', root || document);
    if (!io) { nodes.forEach(function (n) { n.classList.add('in'); }); return; }
    nodes.forEach(function (n) { io.observe(n); });
  };

  /* ── Specular tracking ────────────────────────────────────────────────────
     Sets --mx/--my on the card so the CSS radial-gradient highlight follows the
     pointer. Pointer-fine only: on touch there is no hover, and running this
     would just burn battery. Uses a single delegated listener rather than one
     per card, and throttles to one write per frame. */
  if (finePointer && !reduced) {
    var pending = null;
    document.addEventListener('pointermove', function (e) {
      var card = e.target.closest && e.target.closest('[data-pcard] .pcard-media');
      if (!card) return;
      pending = { card: card, x: e.clientX, y: e.clientY };
      if (pending.queued) return;
      pending.queued = true;
      requestAnimationFrame(function () {
        if (!pending) return;
        var r = pending.card.getBoundingClientRect();
        if (r.width && r.height) {
          pending.card.style.setProperty('--mx', (((pending.x - r.left) / r.width) * 100).toFixed(1) + '%');
          pending.card.style.setProperty('--my', (((pending.y - r.top) / r.height) * 100).toFixed(1) + '%');
        }
        pending = null;
      });
    }, { passive: true });
  }

  /* ── Ticker / marquee duplication ─────────────────────────────────────────
     A CSS marquee that translates -50% needs its content duplicated exactly
     once, otherwise it visibly snaps. Doing it in JS keeps the markup honest. */
  FX.marquee = function (node, itemsHtml) {
    if (!node) return;
    node.innerHTML = itemsHtml + itemsHtml;
  };

  window.FX = FX;
})();
