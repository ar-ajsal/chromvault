const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  // Customer Information (No user account required)
  customerName: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: false },
  deliveryAddress: { type: Object, required: true }, // e.g., { street, city, state, zip, country }

  // Order Information
  orderId: { type: String, required: true, unique: true }, // Unique human-readable ID
  cart: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: { type: String },
    image: { type: String },
    variant: { type: String }, // Size/color if applicable
    quantity: { type: Number, default: 1 },
    price: { type: Number, default: 0 }
  }],
  subTotal: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  shippingFee: { type: Number, default: 0 },
  total: { type: Number, default: 0 },

  // Payment Information
  paymentMethod: { type: String, default: 'Cash On Delivery' },
  paymentStatus: { type: String, enum: ['Pending', 'Paid', 'Failed'], default: 'Pending' },
  paymentReference: { type: String, required: false }, // UTR or Payment ID
  paymentScreenshot: { type: String, required: false }, // URL to cloudinary

  // Order Status
  status: { 
    type: String, 
    enum: ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Out For Delivery', 'Delivered', 'Cancelled', 'Returned'], 
    default: 'Pending' 
  },

  // Shipping Information
  shippingDetails: {
    shipmentId: { type: String, required: false },
    awb: { type: String, required: false },
    courierName: { type: String, required: false },
    trackingUrl: { type: String, required: false },
    status: { type: String, required: false }
  },

  // Dates
  paymentDate: { type: Date, required: false },
  shippingDate: { type: Date, required: false },
  deliveryDate: { type: Date, required: false },

}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
