import mongoose from 'mongoose';

const adminSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    password: {
      type: String,
      required: true
    },
    qrCode: {
      type: String,
      default: null,
      description: 'URL to admin QR code for wallet top-ups'
    }
  },
  { timestamps: true }
);

export default mongoose.model('Admin', adminSchema);

