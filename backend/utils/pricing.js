const mongoose = require('mongoose');
const Product = require('../models/Product');

/**
 * Resolve a cart line to a real Product document.
 * Accepts Mongo _id, legacy string productId, or slug — never trusts a client price.
 */
async function findProduct(item) {
  const id = item._id || item.id || item.productId;
  let product = null;

  if (id && mongoose.Types.ObjectId.isValid(id)) {
    product = await Product.findById(id);
  }
  if (!product && id) {
    product = await Product.findOne({ productId: String(id) });
  }
  if (!product && item.slug) {
    product = await Product.findOne({ slug: item.slug });
  }
  return product;
}

// ─── Server-side money policy ──────────────────────────────
// Central place for shipping / discount rules. Currently: free shipping,
// no discounts (there is no coupon system yet). These deliberately IGNORE any
// client-supplied discount / shippingFee so totals cannot be tampered with.
function computeShipping(/* subTotal, lineItems */) {
  return 0;
}
function computeDiscount(/* subTotal, lineItems */) {
  return 0;
}

/**
 * Compute authoritative order pricing from the DB.
 * Returns { error } on any problem, otherwise
 * { subTotal, discount, shippingFee, total, lineItems }.
 *
 * `lineItems` are safe, server-built cart entries (price/name/image from DB).
 * This single function is the source of truth for BOTH the Razorpay order
 * amount and the persisted order total, so they can never diverge.
 */
async function computeOrderPricing(cart) {
  if (!Array.isArray(cart) || cart.length === 0) {
    return { error: 'Your cart is empty.' };
  }

  let subTotal = 0;
  const lineItems = [];

  for (const item of cart) {
    const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
    const product = await findProduct(item);

    if (!product) {
      return {
        error: `Product is no longer available: ${item.name || item.title || item._id || 'unknown item'}. Please remove it from your cart.`
      };
    }

    if (typeof product.stock === 'number' && product.stock < qty) {
      const title = typeof product.title === 'object' ? product.title.en : product.title;
      return { error: `Insufficient stock for: ${title}. Only ${product.stock} left.` };
    }

    const price = product.prices?.price || product.prices?.originalPrice || 0;
    subTotal += price * qty;

    const name = typeof product.title === 'object'
      ? (product.title.en || 'Product')
      : (product.title || 'Product');
    const image = Array.isArray(product.image) ? product.image[0] : (product.image || item.image || '');

    lineItems.push({
      productId: product._id,
      name,
      image,
      quantity: qty,
      price
    });
  }

  const discount = computeDiscount(subTotal, lineItems);
  const shippingFee = computeShipping(subTotal, lineItems);
  const total = subTotal - discount + shippingFee;

  return { subTotal, discount, shippingFee, total, lineItems };
}

module.exports = { computeOrderPricing, findProduct };
