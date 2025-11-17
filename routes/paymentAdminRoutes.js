const express = require('express');
const { protect, admin } = require('../middleware/authMiddleware');
const {
  adminListPaymentEvents,
  adminRefundPayment,
  adminListTransactions
} = require('../controllers/paymentController');

const router = express.Router();
router.use(protect, admin);

router.get('/events', adminListPaymentEvents);
router.get('/transactions', adminListTransactions);
router.post('/refund', adminRefundPayment);

module.exports = router;
