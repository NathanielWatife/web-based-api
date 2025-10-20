const mongoose = require('mongoose');

const verificationSchema = new mongoose.Schema({
  matricNo: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  code: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['email-verification', 'password-reset'],
    default: 'email-verification'
  },
  expiresAt: {
    type: Date,
    required: true
  },
  used: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create TTL index for automatic expiration
verificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Verification', verificationSchema);