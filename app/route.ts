import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

// The dynamic image injection script & CSS for transparent PNG support
const TRANSPARENT_STYLE = `<style id="vantro-ticker-transparency">
  [data-framer-name*="Ticker"] img,
  [data-framer-name="Center Ticker Scroll"] img {
    background: transparent !important;
    background-color: transparent !important;
  }
  [data-framer-name*="Ticker"] .framer-KIPq6,
  [data-framer-name*="Ticker"] [data-framer-background-image-wrapper],
  [data-framer-name*="Ticker"] li,
  [data-framer-name="Center Ticker Scroll"] li,
  [data-framer-name="Center Ticker Scroll"] .framer-WxCEZ,
  [data-framer-name="Center Ticker Scroll"] [data-framer-background-image-wrapper] {
    background: transparent !important;
    background-color: transparent !important;
  }
</style>`

const INJECTION_SCRIPT = `<script>
(function() {
  'use strict';

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

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'public', 'framer-page.html')
    let html = fs.readFileSync(filePath, 'utf-8')

    // Fix relative image paths from HTTrack mirror to use Framer CDN directly
    html = html.replace(
      /\.\.\/framerusercontent\.com\/images\//g,
      'https://framerusercontent.com/images/'
    )

    // Remove HTTrack mirror comments
    html = html.replace(/<!-- Mirrored from[\s\S]*?-->/g, '')

    // Inject transparent style in head and dynamic image script just before </body>
    html = html.replace('</head>', TRANSPARENT_STYLE + '\n</head>')
    html = html.replace('</body>', INJECTION_SCRIPT + '\n</body>')

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    return new NextResponse('<h1>Site loading...</h1>', {
      status: 500,
      headers: { 'Content-Type': 'text/html' },
    })
  }
}
