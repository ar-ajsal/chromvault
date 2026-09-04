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

module.exports = mongoose.model('Product', productSchema);
