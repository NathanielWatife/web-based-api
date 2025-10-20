const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  book: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Book',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true
  }
});

const orderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    unique: true,
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [orderItemSchema],
  totalAmount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'ready-for-pickup', 'completed', 'cancelled'],
    default: 'pending'
  },
  deliveryOption: {
    type: String,
    enum: ['pickup', 'delivery'],
    default: 'pickup'
  },
  deliveryAddress: String,
  paymentStatus: {
    type: String,
    enum: ['pending', 'successful', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentReference: String,
  paymentMethod: String,
  notes: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Generate custom order ID before saving
orderSchema.pre('save', function(next) {
  if (this.isNew) {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.orderId = `ORD-${timestamp}-${random}`;
  }
  this.updatedAt = Date.now();
  next();
});

// Update stock quantities when order is confirmed
orderSchema.post('save', async function(doc) {
  if (doc.status === 'confirmed' && doc.paymentStatus === 'successful') {
    const Book = mongoose.model('Book');
    
    for (const item of doc.items) {
      await Book.findByIdAndUpdate(
        item.book,
        { $inc: { stockQuantity: -item.quantity } }
      );
    }
  }
});

module.exports = mongoose.model('Order', orderSchema);