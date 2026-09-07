const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { protect, admin } = require('../middleware/authMiddleware');

// Admin routes (require authentication and admin role)
router.post('/request/:orderId', protect, admin, reviewController.requestReview);
router.get('/admin', protect, admin, reviewController.listReviewsAdmin);
router.put('/:id/moderate', protect, admin, reviewController.moderateReview);

// Public routes
router.get('/validate/:token', reviewController.validateToken);
router.post('/submit/:token', reviewController.submitReview);

module.exports = router;
