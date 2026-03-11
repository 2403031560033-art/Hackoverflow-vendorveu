import mongoose from 'mongoose';

const menuItemSchema = new mongoose.Schema({
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  image: {
    type: String,
    default: '/images/menu-placeholder.jpg'
  },
  category: {
    type: String,
    default: 'other'
  },
  inStock: {
    type: Boolean,
    default: true
  },
  preparationTime: {
    type: Number,
    default: 10,
    min: 1
  }
}, {
  timestamps: true
});

export default mongoose.model('MenuItem', menuItemSchema);

