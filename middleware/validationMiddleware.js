const { validationResult } = require('express-validator');
const { formatResponse } = require('../utils/helpers');

// Check for validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json(
      formatResponse(false, 'Validation failed', {
        errors: errors.array().map(error => ({
          field: error.param,
          message: error.msg
        }))
      })
    );
  }
  
  next();
};

module.exports = {
  handleValidationErrors
};