const Razorpay = require('razorpay');
const crypto = require('crypto');
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');


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

// Helper: Generate Unique Order ID
const generateOrderId = async () => {
  const count = await Order.countDocuments();
  return `ORD-${10001 + count}`;
};

// Helper: Deduct Stock
const deductStock = async (cart) => {
  for (let item of cart) {
    const id = item.productId || item._id;
    if (id && mongoose.Types.ObjectId.isValid(id)) {
      try {
        await Product.findByIdAndUpdate(id, { $inc: { stock: -item.quantity } });
      } catch(e) { /* skip legacy products */ }
    }
  }
};

// Helper: Restore Stock
const restoreStock = async (cart) => {
  for (let item of cart) {
    const id = item.productId || item._id;
    if (id && mongoose.Types.ObjectId.isValid(id)) {
      try {
        await Product.findByIdAndUpdate(id, { $inc: { stock: item.quantity } });
      } catch(e) { /* skip legacy products */ }
    }
  }
};

// 2. Create Guest Order (For COD / Manual UPI)
const createGuestOrder = async (req, res) => {
  try {
    const {
      customerName, phone, email, deliveryAddress,
      cart, discount = 0, shippingFee = 0,
      paymentMethod, paymentReference, paymentScreenshot
    } = req.body;

    // Securely validate stock + calculate totals from DB
    let calculatedSubTotal = 0;
    for (let item of cart) {
      if (item._id) {
        const product = await Product.findById(item._id);
        if (!product) {
          return res.status(400).send({ message: `Product not found: ${item.name || item.title || item._id}` });
        }
        if (product.stock < item.quantity) {
          return res.status(400).send({ message: `Insufficient stock for: ${typeof product.title === 'object' ? product.title.en : product.title}. Only ${product.stock} left.` });
        }
        const price = product.prices?.price || product.prices?.originalPrice || 0;
        calculatedSubTotal += price * item.quantity;
        item.price = price;
        item.name = typeof product.title === 'object' ? product.title.en : (product.title || item.name || 'Product');
      }
    }
    const calculatedTotal = calculatedSubTotal - discount + shippingFee;

    const orderId = await generateOrderId();

    const newOrder = new Order({
      customerName, phone, email, deliveryAddress,
      orderId,
      cart, subTotal: calculatedSubTotal, discount, shippingFee, total: calculatedTotal,
      paymentMethod,
      paymentStatus: (paymentMethod === 'Cash On Delivery') ? 'Pending' : 'Pending',
      paymentReference,
      paymentScreenshot,
      status: 'Pending'
    });

    await newOrder.save();
    await deductStock(cart);
    res.status(201).send({ success: true, message: 'Order placed successfully!', order: newOrder });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

// 3. Verify Payment & Create MongoDB Order (For Razorpay)
const verifyPaymentAndCreateOrder = async (req, res) => {
  try {
    const {
      razorpay_order_id, razorpay_payment_id, razorpay_signature,
      customerName, phone, email, deliveryAddress,
      cart, discount = 0, shippingFee = 0
    } = req.body;

    // Backend strict validation
    if (!customerName || customerName.trim().length < 3) {
      return res.status(400).send({ message: 'Invalid customer name.' });
    }
    if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
      return res.status(400).send({ message: 'Invalid 10-digit Indian phone number.' });
    }
    if (!deliveryAddress || !deliveryAddress.street || !deliveryAddress.city || !deliveryAddress.state || !deliveryAddress.district || !deliveryAddress.zip) {
      return res.status(400).send({ message: 'Incomplete delivery address. Street, city, district, state, and zip are required.' });
    }
    if (!/^\d{6}$/.test(deliveryAddress.zip)) {
      return res.status(400).send({ message: 'Invalid 6-digit Pincode.' });
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).send({ message: 'Invalid email address format.' });
    }

    // Backend PIN code API Verification
    try {
      const pinRes = await fetch(`https://api.postalpincode.in/pincode/${deliveryAddress.zip}`);
      const pinData = await pinRes.json();
      if (pinData && pinData[0] && pinData[0].Status === 'Success' && pinData[0].PostOffice) {
        const pinState = pinData[0].PostOffice[0].State;
        const pinDist = pinData[0].PostOffice[0].District;
        
        const sState = deliveryAddress.state.toLowerCase();
        const sDist = deliveryAddress.district.toLowerCase();
        const pState = pinState.toLowerCase();
        const pDist = pinDist.toLowerCase();

        const stateMismatch = !pState.includes(sState) && !sState.includes(pState);

        if (stateMismatch) {
           return res.status(400).send({ message: `PIN code mismatch: PIN belongs to ${pinState}. Please verify your State.` });
        }
      } else if (pinData && pinData[0] && pinData[0].Status === 'Error') {
         return res.status(400).send({ message: 'Invalid Indian Pincode provided.' });
      }
    } catch(err) {
      console.log('PIN validation API failed in backend (ignored due to network):', err.message);
    }

    // Verify HMAC SHA256 signature
    const secret = process.env.RAZORPAY_KEY_SECRET || 'Xb73RLTpN9pD160is3a2UUH1';
    const generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).send({ message: 'Invalid payment signature! Transaction verification failed.' });
    }

    // Prevent duplicate orders for same payment
    const existingOrder = await Order.findOne({ paymentReference: razorpay_payment_id });
    if (existingOrder) {
      return res.status(200).send({ success: true, message: 'Order already recorded.', order: existingOrder });
    }

    // Securely validate stock + calculate totals from DB
    let calculatedSubTotal = 0;
    for (let item of cart) {
      if (item._id) {
        let product = null;
        try {
          if (mongoose.Types.ObjectId.isValid(item._id)) {
            product = await Product.findById(item._id);
          }
          if (!product) {
            product = await Product.findOne({ productId: String(item._id) });
          }
        } catch (e) {
          product = null;
        }

        if (!product) {
          // Legacy WP product not in MongoDB
          const price = item.price || 0;
          calculatedSubTotal += price * item.quantity;
          item.name = item.title || item.name || 'Legacy Product';
          continue;
        }

        if (product.stock < item.quantity) {
          return res.status(400).send({ message: `Insufficient stock for: ${typeof product.title === 'object' ? product.title.en : product.title}. Only ${product.stock} left.` });
        }
        const price = product.prices?.price || product.prices?.originalPrice || 0;
        calculatedSubTotal += price * item.quantity;
        item.price = price;
        item.name = typeof product.title === 'object' ? product.title.en : (product.title || item.name || 'Product');
      }
    }
    const calculatedTotal = calculatedSubTotal - discount + shippingFee;

    const orderId = await generateOrderId();

    const finalCart = cart.map(item => {
      const formattedItem = {
        name: item.name,
        image: item.image,
        quantity: item.quantity,
        price: item.price
      };
      if (item._id && mongoose.Types.ObjectId.isValid(item._id)) {
        formattedItem.productId = item._id;
      }
      return formattedItem;
    });

    const newOrder = new Order({
      customerName, phone, email, deliveryAddress,
      orderId,
      cart: finalCart, subTotal: calculatedSubTotal, discount, shippingFee, total: calculatedTotal,
      paymentMethod: 'Razorpay',
      paymentStatus: 'Paid',
      paymentReference: razorpay_payment_id,
      paymentDate: new Date(),
      status: 'Confirmed'
    });

    await newOrder.save();
    await deductStock(cart);

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

// Helper for backward compatibility with React SPA (Dashtar)
const mapToAdminSchema = (order) => {
  const o = order.toObject ? order.toObject() : order;
  return {
    ...o,
    invoice: o.invoice || (o.orderId ? o.orderId.replace('ORD-', '') : Math.floor(Math.random() * 10000)),
    shippingCost: o.shippingFee || o.shippingCost || 0,
    shippingOption: o.shippingDetails?.courierName || "Standard Delivery",
    userInfo: o.userInfo || {
      name: o.customerName || "N/A",
      contact: o.phone || "N/A",
      email: o.email || "N/A",
      address: o.deliveryAddress?.street || o.deliveryAddress?.address || "",
      city: o.deliveryAddress?.city || "",
      country: o.deliveryAddress?.country || "",
      zipCode: o.deliveryAddress?.zip || ""
    },
    paymentDetails: o.paymentDetails || {
      razorpay_payment_id: o.paymentReference || "",
      method: o.paymentMethod || "Razorpay"
    },
    cart: (o.cart || []).map(item => ({
      ...item,
      title: item.name || item.title || "Product",
      id: item.productId || item._id || item.id
    }))
  };
};

// 4. Get All Orders (for Admin Panel)
const getAllOrders = async (req, res) => {
  try {
    const { search, status, paymentStatus, page = 1, limit = 10 } = req.query;
    let query = {};

    if (status) {
      query.status = status;
    }
    if (paymentStatus) {
      query.paymentStatus = paymentStatus;
    }
    if (search) {
      query.$or = [
        { customerName: { $regex: search, $options: 'i' } },
        { orderId: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
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
      orders: orders.map(mapToAdminSchema),
      totalDoc,
      limits,
      pages: Math.ceil(totalDoc / limits)
    });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

// 5. Get Order By ID
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).send({ message: 'Order not found' });
    res.send(mapToAdminSchema(order));
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

// 6. Update Order (status, payment, shipping)
const updateOrder = async (req, res) => {
  try {
    const { status, paymentStatus, shippingDetails } = req.body;
    const order = await Order.findById(req.params.id);
    
    if (!order) return res.status(404).send({ message: 'Order not found' });

    if (status) {
      // If status is Cancelled or Returned, restore stock
      if ((status === 'Cancelled' || status === 'Returned') && order.status !== 'Cancelled' && order.status !== 'Returned') {
        await restoreStock(order.cart);
      }
      
      order.status = status;
      if (status === 'Shipped') order.shippingDate = new Date();
      if (status === 'Delivered') order.deliveryDate = new Date();
    }

    if (paymentStatus) {
      order.paymentStatus = paymentStatus;
      if (paymentStatus === 'Paid') order.paymentDate = new Date();
    }

    if (shippingDetails) {
      order.shippingDetails = { ...order.shippingDetails, ...shippingDetails };
    }

    await order.save();
    res.send({ message: 'Order updated successfully!', order });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

// 7. Delete Order
const deleteOrder = async (req, res) => {
  try {
    await Order.findByIdAndDelete(req.params.id);
    res.send({ message: 'Order deleted successfully!' });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

// 8. Dashboard Metrics
const getDashboardAmount = async (req, res) => {
  try {
    const orders = await Order.find({ paymentStatus: 'Paid' });
    let totalOrderAmount = 0;
    
    orders.forEach(order => {
      totalOrderAmount += order.total || 0;
    });

    res.send({
      todayOrderAmount: 0,
      yesterdayOrderAmount: 0,
      thisMonthOrderAmount: 0,
      lastMonthOrderAmount: 0,
      totalOrderAmount
    });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

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

const getDashboardRecentOrder = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 8;
    const orders = await Order.find().sort({ createdAt: -1 }).limit(limit);
    res.send({ orders });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

const getBestSellerChart = async (req, res) => {
  res.send({ bestSellingProduct: [] });
};

module.exports = {
  createRazorpayOrder,
  createGuestOrder,
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
