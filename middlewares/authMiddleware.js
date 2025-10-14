const { verifyToken } = require('../utils/generateToken');
const User = require('../models/User');
const { formatResponse } = require('../utils/helpers');

// Protect routes - user must be logged in
const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json(
        formatResponse(false, 'Not authorized to access this route')
      );
    }

    try {
      const decoded = verifyToken(token);
      req.user = await User.findById(decoded.userId).select('-password');
      
      if (!req.user) {
        return res.status(401).json(
          formatResponse(false, 'User not found')
        );
      }

      next();
    } catch (error) {
      return res.status(401).json(
        formatResponse(false, 'Not authorized to access this route')
      );
    }
  } catch (error) {
    next(error);
  }
};

// Grant access to specific roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json(
        formatResponse(false, `User role ${req.user.role} is not authorized to access this route`)
      );
    }
    next();
  };
};

// Check if email is verified
const requireEmailVerification = (req, res, next) => {
  if (!req.user.isEmailVerified) {
    return res.status(403).json(
      formatResponse(false, 'Please verify your email address to access this feature')
    );
  }
  next();
};

module.exports = {
  protect,
  authorize,
  requireEmailVerification
};