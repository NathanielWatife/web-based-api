const express = require('express');
const {
  registerStudent,
  login,
  adminLogin,
  forgotPassword,
  resetPassword,
  verifyToken
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', registerStudent);
router.post('/login', login);
router.post('/admin/login', adminLogin);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/verify-token', protect, verifyToken);

module.exports = router;