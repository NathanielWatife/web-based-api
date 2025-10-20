const Order = require('../models/Order');
const paystack = require('paystack-node');

// Initialize Paystack client
const paystackClient = process.env.PAYSTACK_SECRET_KEY 
  ? new paystack(process.env.PAYSTACK_SECRET_KEY)
  : null;

// Initialize Flutterwave client conditionally
let flw = null;
if (process.env.FLUTTERWAVE_SECRET_KEY) {
  try {
    const Flutterwave = require('flutterwave-node-v3');
    flw = new Flutterwave(process.env.FLUTTERWAVE_SECRET_KEY);
  } catch (error) {
    console.warn('Flutterwave SDK not available:', error.message);
  }
}

// @desc    Initialize payment
// @route   POST /api/payments/initialize
// @access  Private
const initializePayment = async (req, res) => {
  try {
    const { orderId, paymentMethod } = req.body;

    const order = await Order.findById(orderId).populate('user', 'email firstName lastName');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if order belongs to user
    if (order.user._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this order'
      });
    }

    if (paymentMethod === 'paystack' && paystackClient) {
      // Initialize Paystack payment
      const response = await paystackClient.initializeTransaction({
        email: order.user.email,
        amount: order.totalAmount * 100, // Convert to kobo
        reference: `PSK_${order.orderId}_${Date.now()}`,
        metadata: {
          orderId: order._id.toString(),
          matricNo: req.user.matricNo,
          custom_fields: [
            {
              display_name: "Matric Number",
              variable_name: "matric_number",
              value: req.user.matricNo
            },
            {
              display_name: "Order ID",
              variable_name: "order_id",
              value: order.orderId
            }
          ]
        }
      });

      if (response.status) {
        // Update order with payment reference
        order.paymentReference = response.data.reference;
        order.paymentMethod = 'paystack';
        await order.save();

        res.json({
          success: true,
          data: {
            authorizationUrl: response.data.authorization_url,
            reference: response.data.reference
          }
        });
      } else {
        throw new Error(response.message);
      }
    } else if (paymentMethod === 'flutterwave' && flw) {
      // Initialize Flutterwave payment
      const payload = {
        tx_ref: `FLW_${order.orderId}_${Date.now()}`,
        amount: order.totalAmount,
        currency: 'NGN',
        payment_options: 'card, banktransfer, ussd',
        redirect_url: `${process.env.CLIENT_URL}/orders/${order._id}`,
        customer: {
          email: order.user.email,
          name: `${order.user.firstName} ${order.user.lastName}`
        },
        customizations: {
          title: 'YabaTech BookStore',
          description: `Payment for Order ${order.orderId}`,
          logo: `${process.env.CLIENT_URL}/logo.png`
        },
        meta: {
          orderId: order._id.toString(),
          matricNo: req.user.matricNo
        }
      };

      const response = await flw.Payment.initialize(payload);

      if (response.status === 'success') {
        // Update order with payment reference
        order.paymentReference = payload.tx_ref;
        order.paymentMethod = 'flutterwave';
        await order.save();

        res.json({
          success: true,
          data: {
            authorizationUrl: response.data.link,
            reference: payload.tx_ref
          }
        });
      } else {
        throw new Error(response.message);
      }
    } else {
      // Mock payment for development
      if (process.env.NODE_ENV === 'development') {
        const reference = `MOCK_${order.orderId}_${Date.now()}`;
        
        order.paymentReference = reference;
        order.paymentMethod = 'mock';
        await order.save();

        res.json({
          success: true,
          data: {
            authorizationUrl: `${process.env.CLIENT_URL}/orders/${order._id}`,
            reference: reference,
            mock: true
          }
        });
      } else {
        return res.status(400).json({
          success: false,
          message: 'Payment method not available or not configured'
        });
      }
    }
  } catch (error) {
    console.error('Initialize payment error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to initialize payment'
    });
  }
};

// @desc    Verify payment
// @route   GET /api/payments/verify/:reference
// @access  Private
const verifyPayment = async (req, res) => {
  try {
    const { reference } = req.params;

    const order = await Order.findOne({ paymentReference: reference });

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

    let verification;

    if (order.paymentMethod === 'paystack' && paystackClient) {
      verification = await paystackClient.verifyTransaction({ reference });
      
      if (verification.status && verification.data.status === 'success') {
        order.paymentStatus = 'successful';
        order.status = 'confirmed'; // Move to confirmed status
        await order.save();

        res.json({
          success: true,
          message: 'Payment verified successfully',
          data: {
            status: 'successful',
            order: order
          }
        });
      } else {
        order.paymentStatus = 'failed';
        await order.save();

        res.json({
          success: false,
          message: 'Payment verification failed',
          data: {
            status: 'failed'
          }
        });
      }
    } else if (order.paymentMethod === 'flutterwave' && flw) {
      verification = await flw.Transaction.verify({ id: reference });

      if (verification.status === 'success' && verification.data.status === 'successful') {
        order.paymentStatus = 'successful';
        order.status = 'confirmed';
        await order.save();

        res.json({
          success: true,
          message: 'Payment verified successfully',
          data: {
            status: 'successful',
            order: order
          }
        });
      } else {
        order.paymentStatus = 'failed';
        await order.save();

        res.json({
          success: false,
          message: 'Payment verification failed',
          data: {
            status: 'failed'
          }
        });
      }
    } else if (order.paymentMethod === 'mock') {
      // Mock verification for development
      order.paymentStatus = 'successful';
      order.status = 'confirmed';
      await order.save();

      res.json({
        success: true,
        message: 'Payment verified successfully (Mock)',
        data: {
          status: 'successful',
          order: order,
          mock: true
        }
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment method or payment gateway not configured'
      });
    }
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to verify payment'
    });
  }
};

module.exports = {
  initializePayment,
  verifyPayment
};