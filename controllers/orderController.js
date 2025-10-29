const Order = require('../models/Order');
const Book = require('../models/Book');
const { sendEmail, emailTemplates } = require('../utils/sendEmail');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
const createOrder = async (req, res) => {
  try {
    const { items, totalAmount, deliveryOption, deliveryAddress, notes } = req.body;

    // Validate stock availability
    for (const item of items) {
      const book = await Book.findById(item.book);
      if (!book) {
        return res.status(404).json({
          success: false,
          message: `Book not found: ${item.book}`
        });
      }
      if (book.stockQuantity < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for: ${book.title}. Available: ${book.stockQuantity}`
        });
      }
    }

    const order = await Order.create({
      user: req.user.id,
      items,
      totalAmount,
      deliveryOption,
      deliveryAddress: deliveryOption === 'delivery' ? deliveryAddress : undefined,
      notes
    });

    // Populate order with book details
    await order.populate('items.book', 'title author imageUrl');

    // Send order confirmation email asynchronously so that email delays
    // (e.g. unconfigured SMTP, external SMTP slowness) don't block the
    // API response or cause client-side request timeouts.
    sendEmail({
      email: req.user.email,
      subject: 'Order Confirmed - YabaTech BookStore',
      html: emailTemplates.orderConfirmation(req.user.firstName, order)
    })
      .then((info) => console.log('Async order confirmation email result:', info?.messageId || 'ok'))
      .catch((emailError) => console.error('Order confirmation email failed:', emailError));

    // Notify admin about new order (non-blocking)
    if (ADMIN_EMAIL) {
      // send a simplified admin notification; include student info and items
      sendEmail({
        email: ADMIN_EMAIL,
        subject: `New Order Placed - ${order.orderId}`,
        html: emailTemplates.adminNewOrder('Admin', order, {
          firstName: req.user.firstName,
          lastName: req.user.lastName,
          matricNo: req.user.matricNo
        })
      }).catch((e) => console.error('Admin notification email failed:', e));
    }

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: order
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create order'
    });
  }
};

// @desc    Get user's orders
// @route   GET /api/orders/my-orders
// @access  Private
const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id })
      .populate('items.book', 'title author imageUrl isbn')
      .sort('-createdAt');

    res.json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    console.error('Get my orders error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch orders'
    });
  }
};

// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Private
const getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'firstName lastName email matricNo phoneNumber')
      .populate('items.book', 'title author imageUrl isbn category');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if order belongs to user or user is admin
    if (order.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this order'
      });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch order'
    });
  }
};

// @desc    Cancel order
// @route   PUT /api/orders/:id/cancel
// @access  Private
const cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if order belongs to user
    if (order.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this order'
      });
    }

    // Check if order can be cancelled
    if (!['pending', 'confirmed'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: 'Order cannot be cancelled at this stage'
      });
    }

    order.status = 'cancelled';
    await order.save();

    // Restore stock if order was confirmed
    if (order.status === 'confirmed') {
      for (const item of order.items) {
        await Book.findByIdAndUpdate(
          item.book,
          { $inc: { stockQuantity: item.quantity } }
        );
      }
    }

    res.json({
      success: true,
      message: 'Order cancelled successfully',
      data: order
    });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to cancel order'
    });
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getOrder,
  cancelOrder
};