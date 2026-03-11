import mongoose from 'mongoose';

const supportMessageSchema = new mongoose.Schema({
  senderType: {
    type: String,
    enum: ['customer', 'vendor', 'admin'],
    required: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'senderTypeModel'
  },
  senderTypeModel: {
    type: String,
    enum: ['Customer', 'Vendor', 'Admin'],
    required: true
  },
  recipientType: {
    type: String,
    enum: ['customer', 'vendor', 'admin'],
    required: true
  },
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'recipientTypeModel'
  },
  recipientTypeModel: {
    type: String,
    enum: ['Customer', 'Vendor', 'Admin'],
    required: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  threadId: {
    type: String,
    required: true,
    index: true
  },
  isRead: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for efficient querying
supportMessageSchema.index({ threadId: 1, createdAt: -1 });
supportMessageSchema.index({ recipientId: 1, recipientType: 1, isRead: 1 });

export default mongoose.model('SupportMessage', supportMessageSchema);
