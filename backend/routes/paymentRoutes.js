import express from 'express';
import {
  createRazorpayOrder,
  verifyPayment,
  addToWalletViaRazorpay,
  getRazorpayKey
} from '../controllers/paymentController.js';

const router = express.Router();

// Get Razorpay key
router.get('/razorpay-key', getRazorpayKey);

// Create Razorpay order
router.post('/create-order', createRazorpayOrder);

// Verify payment signature
router.post('/verify-payment', verifyPayment);

// Add money to wallet via Razorpay
router.post('/add-wallet', addToWalletViaRazorpay);

export default router;
