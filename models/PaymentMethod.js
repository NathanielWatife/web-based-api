const mongoose = require('mongoose');

const paymentMethodSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  provider: { type: String, enum: ['paystack', 'flutterwave'], required: true },
  customerId: { type: String },
  // Sensitive: encrypted authorization/token string from PSP (never raw PAN)
  tokenEncrypted: { type: String, required: true },
  last4: { type: String },
  brand: { type: String },
  expMonth: { type: String },
  expYear: { type: String },
  reusable: { type: Boolean, default: false },
  signature: { type: String },
  createdAt: { type: Date, default: Date.now }
});

paymentMethodSchema.index({ user: 1, provider: 1 });

module.exports = mongoose.model('PaymentMethod', paymentMethodSchema);
