import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import fs from 'fs'
import path from 'path'

// The dynamic image injection script & CSS for transparent PNG support, branding & badges
const TRANSPARENT_STYLE = `<style id="vantro-ticker-transparency">
  /* Hide Framer Badge and Free Template badge */
  #__framer-badge-container,
  .__framer-badge,
  [aria-label="Free Template"],
  .framer-1j4zjnf-container {
    display: none !important;
    visibility: hidden !important;
    opacity: 0 !important;
    pointer-events: none !important;
    width: 0 !important;
    height: 0 !important;
    overflow: hidden !important;
  }

  /* Hide all social media icons except Instagram */
  .framer-11ke9no-container,
  .framer-1xpidea-container,
  .framer-1nwea0z-container,
  .framer-11zaf2d-container,
  [data-framer-name="Social Bar"] a[href*="facebook"],
  [data-framer-name="Social Bar"] a[href*="tiktok"],
  [data-framer-name="Social Bar"] a[href*="x.com"],
  [data-framer-name="Social Bar"] a[alt*="facebook"],
  [data-framer-name="Social Bar"] a[alt*="TikTok"],
  [data-framer-name="Social Bar"] a[alt*="Posts on X"],
  [data-framer-name="Social Bar"] a[alt*="Linkedin"] {
    display: none !important;
    visibility: hidden !important;
    opacity: 0 !important;
    pointer-events: none !important;
  }

  /* Logo: ensure Vantro logo displays correctly */
  .framer-2eckrq img,
  .framer-vseizl-container .framer-2eckrq img {
    object-fit: contain !important;
    object-position: center !important;
    max-width: 120px !important;
    height: auto !important;
  }

  /* Ticker images: ensure proper fill without cropping */
  [data-framer-name*="Ticker"] img,
  [data-framer-name="Center Ticker Scroll"] img {
    object-fit: contain !important;
    object-position: center !important;
    width: 100% !important;
    height: 100% !important;
    display: block !important;
  }
  [data-framer-name*="Ticker"] [data-framer-background-image-wrapper],
  [data-framer-name="Center Ticker Scroll"] [data-framer-background-image-wrapper] {
    overflow: hidden !important;
  }
  /* Remove dark background from ticker cards so transparent images look clean */
  [data-framer-name*="Ticker"] .framer-KIPq6,
  [data-framer-name*="Ticker"] li,
  [data-framer-name="Center Ticker Scroll"] li,
  [data-framer-name="Center Ticker Scroll"] .framer-WxCEZ {
    background: transparent !important;
    background-color: transparent !important;
  }
</style>`

const INJECTION_SCRIPT = `<script>
(function() {
  'use strict';

  var INSTA_URL = 'https://www.instagram.com/vantro.accessories/';
  var LOGO_URL = '/vantro-logo.svg';

  // 1. Intercept "Get in Touch" clicks during capture phase to guarantee redirect to Instagram
  document.addEventListener('click', function(e) {
    var touchBtn = e.target.closest('a[href*="support@iconicgraphics.com"], a[href*="vantro.accessories"], a.framer-phDBw, .framer-1xjt3m-container a');
    if (!touchBtn) {
      var aTag = e.target.closest('a');
      if (aTag && aTag.textContent && aTag.textContent.toLowerCase().includes('get in touch')) {
        touchBtn = aTag;
      }
    }
    if (touchBtn) {
      e.preventDefault();
      e.stopPropagation();
      window.open(INSTA_URL, '_blank', 'noopener,noreferrer');
      return false;
    }
  }, true);

  // 2. Remove Free Template and Framer badges
  function removeBadges() {
    var badge = document.getElementById('__framer-badge-container');
    if (badge) badge.remove();
    document.querySelectorAll('.framer-1j4zjnf-container, [aria-label="Free Template"], .__framer-badge').forEach(function(el) {
      el.remove();
    });
  }

  // 3. Ensure Logo is Vantro
  function ensureLogo() {
    var logoImgs = document.querySelectorAll('.framer-2eckrq img, .framer-vseizl-container img, img[src*="r7kphut7EBaLCaiSFUy6Wf7zOWQ"]');
    logoImgs.forEach(function(img) {
      if (img.getAttribute('src') !== LOGO_URL) {
        img.src = LOGO_URL;
        img.srcset = '';
        img.removeAttribute('srcset');
        img.alt = 'Vantro';
      }
    });
  }

  // 4. Update "Get in Touch" buttons
  function updateGetInTouch() {
    document.querySelectorAll('.framer-1xjt3m-container a, a.framer-phDBw').forEach(function(a) {
      if (a.getAttribute('href') !== INSTA_URL) {
        a.setAttribute('href', INSTA_URL);
        a.setAttribute('target', '_blank');
        a.setAttribute('rel', 'noopener noreferrer');
      }
    });
  }

  // 5. Update Social Bar: remove others, ensure Instagram link
  function updateSocialBar() {
    document.querySelectorAll('.framer-11ke9no-container, .framer-1xpidea-container, .framer-1nwea0z-container, .framer-11zaf2d-container').forEach(function(el) {
      el.remove();
    });
    document.querySelectorAll('.framer-131q4ey-container a, [data-framer-name="Social Bar"] a').forEach(function(a) {
      if (a.getAttribute('href') !== INSTA_URL) {
        a.setAttribute('href', INSTA_URL);
        a.setAttribute('target', '_blank');
        a.setAttribute('rel', 'noopener noreferrer');
        a.setAttribute('aria-label', 'Follow us on Instagram');
      }
    });
  }

  function applyBrandChanges() {
    removeBadges();
    ensureLogo();
    updateGetInTouch();
    updateSocialBar();
  }

  applyBrandChanges();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyBrandChanges);
  }
  window.addEventListener('load', function() {
    setTimeout(applyBrandChanges, 200);
    setTimeout(applyBrandChanges, 800);
  });

  // MutationObserver to enforce changes across React / Framer hydration
  if (window.MutationObserver) {
    var observer = new MutationObserver(function() {
      // Disconnect observer to avoid infinite loops from our own DOM changes
      observer.disconnect();
      applyBrandChanges();
      // Re-observe
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['src', 'href']
      });
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src', 'href']
    });
  }

  var SIDE_TICKERS = ['Ticker 1', 'Ticker 2', 'Ticker 3', 'Ticker 4'];

  function applyImgAttributes(img, url) {
    img.src = url;
    img.srcset = '';
    img.sizes = '';
    img.removeAttribute('srcset');
    img.removeAttribute('sizes');
    img.style.visibility = '';
    img.style.background = 'transparent';
    img.style.backgroundColor = 'transparent';

    var parentWrapper = img.closest('[data-framer-background-image-wrapper]');
    if (parentWrapper) {
      parentWrapper.style.background = 'transparent';
      parentWrapper.style.backgroundColor = 'transparent';
    }
    var card = img.closest('.framer-KIPq6, .framer-WxCEZ');
    if (card) {
      card.style.background = 'transparent';
      card.style.backgroundColor = 'transparent';
    }
    var li = img.closest('li');
    if (li) {
      li.style.background = 'transparent';
      li.style.backgroundColor = 'transparent';
    }
  }

  function replaceTickerImages(images) {
    if (!images || images.length === 0) return;

    // 1. Center Ticker Scroll (Desktop, Tablet, Phone) — scrolls directly over center text
    var centerTickers = document.querySelectorAll('[data-framer-name="Center Ticker Scroll"]');
    centerTickers.forEach(function(ticker) {
      var imgEls = Array.from(ticker.querySelectorAll('img'));
      imgEls.forEach(function(img, i) {
        var imageIndex = i % images.length;
        applyImgAttributes(img, images[imageIndex].secure_url);
      });
    });

    // 2. Side Tickers (Ticker 1, 2, 3, 4)
    SIDE_TICKERS.forEach(function(name, colIndex) {
      var tickers = document.querySelectorAll('[data-framer-name="' + name + '"]');
      tickers.forEach(function(ticker) {
        var imgEls = Array.from(ticker.querySelectorAll('li.ticker-item img, img'));
        imgEls.forEach(function(img, i) {
          var imageIndex = (colIndex * imgEls.length + i) % images.length;
          applyImgAttributes(img, images[imageIndex].secure_url);
        });
      });
    });
  }

  function loadDynamicImages() {
    fetch('/api/images')
      .then(function(r) { return r.json(); })
      .then(function(data) {
        replaceTickerImages(data.images || []);
      })
      .catch(function(e) {
        console.warn('[Vantro] Dynamic images unavailable:', e);
      });
  }

  if (document.readyState === 'complete') {
    loadDynamicImages();
  } else {
    window.addEventListener('load', function() {
      setTimeout(loadDynamicImages, 600);
    });
  }
})();
</script>`

export async function GET(request: NextRequest) {
  try {
    let html = ''
    try {
      const filePath = path.join(process.cwd(), 'public', 'framer-page.html')
      html = fs.readFileSync(filePath, 'utf-8')
    } catch (fsErr) {
      // Fallback for Vercel where public dir might not be in the serverless function bundle
      const assetUrl = new URL('/framer-page.html', request.url)
      const res = await fetch(assetUrl.toString())
      if (!res.ok) throw new Error('Failed to fetch static HTML: ' + res.statusText)
      html = await res.text()
    }

    // Fix relative image paths from HTTrack mirror to use Framer CDN directly
    html = html.replace(
      /\.\.\/framerusercontent\.com\/images\//g,
      'https://framerusercontent.com/images/'
    )

    // Remove HTTrack mirror comments
    html = html.replace(/<!-- Mirrored from[\s\S]*?-->/g, '')

    // Replace old ComingSo logo with Vantro logo
    html = html.replace(
      /https:\/\/framerusercontent\.com\/images\/r7kphut7EBaLCaiSFUy6Wf7zOWQ\.svg\?width=120&amp;height=17/g,
      '/vantro-logo.svg'
    )
    html = html.replace(/r7kphut7EBaLCaiSFUy6Wf7zOWQ\.svg/g, 'vantro-logo.svg')

    // Replace og:url comingso reference
    html = html.replace(
      /https:\/\/comingso\.framer\.website\//g,
      '/'
    )

    // Replace Get in Touch mailto with Instagram
    html = html.replace(
      /mailto:\s*support@iconicgraphics\.com/g,
      'https://www.instagram.com/vantro.accessories/'
    )

    // Inject transparent style in head and dynamic image script just before </body>
    html = html.replace('</head>', TRANSPARENT_STYLE + '\n</head>')
    html = html.replace('</body>', INJECTION_SCRIPT + '\n</body>')

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    })
  } catch (err: any) {
    return new NextResponse('<h1>Site loading... Error: ' + err.message + ' ' + err.stack + '</h1>', {
      status: 500,
      headers: { 'Content-Type': 'text/html' },
    })
  }
}

