require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, { family: 4 })
  .then(() => console.log('MongoDB connected successfully'))
  .catch((err) => console.log('MongoDB connection error:', err));

// Routes
app.use('/v1/admin', require('./routes/adminRoutes'));
app.use('/v1/products', require('./routes/productRoutes'));
app.use('/v1/category', require('./routes/categoryRoutes'));
app.use('/v1/customer', require('./routes/customerRoutes'));
app.use('/v1/cloudinary', require('./routes/uploadRoutes'));
app.use('/v1/orders', require('./routes/orderRoutes'));

app.get('/', (req, res) => {
  res.send('Chromora Backend API is running...');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
