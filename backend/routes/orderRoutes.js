const express = require('express');
const router = express.Router();
const {
  createRazorpayOrder,
  verifyPaymentAndCreateOrder,
  createGuestOrder,
  getAllOrders,
  getOrderById,
  updateOrder,
  deleteOrder,
  getDashboardAmount,
  getDashboardCount,
  getDashboardRecentOrder,
  getBestSellerChart
} = require('../controllers/orderController');

// Razorpay Checkout
router.post('/create-razorpay-order', createRazorpayOrder);
router.post('/verify-payment', verifyPaymentAndCreateOrder);
router.post('/guest-checkout', createGuestOrder);

// Dashboard Analytics
router.get('/dashboard-amount', getDashboardAmount);
router.get('/dashboard-count', getDashboardCount);
router.get('/dashboard-recent-order', getDashboardRecentOrder);
router.get('/best-seller/chart', getBestSellerChart);

// Admin Orders Management
router.get('/', getAllOrders);
router.get('/:id', getOrderById);
router.put('/:id', updateOrder);
router.delete('/:id', deleteOrder);

module.exports = router;
