const fs = require('fs');
const path = require('path');
const Book = require('../models/Book');
const APIFeatures = require('../utils/apiFeatures');
const cloudinary = require('../config/cloudinary');
const { logger } = require('../utils/logger');

// Determine if Cloudinary is configured via env vars
const hasCloudinary = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET
);

// Helper to ensure a directory exists
const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Helper to upload buffer to Cloudinary
const uploadBufferToCloudinary = (buffer, folder = 'books', originalName = 'image.jpg') => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image' },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(buffer);
  });
};

// Fallback: save buffer to local uploads folder and return an object resembling Cloudinary response
const saveBufferLocally = async (buffer, folder = 'books', originalName = 'image.jpg') => {
  const uploadsRoot = path.join(__dirname, '..', 'uploads');
  const targetDir = path.join(uploadsRoot, folder);
  ensureDir(targetDir);

  const ext = path.extname(originalName) || '.jpg';
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2,8)}${ext}`;
  const filePath = path.join(targetDir, filename);

  await fs.promises.writeFile(filePath, buffer);

  // Build a URL that points to the served uploads route on the backend
  const port = process.env.PORT || 5000;
  const backendUrl = process.env.BACKEND_URL || `http://localhost:${port}`;

  return {
    secure_url: `${backendUrl}/uploads/${folder}/${filename}`,
    public_id: `local/${folder}/${filename}`
  };
};

// @desc    Get all books
// @route   GET /api/books
// @access  Public
const getBooks = async (req, res) => {
  try {
    const features = new APIFeatures(Book.find({ isActive: true }), req.query)
      .filter()
      .search()
      .sort()
      .limitFields()
      .paginate();

    const books = await features.query;

    // Get total count for pagination
    const totalFeatures = new APIFeatures(Book.find({ isActive: true }), req.query)
      .filter()
      .search();
    
    const total = await Book.countDocuments(totalFeatures.query);

    res.json({
      success: true,
      count: books.length,
      total,
      pagination: {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 12,
        pages: Math.ceil(total / (parseInt(req.query.limit) || 12))
      },
      data: books
    });
  } catch (error) {
    logger.error('Get books error: ' + (error?.message || error));
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch books'
    });
  }
};

// @desc    Get single book
// @route   GET /api/books/:id
// @access  Public
const getBook = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);

    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }

    res.json({
      success: true,
      data: book
    });
  } catch (error) {
    logger.error('Get book error: ' + (error?.message || error));
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch book'
    });
  }
};

// @desc    Get book categories
// @route   GET /api/books/categories
// @access  Public
const getCategories = async (req, res) => {
  try {
    const categories = await Book.distinct('category', { isActive: true });
    
    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    logger.error('Get categories error: ' + (error?.message || error));
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch categories'
    });
  }
};

// @desc    Create book
// @route   POST /api/books
// @access  Private/Admin
const createBook = async (req, res) => {
  try {
    let payload = { ...req.body };

    // If image file is present, upload to Cloudinary (or fallback to local storage)
    if (req.file && req.file.buffer) {
      let uploaded;
      if (hasCloudinary) {
        uploaded = await uploadBufferToCloudinary(req.file.buffer, 'books', req.file.originalname);
      } else {
        uploaded = await saveBufferLocally(req.file.buffer, 'books', req.file.originalname);
      }
      payload.imageUrl = uploaded.secure_url;
    }

    const book = await Book.create(payload);

    res.status(201).json({
      success: true,
      message: 'Book created successfully',
      data: book
    });
  } catch (error) {
    logger.error('Create book error: ' + (error?.message || error));
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create book'
    });
  }
};

// @desc    Update book
// @route   PUT /api/books/:id
// @access  Private/Admin
const updateBook = async (req, res) => {
  try {
    let updates = { ...req.body };

    // If a new image file is present, upload and set imageUrl (Cloudinary or local fallback)
    if (req.file && req.file.buffer) {
      let uploaded;
      if (hasCloudinary) {
        uploaded = await uploadBufferToCloudinary(req.file.buffer, 'books', req.file.originalname);
      } else {
        uploaded = await saveBufferLocally(req.file.buffer, 'books', req.file.originalname);
      }
      updates.imageUrl = uploaded.secure_url;
    }

    const book = await Book.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }

    res.json({
      success: true,
      message: 'Book updated successfully',
      data: book
    });
  } catch (error) {
    logger.error('Update book error: ' + (error?.message || error));
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update book'
    });
  }
};

// @desc    Delete book
// @route   DELETE /api/books/:id
// @access  Private/Admin
const deleteBook = async (req, res) => {
  try {
    const book = await Book.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }

    res.json({
      success: true,
      message: 'Book deleted successfully'
    });
  } catch (error) {
    logger.error('Delete book error: ' + (error?.message || error));
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete book'
    });
  }
};

module.exports = {
  getBooks,
  getBook,
  getCategories,
  createBook,
  updateBook,
  deleteBook
};