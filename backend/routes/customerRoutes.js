const express = require('express');
const router = express.Router();
const {
  createCustomer,
  loginCustomer,
  getAllCustomers,
  getCustomerById
} = require('../controllers/customerController');

router.post('/create', createCustomer);
router.post('/login', loginCustomer);
router.get('/', getAllCustomers);
router.get('/:id', getCustomerById);

module.exports = router;
