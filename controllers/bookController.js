const Book = require('../models/Book');
const APIFeatures = require('../utils/apiFeatures');

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
    console.error('Get books error:', error);
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
    console.error('Get book error:', error);
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
    console.error('Get categories error:', error);
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
    const book = await Book.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Book created successfully',
      data: book
    });
  } catch (error) {
    console.error('Create book error:', error);
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
    const book = await Book.findByIdAndUpdate(
      req.params.id,
      req.body,
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
    console.error('Update book error:', error);
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
    console.error('Delete book error:', error);
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