const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { protectAdmin } = require('../middleware/authMiddleware');

// Admin routes (require authentication and admin role)
router.post('/request/:orderId', protectAdmin, reviewController.requestReview);
router.get('/admin', protectAdmin, reviewController.listReviewsAdmin);
router.put('/:id/moderate', protectAdmin, reviewController.moderateReview);

// Public routes
router.get('/validate/:token', reviewController.validateToken);
router.post('/submit/:token', reviewController.submitReview);

module.exports = router;
