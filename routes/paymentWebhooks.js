const express = require('express');
const router = express.Router();

// Paystack expects raw body to compute signature
const paystackRaw = express.raw({ type: 'application/json' });

const {
  paystackWebhook,
  flutterwaveWebhook
} = require('../controllers/paymentController');

router.post('/paystack', paystackRaw, paystackWebhook);
// Flutterwave can use JSON body
router.post('/flutterwave', express.json({ limit: '100kb' }), flutterwaveWebhook);

module.exports = router;
