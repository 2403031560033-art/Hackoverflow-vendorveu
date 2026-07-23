import Razorpay from 'razorpay';
import crypto from 'crypto';
import Order from '../models/Order.js';
import Customer from '../models/Customer.js';
import Vendor from '../models/Vendor.js';

let razorpay = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  try {
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });
  } catch (err) {
    console.error('Razorpay initialization warning:', err);
  }
}

export const createRazorpayOrder = async (req, res) => {
  try {
    const { amount, currency = 'INR', receipt, customerId, orderId } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const key_id = process.env.RAZORPAY_KEY_ID || 'rzp_test_vendorvue_mock';

    if (razorpay) {
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

      return res.json({
        success: true,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        key_id
      });
    } else {
      // Mock order creation when Razorpay API key is not configured in .env
      const mockOrderId = `order_rzp_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      return res.json({
        success: true,
        orderId: mockOrderId,
        amount: Math.round(amount * 100),
        currency,
        key_id,
        isMock: true
      });
    }
  } catch (error) {
    console.error('Razorpay order creation error:', error);
    res.status(500).json({ error: error.message || 'Failed to create Razorpay order' });
  }
};

export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId, customerId } = req.body;

    // Verify signature if key_secret is set
    if (process.env.RAZORPAY_KEY_SECRET && razorpay_signature) {
      const body = `${razorpay_order_id}|${razorpay_payment_id}`;
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body)
        .digest('hex');

      if (expectedSignature !== razorpay_signature) {
        return res.status(400).json({ error: 'Payment verification failed' });
      }
    }

    let order = null;
    if (orderId) {
      order = await Order.findById(orderId);
      if (order && order.paymentStatus !== 'paid') {
        order.paymentStatus = 'paid';
        order.status = 'pending';
        order.transactionId = razorpay_payment_id || `pay_${Date.now()}`;
        order.razorpayOrderId = razorpay_order_id || `ord_${Date.now()}`;
        
        order.otp = Math.floor(1000 + Math.random() * 9000).toString();
        
        const vendor = await Vendor.findById(order.vendorId);
        const activeOrders = await Order.countDocuments({ vendorId: order.vendorId, status: { $in: ['pending', 'preparing'] } });
        const totalQueueSize = activeOrders + (vendor?.walkInCount || 0);
        const avgPrepTime = vendor?.avgPrepTimeMinutes || 10;
        order.estimatedPickupTime = new Date(Date.now() + (totalQueueSize * avgPrepTime) * 60000);

        await order.save();
        
        if (order.walletAmount > 0) {
          const customer = await Customer.findOne({ phone: order.customerPhone });
          if (customer) {
            customer.walletBalance -= order.walletAmount;
            customer.transactions.push({
              type: 'debit',
              amount: order.walletAmount,
              orderId: order._id,
              description: `Wallet Payment for Order #${order.orderNumber}`
            });
            await customer.save();
          }
        }
        
        await Vendor.findByIdAndUpdate(order.vendorId, { $inc: { totalOrders: 1 } });
      }
    }

    if (customerId && order) {
      await Customer.updateOne(
        { phone: customerId },
        {
          $push: {
            transactions: {
              type: 'payment',
              amount: order.total,
              description: `Order #${order.orderNumber || orderId} - Razorpay Payment`,
              paymentId: razorpay_payment_id || `pay_${Date.now()}`,
              date: new Date()
            }
          }
        }
      );
    }

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
