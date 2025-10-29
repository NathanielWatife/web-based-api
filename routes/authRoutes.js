const express = require('express');
const {
  registerStudent,
  login,
  adminLogin,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
  verifyToken
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', registerStudent);
router.post('/login', login);
router.post('/admin/login', adminLogin);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerification);
router.get('/verify-token', protect, verifyToken);

module.exports = router;