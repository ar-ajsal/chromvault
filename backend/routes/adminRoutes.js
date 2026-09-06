const express = require('express');
const router = express.Router();
const {
  registerAdmin,
  loginAdmin,
  getSetting,
  saveSetting
} = require('../controllers/adminController');
const { protectAdmin, requireRole } = require('../middleware/authMiddleware');

// Public: admin login only.
router.post('/login', loginAdmin);

// Protected: only an authenticated super admin can create new admin accounts.
// (The very first admin is created out-of-band via `node seedAdmin.js`.)
router.post('/register', protectAdmin, requireRole('super admin'), registerAdmin);

// Protected: admin settings (e.g. From Address for invoice dispatch)
router.get('/settings/:key', protectAdmin, getSetting);
router.put('/settings/:key', protectAdmin, saveSetting);

module.exports = router;
