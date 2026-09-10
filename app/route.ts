import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

// The dynamic image injection script
// Fetches from /api/images and replaces hardcoded sources in ticker columns
const INJECTION_SCRIPT = `<script>
(function() {
  'use strict';

  var TICKER_NAMES = ['Ticker 1', 'Ticker 2', 'Ticker 3', 'Ticker 4'];

  function replaceTickerImages(images) {
    if (!images || images.length === 0) {
      // Hide hardcoded images in all tickers when no uploads exist
      TICKER_NAMES.forEach(function(name) {
        var el = document.querySelector('[data-framer-name="' + name + '"]');
        if (el) {
          el.querySelectorAll('img').forEach(function(img) {
            img.style.visibility = 'hidden';
          });
        }
      });
      return;
    }

    TICKER_NAMES.forEach(function(name, colIndex) {
      var ticker = document.querySelector('[data-framer-name="' + name + '"]');
      if (!ticker) return;

      // Get all <img> inside this ticker's <li class="ticker-item"> elements
      var imgEls = Array.from(ticker.querySelectorAll('li.ticker-item img'));

      imgEls.forEach(function(img, i) {
        // Cycle through available images
        var imageIndex = (colIndex * imgEls.length + i) % images.length;
        var url = images[imageIndex].secure_url;
        img.src = url;
        img.srcset = '';
        img.sizes = '';
        img.removeAttribute('srcset');
        img.removeAttribute('sizes');
        img.style.visibility = '';
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
      // Small delay to let Framer initialize first
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

    // Inject our dynamic image script just before </body>
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
