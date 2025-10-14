const Book = require('../models/Book');
const Category = require('../models/Category');
const { formatResponse, paginate } = require('../utils/helpers');

// @desc    Get all books with filtering, sorting, and pagination
// @route   GET /api/books
// @access  Public
const getBooks = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 12,
      search,
      category,
      minPrice,
      maxPrice,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query object
    let query = { isAvailable: true };

    // Search functionality
    if (search) {
      query.$text = { $search: search };
    }

    // Category filter
    if (category) {
      query.category = { $regex: category, $options: 'i' };
    }

    // Price range filter
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Pagination
    const { skip, limit: paginateLimit } = paginate(Number(page), Number(limit));

    // Execute query
    const books = await Book.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(paginateLimit)
      .select('-__v');

    // Get total count for pagination
    const total = await Book.countDocuments(query);
    const totalPages = Math.ceil(total / paginateLimit);

    res.json(
      formatResponse(true, 'Books retrieved successfully', {
        books,
        pagination: {
          currentPage: Number(page),
          totalPages,
          totalBooks: total,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      })
    );
  } catch (error) {
    next(error);
  }
};

// @desc    Get single book
// @route   GET /api/books/:id
// @access  Public
const getBook = async (req, res, next) => {
  try {
    const book = await Book.findById(req.params.id);

    if (!book) {
      return res.status(404).json(
        formatResponse(false, 'Book not found')
      );
    }

    res.json(
      formatResponse(true, 'Book retrieved successfully', { book })
    );
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new book
// @route   POST /api/admin/books
// @access  Private/Admin
const createBook = async (req, res, next) => {
  try {
    const {
      title,
      author,
      isbn,
      price,
      category,
      description,
      stockQuantity,
      publisher,
      publicationYear
    } = req.body;

    // Check if book with same ISBN already exists
    const existingBook = await Book.findOne({ isbn });
    if (existingBook) {
      return res.status(400).json(
        formatResponse(false, 'Book with this ISBN already exists')
      );
    }

    // Handle image upload
    let imageUrl = '';
    if (req.file && req.file.cloudinaryResult) {
      imageUrl = req.file.cloudinaryResult.secure_url;
    }

    const book = await Book.create({
      title,
      author,
      isbn,
      price,
      category,
      description,
      stockQuantity,
      publisher,
      publicationYear,
      imageUrl
    });

    res.status(201).json(
      formatResponse(true, 'Book created successfully', { book })
    );
  } catch (error) {
    next(error);
  }
};

// @desc    Update a book
// @route   PUT /api/admin/books/:id
// @access  Private/Admin
const updateBook = async (req, res, next) => {
  try {
    let book = await Book.findById(req.params.id);

    if (!book) {
      return res.status(404).json(
        formatResponse(false, 'Book not found')
      );
    }

    // Check if ISBN is being changed and if it's already taken
    if (req.body.isbn && req.body.isbn !== book.isbn) {
      const existingBook = await Book.findOne({ isbn: req.body.isbn });
      if (existingBook) {
        return res.status(400).json(
          formatResponse(false, 'Book with this ISBN already exists')
        );
      }
    }

    // Handle image upload
    if (req.file && req.file.cloudinaryResult) {
      req.body.imageUrl = req.file.cloudinaryResult.secure_url;
    }

    // Update book
    book = await Book.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.json(
      formatResponse(true, 'Book updated successfully', { book })
    );
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a book
// @route   DELETE /api/admin/books/:id
// @access  Private/Admin
const deleteBook = async (req, res, next) => {
  try {
    const book = await Book.findById(req.params.id);

    if (!book) {
      return res.status(404).json(
        formatResponse(false, 'Book not found')
      );
    }

    await Book.findByIdAndDelete(req.params.id);

    res.json(
      formatResponse(true, 'Book deleted successfully')
    );
  } catch (error) {
    next(error);
  }
};

// @desc    Get all categories
// @route   GET /api/books/categories
// @access  Public
const getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find({ isActive: true })
      .select('name description')
      .sort({ name: 1 });

    res.json(
      formatResponse(true, 'Categories retrieved successfully', { categories })
    );
  } catch (error) {
    next(error);
  }
};

// @desc    Update book stock
// @route   PATCH /api/admin/books/:id/stock
// @access  Private/Admin
const updateStock = async (req, res, next) => {
  try {
    const { stockQuantity } = req.body;

    const book = await Book.findById(req.params.id);

    if (!book) {
      return res.status(404).json(
        formatResponse(false, 'Book not found')
      );
    }

    book.stockQuantity = stockQuantity;
    book.isAvailable = stockQuantity > 0;
    await book.save();

    res.json(
      formatResponse(true, 'Stock updated successfully', { book })
    );
  } catch (error) {
    next(error);
  }
};

// @desc    Get featured books
// @route   GET /api/books/featured
// @access  Public
const getFeaturedBooks = async (req, res, next) => {
  try {
    const books = await Book.find({ isAvailable: true, stockQuantity: { $gt: 0 } })
      .sort({ createdAt: -1 })
      .limit(8)
      .select('title author price imageUrl category');

    res.json(
      formatResponse(true, 'Featured books retrieved successfully', { books })
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getBooks,
  getBook,
  createBook,
  updateBook,
  deleteBook,
  getCategories,
  updateStock,
  getFeaturedBooks
};