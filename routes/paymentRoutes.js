const express = require('express');
const {
  initializePayment,
  verifyPayment
} = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.post('/initialize', initializePayment);
router.get('/verify/:reference', verifyPayment);

module.exports = router;