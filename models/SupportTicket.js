const mongoose = require('mongoose');

const ticketMessageSchema = new mongoose.Schema({
  sender: {
    type: String,
    enum: ['user', 'admin', 'bot'],
    required: true,
  },
  text: {
    type: String,
    required: true,
    trim: true,
  },
  meta: {
    type: Object,
    default: {},
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const supportTicketSchema = new mongoose.Schema({
  ticketId: {
    type: String,
    unique: true,
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
  },
  subject: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  status: {
    type: String,
    enum: ['open', 'in-progress', 'resolved', 'closed'],
    default: 'open',
    index: true,
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium',
  },
  origin: {
    type: String,
    enum: ['chatbot', 'manual'],
    default: 'chatbot',
  },
  messages: [ticketMessageSchema],
  lastActivityAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Generate custom Ticket ID and keep timestamps fresh
supportTicketSchema.pre('validate', function (next) {
  if (this.isNew && !this.ticketId) {
    const ts = Date.now().toString().slice(-6);
    const rnd = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.ticketId = `TCK-${ts}-${rnd}`;
  }
  this.updatedAt = Date.now();
  this.lastActivityAt = Date.now();
  next();
});

supportTicketSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  if (this.isModified('messages')) {
    this.lastActivityAt = Date.now();
  }
  next();
});

module.exports = mongoose.model('SupportTicket', supportTicketSchema);
