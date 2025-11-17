const Order = require('../models/Order');
const PaymentMethod = require('../models/PaymentMethod');
const PaymentEvent = require('../models/PaymentEvent');
const paystack = require('paystack-node');
const crypto = require('crypto');
const { logger } = require('../utils/logger');
const { encrypt } = require('../utils/crypto');

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
    logger.warn('Flutterwave SDK not available: ' + error.message);
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
      flutterwaveWebhook
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
        redirect_url: `${process.env.FRONTEND_URL}/orders/${order._id}`,
        customer: {
          email: order.user.email,
          name: `${order.user.firstName} ${order.user.lastName}`
        },
        customizations: {
          title: 'YabaTech BookStore',
          description: `Payment for Order ${order.orderId}`,
          logo: `${process.env.FRONTEND_URL}/logo.png`
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
      return res.status(400).json({
        success: false,
        message: 'Payment method not available or not configured'
      });
    }
  } catch (error) {
    logger.error('Initialize payment error: ' + (error?.message || error));
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

    const order = await Order.findOne({ paymentReference: reference }).populate('user', 'firstName lastName email matricNo');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if order belongs to user
    if (order.user && order.user._id && order.user._id.toString() !== req.user.id) {
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
        order.status = 'confirmed';
        await order.save();

        // Notify user about confirmed payment/order
        try {
          if (order.user && order.user.email) {
            const { sendEmail, emailTemplates } = require('../utils/sendEmail');
            sendEmail({
              email: order.user.email,
              subject: `Payment Confirmed - Order ${order.orderId}`,
              html: emailTemplates.orderStatusUpdate(order.user.firstName || '', order, 'confirmed')
            }).catch((e) => logger.error('Payment confirmation email failed: ' + (e?.message || e)));
          }
        } catch (e) {
          logger.error('Payment email notify error: ' + (e?.message || e));
        }

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

        // Notify user
        try {
          if (order.user && order.user.email) {
            const { sendEmail, emailTemplates } = require('../utils/sendEmail');
            sendEmail({
              email: order.user.email,
              subject: `Payment Confirmed - Order ${order.orderId}`,
              html: emailTemplates.orderStatusUpdate(order.user.firstName || '', order, 'confirmed')
            }).catch((e) => logger.error('Payment confirmation email failed: ' + (e?.message || e)));
          }
        } catch (e) {
          logger.error('Payment email notify error: ' + (e?.message || e));
        }

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
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment method or payment gateway not configured'
      });
    }
  } catch (error) {
    logger.error('Verify payment error: ' + (error?.message || error));
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to verify payment'
    });
  }
};

module.exports = {
  initializePayment,
  verifyPayment,
  paystackWebhook,
  flutterwaveWebhook,
  listPaymentMethods,
  deletePaymentMethod
};

// --- Webhooks ---

// @desc    Paystack webhook receiver
// @route   POST /api/payments/webhook/paystack
// @access  Public (signature verified)
async function paystackWebhook(req, res) {
  try {
    const signature = req.headers['x-paystack-signature'];
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!signature || !secret) return res.status(400).end();

    const computed = crypto
      .createHmac('sha512', secret)
      .update(req.body) // raw buffer
      .digest('hex');

    if (computed !== signature) {
      return res.status(401).end();
    }

    const event = JSON.parse(req.body.toString('utf8'));
    const data = event?.data || {};
    const status = data?.status;
    const metadata = data?.metadata || {};
    const reference = data?.reference;
    const eventId = `${event?.event || 'paystack'}:${data?.id || reference || ''}`;

    // Idempotency: skip if we already processed this event
    try {
      if (eventId) {
        await PaymentEvent.create({
          provider: 'paystack',
          type: 'webhook',
          eventId,
          reference,
          status,
          raw: event,
          processedAt: new Date()
        });
      }
    } catch (e) {
      // duplicate (unique index) → already processed
      return res.status(200).json({ received: true, duplicate: true });
    }

    if (status === 'success') {
      const orderId = metadata.orderId;
      if (orderId) {
        const order = await Order.findById(orderId).populate('user', 'email firstName');
        if (order) {
          order.paymentStatus = 'successful';
          order.status = 'confirmed';
          order.paymentReference = reference || order.paymentReference;
          await order.save();
          try { await PaymentEvent.updateOne({ eventId }, { order: order._id }); } catch (_) {}

          // Save reusable authorization (tokenized) if present
          if (data.authorization && data.authorization.reusable && order.user) {
            try {
              const auth = data.authorization;
              const tokenEnc = encrypt(auth.authorization_code);
              await PaymentMethod.findOneAndUpdate(
                { user: order.user._id, provider: 'paystack', signature: auth.signature },
                {
                  user: order.user._id,
                  provider: 'paystack',
                  tokenEncrypted: tokenEnc,
                  last4: auth.last4,
                  brand: auth.brand,
                  expMonth: String(auth.exp_month || ''),
                  expYear: String(auth.exp_year || ''),
                  reusable: !!auth.reusable,
                  signature: auth.signature,
                },
                { upsert: true, new: true }
              );
            } catch (e) {
              logger.error('Failed to persist reusable authorization: ' + (e?.message || e));
            }
          }
        }
      }
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    logger.error('Paystack webhook error: ' + (err?.message || err));
    return res.status(200).json({ received: true });
  }
}

// --- Admin endpoints ---

// @desc    List payment events (audit/logs)
// @route   GET /api/payments/admin/events
// @access  Admin
async function adminListPaymentEvents(req, res) {
  try {
    const { provider, type, status, limit = 50, page = 1 } = req.query;
    const q = {};
    if (provider) q.provider = provider;
    if (type) q.type = type;
    if (status) q.status = status;
    const skip = (Math.max(Number(page), 1) - 1) * Math.min(Number(limit), 200);
    const events = await PaymentEvent.find(q)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Math.min(Number(limit), 200))
      .populate('order', 'orderId status paymentStatus totalAmount user')
      .lean();
    res.json({ success: true, data: events });
  } catch (e) {
    logger.error('Admin list payment events error: ' + (e?.message || e));
    res.status(500).json({ success: false, message: 'Failed to list payment events' });
  }
}

// @desc    List transactions (orders with payment info)
// @route   GET /api/payments/admin/transactions
// @access  Admin
async function adminListTransactions(req, res) {
  try {
    const { status, paymentStatus, from, to, limit = 50, page = 1 } = req.query;
    const q = {};
    if (status) q.status = status;
    if (paymentStatus) q.paymentStatus = paymentStatus;
    if (from || to) {
      q.createdAt = {};
      if (from) q.createdAt.$gte = new Date(from);
      if (to) q.createdAt.$lte = new Date(to);
    }
    const skip = (Math.max(Number(page), 1) - 1) * Math.min(Number(limit), 200);
    const orders = await Order.find(q)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Math.min(Number(limit), 200))
      .populate('user', 'firstName lastName email matricNo')
      .lean();
    res.json({ success: true, data: orders });
  } catch (e) {
    logger.error('Admin list transactions error: ' + (e?.message || e));
    res.status(500).json({ success: false, message: 'Failed to list transactions' });
  }
}

// @desc    Refund a payment (Paystack supported)
// @route   POST /api/payments/admin/refund
// @access  Admin
async function adminRefundPayment(req, res) {
  try {
    const { orderId, amount, reason } = req.body;
    if (!orderId) return res.status(400).json({ success: false, message: 'orderId is required' });
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.paymentStatus !== 'successful') {
      return res.status(400).json({ success: false, message: 'Only successful payments can be refunded' });
    }

    if (order.paymentMethod === 'paystack' && process.env.PAYSTACK_SECRET_KEY) {
      const payload = {
        reference: order.paymentReference,
      };
      if (amount) payload.amount = Math.round(Number(amount) * 100);
      if (reason) payload.customer_note = String(reason);
      const resp = await fetch('https://api.paystack.co/refund', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
        },
        body: JSON.stringify(payload)
      });
      const data = await resp.json();
      if (!resp.ok || data.status === false) {
        return res.status(400).json({ success: false, message: data?.message || 'Refund failed' });
      }

      try {
        await PaymentEvent.create({
          provider: 'paystack',
          type: 'refund',
          eventId: `refund:${order.paymentReference}:${Date.now()}`,
          reference: order.paymentReference,
          order: order._id,
          status: 'initiated',
          amount: amount ? Number(amount) : undefined,
          raw: data,
          processedAt: new Date()
        });
      } catch (_) {}

      return res.json({ success: true, message: 'Refund initiated', data });
    }

    if (order.paymentMethod === 'flutterwave' && process.env.FLUTTERWAVE_SECRET_KEY) {
      return res.status(501).json({ success: false, message: 'Flutterwave refund not yet implemented' });
    }

    return res.status(400).json({ success: false, message: 'Refund not available for this payment method' });
  } catch (e) {
    logger.error('Admin refund error: ' + (e?.message || e));
    res.status(500).json({ success: false, message: 'Failed to process refund' });
  }
}

// @desc    Flutterwave webhook receiver
// @route   POST /api/payments/webhook/flutterwave
// @access  Public (signature verified)
async function flutterwaveWebhook(req, res) {
  try {
    const hash = req.headers['verif-hash'];
    const secret = process.env.FLUTTERWAVE_SECRET_KEY;
    if (!hash || !secret || hash !== secret) return res.status(401).end();

    const event = req.body || {};
    const data = event?.data || {};
    const status = data?.status;
    const orderId = data?.meta?.orderId;
    const reference = data?.tx_ref || data?.id;
    const eventId = `flutterwave:${data?.id || reference || ''}`;

    try {
      if (eventId) {
        await PaymentEvent.create({
          provider: 'flutterwave',
          type: 'webhook',
          eventId,
          reference,
          status,
          raw: event,
          processedAt: new Date()
        });
      }
    } catch (e) {
      return res.status(200).json({ received: true, duplicate: true });
    }

    if (status === 'successful' && orderId) {
      const order = await Order.findById(orderId).populate('user', 'email firstName');
      if (order) {
        order.paymentStatus = 'successful';
        order.status = 'confirmed';
        order.paymentReference = reference || order.paymentReference;
        await order.save();
        try { await PaymentEvent.updateOne({ eventId }, { order: order._id }); } catch (_) {}
      }
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    logger.error('Flutterwave webhook error: ' + (err?.message || err));
    return res.status(200).json({ received: true });
  }
}

// @desc    List saved payment methods (tokenized, non-sensitive)
// @route   GET /api/payments/methods
// @access  Private
async function listPaymentMethods(req, res) {
  try {
    const methods = await PaymentMethod.find({ user: req.user._id })
      .select('provider last4 brand expMonth expYear reusable createdAt');
    res.json({ success: true, data: methods });
  } catch (e) {
    logger.error('List payment methods error: ' + (e?.message || e));
    res.status(500).json({ success: false, message: 'Failed to list payment methods' });
  }
}

// @desc    Delete a saved payment method
// @route   DELETE /api/payments/methods/:id
// @access  Private
async function deletePaymentMethod(req, res) {
  try {
    const { id } = req.params;
    const method = await PaymentMethod.findOne({ _id: id, user: req.user._id });
    if (!method) return res.status(404).json({ success: false, message: 'Payment method not found' });
    await method.deleteOne();
    res.json({ success: true, message: 'Payment method removed' });
  } catch (e) {
    logger.error('Delete payment method error: ' + (e?.message || e));
    res.status(500).json({ success: false, message: 'Failed to delete payment method' });
  }
}