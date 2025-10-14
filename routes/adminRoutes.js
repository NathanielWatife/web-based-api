const express = require('express');
const { protect, authorize } = require('../middlewares/authMiddleware');

const router = express.Router();

// Import controllers
const Book = require('../models/Book');
const Order = require('../models/Order');
const User = require('../models/User');
const { formatResponse } = require('../utils/helpers');

// @desc    Get admin dashboard statistics
// @route   GET /api/admin/dashboard
// @access  Private/Admin
router.get('/dashboard', protect, authorize('admin'), async (req, res, next) => {
  try {
    // Get total counts
    const totalBooks = await Book.countDocuments();
    const totalUsers = await User.countDocuments();
    const totalOrders = await Order.countDocuments();

    // Get revenue statistics
    const revenueStats = await Order.aggregate([
      {
        $match: {
          status: 'completed',
          paymentStatus: 'paid'
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          averageOrderValue: { $avg: '$totalAmount' }
        }
      }
    ]);

    // Get order status distribution
    const orderStatusDistribution = await Order.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get low stock books
    const lowStockBooks = await Book.find({
      stockQuantity: { $lte: 5 },
      isAvailable: true
    })
    .select('title stockQuantity price')
    .sort({ stockQuantity: 1 })
    .limit(10);

    // Get recent orders
    const recentOrders = await Order.find()
      .populate('user', 'matricNo fullName')
      .populate('items.book', 'title')
      .sort({ createdAt: -1 })
      .limit(10);

    // Get monthly revenue (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyRevenue = await Order.aggregate([
      {
        $match: {
          status: 'completed',
          paymentStatus: 'paid',
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          revenue: { $sum: '$totalAmount' },
          orders: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    const dashboardData = {
      overview: {
        totalBooks,
        totalUsers,
        totalOrders,
        totalRevenue: revenueStats[0]?.totalRevenue || 0,
        averageOrderValue: revenueStats[0]?.averageOrderValue || 0
      },
      orderStatusDistribution,
      lowStockBooks,
      recentOrders,
      monthlyRevenue
    };

    res.json(
      formatResponse(true, 'Dashboard data retrieved successfully', dashboardData)
    );
  } catch (error) {
    next(error);
  }
});

// @desc    Get system statistics
// @route   GET /api/admin/statistics
// @access  Private/Admin
router.get('/statistics', protect, authorize('admin'), async (req, res, next) => {
  try {
    // Get user registration statistics (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const userStats = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
      }
    ]);

    // Get book category distribution
    const categoryDistribution = await Book.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalStock: { $sum: '$stockQuantity' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    // Get top selling books
    const topSellingBooks = await Order.aggregate([
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.book',
          totalSold: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
        }
      },
      {
        $lookup: {
          from: 'books',
          localField: '_id',
          foreignField: '_id',
          as: 'book'
        }
      },
      {
        $unwind: '$book'
      },
      {
        $project: {
          _id: 0,
          book: {
            _id: '$book._id',
            title: '$book.title',
            author: '$book.author',
            price: '$book.price'
          },
          totalSold: 1,
          totalRevenue: 1
        }
      },
      {
        $sort: { totalSold: -1 }
      },
      {
        $limit: 10
      }
    ]);

    const statistics = {
      userRegistrations: userStats,
      categoryDistribution,
      topSellingBooks
    };

    res.json(
      formatResponse(true, 'Statistics retrieved successfully', statistics)
    );
  } catch (error) {
    next(error);
  }
});

module.exports = router;