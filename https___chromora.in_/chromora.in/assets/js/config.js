/**
 * Chromora runtime configuration.
 * Single source of truth for the API base URL used by every storefront script.
 *
 * Resolution order (first match wins):
 *   1. window.__CHROMORA_API_BASE__  — injected by the server from an env var
 *      (see frontendServer.js / STOREFRONT_API_BASE). Lets prod point anywhere
 *      without editing shipped JS.
 *   2. <meta name="chromora-api-base" content="...">  — optional static override.
 *   3. Hostname heuristic — localhost/127.0.0.1 → local backend on :5000,
 *      otherwise same-origin "/v1" (works behind a reverse proxy in production).
 *
 * No secrets live here; this is public config only.
 */
(function () {
  function resolveApiBase() {
    if (typeof window !== 'undefined' && window.__CHROMORA_API_BASE__) {
      return String(window.__CHROMORA_API_BASE__).replace(/\/+$/, '');
    }
    var meta = document.querySelector('meta[name="chromora-api-base"]');
    if (meta && meta.content) {
      return meta.content.replace(/\/+$/, '');
    }
    var host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://localhost:5000/v1';
    }
    // Production default: same origin, path-prefixed. Assumes the backend is
    // reachable at /v1 on the site's own domain (reverse proxy / same host).
    return window.location.origin + '/v1';
  }

  var API_BASE = resolveApiBase();

  window.CHROMORA_CONFIG = Object.assign(window.CHROMORA_CONFIG || {}, {
    API_BASE: API_BASE
  });
})();
