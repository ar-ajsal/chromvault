const express = require('express');
const router = express.Router();
const {
  addCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  updateStatus,
  deleteCategory
} = require('../controllers/categoryController');

router.post('/add', addCategory);
router.get('/', getAllCategories); // might need to handle /category vs /category/all
router.get('/all', getAllCategories);
router.get('/:id', getCategoryById);
router.put('/:id', updateCategory);
router.put('/status/:id', updateStatus);
router.delete('/:id', deleteCategory);

module.exports = router;
