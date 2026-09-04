const Category = require('../models/Category');

const addCategory = async (req, res) => {
  try {
    const newCategory = new Category(req.body);
    await newCategory.save();
    res.status(200).send({ message: "Category Added Successfully!", category: newCategory });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

const getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find({}).sort({ createdAt: -1 });
    res.status(200).send({ categories });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

const getCategoryById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    res.status(200).send(category);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

const updateCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).send({ message: "Category Updated Successfully!", category });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

const updateStatus = async (req, res) => {
  try {
    const newStatus = req.body.status;
    await Category.findByIdAndUpdate(req.params.id, { status: newStatus });
    res.status(200).send({ message: `Category ${newStatus === 'show' ? 'Published' : 'Unpublished'} Successfully!` });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

const deleteCategory = async (req, res) => {
  try {
    await Category.findByIdAndDelete(req.params.id);
    res.status(200).send({ message: "Category Deleted Successfully!" });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

module.exports = {
  addCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  updateStatus,
  deleteCategory
};
