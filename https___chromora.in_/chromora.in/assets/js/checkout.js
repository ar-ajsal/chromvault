/**
 * Chromora Razorpay Checkout & Cart Drawer System
 */

(function () {
  const API_BASE = 'http://localhost:5000/v1';

  // Inject Razorpay Script if not present
  if (!document.getElementById('razorpay-sdk')) {
    const rzpScript = document.createElement('script');
    rzpScript.id = 'razorpay-sdk';
    rzpScript.src = 'https://checkout.razorpay.com/v1/checkout.js';
    document.head.appendChild(rzpScript);
  }

  // Inject Styles
  const style = document.createElement('style');
  style.innerHTML = `
    /* Floating Cart Button */
    .chromora-floating-cart-btn {
      position: fixed;
      bottom: 30px;
      right: 30px;
      background: #000;
      color: #fff;
      border: 2px solid #fff;
      border-radius: 50px;
      padding: 14px 24px;
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;
      z-index: 99999;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
      transition: all 0.3s ease;
      font-family: inherit;
      font-size: 15px;
      letter-spacing: 1px;
    }
    .chromora-floating-cart-btn:hover {
      transform: translateY(-3px) scale(1.03);
      background: #111;
      box-shadow: 0 14px 40px rgba(255,255,255,0.2);
    }
    .chromora-cart-badge {
      background: #fff;
      color: #000;
      font-weight: bold;
      border-radius: 50%;
      width: 22px;
      height: 22px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
    }

    /* Cart Drawer Overlay */
    .chromora-drawer-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(4px);
      z-index: 999999;
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.3s ease;
    }
    .chromora-drawer-overlay.active {
      opacity: 1;
      visibility: visible;
    }

    /* Cart Drawer */
    .chromora-drawer {
      position: fixed;
      top: 0;
      right: -480px;
      width: 100%;
      max-width: 440px;
      height: 100vh;
      background: #0a0a0a;
      color: #fff;
      z-index: 1000000;
      box-shadow: -10px 0 30px rgba(0,0,0,0.8);
      transition: right 0.35s cubic-bezier(0.16, 1, 0.3, 1);
      display: flex;
      flex-direction: column;
      font-family: inherit;
    }
    .chromora-drawer.active {
      right: 0;
    }

    .chromora-drawer-header {
      padding: 24px;
      border-bottom: 1px solid #222;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .chromora-drawer-title {
      font-size: 20px;
      font-weight: 700;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      margin: 0;
    }
    .chromora-drawer-close {
      background: none;
      border: none;
      color: #888;
      font-size: 26px;
      cursor: pointer;
      line-height: 1;
      transition: color 0.2s;
    }
    .chromora-drawer-close:hover {
      color: #fff;
    }

    .chromora-drawer-body {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
    }

    /* Cart Items */
    .chromora-cart-item {
      display: flex;
      gap: 16px;
      padding: 16px 0;
      border-bottom: 1px solid #1a1a1a;
      align-items: center;
    }
    .chromora-cart-img {
      width: 70px;
      height: 70px;
      object-fit: cover;
      border-radius: 6px;
      background: #151515;
    }
    .chromora-cart-item-details {
      flex: 1;
    }
    .chromora-cart-item-title {
      font-size: 14px;
      font-weight: 600;
      margin: 0 0 6px 0;
      color: #eee;
    }
    .chromora-cart-item-price {
      font-size: 15px;
      font-weight: bold;
      color: #fff;
    }
    .chromora-qty-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 8px;
    }
    .chromora-qty-btn {
      background: #222;
      color: #fff;
      border: none;
      width: 26px;
      height: 26px;
      border-radius: 4px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
    }
    .chromora-qty-btn:hover {
      background: #333;
    }
    .chromora-remove-btn {
      background: none;
      border: none;
      color: #e53e3e;
      cursor: pointer;
      font-size: 13px;
      margin-left: auto;
    }

    /* Checkout Form */
    .chromora-checkout-form {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .chromora-form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .chromora-form-group label {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #aaa;
    }
    .chromora-form-group input {
      background: #141414;
      border: 1px solid #333;
      color: #fff;
      padding: 12px 14px;
      border-radius: 6px;
      font-size: 14px;
      outline: none;
      transition: border-color 0.2s;
    }
    .chromora-form-group input:focus {
      border-color: #fff;
    }

    /* Drawer Footer */
    .chromora-drawer-footer {
      padding: 24px;
      border-top: 1px solid #222;
      background: #0d0d0d;
    }
    .chromora-summary-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 10px;
      font-size: 14px;
      color: #aaa;
    }
    .chromora-summary-total {
      font-size: 18px;
      font-weight: bold;
      color: #fff;
      margin-top: 14px;
      padding-top: 14px;
      border-top: 1px dashed #333;
    }

    .chromora-btn-primary {
      width: 100%;
      background: #fff;
      color: #000;
      border: none;
      padding: 16px;
      font-size: 15px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      border-radius: 6px;
      cursor: pointer;
      margin-top: 18px;
      transition: all 0.2s ease;
    }
    .chromora-btn-primary:hover {
      background: #e2e2e2;
      transform: translateY(-1px);
    }
    .chromora-btn-secondary {
      width: 100%;
      background: transparent;
      color: #888;
      border: 1px solid #333;
      padding: 12px;
      font-size: 13px;
      border-radius: 6px;
      cursor: pointer;
      margin-top: 10px;
      text-align: center;
    }
    .chromora-btn-secondary:hover {
      color: #fff;
      border-color: #555;
    }

    /* Order Success Card */
    .chromora-success-card {
      text-align: center;
      padding: 30px 10px;
    }
    .chromora-success-icon {
      width: 64px;
      height: 64px;
      background: #10b981;
      color: #fff;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      margin: 0 auto 20px auto;
    }
    .chromora-success-title {
      font-size: 22px;
      font-weight: bold;
      margin-bottom: 10px;
      color: #fff;
    }
    .chromora-success-desc {
      font-size: 14px;
      color: #aaa;
      margin-bottom: 24px;
      line-height: 1.6;
    }
    .chromora-receipt {
      background: #141414;
      border: 1px solid #222;
      border-radius: 8px;
      padding: 16px;
      text-align: left;
      font-size: 13px;
      color: #ccc;
      margin-bottom: 24px;
    }
  `;
  document.head.appendChild(style);

  // Cart State Manager
  const Cart = {
    get() {
      try {
        return JSON.parse(localStorage.getItem('chromora_cart')) || [];
      } catch (e) {
        return [];
      }
    },
    save(cart) {
      localStorage.setItem('chromora_cart', JSON.stringify(cart));
      updateUI();
    },
    add(product) {
      const cart = this.get();
      const existing = cart.find(item => item.id === product.id);
      if (existing) {
        existing.quantity = (existing.quantity || 1) + 1;
      } else {
        cart.push({ ...product, quantity: 1 });
      }
      this.save(cart);
      openDrawer('cart');
    },
    remove(id) {
      const cart = this.get().filter(item => item.id !== id);
      this.save(cart);
    },
    updateQty(id, delta) {
      const cart = this.get();
      const item = cart.find(i => i.id === id);
      if (item) {
        item.quantity = Math.max(1, (item.quantity || 1) + delta);
        this.save(cart);
      }
    },
    clear() {
      localStorage.removeItem('chromora_cart');
      updateUI();
    },
    total() {
      return this.get().reduce((sum, item) => sum + (item.price * item.quantity), 0);
    }
  };

  // Build Floating Button & Drawer DOM
  const domWrapper = document.createElement('div');
  domWrapper.id = 'chromora-checkout-root';
  domWrapper.innerHTML = `
    <!-- Floating Cart Button -->
    <div class="chromora-floating-cart-btn" id="chromora-cart-trigger">
      <span>🛒 CART</span>
      <div class="chromora-cart-badge" id="chromora-cart-count">0</div>
    </div>

    <!-- Drawer Overlay -->
    <div class="chromora-drawer-overlay" id="chromora-drawer-overlay"></div>

    <!-- Drawer Panel -->
    <div class="chromora-drawer" id="chromora-drawer">
      <div class="chromora-drawer-header">
        <h3 class="chromora-drawer-title" id="chromora-drawer-title">Shopping Cart</h3>
        <button class="chromora-drawer-close" id="chromora-drawer-close">&times;</button>
      </div>

      <div class="chromora-drawer-body" id="chromora-drawer-content">
        <!-- Injected dynamically -->
      </div>

      <div class="chromora-drawer-footer" id="chromora-drawer-footer">
        <!-- Injected dynamically -->
      </div>
    </div>
  `;
  document.body.appendChild(domWrapper);

  // View Controller ('cart', 'checkout', 'success')
  let currentView = 'cart';
  let lastOrderData = null;

  function openDrawer(view = 'cart') {
    currentView = view;
    renderDrawer();
    document.getElementById('chromora-drawer-overlay').classList.add('active');
    document.getElementById('chromora-drawer').classList.add('active');
  }

  function closeDrawer() {
    document.getElementById('chromora-drawer-overlay').classList.remove('active');
    document.getElementById('chromora-drawer').classList.remove('active');
  }

  function renderDrawer() {
    const titleEl = document.getElementById('chromora-drawer-title');
    const contentEl = document.getElementById('chromora-drawer-content');
    const footerEl = document.getElementById('chromora-drawer-footer');
    const cart = Cart.get();

    if (currentView === 'cart') {
      titleEl.innerText = `YOUR CART (${cart.reduce((c, i) => c + i.quantity, 0)})`;

      if (cart.length === 0) {
        contentEl.innerHTML = `
          <div style="text-align: center; padding: 60px 0; color: #777;">
            <p style="font-size: 36px; margin-bottom: 12px;">🛍️</p>
            <p style="font-size: 16px; font-weight: 500;">Your cart is currently empty</p>
            <p style="font-size: 13px;">Add some unique jewelry pieces to get started.</p>
          </div>
        `;
        footerEl.innerHTML = `
          <button class="chromora-btn-primary" onclick="window.location.href='/shop'">Explore Shop</button>
        `;
        return;
      }

      contentEl.innerHTML = cart.map(item => `
        <div class="chromora-cart-item">
          <img src="${item.image || 'wp-content/uploads/woocommerce-placeholder.png'}" class="chromora-cart-img" />
          <div class="chromora-cart-item-details">
            <h4 class="chromora-cart-item-title">${item.title}</h4>
            <div class="chromora-cart-item-price">₹${item.price}</div>
            <div class="chromora-qty-wrap">
              <button class="chromora-qty-btn" onclick="chromoraCheckout.updateQty('${item.id}', -1)">-</button>
              <span style="font-size: 13px; font-weight: bold; width: 20px; text-align: center;">${item.quantity}</span>
              <button class="chromora-qty-btn" onclick="chromoraCheckout.updateQty('${item.id}', 1)">+</button>
              <button class="chromora-remove-btn" onclick="chromoraCheckout.remove('${item.id}')">Remove</button>
            </div>
          </div>
        </div>
      `).join('');

      footerEl.innerHTML = `
        <div class="chromora-summary-row">
          <span>Subtotal</span>
          <span>₹${Cart.total()}</span>
        </div>
        <div class="chromora-summary-row">
          <span>Shipping</span>
          <span style="color: #10b981;">FREE</span>
        </div>
        <div class="chromora-summary-row chromora-summary-total">
          <span>Total</span>
          <span>₹${Cart.total()}</span>
        </div>
        <button class="chromora-btn-primary" id="chromora-proceed-checkout-btn">Proceed to Checkout</button>
      `;

      document.getElementById('chromora-proceed-checkout-btn').onclick = () => {
        openDrawer('checkout');
      };
    } else if (currentView === 'checkout') {
      titleEl.innerText = 'CHECKOUT DETAILS';

      contentEl.innerHTML = `
        <form id="chromora-checkout-form" class="chromora-checkout-form">
          <div class="chromora-form-group">
            <label>Full Name *</label>
            <input type="text" id="cust-name" placeholder="John Doe" required />
          </div>
          <div class="chromora-form-group">
            <label>Email Address *</label>
            <input type="email" id="cust-email" placeholder="john@example.com" required />
          </div>
          <div class="chromora-form-group">
            <label>Phone Number *</label>
            <input type="tel" id="cust-phone" placeholder="9876543210" required />
          </div>
          <div class="chromora-form-group">
            <label>Shipping Address *</label>
            <input type="text" id="cust-address" placeholder="House #, Street, Area" required />
          </div>
          <div style="display: flex; gap: 10px;">
            <div class="chromora-form-group" style="flex: 1;">
              <label>City *</label>
              <input type="text" id="cust-city" placeholder="Mumbai" required />
            </div>
            <div class="chromora-form-group" style="flex: 1;">
              <label>Pincode *</label>
              <input type="text" id="cust-pincode" placeholder="400001" required />
            </div>
          </div>
        </form>
      `;

      footerEl.innerHTML = `
        <div class="chromora-summary-row chromora-summary-total" style="margin-top: 0; padding-top: 0; border: none;">
          <span>Total Payable</span>
          <span>₹${Cart.total()}</span>
        </div>
        <button class="chromora-btn-primary" id="chromora-pay-btn">Pay ₹${Cart.total()} with Razorpay</button>
        <button class="chromora-btn-secondary" id="chromora-back-cart-btn">Back to Cart</button>
      `;

      document.getElementById('chromora-back-cart-btn').onclick = () => {
        openDrawer('cart');
      };

      document.getElementById('chromora-pay-btn').onclick = handleRazorpayPayment;
    } else if (currentView === 'success') {
      titleEl.innerText = 'ORDER CONFIRMED';

      contentEl.innerHTML = `
        <div class="chromora-success-card">
          <div class="chromora-success-icon">✓</div>
          <h3 class="chromora-success-title">Thank you for your order!</h3>
          <p class="chromora-success-desc">
            Your payment was verified successfully. A confirmation has been sent to your email.
          </p>
          <div class="chromora-receipt">
            <p><strong>Invoice Number:</strong> #${lastOrderData?.invoice || '10001'}</p>
            <p><strong>Order ID:</strong> ${lastOrderData?._id || 'N/A'}</p>
            <p><strong>Customer:</strong> ${lastOrderData?.userInfo?.name || 'Customer'}</p>
            <p><strong>Amount Paid:</strong> ₹${lastOrderData?.total || 0}</p>
            <p><strong>Payment Method:</strong> Razorpay</p>
            <p><strong>Status:</strong> Processing</p>
          </div>
        </div>
      `;

      footerEl.innerHTML = `
        <button class="chromora-btn-primary" onclick="window.location.href='/'">Continue Shopping</button>
      `;
    }
  }

  // Handle Payment Initiation with Razorpay
  async function handleRazorpayPayment() {
    const name = document.getElementById('cust-name')?.value.trim();
    const email = document.getElementById('cust-email')?.value.trim();
    const phone = document.getElementById('cust-phone')?.value.trim();
    const address = document.getElementById('cust-address')?.value.trim();
    const city = document.getElementById('cust-city')?.value.trim();
    const pincode = document.getElementById('cust-pincode')?.value.trim();

    if (!name || !email || !phone || !address || !city || !pincode) {
      alert('Please fill in all shipping details!');
      return;
    }

    const payBtn = document.getElementById('chromora-pay-btn');
    payBtn.disabled = true;
    payBtn.innerText = 'Processing Order...';

    const cart = Cart.get();
    const total = Cart.total();

    try {
      // 1. Create Order on Backend
      const orderRes = await fetch(`${API_BASE}/orders/create-razorpay-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: total, currency: 'INR' })
      });

      if (!orderRes.ok) {
        throw new Error('Failed to create Razorpay order');
      }

      const orderData = await orderRes.json();

      // 2. Open Razorpay Checkout Modal
      const options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Chromora Jewelry',
        description: 'Order Payment',
        image: 'https://chromora.in/wp-content/uploads/2026/04/cropped-Group-1-1.png',
        order_id: orderData.id,
        prefill: {
          name,
          email,
          contact: phone
        },
        theme: {
          color: '#000000'
        },
        handler: async function (response) {
          payBtn.innerText = 'Verifying Payment...';
          try {
            // 3. Verify Payment on Backend
            const verifyRes = await fetch(`${API_BASE}/orders/verify-payment`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                cart,
                userInfo: {
                  name,
                  email,
                  contact: phone,
                  address,
                  city,
                  zipCode: pincode,
                  country: 'India'
                },
                subTotal: total,
                shippingCost: 0,
                discount: 0,
                total
              })
            });

            const verifyData = await verifyRes.json();

            if (verifyRes.ok && verifyData.success) {
              lastOrderData = verifyData.order;
              Cart.clear();
              openDrawer('success');
            } else {
              alert(verifyData.message || 'Payment verification failed.');
              payBtn.disabled = false;
              payBtn.innerText = `Pay ₹${total} with Razorpay`;
            }
          } catch (err) {
            console.error('Verification error:', err);
            alert('Error verifying payment.');
            payBtn.disabled = false;
            payBtn.innerText = `Pay ₹${total} with Razorpay`;
          }
        },
        modal: {
          ondismiss: function () {
            payBtn.disabled = false;
            payBtn.innerText = `Pay ₹${total} with Razorpay`;
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response) {
        alert('Payment Failed: ' + response.error.description);
        payBtn.disabled = false;
        payBtn.innerText = `Pay ₹${total} with Razorpay`;
      });
      rzp.open();

    } catch (err) {
      console.error('Payment flow error:', err);
      alert('Error initiating checkout: ' + err.message);
      payBtn.disabled = false;
      payBtn.innerText = `Pay ₹${total} with Razorpay`;
    }
  }

  function updateUI() {
    const cart = Cart.get();
    const count = cart.reduce((c, i) => c + (i.quantity || 1), 0);
    const badge = document.getElementById('chromora-cart-count');
    if (badge) badge.innerText = count;

    // Also update any theme-native cart counters
    document.querySelectorAll('.cart-count, .cart-contents .count, .ast-site-header-cart i.astra-icon').forEach(el => {
      if (el.tagName === 'I') {
        el.setAttribute('data-cart-total', count);
      } else {
        el.innerText = count;
      }
    });

    if (document.getElementById('chromora-drawer')?.classList.contains('active')) {
      renderDrawer();
    }
  }

  // Event Listeners
  document.getElementById('chromora-cart-trigger').onclick = () => openDrawer('cart');
  document.getElementById('chromora-drawer-close').onclick = closeDrawer;
  document.getElementById('chromora-drawer-overlay').onclick = closeDrawer;

  // Intercept any click on header cart links
  document.querySelectorAll('.ast-header-woo-cart, .cart-container, a[href*="/cart"]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      openDrawer('cart');
    });
  });

  // Global Checkout Object
  window.chromoraCheckout = {
    open: openDrawer,
    close: closeDrawer,
    add: (item) => Cart.add(item),
    remove: (id) => Cart.remove(id),
    updateQty: (id, delta) => Cart.updateQty(id, delta)
  };

  // Initial update
  updateUI();
})();
