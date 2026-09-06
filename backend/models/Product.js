const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  productId: { type: String, required: false },
  sku: { type: String, required: false },
  barcode: { type: String, required: false },
  title: { type: Object, required: true }, // e.g. { en: "Product Title" }
  description: { type: Object, required: false },
  slug: { type: String, required: false },
  categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  image: [{ type: String }],
  stock: { type: Number, default: 0 },
  tag: [{ type: String }],
  prices: {
    price: { type: Number, default: 0 },
    originalPrice: { type: Number, default: 0 },
    discount: { type: Number, default: 0 }
  },
  isCombination: { type: Boolean, default: false },
  variants: [{ type: Object }],
  status: { type: String, default: 'show' },
  isFeatured: { type: Boolean, default: false },
}, { timestamps: true });

// ─── Indexes for common queries ────────────────────────────
// Storefront resolves a product by slug on every product page.
// Sparse because legacy products may not have a slug; not unique because the
// scraped data may contain incidental duplicates we don't want to reject.
productSchema.index({ slug: 1 }, { sparse: true });
// Legacy string productId used by the pricing resolver fallback.
productSchema.index({ productId: 1 }, { sparse: true });
// Admin/storefront list is sorted newest-first and filtered by category.
productSchema.index({ createdAt: -1 });
productSchema.index({ categories: 1 });

module.exports = mongoose.model('Product', productSchema);
