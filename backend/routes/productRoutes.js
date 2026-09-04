const express = require('express');
const router = express.Router();
const {
  addProduct,
  addAllProducts,
  getAllProducts,
  getProductById, getProductBySlug,
  updateProduct,
  updateStatus,
  deleteProduct
} = require('../controllers/productController');

router.post('/add', addProduct);
router.post('/all', addAllProducts);
router.get('/', getAllProducts);
router.post('/:id', getProductById);
router.get('/slug/:slug', getProductBySlug); // frontend uses POST for getProductById as per ProductServices-DBTGWG86.js
router.patch('/:id', updateProduct);
router.put('/status/:id', updateStatus);
router.delete('/:id', deleteProduct);

module.exports = router;

