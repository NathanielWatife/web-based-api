const express = require('express');
const { body } = require('express-validator');
const {
  createOrder,
  getMyOrders,
  getOrder,
  updateOrderStatus,
  getAllOrders,
  cancelOrder
} = require('../controllers/orderController');
const { protect, authorize } = require('../middlewares/authMiddleware');
const { handleValidationErrors } = require('../middlewares/validationMiddleware');

const router = express.Router();

// Validation rules
const orderValidation = [
  body('items')
    .isArray({ min: 1 })
    .withMessage('Order must have at least one item'),
  body('items.*.book')
    .isMongoId()
    .withMessage('Invalid book ID'),
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1'),
  body('pickupOption')
    .isIn(['library', 'bookstore'])
    .withMessage('Pickup option must be either library or bookstore')
];

const orderStatusValidation = [
  body('status')
    .isIn(['pending', 'confirmed', 'processing', 'ready for pickup', 'completed', 'cancelled'])
    .withMessage('Invalid order status')
];

// User routes
router.post('/',
  protect,
  orderValidation,
  handleValidationErrors,
  createOrder
);

router.get('/my-orders',
  protect,
  getMyOrders
);

router.get('/:id',
  protect,
  getOrder
);

router.put('/:id/cancel',
  protect,
  cancelOrder
);

// Admin routes
router.get('/admin/orders',
  protect,
  authorize('admin'),
  getAllOrders
);

router.put('/admin/orders/:id',
  protect,
  authorize('admin'),
  orderStatusValidation,
  handleValidationErrors,
  updateOrderStatus
);

module.exports = router;