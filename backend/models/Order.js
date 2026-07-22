import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  menuItemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MenuItem',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  quantity: {
    type: Number,
    default: 1,
    min: 1
  }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: Number,
    unique: true,
    index: true
  },
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true
  },
  customerName: {
    type: String,
    required: function() { return this.orderSource !== 'walkin'; },
    trim: true
  },
  customerPhone: {
    type: String,
    required: function() { return this.orderSource !== 'walkin'; },
    match: /^[0-9]{10}$/,
    default: null
  },
  items: [orderItemSchema],
  total: {
    type: Number,
    required: true,
    min: 0
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'upi', 'wallet', 'wallet-cash', 'razorpay'],
    required: true
  },
  walletAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  cashAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  otp: {
    type: String,
    required: function() { return this.orderSource !== 'walkin'; },
    match: /^[0-9]{4}$/,
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'preparing', 'ready', 'completed', 'cancelled'],
    default: 'pending'
  },
  estimatedTime: {
    type: Number,
    default: 10
  },
  notes: {
    type: String,
    default: ''
  },
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  ratingComment: {
    type: String,
    default: ''
  },
  // Shared Queue fields
  orderSource: {
    type: String,
    enum: ['online', 'walkin'],
    default: 'online'
  },
  estimatedPickupTime: {
    type: Date,
    default: null
  },
  // QR Token Pickup fields
  pickupToken: {
    type: String,
    unique: true,
    sparse: true,
    default: null
  },
  pickupTokenUsed: {
    type: Boolean,
    default: false
  },
  pickupTokenExpiresAt: {
    type: Date,
    default: null
  },
  // Web3 Receipt Integrity
  receiptHash: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Auto-increment orderNumber and generate E-Token before saving
orderSchema.pre('save', async function(next) {
  if (!this.orderNumber) {
    const lastOrder = await mongoose.model('Order').findOne().sort({ orderNumber: -1 });
    this.orderNumber = lastOrder ? lastOrder.orderNumber + 1 : 1;
  }
  if (!this.pickupToken) {
    const hash = crypto.randomBytes(3).toString('hex').toUpperCase();
    const payStr = (this.paymentMethod || 'UPI').toUpperCase();
    this.pickupToken = `ETOKEN-ORD#${this.orderNumber}-PAID₹${this.total}-${payStr}-${hash}`;
  }
  next();
});

export default mongoose.model('Order', orderSchema);

