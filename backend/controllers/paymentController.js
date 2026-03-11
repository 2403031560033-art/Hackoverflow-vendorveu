import Razorpay from 'razorpay';
import crypto from 'crypto';
import Order from '../models/Order.js';
import Customer from '../models/Customer.js';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

export const createRazorpayOrder = async (req, res) => {
  try {
    const { amount, currency = 'INR', receipt, customerId, orderId } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const options = {
      amount: Math.round(amount * 100), // Razorpay expects amount in paise
      currency,
      receipt: receipt || `order_${Date.now()}`,
      payment_capture: 1, // Auto-capture payment
      notes: {
        customerId,
        orderId,
        description: 'VendorVue Order Payment'
      }
    };

    const order = await razorpay.orders.create(options);

    res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    console.error('Razorpay order creation error:', error);
    res.status(500).json({ error: error.message || 'Failed to create Razorpay order' });
  }
};

export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId, customerId } = req.body;

    // Verify signature
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: 'Payment verification failed' });
    }

    // Update order payment status
    const order = await Order.findByIdAndUpdate(
      orderId,
      {
        paymentStatus: 'paid',
        paymentMethod: 'razorpay',
        razorpayPaymentId: razorpay_payment_id,
        razorpayOrderId: razorpay_order_id,
        paidAt: new Date()
      },
      { new: true }
    );

    // Update customer wallet transaction if needed
    await Customer.updateOne(
      { phone: customerId },
      {
        $push: {
          transactions: {
            type: 'payment',
            amount: order.totalAmount,
            description: `Order #${orderId} - Razorpay Payment`,
            paymentId: razorpay_payment_id,
            date: new Date()
          }
        }
      }
    );

    res.json({
      success: true,
      message: 'Payment verified successfully',
      order
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ error: error.message || 'Payment verification failed' });
  }
};

export const addToWalletViaRazorpay = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount, customerPhone } = req.body;

    // Verify signature
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: 'Payment verification failed' });
    }

    // Update customer wallet
    const customer = await Customer.findOneAndUpdate(
      { phone: customerPhone },
      {
        $inc: { 'wallet.balance': amount },
        $push: {
          'wallet.transactions': {
            type: 'credit',
            amount,
            method: 'razorpay',
            description: 'Wallet Top-up via UPI',
            paymentId: razorpay_payment_id,
            date: new Date()
          }
        }
      },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Wallet updated successfully',
      balance: customer.wallet.balance,
      transactions: customer.wallet.transactions
    });
  } catch (error) {
    console.error('Wallet update error:', error);
    res.status(500).json({ error: error.message || 'Failed to update wallet' });
  }
};

export const getRazorpayKey = (req, res) => {
  try {
    res.json({
      key_id: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get Razorpay key' });
  }
};
