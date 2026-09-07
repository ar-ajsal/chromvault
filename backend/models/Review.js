const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  
  rating: { type: Number, min: 1, max: 5 },
  text: { type: String },
  
  status: { 
    type: String, 
    enum: ['pending_submission', 'pending_moderation', 'approved', 'rejected'], 
    default: 'pending_submission' 
  },
  
  token: { type: String, unique: true, required: true }, // For the secure one-time link
  
}, { timestamps: true });

// Indexes for common queries
reviewSchema.index({ token: 1 });
reviewSchema.index({ productId: 1, status: 1 });
reviewSchema.index({ status: 1 });

module.exports = mongoose.model('Review', reviewSchema);
