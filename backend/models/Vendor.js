import mongoose from 'mongoose';

const vendorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: '',
    trim: true
  },
  phone: {
    type: String,
    required: true,
    unique: true,
    match: /^[0-9]{10}$/
  },
  password: {
    type: String,
    required: true,
    minlength: 8
  },
  serviceType: {
    type: String,
    enum: ['food', 'salon', 'doctor', 'milk', 'grocery', 'service'],
    default: 'food'
  },
  category: {
    type: String,
    default: 'other'
  },
  location: {
    lat: {
      type: Number,
      required: true
    },
    lng: {
      type: Number,
      required: true
    },
    address: {
      type: String,
      default: ''
    }
  },
  image: {
    type: String,
    default: '/images/vendor-placeholder.jpg'
  },
  qrCode: {
    type: String,
    default: null,
    description: 'URL to vendor QR code for UPI payments'
  },
  upiId: {
    type: String,
    default: null,
    trim: true,
    description: 'Vendor UPI ID for payments (e.g., vendor@upi, vendor@paytm)'
  },
  isOpen: {
    type: Boolean,
    default: true
  },
  rating: {
    type: Number,
    default: 4.0,
    min: 0,
    max: 5
  },
  totalOrders: {
    type: Number,
    default: 0
  },
  currentWaitingTime: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true
});

export default mongoose.model('Vendor', vendorSchema);

