const crypto = require('crypto');
const Review = require('../models/Review');
const Order = require('../models/Order');

// ============================================================================
// ADMIN CONTROLLERS
// ============================================================================

// POST /v1/admin/reviews/request/:orderId
exports.requestReview = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { productId } = req.body; // Specifically which product in the order

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    
    // Check if a review already exists
    const existing = await Review.findOne({ orderId, productId });
    if (existing) {
      if (existing.status === 'pending_submission') {
        return res.json({ message: 'Review request already generated', token: existing.token });
      }
      return res.status(400).json({ error: 'Review already submitted for this product' });
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');

    const review = await Review.create({
      orderId,
      productId,
      token,
      status: 'pending_submission'
    });

    res.json({ message: 'Review request generated', token: review.token });
  } catch (err) {
    console.error('requestReview error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// GET /v1/admin/reviews
exports.listReviewsAdmin = async (req, res) => {
  try {
    const status = req.query.status || 'pending_moderation';
    const reviews = await Review.find({ status })
      .populate('productId', 'title image')
      .populate('orderId', 'customerName')
      .sort({ createdAt: -1 });
    
    res.json({ reviews });
  } catch (err) {
    console.error('listReviewsAdmin error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// PUT /v1/admin/reviews/:id/moderate
exports.moderateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'approved' or 'rejected'

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const review = await Review.findByIdAndUpdate(id, { status }, { new: true });
    if (!review) return res.status(404).json({ error: 'Review not found' });

    res.json({ review });
  } catch (err) {
    console.error('moderateReview error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ============================================================================
// PUBLIC CONTROLLERS
// ============================================================================

// GET /v1/reviews/validate/:token
exports.validateToken = async (req, res) => {
  try {
    const { token } = req.params;
    const review = await Review.findOne({ token }).populate('productId', 'title image');
    
    if (!review) return res.status(404).json({ error: 'Invalid or expired link' });
    if (review.status !== 'pending_submission') {
      return res.status(400).json({ error: 'Review already submitted' });
    }

    res.json({ 
      valid: true, 
      productId: review.productId._id,
      productTitle: review.productId.title,
      productImage: review.productId.image && review.productId.image.length ? review.productId.image[0] : null
    });
  } catch (err) {
    console.error('validateToken error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// POST /v1/reviews/submit/:token
exports.submitReview = async (req, res) => {
  try {
    const { token } = req.params;
    const { rating, text } = req.body;

    const review = await Review.findOne({ token });
    if (!review) return res.status(404).json({ error: 'Invalid link' });
    if (review.status !== 'pending_submission') {
      return res.status(400).json({ error: 'Review already submitted' });
    }

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    review.rating = rating;
    review.text = text;
    review.status = 'pending_moderation';
    await review.save();

    res.json({ message: 'Review submitted successfully' });
  } catch (err) {
    console.error('submitReview error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// GET /v1/products/:id/reviews
exports.getProductReviews = async (req, res) => {
  try {
    const { id } = req.params;
    const reviews = await Review.find({ productId: id, status: 'approved' })
      .populate('orderId', 'customerName')
      .sort({ updatedAt: -1 });

    const formattedReviews = reviews.map(r => ({
      id: r._id,
      rating: r.rating,
      text: r.text,
      customerName: r.orderId ? r.orderId.customerName : 'Verified Buyer',
      date: r.updatedAt
    }));

    res.json({ reviews: formattedReviews });
  } catch (err) {
    console.error('getProductReviews error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// GET /v1/reviews/all
exports.getAllReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ status: 'approved' })
      .populate('orderId', 'customerName')
      .sort({ updatedAt: -1 })
      .limit(10); // Limit to recent 10 for the homepage

    const formattedReviews = reviews.map(r => ({
      id: r._id,
      rating: r.rating,
      text: r.text,
      customerName: r.orderId ? r.orderId.customerName : 'Verified Buyer',
      date: r.updatedAt
    }));

    res.json({ reviews: formattedReviews });
  } catch (err) {
    console.error('getAllReviews error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};
