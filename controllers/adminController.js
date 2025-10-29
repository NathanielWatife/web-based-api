const User = require('../models/User');
const Book = require('../models/Book');
const Order = require('../models/Order');
const { sendEmail, emailTemplates } = require('../utils/sendEmail');

// @desc    Get dashboard stats
// @route   GET /api/admin/dashboard
// @access  Private/Admin
const getDashboardStats = async (req, res) => {
  try {
    const totalBooks = await Book.countDocuments({ isActive: true });
    const totalOrders = await Order.countDocuments();
    const totalUsers = await User.countDocuments({ role: 'student' });
    
    const totalRevenue = await Order.aggregate([
      { $match: { paymentStatus: 'successful' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);

    const pendingOrders = await Order.countDocuments({ status: 'pending' });

    const recentOrders = await Order.find()
      .populate('user', 'firstName lastName matricNo')
      .sort('-createdAt')
      .limit(5);

    const lowStockBooks = await Book.find({ 
      stockQuantity: { $lte: 10 },
      isActive: true 
    }).limit(5);

    res.json({
      success: true,
      data: {
        stats: {
          totalBooks,
          totalOrders,
          totalUsers,
          totalRevenue: totalRevenue[0]?.total || 0,
          pendingOrders
        },
        recentOrders,
        lowStockBooks
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch dashboard stats'
    });
  }
};

// @desc    Get all orders (admin)
// @route   GET /api/admin/orders
// @access  Private/Admin
const getAllOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    const query = status ? { status } : {};

    const orders = await Order.find(query)
      .populate('user', 'firstName lastName email matricNo phoneNumber')
      .populate('items.book', 'title author')
      .sort('-createdAt')
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Order.countDocuments(query);

    res.json({
      success: true,
      count: orders.length,
      total,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      },
      data: orders
    });
  } catch (error) {
    console.error('Get all orders error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch orders'
    });
  }
};

// @desc    Update order status
// @route   PUT /api/admin/orders/:id/status
// @access  Private/Admin
const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    ).populate('user', 'firstName lastName email');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Notify user about status change (async)
    try {
      if (order && order.user && order.user.email) {
        sendEmail({
          email: order.user.email,
          subject: `Order ${order.orderId} - Status Updated`,
          html: emailTemplates.orderStatusUpdate(order.user.firstName || '', order, status)
        }).catch((e) => console.error('Failed to send order status email:', e));
      }
    } catch (e) {
      console.error('Order status notification error:', e);
    }

    res.json({
      success: true,
      message: 'Order status updated successfully',
      data: order
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update order status'
    });
  }
};

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
const getAllUsers = async (req, res) => {
  try {
    const { verified, page = 1, limit = 10 } = req.query;

    const query = { role: 'student' };
    if (verified !== undefined) {
      query.isVerified = verified === 'true';
    }

    const users = await User.find(query)
      .select('-password')
      .sort('-createdAt')
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      count: users.length,
      total,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      },
      data: users
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch users'
    });
  }
};

module.exports = {
  getDashboardStats,
  getAllOrders,
  updateOrderStatus,
  getAllUsers
};