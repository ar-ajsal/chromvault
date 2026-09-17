const fs = require('fs');
const path = require('path');

const collections = ['watches', 'belts', 'shades', 'caps'];
const productsDir = path.join(__dirname, 'products');
const collectionsDir = path.join(__dirname, 'collections');

const templateHtml = fs.readFileSync(path.join(productsDir, 'template.html'), 'utf8');

collections.forEach(cat => {
  let gridHtml = '';
  for (let i = 1; i <= 3; i++) {
    const title = `${cat.charAt(0).toUpperCase() + cat.slice(1, -1)} Product ${i}`;
    const handle = `fake-${cat.slice(0, -1)}-${i}`;
    const price = 999;
    
    // Create product page
    let prodHtml = templateHtml.replace(/<title>.*?<\/title>/gi, `<title>${title} - VANTRO</title>`);
    prodHtml = prodHtml.replace(/>Template Product</g, `>${title}<`);
    fs.writeFileSync(path.join(productsDir, `${handle}.html`), prodHtml);

    // Build grid item HTML
    gridHtml += `
      <div class="product-card">
        <div class="product-card__image-wrapper">
          <a href="../products/${handle}.html" class="product-card__link">
            <div style="width: 100%; aspect-ratio: 3/4; background: #eee; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: bold; color: #aaa;">${title}</div>
          </a>
          <button class="product-card__plus-button" aria-label="Add to cart" onclick="window.vantroAddToCart(event, {id: '${handle}', title: '${title}', price: ${price}, image: ''})">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 5V19" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M5 12H19" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <div class="product-card__loader"></div>
          </button>
        </div>
        <div class="product-card__info">
          <div class="product-card__vendor">VANTRO</div>
          <h3 class="product-card__title">
            <a href="../products/${handle}.html">${title}</a>
          </h3>
          <div class="product-card__price">
            <span class="current-price">Rs. ${price}.00</span>
          </div>
        </div>
      </div>
    `;
  }
  
  // Update collection HTML
  const collFile = path.join(collectionsDir, `${cat}.html`);
  if (fs.existsSync(collFile)) {
    let html = fs.readFileSync(collFile, 'utf8');
    const startIndex = html.indexOf('<div class="product-grid"');
    if (startIndex !== -1) {
      const startTagEnd = html.indexOf('>', startIndex) + 1;
      
      let sentinelIndex = html.indexOf('<div\\n        class="infinite-scroll-sentinel"', startTagEnd);
      if (sentinelIndex === -1) {
          sentinelIndex = html.indexOf('<div\\r\\n        class="infinite-scroll-sentinel"', startTagEnd);
      }
      if (sentinelIndex === -1) {
          sentinelIndex = html.indexOf('class="infinite-scroll-sentinel"', startTagEnd);
          if (sentinelIndex !== -1) {
              sentinelIndex = html.lastIndexOf('<div', sentinelIndex);
          }
      }
      
      let endIndex = sentinelIndex !== -1 ? sentinelIndex : html.indexOf('</div>', startTagEnd);
      
      const before = html.substring(0, startTagEnd);
      const after = html.substring(endIndex);
      
      html = before + '\\n' + gridHtml + '\\n' + after;
      fs.writeFileSync(collFile, html);
      console.log(`Updated ${cat}.html`);
    } else {
      console.log(`Could not find grid in ${cat}.html`);
    }
  }
});
console.log('Done!');
