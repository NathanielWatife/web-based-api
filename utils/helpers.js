const crypto = require('crypto');

// Generate random token
const generateRandomToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Generate reset token and set expiry
const generateResetToken = () => {
  const resetToken = crypto.randomBytes(20).toString('hex');
  const resetPasswordExpire = Date.now() + 60 * 60 * 1000; // 1 hour
  return { resetToken, resetPasswordExpire };
};

// Format response
const formatResponse = (success, message, data = null) => {
  return {
    success,
    message,
    data
  };
};

// Pagination helper
const paginate = (page = 1, limit = 10) => {
  const skip = (page - 1) * limit;
  return { skip, limit };
};

// Generate email verification token
const generateEmailVerificationToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

module.exports = {
  generateRandomToken,
  generateResetToken,
  formatResponse,
  paginate,
  generateEmailVerificationToken
};