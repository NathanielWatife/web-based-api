const express = require('express');
const {
  getDashboardStats,
  getAllOrders,
  updateOrderStatus,
  getAllUsers
} = require('../controllers/adminController');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect, admin);

router.get('/dashboard', getDashboardStats);
router.get('/orders', getAllOrders);
router.put('/orders/:id/status', updateOrderStatus);
router.get('/users', getAllUsers);

module.exports = router;