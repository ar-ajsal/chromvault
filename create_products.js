const fs = require('fs');
const path = require('path');

const templatePath = path.join(__dirname, 'storefront', 'products', 'template.html');
const productsDir = path.join(__dirname, 'storefront', 'products');

const templateContent = fs.readFileSync(templatePath, 'utf8');

const categories = [
  { name: 'watche', label: 'WATCHES' },
  { name: 'belt', label: 'BELTS' },
  { name: 'cap', label: 'CAPS' },
  { name: 'shade', label: 'SHADES' }
];

for (const category of categories) {
  for (let i = 1; i <= 3; i++) {
    const title = `${category.name.charAt(0).toUpperCase() + category.name.slice(1)} Product ${i}`;
    const price = `${999 + i * 100}`;
    const fileName = `fake-${category.name}-${i}.html`;
    
    let content = templateContent;
    
    // Replace <title>
    content = content.replace(/<title>[\s\S]*?<\/title>/, `<title>${title} - Vantro</title>`);
    
    // Replace product title in header
    content = content.replace(/<h1 class="product-title-text-render"[^>]*>[\s\S]*?<\/h1>/, `<h1 class="product-title-text-render" style="display: block !important; margin: 0;">\n                  ${title}\n                </h1>`);
    
    // Replace SHADES label
    content = content.replace(/<span class="product-label-small">SHADES<\/span>/g, `<span class="product-label-small">${category.label}</span>`);
    
    // Replace price (e.g. Rs. 1,399)
    content = content.replace(/Rs\. 1,399/g, `Rs. ${price}`);
    content = content.replace(/"amount":1399\.0/g, `"amount":${price}.0`);
    content = content.replace(/"amount"\s*:\s*1399\.0/g, `"amount":${price}.0`);
    content = content.replace(/1399\.00/g, `${price}.00`);
    
    // Replace description to mention product details
    const details = `Product Specifications for ${title}. Category: ${category.label}. High quality materials.`;
    content = content.replace(/<meta name="description" content="[^"]*">/g, `<meta name="description" content="${details}">`);
    content = content.replace(/<meta property="og:description" content="[^"]*">/g, `<meta property="og:description" content="${details}">`);
    
    // Replace the visible description paragraph
    content = content.replace(/<p><span>Product Specifications<\/span><\/p>[\s\S]*?<\/ul>/, `<p><span>Product Specifications</span></p>\n  <ul>\n  <li><span>Category: ${category.label}</span></li>\n  <li><span>Product Details: High quality ${category.name}</span></li>\n  </ul>`);
    
    const outputPath = path.join(productsDir, fileName);
    fs.writeFileSync(outputPath, content);
    console.log(`Created ${fileName}`);
  }
}
