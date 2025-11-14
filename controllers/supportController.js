const SupportTicket = require('../models/SupportTicket');
const Order = require('../models/Order');

exports.listTickets = async (req, res) => {
  try {
    const { status, page = 1, limit = 20, q } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (q) filter.$or = [
      { subject: new RegExp(q, 'i') },
      { description: new RegExp(q, 'i') },
      { ticketId: new RegExp(q, 'i') },
    ];

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      SupportTicket.find(filter)
        .populate('user', 'firstName lastName email')
        .populate('order', 'orderId status paymentStatus')
        .sort({ lastActivityAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      SupportTicket.countDocuments(filter),
    ]);

    res.json({ success: true, data: { items, page: Number(page), limit: Number(limit), total } });
  } catch (err) {
    res.status(500).json({ success: false, message: err?.message || 'Failed to list tickets' });
  }
};

exports.getMyTickets = async (req, res) => {
  try {
    const userId = req.user._id;
    const items = await SupportTicket.find({ user: userId })
      .populate('order', 'orderId status paymentStatus')
      .sort({ lastActivityAt: -1 })
      .limit(100);
    res.json({ success: true, data: { items } });
  } catch (err) {
    res.status(500).json({ success: false, message: err?.message || 'Failed to load your tickets' });
  }
};

exports.getTicketById = async (req, res) => {
  try {
    const ticket = await SupportTicket.findOne({ _id: req.params.id })
      .populate('user', 'firstName lastName email')
      .populate('order', 'orderId status paymentStatus');
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

    // Allow owner or admin only
    if (req.user.role !== 'admin' && ticket.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    res.json({ success: true, data: ticket });
  } catch (err) {
    res.status(500).json({ success: false, message: err?.message || 'Failed to get ticket' });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['open', 'in-progress', 'resolved', 'closed'];
    if (!allowed.includes(status)) return res.status(400).json({ success: false, message: 'Invalid status' });

    const ticket = await SupportTicket.findByIdAndUpdate(
      req.params.id,
      { status, updatedAt: Date.now() },
      { new: true }
    );
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
    res.json({ success: true, data: ticket });
  } catch (err) {
    res.status(500).json({ success: false, message: err?.message || 'Failed to update status' });
  }
};

exports.replyToTicket = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ success: false, message: 'Reply text is required' });
    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

    ticket.messages.push({ sender: 'admin', text });
    ticket.lastActivityAt = Date.now();
    await ticket.save();

    res.json({ success: true, data: ticket });
  } catch (err) {
    res.status(500).json({ success: false, message: err?.message || 'Failed to send reply' });
  }
};
