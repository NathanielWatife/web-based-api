const User = require('../models/User');
const Order = require('../models/Order');
const { formatResponse, paginate } = require('../utils/helpers');

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password');

    if (!user) {
      return res.status(404).json(
        formatResponse(false, 'User not found')
      );
    }

    // Get user's order statistics
    const orderStats = await Order.aggregate([
      { $match: { user: user._id } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: '$totalAmount' },
          pendingOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          }
        }
      }
    ]);

    const stats = orderStats[0] || {
      totalOrders: 0,
      totalSpent: 0,
      pendingOrders: 0
    };

    res.json(
      formatResponse(true, 'User profile retrieved successfully', {
        user,
        stats
      })
    );
  } catch (error) {
    next(error);
  }
};

// @desc    Get all users (Admin)
// @route   GET /api/admin/users
// @access  Private/Admin
const getAllUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, role } = req.query;

    // Build query
    let query = {};
    if (role) {
      query.role = role;
    }

    const { skip, limit: paginateLimit } = paginate(Number(page), Number(limit));

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(paginateLimit);

    const total = await User.countDocuments(query);
    const totalPages = Math.ceil(total / paginateLimit);

    res.json(
      formatResponse(true, 'Users retrieved successfully', {
        users,
        pagination: {
          currentPage: Number(page),
          totalPages,
          totalUsers: total,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      })
    );
  } catch (error) {
    next(error);
  }
};

// @desc    Update user role (Admin)
// @route   PUT /api/admin/users/:id/role
// @access  Private/Admin
const updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json(
        formatResponse(false, 'User not found')
      );
    }

    user.role = role;
    await user.save();

    res.json(
      formatResponse(true, 'User role updated successfully', {
        user: {
          _id: user._id,
          matricNo: user.matricNo,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          isEmailVerified: user.isEmailVerified
        }
      })
    );
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user (Admin)
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json(
        formatResponse(false, 'User not found')
      );
    }

    // Check if user has orders
    const userOrders = await Order.countDocuments({ user: user._id });
    if (userOrders > 0) {
      return res.status(400).json(
        formatResponse(false, 'Cannot delete user with existing orders')
      );
    }

    await User.findByIdAndDelete(req.params.id);

    res.json(
      formatResponse(true, 'User deleted successfully')
    );
  } catch (error) {
    next(error);
  }
};

// @desc    Get user dashboard statistics
// @route   GET /api/users/dashboard
// @access  Private
const getUserDashboard = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Get recent orders
    const recentOrders = await Order.find({ user: userId })
      .populate('items.book', 'title imageUrl')
      .sort({ createdAt: -1 })
      .limit(5);

    // Get order statistics
    const orderStats = await Order.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: '$totalAmount' },
          pendingOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          completedOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          }
        }
      }
    ]);

    const stats = orderStats[0] || {
      totalOrders: 0,
      totalSpent: 0,
      pendingOrders: 0,
      completedOrders: 0
    };

    res.json(
      formatResponse(true, 'Dashboard data retrieved successfully', {
        recentOrders,
        stats
      })
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUserProfile,
  getAllUsers,
  updateUserRole,
  deleteUser,
  getUserDashboard
};