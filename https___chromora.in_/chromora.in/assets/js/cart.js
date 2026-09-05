document.addEventListener('DOMContentLoaded', () => {
    // Initialize cart in localStorage
    if (!localStorage.getItem('chromora_cart')) {
        localStorage.setItem('chromora_cart', JSON.stringify([]));
    }

    // Bind add to cart buttons (event delegation for dynamically loaded products)
    document.body.addEventListener('click', (e) => {
        // 1. Loop Product "Add to cart" button (not single product page)
        const btn = e.target.closest('.ajax_add_to_cart, .add_to_cart_button');
        if (btn && !btn.classList.contains('single_add_to_cart_button') && !btn.classList.contains('single_buy_now_button')) {
            e.preventDefault();

            const _id = btn.getAttribute('data-product_id') || ('prod_' + Date.now());
            const title = btn.getAttribute('data-product_title') || btn.closest('.product-inner')?.querySelector('.woocommerce-loop-product__title')?.innerText || 'Product';
            const price = parseFloat(btn.getAttribute('data-product_price')) || 0;
            const image = btn.getAttribute('data-product_image') || '';
            const slug = btn.getAttribute('data-product_slug') || '';

            if (window.chromoraCheckout) {
                window.chromoraCheckout.add({ _id, id: _id, title, price, image, slug });
            } else {
                addToCart({ _id, id: _id, title, price, image, slug, quantity: 1 });
            }
        }

        // 2. Single Product Page "Add to cart" and "Buy Now" buttons
        const singleBtn = e.target.closest('.single_add_to_cart_button, .single_buy_now_button');
        if (singleBtn) {
            e.preventDefault();

            const isBuyNow = singleBtn.classList.contains('single_buy_now_button');
            const _id = singleBtn.getAttribute('data-product_id') || window.location.pathname.split('/').filter(Boolean).pop() || ('prod_' + Date.now());
            const title = document.querySelector('h1.product_title')?.innerText || 'Product';
            const priceText = document.querySelector('p.price ins .amount')?.innerText || document.querySelector('p.price .amount')?.innerText || '0';
            const price = parseFloat(priceText.replace(/[^0-9.]/g, '')) || 0;
            const image = document.querySelector('.woocommerce-product-gallery__image img, img.wp-post-image')?.src || '';
            const slug = window.location.pathname.split('/').filter(Boolean).pop() || '';
            const qtyInput = document.querySelector('input.qty');
            const quantity = qtyInput ? parseInt(qtyInput.value) || 1 : 1;

            if (window.chromoraCheckout) {
                window.chromoraCheckout.add({ _id, id: _id, title, price, image, slug, quantity });
            } else {
                addToCart({ _id, id: _id, title, price, image, slug, quantity });
            }

            if (isBuyNow) {
                if (window.chromoraCheckout) {
                    window.chromoraCheckout.open('checkout');
                } else {
                    window.location.href = '/cart';
                }
            }
        }
    });
});

function addToCart(product) {
    let cart = JSON.parse(localStorage.getItem('chromora_cart')) || [];

    const existing = cart.find(item => item._id === product._id);
    if (existing) {
        existing.quantity += (product.quantity || 1);
    } else {
        cart.push({ ...product, quantity: (product.quantity || 1) });
    }

    localStorage.setItem('chromora_cart', JSON.stringify(cart));
    updateCartCount();
}

function updateCartCount() {
    let cart = JSON.parse(localStorage.getItem('chromora_cart')) || [];
    const count = cart.reduce((total, item) => total + (item.quantity || 1), 0);

    const badges = document.querySelectorAll('.cart-count, .cart-contents .count, #chromora-cart-count');
    badges.forEach(b => b.innerText = count);
}
