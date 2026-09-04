const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  cart: [{ type: Object }], // array of products in cart
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  userInfo: { type: Object },
  subTotal: { type: Number, default: 0 },
  shippingCost: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  shippingOption: { type: String, default: 'Pending' },
  paymentMethod: { type: String, default: 'Cash On Delivery' },
  status: { type: String, default: 'Pending' },
  invoice: { type: Number },
  paymentDetails: { type: Object },
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
