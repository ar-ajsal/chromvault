document.addEventListener('DOMContentLoaded', () => {
    // Initialize cart in localStorage
    if (!localStorage.getItem('chromora_cart')) {
        localStorage.setItem('chromora_cart', JSON.stringify([]));
    }

    // Bind add to cart buttons (event delegation for dynamically loaded products)
    document.body.addEventListener('click', (e) => {
        // 1. Loop Product "Add to cart" button
        if (e.target.classList.contains('ajax_add_to_cart') || e.target.classList.contains('add_to_cart_button')) {
            e.preventDefault();
            
            const btn = e.target;
            const productElement = btn.closest('.product-inner') || btn.closest('.product');
            const id = btn.getAttribute('data-product_id') || ('prod_' + Date.now());
            const title = productElement?.querySelector('.woocommerce-loop-product__title')?.innerText || 'Product';
            const priceText = productElement?.querySelector('ins .amount')?.innerText || productElement?.querySelector('.amount')?.innerText || '0';
            const price = parseFloat(priceText.replace(/[^0-9.]/g, '')) || 0;
            const image = productElement?.querySelector('img')?.src || '';

            if (window.chromoraCheckout) {
                window.chromoraCheckout.add({ id, title, price, image });
            } else {
                addToCart({ id, title, price, image, quantity: 1 });
            }
        }

        // 2. Single Product Page "Add to cart" and "Buy Now" buttons
        if (e.target.classList.contains('single_add_to_cart_button') || e.target.classList.contains('single_buy_now_button')) {
            e.preventDefault();

            const btn = e.target;
            const isBuyNow = btn.classList.contains('single_buy_now_button');
            const id = btn.getAttribute('data-product_id') || window.location.pathname.split('/').filter(Boolean).pop() || ('prod_' + Date.now());
            const title = document.querySelector('h1.product_title')?.innerText || 'Product';
            const priceText = document.querySelector('p.price ins .amount')?.innerText || document.querySelector('p.price .amount')?.innerText || '0';
            const price = parseFloat(priceText.replace(/[^0-9.]/g, '')) || 0;
            const image = document.querySelector('.woocommerce-product-gallery__image img, img.wp-post-image')?.src || '';
            const qtyInput = document.querySelector('input.qty');
            const quantity = qtyInput ? parseInt(qtyInput.value) || 1 : 1;

            if (window.chromoraCheckout) {
                for (let i = 0; i < quantity; i++) {
                    window.chromoraCheckout.add({ id, title, price, image });
                }
            } else {
                addToCart({ id, title, price, image, quantity });
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
    
    const existing = cart.find(item => item.id === product.id);
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
