const API_BASE_URL = 'http://localhost:5000/v1';

// Fetch all products from backend
async function fetchProducts(params = {}) {
    try {
        const query = new URLSearchParams({
            page: params.page || 1,
            limit: params.limit || 50,
            ...(params.category ? { category: params.category } : {}),
            ...(params.title ? { title: params.title } : {}),
        }).toString();
        const response = await fetch(`${API_BASE_URL}/products?${query}`);
        if (!response.ok) throw new Error('Failed to fetch products');
        const data = await response.json();
        return data.products || data || [];
    } catch (error) {
        console.error('[Chromora] Error fetching products:', error);
        return [];
    }
}

// Fetch single product by slug
async function fetchProductBySlug(slug) {
    try {
        const response = await fetch(`${API_BASE_URL}/products/slug/${slug}`);
        if (!response.ok) throw new Error('Product not found');
        return await response.json();
    } catch (error) {
        console.error('[Chromora] Error fetching product:', error);
        return null;
    }
}

// Build product card HTML — used on homepage & shop page
function createProductCardHTML(product) {
    const title = (typeof product.title === 'object' ? product.title.en : product.title) || 'Product';
    const price = product.prices?.price ?? product.price ?? 0;
    const originalPrice = product.prices?.originalPrice ?? product.originalPrice ?? price;
    const image = Array.isArray(product.image) ? product.image[0] : (product.image || '/wp-content/uploads/woocommerce-placeholder.png');
    const slug = product.slug || product._id;
    const productId = product._id || product.id || slug;

    // Build absolute link regardless of current URL depth
    const link = `/product/${slug}`;

    const saleBadge = originalPrice > price
        ? `<span class="onsale">Sale!</span>`
        : '';

    const priceHTML = originalPrice > price
        ? `<del aria-hidden="true"><span class="woocommerce-Price-amount amount"><bdi><span class="woocommerce-Price-currencySymbol">&#8377;</span>${originalPrice}</bdi></span></del>
           <ins><span class="woocommerce-Price-amount amount"><bdi><span class="woocommerce-Price-currencySymbol">&#8377;</span>${price}</bdi></span></ins>`
        : `<span class="woocommerce-Price-amount amount"><bdi><span class="woocommerce-Price-currencySymbol">&#8377;</span>${price}</bdi></span>`;

    return `
    <li class="product type-product status-publish first instock has-post-thumbnail shipping-taxable purchasable product-type-simple">
        <div class="product-inner">
            <a href="${link}" class="woocommerce-LoopProduct-link woocommerce-loop-product__link">
                ${saleBadge}
                <img
                    width="300" height="300"
                    src="${image}"
                    class="attachment-woocommerce_thumbnail size-woocommerce_thumbnail"
                    alt="${title}"
                    loading="lazy"
                    onerror="this.src='/wp-content/uploads/woocommerce-placeholder.png'"
                />
                <h2 class="woocommerce-loop-product__title">${title}</h2>
                <span class="price">${priceHTML}</span>
            </a>
            <a
                href="#"
                data-product_id="${productId}"
                data-product_title="${title}"
                data-product_price="${price}"
                data-product_image="${image}"
                data-product_slug="${slug}"
                class="button product_type_simple add_to_cart_button ajax_add_to_cart"
                aria-label="Add "${title}" to your cart"
            >Add to cart</a>
        </div>
    </li>`;
}

// Render products into a DOM container selector
async function renderProducts(containerSelector) {
    const container = document.querySelector(containerSelector);
    if (!container) {
        console.warn('[Chromora] renderProducts: selector not found:', containerSelector);
        return;
    }

    container.innerHTML = '<p style="color:#aaa;padding:20px;">Loading products...</p>';

    const products = await fetchProducts();

    if (!products.length) {
        container.innerHTML = '<p style="color:#aaa;padding:20px;">No products found. Make sure the backend is running on port 5000.</p>';
        return;
    }

    container.innerHTML = products.map(p => createProductCardHTML(p)).join('');
}

// Expose to global scope
window.chromoraAPI = {
    fetchProducts,
    fetchProductBySlug,
    renderProducts,
    createProductCardHTML,
    API_BASE_URL
};
