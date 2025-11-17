const express = require('express');
const {
  initializePayment,
  verifyPayment,
  listPaymentMethods,
  deletePaymentMethod
} = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.post('/initialize', initializePayment);
router.get('/verify/:reference', verifyPayment);
router.get('/methods', listPaymentMethods);
router.delete('/methods/:id', deletePaymentMethod);

module.exports = router;