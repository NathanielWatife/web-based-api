const express = require('express');
const {
  registerStudent,
  verifyEmail,
  login,
  adminLogin,
  resendVerification,
  forgotPassword,
  resetPassword,
  verifyToken
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', registerStudent);
router.post('/verify-email', verifyEmail);
router.post('/login', login);
router.post('/admin/login', adminLogin);
router.post('/resend-verification', resendVerification);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/verify-token', protect, verifyToken);

module.exports = router;