const express = require('express');
const { body } = require('express-validator');
const {
  getUserProfile,
  getAllUsers,
  updateUserRole,
  deleteUser,
  getUserDashboard
} = require('../controllers/userController');
const { protect, authorize } = require('../middlewares/authMiddleware');
const { handleValidationErrors } = require('../middlewares/validationMiddleware');

const router = express.Router();

// Validation rules
const roleValidation = [
  body('role')
    .isIn(['student', 'admin'])
    .withMessage('Role must be either student or admin')
];

// User routes
router.get('/profile',
  protect,
  getUserProfile
);

router.get('/dashboard',
  protect,
  getUserDashboard
);

// Admin routes
router.get('/admin/users',
  protect,
  authorize('admin'),
  getAllUsers
);

router.put('/admin/users/:id/role',
  protect,
  authorize('admin'),
  roleValidation,
  handleValidationErrors,
  updateUserRole
);

router.delete('/admin/users/:id',
  protect,
  authorize('admin'),
  deleteUser
);

module.exports = router;