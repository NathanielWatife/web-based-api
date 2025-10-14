const Order = require('../models/Order');
const Book = require('../models/Book');
const User = require('../models/User');
const { sendEmail } = require('../config/emailConfig');
const { orderConfirmationTemplate } = require('../utils/emailTemplates');
const { formatResponse, paginate } = require('../utils/helpers');

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
const createOrder = async (req, res, next) => {
  try {
    const { items, pickupOption, paymentReference } = req.body;
    const userId = req.user._id;

    // Validate items
    if (!items || items.length === 0) {
      return res.status(400).json(
        formatResponse(false, 'Order must have at least one item')
      );
    }

    // Check stock availability and calculate total
    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      const book = await Book.findById(item.book);
      
      if (!book) {
        return res.status(404).json(
          formatResponse(false, `Book with ID ${item.book} not found`)
        );
      }

      if (!book.isAvailable || book.stockQuantity < item.quantity) {
        return res.status(400).json(
          formatResponse(false, `Insufficient stock for ${book.title}. Available: ${book.stockQuantity}`)
        );
      }

      orderItems.push({
        book: book._id,
        quantity: item.quantity,
        price: book.price
      });

      totalAmount += item.quantity * book.price;
    }

    // Create order
    const order = await Order.create({
      user: userId,
      items: orderItems,
      totalAmount,
      pickupOption,
      paymentReference,
      paymentStatus: paymentReference ? 'paid' : 'pending',
      shippingAddress: {
        fullName: req.user.fullName,
        matricNo: req.user.matricNo,
        department: req.user.matricNo.split('/')[0] // Extract department from matric number
      }
    });

    // Update book stock quantities
    for (const item of items) {
      await Book.findByIdAndUpdate(
        item.book,
        { $inc: { stockQuantity: -item.quantity } },
        { new: true }
      );
    }

    // Check if any books are out of stock after this order
    const updatedBooks = await Book.find({ _id: { $in: items.map(item => item.book) } });
    for (const book of updatedBooks) {
      if (book.stockQuantity === 0) {
        book.isAvailable = false;
        await book.save();
      }
    }

    // Send order confirmation email
    const user = await User.findById(userId);
    const emailResult = await sendEmail({
      email: user.email,
      subject: 'Order Confirmation - YabaTech Bookstore',
      html: orderConfirmationTemplate(order, user)
    });

    if (!emailResult.success) {
      console.error('Failed to send order confirmation email:', emailResult.error);
    }

    // Populate order details for response
    await order.populate('items.book', 'title author imageUrl');

    res.status(201).json(
      formatResponse(true, 'Order created successfully', {
        order,
        emailSent: emailResult.success
      })
    );
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's orders
// @route   GET /api/orders/my-orders
// @access  Private
const getMyOrders = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const userId = req.user._id;

    const { skip, limit: paginateLimit } = paginate(Number(page), Number(limit));

    const orders = await Order.find({ user: userId })
      .populate('items.book', 'title author imageUrl price')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(paginateLimit);

    const total = await Order.countDocuments({ user: userId });
    const totalPages = Math.ceil(total / paginateLimit);

    res.json(
      formatResponse(true, 'Orders retrieved successfully', {
        orders,
        pagination: {
          currentPage: Number(page),
          totalPages,
          totalOrders: total,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      })
    );
  } catch (error) {
    next(error);
  }
};

// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Private
const getOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'matricNo fullName email')
      .populate('items.book', 'title author imageUrl isbn');

    if (!order) {
      return res.status(404).json(
        formatResponse(false, 'Order not found')
      );
    }

    // Check if user owns the order or is admin
    if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json(
        formatResponse(false, 'Not authorized to access this order')
      );
    }

    res.json(
      formatResponse(true, 'Order retrieved successfully', { order })
    );
  } catch (error) {
    next(error);
  }
};

// @desc    Update order status
// @route   PUT /api/admin/orders/:id
// @access  Private/Admin
const updateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    const order = await Order.findById(req.params.id)
      .populate('user', 'email fullName');

    if (!order) {
      return res.status(404).json(
        formatResponse(false, 'Order not found')
      );
    }

    order.status = status;
    await order.save();

    // Send status update email
    const emailResult = await sendEmail({
      email: order.user.email,
      subject: `Order Status Update - ${order._id}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2c5aa0; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .status { padding: 10px; background: #e7f3ff; border-left: 4px solid #2c5aa0; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Order Status Update</h1>
            </div>
            <div class="content">
              <h2>Hello ${order.user.fullName},</h2>
              <p>Your order status has been updated:</p>
              <div class="status">
                <h3>Order ID: ${order._id}</h3>
                <p><strong>New Status:</strong> ${status}</p>
                <p><strong>Pickup Location:</strong> ${order.pickupOption}</p>
                <p><strong>Total Amount:</strong> ₦${order.totalAmount}</p>
              </div>
              <p>You can check your order details in your account dashboard.</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} YabaTech Bookstore. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    });

    if (!emailResult.success) {
      console.error('Failed to send status update email:', emailResult.error);
    }

    res.json(
      formatResponse(true, 'Order status updated successfully', {
        order,
        emailSent: emailResult.success
      })
    );
  } catch (error) {
    next(error);
  }
};

// @desc    Get all orders (Admin)
// @route   GET /api/admin/orders
// @access  Private/Admin
const getAllOrders = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    // Build query
    let query = {};
    if (status) {
      query.status = status;
    }

    const { skip, limit: paginateLimit } = paginate(Number(page), Number(limit));

    const orders = await Order.find(query)
      .populate('user', 'matricNo fullName email')
      .populate('items.book', 'title author')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(paginateLimit);

    const total = await Order.countDocuments(query);
    const totalPages = Math.ceil(total / paginateLimit);

    // Get order statistics
    const stats = await Order.aggregate([
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' },
          pendingOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          completedOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          }
        }
      }
    ]);

    res.json(
      formatResponse(true, 'Orders retrieved successfully', {
        orders,
        pagination: {
          currentPage: Number(page),
          totalPages,
          totalOrders: total,
          hasNext: page < totalPages,
          hasPrev: page > 1
        },
        stats: stats[0] || {
          totalOrders: 0,
          totalRevenue: 0,
          pendingOrders: 0,
          completedOrders: 0
        }
      })
    );
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel order
// @route   PUT /api/orders/:id/cancel
// @access  Private
const cancelOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json(
        formatResponse(false, 'Order not found')
      );
    }

    // Check if user owns the order
    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json(
        formatResponse(false, 'Not authorized to cancel this order')
      );
    }

    // Check if order can be cancelled
    if (['completed', 'cancelled'].includes(order.status)) {
      return res.status(400).json(
        formatResponse(false, `Cannot cancel order with status: ${order.status}`)
      );
    }

    // Restore book stock
    for (const item of order.items) {
      await Book.findByIdAndUpdate(
        item.book,
        { $inc: { stockQuantity: item.quantity } },
        { new: true }
      );
    }

    // Update order status
    order.status = 'cancelled';
    await order.save();

    res.json(
      formatResponse(true, 'Order cancelled successfully', { order })
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getOrder,
  updateOrderStatus,
  getAllOrders,
  cancelOrder
};