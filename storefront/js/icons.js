/* ============================================================================
   CHROMVAULT — ICONS
   Inline SVG sprites. 1.6px strokes on a 24 grid: fine enough to feel drawn
   rather than bundled, heavy enough to survive a 20px render.
   Usage: icon('bag') or <span data-ic="bag"></span> (hydrated by shell.js).
   ========================================================================== */
(function () {
  'use strict';

  var P = 'stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"';

  var D = {
    menu:    '<path ' + P + ' d="M3 6h18M3 12h18M3 18h12"/>',
    x:       '<path ' + P + ' d="M18 6 6 18M6 6l12 12"/>',
    search:  '<circle ' + P + ' cx="11" cy="11" r="7"/><path ' + P + ' d="m16.5 16.5 4 4"/>',
    bag:     '<path ' + P + ' d="M6 8h12l-1 12H7L6 8Z"/><path ' + P + ' d="M9.5 8V6.2a2.5 2.5 0 0 1 5 0V8"/>',
    arrow:   '<path ' + P + ' d="M4 12h15m0 0-5.5-5.5M19 12l-5.5 5.5"/>',
    arrowUp: '<path ' + P + ' d="M12 19V5m0 0-5.5 5.5M12 5l5.5 5.5"/>',
    chev:    '<path ' + P + ' d="m9 5 7 7-7 7"/>',
    chevD:   '<path ' + P + ' d="m5 9 7 7 7-7"/>',
    plus:    '<path ' + P + ' d="M12 5v14M5 12h14"/>',
    minus:   '<path ' + P + ' d="M5 12h14"/>',
    check:   '<path ' + P + ' d="m4 12.5 5 5L20 6.5"/>',
    lock:    '<rect ' + P + ' x="4.5" y="10.5" width="15" height="10" rx="2"/><path ' + P + ' d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
    card:    '<rect ' + P + ' x="2.5" y="5.5" width="19" height="13" rx="2"/><path ' + P + ' d="M2.5 10h19"/>',
    truck:   '<path ' + P + ' d="M2.5 7.5h10v9h-10z"/><path ' + P + ' d="M12.5 11h4l3 3v2.5h-7z"/><circle ' + P + ' cx="6" cy="18.5" r="1.8"/><circle ' + P + ' cx="16.5" cy="18.5" r="1.8"/>',
    box:     '<path ' + P + ' d="M12 3 3.5 7.3v9.4L12 21l8.5-4.3V7.3L12 3Z"/><path ' + P + ' d="M3.5 7.3 12 11.7l8.5-4.4M12 21v-9.3"/>',
    spark:   '<path ' + P + ' d="M12 3.5 13.9 9l5.6 1.9-5.6 1.9L12 18.5l-1.9-5.7L4.5 11l5.6-2Z"/>',
    ret:     '<path ' + P + ' d="M20 11a8 8 0 1 0-2.6 5.9"/><path ' + P + ' d="M20 5v6h-6"/>',
    pin:     '<path ' + P + ' d="M12 21s7-6.1 7-11a7 7 0 0 0-14 0c0 4.9 7 11 7 11Z"/><circle ' + P + ' cx="12" cy="10" r="2.6"/>',
    mail:    '<rect ' + P + ' x="2.5" y="5" width="19" height="14" rx="2"/><path ' + P + ' d="m3 6.5 9 6.5 9-6.5"/>',
    phone:   '<path ' + P + ' d="M7 3.5h3l1.5 4-2 1.5a11 11 0 0 0 5.5 5.5l1.5-2 4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 5 5.7 2 2 0 0 1 7 3.5Z"/>',
    warn:    '<path ' + P + ' d="M12 4 2.8 20h18.4L12 4Z"/><path ' + P + ' d="M12 10v4.5M12 17.4v.1"/>',
    frown:   '<circle ' + P + ' cx="12" cy="12" r="8.5"/><path ' + P + ' d="M8.6 15.4a4.4 4.4 0 0 1 6.8 0M9 9.6v.1M15 9.6v.1"/>',
    plug:    '<path ' + P + ' d="M9 3.5v5M15 3.5v5"/><path ' + P + ' d="M6.5 8.5h11v3a5.5 5.5 0 0 1-11 0v-3Z"/><path ' + P + ' d="M12 17v3.5"/>',
    filter:  '<path ' + P + ' d="M4 6.5h16M7 12h10M10.5 17.5h3"/>'
  };

  function icon(name, size) {
    var d = D[name];
    if (!d) return '';
    var s = size || 20;
    return '<svg viewBox="0 0 24 24" width="' + s + '" height="' + s +
           '" aria-hidden="true" focusable="false">' + d + '</svg>';
  }

  window.ICON = icon;
  window.ICON.has = function (n) { return !!D[n]; };
})();
