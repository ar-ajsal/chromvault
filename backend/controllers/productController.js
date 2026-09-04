const Product = require('../models/Product');

const addProduct = async (req, res) => {
  try {
    const newProduct = new Product(req.body);
    await newProduct.save();
    res.status(200).send({ message: "Product Added Successfully!", product: newProduct });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

const addAllProducts = async (req, res) => {
  try {
    await Product.insertMany(req.body);
    res.status(200).send({ message: "Products Added Successfully!" });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

const getAllProducts = async (req, res) => {
  try {
    const { page = 1, limit = 20, category, title, price } = req.query;
    let query = {};
    if (category) {
      query.categories = category;
    }
    if (title) {
      query.$or = [
        { "title.en": { $regex: title, $options: "i" } },
        { "title.bn": { $regex: title, $options: "i" } }
      ];
    }
    const products = await Product.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate('category');
      
    const totalDoc = await Product.countDocuments(query);
    res.status(200).send({ products, totalDoc });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).send({ message: "Product not found!" });
    res.status(200).send(product);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

const updateProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).send({ message: "Product Updated Successfully!", product });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

const updateStatus = async (req, res) => {
  try {
    const newStatus = req.body.status;
    await Product.findByIdAndUpdate(req.params.id, { status: newStatus });
    res.status(200).send({ message: `Product ${newStatus === 'show' ? 'Published' : 'Unpublished'} Successfully!` });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

const deleteProduct = async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.status(200).send({ message: "Product Deleted Successfully!" });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

const getProductBySlug = async (req, res) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug });
    res.send(product);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

module.exports = {
  getProductBySlug,
  addProduct,
  addAllProducts,
  getAllProducts,
  getProductById,
  updateProduct,
  updateStatus,
  deleteProduct
};

