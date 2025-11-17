const express = require('express');
const { protect, admin } = require('../middleware/authMiddleware');
const {
  adminListPaymentEvents,
  adminRefundPayment,
  adminListTransactions,
  adminExportTransactionsCSV
} = require('../controllers/paymentController');

const router = express.Router();
router.use(protect, admin);

router.get('/events', adminListPaymentEvents);
router.get('/transactions', adminListTransactions);
router.post('/refund', adminRefundPayment);
router.get('/export/transactions.csv', adminExportTransactionsCSV);

module.exports = router;
