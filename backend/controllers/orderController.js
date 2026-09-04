const Razorpay = require('razorpay');
const crypto = require('crypto');
const Order = require('../models/Order');

// Initialize Razorpay instance
const getRazorpayInstance = () => {
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_TXHURjJtlreCDv',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'Xb73RLTpN9pD160is3a2UUH1'
  });
};

// 1. Create Razorpay Order
const createRazorpayOrder = async (req, res) => {
  try {
    const { amount, currency = 'INR' } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).send({ message: 'Invalid order amount' });
    }

    const razorpay = getRazorpayInstance();
    const options = {
      amount: Math.round(amount * 100), // Amount in paise
      currency,
      receipt: `rcpt_${Date.now()}`
    };

    const order = await razorpay.orders.create(options);
    res.status(200).send({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID || 'rzp_test_TXHURjJtlreCDv'
    });
  } catch (err) {
    console.error('Error creating Razorpay order:', err);
    res.status(500).send({ message: err.message });
  }
};

// 2. Verify Payment & Create MongoDB Order
const verifyPaymentAndCreateOrder = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      cart,
      userInfo,
      subTotal,
      shippingCost = 0,
      discount = 0,
      total
    } = req.body;

    // Verify HMAC SHA256 signature
    const secret = process.env.RAZORPAY_KEY_SECRET || 'Xb73RLTpN9pD160is3a2UUH1';
    const generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).send({ message: 'Invalid payment signature! Transaction verification failed.' });
    }

    // Generate unique sequential invoice number
    const orderCount = await Order.countDocuments();
    const invoiceNumber = 10001 + orderCount;

    const newOrder = new Order({
      cart,
      userInfo,
      subTotal,
      shippingCost,
      discount,
      total,
      shippingOption: 'Standard Delivery',
      paymentMethod: 'Razorpay',
      status: 'Processing',
      invoice: invoiceNumber,
      paymentDetails: {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        paidAt: new Date()
      }
    });

    await newOrder.save();

    res.status(201).send({
      success: true,
      message: 'Payment verified and order placed successfully!',
      order: newOrder
    });
  } catch (err) {
    console.error('Error verifying payment:', err);
    res.status(500).send({ message: err.message });
  }
};

// 3. Get All Orders (for Admin Panel)
const getAllOrders = async (req, res) => {
  try {
    const { customerName, status, page = 1, limit = 8, day, method } = req.query;
    let query = {};

    if (status) {
      query.status = status;
    }
    if (method) {
      query.paymentMethod = method;
    }
    if (customerName) {
      query['userInfo.name'] = { $regex: customerName, $options: 'i' };
    }
    if (day) {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(day));
      query.createdAt = { $gte: daysAgo };
    }

    const pages = parseInt(page);
    const limits = parseInt(limit);
    const skip = (pages - 1) * limits;

    const totalDoc = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limits);

    res.send({
      orders,
      totalDoc,
      limits,
      pages: Math.ceil(totalDoc / limits)
    });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

// 4. Get Order By ID
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).send({ message: 'Order not found' });
    res.send(order);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

// 5. Update Order (e.g. status)
const updateOrder = async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    res.send({ message: 'Order status updated successfully!', order });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

// 6. Delete Order
const deleteOrder = async (req, res) => {
  try {
    await Order.findByIdAndDelete(req.params.id);
    res.send({ message: 'Order deleted successfully!' });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

// 7. Dashboard Amount Metrics
const getDashboardAmount = async (req, res) => {
  try {
    const orders = await Order.find();
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    let todayOrderAmount = 0;
    let yesterdayOrderAmount = 0;
    let thisMonthOrderAmount = 0;
    let lastMonthOrderAmount = 0;
    let totalOrderAmount = 0;

    orders.forEach(order => {
      const orderDate = new Date(order.createdAt);
      const total = order.total || 0;
      totalOrderAmount += total;

      if (orderDate >= startOfToday) {
        todayOrderAmount += total;
      } else if (orderDate >= startOfYesterday && orderDate < startOfToday) {
        yesterdayOrderAmount += total;
      }

      if (orderDate >= startOfThisMonth) {
        thisMonthOrderAmount += total;
      } else if (orderDate >= startOfLastMonth && orderDate < startOfThisMonth) {
        lastMonthOrderAmount += total;
      }
    });

    res.send({
      todayOrderAmount,
      yesterdayOrderAmount,
      thisMonthOrderAmount,
      lastMonthOrderAmount,
      totalOrderAmount
    });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

// 8. Dashboard Order Counts
const getDashboardCount = async (req, res) => {
  try {
    const totalOrder = await Order.countDocuments();
    const totalPendingOrder = await Order.countDocuments({ status: 'Pending' });
    const totalProcessingOrder = await Order.countDocuments({ status: 'Processing' });
    const totalDeliveredOrder = await Order.countDocuments({ status: 'Delivered' });

    res.send({
      totalOrder,
      totalPendingOrder,
      totalProcessingOrder,
      totalDeliveredOrder
    });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

// 9. Dashboard Recent Orders
const getDashboardRecentOrder = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 8;
    const orders = await Order.find().sort({ createdAt: -1 }).limit(limit);
    res.send({ orders });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

// 10. Best Seller Chart
const getBestSellerChart = async (req, res) => {
  try {
    const orders = await Order.find();
    const productSales = {};

    orders.forEach(order => {
      if (Array.isArray(order.cart)) {
        order.cart.forEach(item => {
          const title = item.title || 'Product';
          productSales[title] = (productSales[title] || 0) + (item.quantity || 1);
        });
      }
    });

    const bestSellingProduct = Object.keys(productSales).map(title => ({
      _id: title,
      count: productSales[title]
    }));

    res.send({ bestSellingProduct });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

module.exports = {
  createRazorpayOrder,
  verifyPaymentAndCreateOrder,
  getAllOrders,
  getOrderById,
  updateOrder,
  deleteOrder,
  getDashboardAmount,
  getDashboardCount,
  getDashboardRecentOrder,
  getBestSellerChart
};
