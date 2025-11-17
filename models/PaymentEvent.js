const mongoose = require('mongoose');

const paymentEventSchema = new mongoose.Schema({
  provider: { type: String, enum: ['paystack', 'flutterwave'], required: true },
  type: { type: String, enum: ['webhook', 'verify', 'refund'], required: true },
  eventId: { type: String },
  reference: { type: String },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  status: { type: String },
  amount: { type: Number },
  raw: { type: Object },
  processedAt: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

paymentEventSchema.index({ provider: 1, type: 1, eventId: 1 }, { unique: true, sparse: true });
paymentEventSchema.index({ reference: 1, provider: 1 });

module.exports = mongoose.model('PaymentEvent', paymentEventSchema);
