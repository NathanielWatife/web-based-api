const multer = require('multer');
const path = require('path');
const cloudinary = require('../config/cloudinary');
const { formatResponse } = require('../utils/helpers');
const { logger } = require('../utils/logger');

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter
const fileFilter = (req, file, cb) => {
  // Check if file is an image
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Cloudinary upload function
const uploadToCloudinary = async (fileBuffer, folder = 'yabatech-bookstore') => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        resource_type: 'auto'
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    uploadStream.end(fileBuffer);
  });
};

// Middleware to handle single file upload
const uploadSingleImage = (fieldName) => {
  return (req, res, next) => {
    upload.single(fieldName)(req, res, async (err) => {
      if (err) {
        return res.status(400).json(
          formatResponse(false, err.message)
        );
      }

      // If file is uploaded, upload to Cloudinary
      if (req.file) {
        try {
          const result = await uploadToCloudinary(req.file.buffer);
          req.file.cloudinaryResult = result;
          next();
        } catch (error) {
          logger.error('Cloudinary upload error: ' + (error?.message || error));
          return res.status(500).json(
            formatResponse(false, 'Error uploading image')
          );
        }
      } else {
        next();
      }
    });
  };
};

module.exports = {
  upload,
  uploadToCloudinary,
  uploadSingleImage
};