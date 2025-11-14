const Order = require('../models/Order');
const SupportTicket = require('../models/SupportTicket');
const { logger } = require('../utils/logger');

function extractOrderId(text = '') {
  const m = text.match(/ORD-[0-9]{6}-[0-9]{3}/i);
  return m ? m[0].toUpperCase() : null;
}

function detectIntent(text = '') {
  const t = text.toLowerCase();
  if (/(payment|pay|debit|charge).*(fail|declin|error|unsuccessful)/.test(t)) return 'payment_failed';
  if (/(order).*(status|track|where|progress)/.test(t)) return 'order_status';
  if (/refund|reversal/.test(t)) return 'refund';
  if (/(cancel).*(order)/.test(t)) return 'cancel_order';
  if (/(deliver|pickup).*(when|time|arrive)/.test(t)) return 'delivery_time';
  if (/return|exchange/.test(t)) return 'return_policy';
  if (/human|agent|support|help desk/.test(t)) return 'human';
  return 'fallback';
}

exports.handleMessage = async (req, res) => {
  try {
    const { message = '', context = {} } = req.body || {};
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    const user = req.user;
    const intent = detectIntent(message);
    const possibleOrderId = extractOrderId(message) || context.orderId;
    let order = null;
    let createdTicket = null;
    let reply = '';

    if (possibleOrderId) {
      order = await Order.findOne({ orderId: possibleOrderId }).populate('user');
    }

    switch (intent) {
      case 'payment_failed': {
        if (order) {
          if (order.paymentStatus === 'successful') {
            reply = `I see order ${order.orderId} shows a successful payment. If you were charged twice, the extra charge should auto-reverse within 24–72 hours. Would you like me to open a ticket to review this?`;
          } else {
            reply = `Thanks for the details. I see order ${order.orderId} has payment status: ${order.paymentStatus}. If you were debited, the payment may auto-reverse within 24–72 hours. I've created a support ticket so our admin can review and assist further.`;
          }
        } else {
          reply = `I'm sorry about the failed payment. Please share your Order ID (e.g., ORD-123456-789) and, if available, the payment reference. I've created a support ticket and will attach any details you provide next.`;
        }

        createdTicket = await SupportTicket.create({
          user: user._id,
          order: order?._id,
          subject: `Payment issue${order ? ` for ${order.orderId}` : ''}`,
          description: message,
          origin: 'chatbot',
          priority: 'high',
          messages: [
            { sender: 'user', text: message },
            { sender: 'bot', text: reply, meta: { intent } },
          ],
        });

        break;
      }
      case 'order_status': {
        if (order) {
          reply = `Order ${order.orderId} is currently ${order.status} with payment status ${order.paymentStatus}.`;
        } else {
          reply = `I can help track your order. Please provide your Order ID (e.g., ORD-123456-789).`;
        }
        break;
      }
      case 'refund': {
        reply = `Refunds for failed or reversed payments typically process within 24–72 hours depending on your bank. If you've waited longer, I can open a ticket for manual review. Would you like me to do that?`;
        break;
      }
      case 'cancel_order': {
        if (order) {
          reply = `I can request cancellation for order ${order.orderId} if it's not yet processed. Should I open a ticket to handle this?`;
        } else {
          reply = `Please share your Order ID to request a cancellation. I can open a ticket once I have it.`;
        }
        break;
      }
      case 'delivery_time': {
        reply = `Pickup orders are typically ready within 1–2 business days. Delivery timelines vary by address; once your order is processing, you'll get an update. Share your Order ID if you'd like a specific check.`;
        break;
      }
      case 'return_policy': {
        reply = `You can return items within 7 days if they're in original condition. To start a return, I can create a support ticket for you.`;
        break;
      }
      case 'human': {
        reply = `Sure — connecting you to an admin. I've created a support ticket so the admin can follow up shortly.`;
        createdTicket = await SupportTicket.create({
          user: user._id,
          subject: 'Request to speak with support',
          description: message,
          origin: 'chatbot',
          messages: [
            { sender: 'user', text: message },
            { sender: 'bot', text: reply, meta: { intent } },
          ],
        });
        break;
      }
      default: {
        reply = `I can help with payments, orders, refunds, and returns. Could you please share more details or your Order ID (e.g., ORD-123456-789)?`;
      }
    }

    logger.info('Chatbot handled message', { user: user._id.toString(), intent, order: order?.orderId, ticket: createdTicket?.ticketId });

    return res.json({
      success: true,
      data: {
        intent,
        reply,
        ticketId: createdTicket?.ticketId || null,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err?.message || 'Chatbot error' });
  }
};
