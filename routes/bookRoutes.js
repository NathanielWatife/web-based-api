const express = require('express');
const {
  getBooks,
  getBook,
  getCategories,
  getRecommendedBooks,
  createBook,
  updateBook,
  deleteBook
} = require('../controllers/bookController');
const { protect, admin } = require('../middleware/authMiddleware');
const { uploadSingleImage } = require('../middleware/uploadMiddleware');

const router = express.Router();

router.get('/', getBooks);
router.get('/categories', getCategories);
router.get('/recommended', protect, getRecommendedBooks);
router.get('/:id', getBook);

// Admin routes
router.post('/', protect, admin, uploadSingleImage, createBook);
router.put('/:id', protect, admin, uploadSingleImage, updateBook);
router.delete('/:id', protect, admin, deleteBook);

module.exports = router;