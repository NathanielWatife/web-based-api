const express = require('express');
const { body } = require('express-validator');
const {
  getBooks,
  getBook,
  createBook,
  updateBook,
  deleteBook,
  getCategories,
  updateStock,
  getFeaturedBooks
} = require('../controllers/bookController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { uploadSingleImage } = require('../middleware/uploadMiddleware');
const { handleValidationErrors } = require('../middleware/validationMiddleware');

const router = express.Router();

// Validation rules
const bookValidation = [
  body('title')
    .notEmpty()
    .trim()
    .withMessage('Book title is required'),
  body('author')
    .notEmpty()
    .trim()
    .withMessage('Author name is required'),
  body('isbn')
    .notEmpty()
    .trim()
    .withMessage('ISBN is required'),
  body('price')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('category')
    .notEmpty()
    .trim()
    .withMessage('Category is required'),
  body('description')
    .notEmpty()
    .withMessage('Description is required'),
  body('stockQuantity')
    .isInt({ min: 0 })
    .withMessage('Stock quantity must be a non-negative integer'),
  body('publisher')
    .notEmpty()
    .trim()
    .withMessage('Publisher is required'),
  body('publicationYear')
    .isInt({ min: 1900, max: new Date().getFullYear() })
    .withMessage('Please enter a valid publication year')
];

// Public routes
router.get('/', getBooks);
router.get('/featured', getFeaturedBooks);
router.get('/categories', getCategories);
router.get('/:id', getBook);

// Admin routes
router.post('/admin/books', 
  protect, 
  authorize('admin'), 
  uploadSingleImage('image'),
  bookValidation,
  handleValidationErrors,
  createBook
);

router.put('/admin/books/:id',
  protect,
  authorize('admin'),
  uploadSingleImage('image'),
  [
    body('title').optional().notEmpty().trim().withMessage('Book title is required'),
    body('author').optional().notEmpty().trim().withMessage('Author name is required'),
    body('isbn').optional().notEmpty().trim().withMessage('ISBN is required'),
    body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    body('category').optional().notEmpty().trim().withMessage('Category is required'),
    body('stockQuantity').optional().isInt({ min: 0 }).withMessage('Stock quantity must be a non-negative integer'),
    body('publicationYear').optional().isInt({ min: 1900, max: new Date().getFullYear() }).withMessage('Please enter a valid publication year')
  ],
  handleValidationErrors,
  updateBook
);

router.patch('/admin/books/:id/stock',
  protect,
  authorize('admin'),
  [
    body('stockQuantity')
      .isInt({ min: 0 })
      .withMessage('Stock quantity must be a non-negative integer')
  ],
  handleValidationErrors,
  updateStock
);

router.delete('/admin/books/:id',
  protect,
  authorize('admin'),
  deleteBook
);

module.exports = router;