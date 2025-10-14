const express = require('express');
const { body } = require('express-validator');
const {
  register,
  verifyEmail,
  login,
  getMe,
  forgotPassword,
  resetPassword,
  updateProfile,
  resendVerification
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { handleValidationErrors } = require('../middleware/validationMiddleware');

const router = express.Router();

// Validation rules
const registerValidation = [
  body('matricNo')
    .matches(/^[A-Z]{3}\/\d{2}\/\d{4}$/)
    .withMessage('Please enter a valid matric number format (e.g., CST/20/1234)'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please enter a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('fullName')
    .notEmpty()
    .trim()
    .withMessage('Full name is required')
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please enter a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

const emailValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please enter a valid email')
];

const resetPasswordValidation = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
];

// Routes
router.post('/register', registerValidation, handleValidationErrors, register);
router.post('/verify-email', [
  body('token').notEmpty().withMessage('Verification token is required')
], handleValidationErrors, verifyEmail);
router.post('/login', loginValidation, handleValidationErrors, login);
router.post('/forgot-password', emailValidation, handleValidationErrors, forgotPassword);
router.post('/reset-password', resetPasswordValidation, handleValidationErrors, resetPassword);
router.post('/resend-verification', emailValidation, handleValidationErrors, resendVerification);

// Protected routes
router.get('/me', protect, getMe);
router.put('/profile', protect, [
  body('fullName').optional().trim().notEmpty().withMessage('Full name cannot be empty'),
  body('email').optional().isEmail().withMessage('Please enter a valid email')
], handleValidationErrors, updateProfile);

module.exports = router;