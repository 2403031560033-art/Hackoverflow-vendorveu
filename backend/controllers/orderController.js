import Order from '../models/Order.js';
import Vendor from '../models/Vendor.js';
import Customer from '../models/Customer.js';
import crypto from 'crypto';

export const createOrder = async (req, res) => {
  try {
    const {
      vendorId,
      customerName,
      customerPhone,
      items,
      total,
      paymentMethod,
      walletAmount,
      cashAmount,
      notes
    } = req.body;

    // Check if vendor has paused online ordering
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    if (vendor.onlineOrderingPaused) {
      return res.status(400).json({ error: 'This vendor is not accepting online orders right now. Please try again later.' });
    }

    // Validate COD payment - requires minimum ₹100 wallet balance
    if (paymentMethod === 'cash') {
      const customer = await Customer.findOne({ phone: customerPhone });
      const walletBalance = customer ? customer.walletBalance : 0;
      
      if (walletBalance < 100) {
        return res.status(400).json({ 
          error: 'COD payment requires minimum ₹100 wallet balance. Please add money to wallet first.' 
        });
      }
    }

    // Calculate estimated base prep time from items
    const estimatedTime = items.reduce((max, item) => {
      return Math.max(max, item.preparationTime || 10);
    }, 10);

    const isInstantPaid = paymentMethod === 'wallet' || paymentMethod === 'upi';

    const order = new Order({
      vendorId,
      customerName,
      customerPhone,
      items,
      total,
      paymentMethod,
      walletAmount: walletAmount || 0,
      cashAmount: cashAmount || 0,
      estimatedTime,
      orderSource: 'online',
      notes: notes || '',
      status: isInstantPaid ? 'pending' : 'pending_payment',
      paymentStatus: isInstantPaid ? 'paid' : 'pending'
    });

    if (isInstantPaid) {
       order.otp = Math.floor(1000 + Math.random() * 9000).toString();
       const activeOrders = await Order.countDocuments({ vendorId, status: { $in: ['pending', 'preparing'] } });
       const totalQueueSize = activeOrders + (vendor.walkInCount || 0);
       const avgPrepTime = vendor.avgPrepTimeMinutes || 10;
       order.estimatedPickupTime = new Date(Date.now() + (totalQueueSize * avgPrepTime) * 60000);
    }

    await order.save();

    if (isInstantPaid) {
      // Wallet deduction & Customer/Vendor updates
      await Vendor.findByIdAndUpdate(vendorId, { $inc: { totalOrders: 1 } });
      
      let customer = await Customer.findOne({ phone: customerPhone });
      if (!customer) {
        customer = new Customer({ phone: customerPhone, name: customerName });
      }
      
      customer.walletBalance -= walletAmount;
      customer.transactions.push({
        type: 'debit',
        amount: walletAmount,
        orderId: order._id,
        description: `Payment for Order #${order.orderNumber}`
      });
      customer.totalOrders += 1;
      await customer.save();
    }

    res.status(201).json({
      orderId: order._id,
      orderNumber: order.orderNumber,
      otp: order.otp,
      pickupToken: order.pickupToken,
      estimatedTime: order.estimatedTime,
      estimatedPickupTime: order.estimatedPickupTime,
      status: order.status
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('vendorId', 'name phone location image')
      .populate('items.menuItemId', 'name');

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getOrderByNumber = async (req, res) => {
  try {
    const order = await Order.findOne({ orderNumber: req.params.orderNumber })
      .populate('vendorId', 'name phone location image')
      .populate('items.menuItemId', 'name');

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getVendorOrders = async (req, res) => {
  try {
    const { status } = req.query;
    const query = { vendorId: req.params.vendorId, status: { $nin: ['completed', 'pending_payment', 'failed'] } };
    
    if (status && status !== 'all') {
      query.status = status;
    }

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .populate('items.menuItemId', 'name image');

    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getVendorStats = async (req, res) => {
  try {
    const vendorId = req.params.vendorId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalOrders = await Order.countDocuments({ vendorId });
    const pendingOrders = await Order.countDocuments({ vendorId, status: 'pending' });
    const completedToday = await Order.countDocuments({
      vendorId,
      status: 'completed',
      createdAt: { $gte: today }
    });
    
    const completedOrders = await Order.find({ vendorId, status: 'completed' });
    const totalRevenue = completedOrders.reduce((sum, order) => sum + order.total, 0);

    res.json({
      totalOrders,
      pendingOrders,
      completedOrders: completedToday,
      totalRevenue
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const { status, estimatedTime } = req.body;
    
    // Build update object
    const updateData = { status };
    
    // If status is being updated to 'preparing' and estimatedTime is provided, update it
    if (status === 'preparing' && estimatedTime !== undefined) {
      // Validate estimatedTime is a positive number
      if (typeof estimatedTime !== 'number' || estimatedTime <= 0) {
        return res.status(400).json({ error: 'Estimated time must be a positive number' });
      }
      updateData.estimatedTime = estimatedTime;
    }

    // When marking as 'ready', set QR token expiry (2 hours from now)
    if (status === 'ready') {
      updateData.pickupTokenExpiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
    }
    
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const verifyOTP = async (req, res) => {
  try {
    const { otp } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.otp !== otp) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    if (order.status !== 'ready') {
      return res.status(400).json({ error: 'Order is not ready for pickup' });
    }

    order.status = 'completed';
    await order.save();

    res.json({ message: 'OTP verified successfully', order });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Verify single-use QR pickup token
export const verifyPickupToken = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Pickup token is required' });
    }

    const order = await Order.findOne({ pickupToken: token });

    if (!order) {
      return res.status(404).json({ error: 'Invalid pickup token. Order not found.' });
    }

    if (order.pickupTokenUsed) {
      return res.status(400).json({ error: 'This pickup token has already been used. Order was already collected.' });
    }

    if (order.status !== 'ready') {
      return res.status(400).json({ error: `Order is not ready for pickup. Current status: ${order.status}` });
    }

    if (order.pickupTokenExpiresAt && new Date() > order.pickupTokenExpiresAt) {
      return res.status(400).json({ error: 'Pickup token has expired. Please contact the vendor.' });
    }

    // Mark token as used and complete the order
    order.pickupTokenUsed = true;
    order.status = 'completed';
    await order.save();

    res.json({
      message: 'Pickup verified successfully! Order completed.',
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        total: order.total,
        status: order.status
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create a walk-in order (vendor-side, minimal data)
export const createWalkInOrder = async (req, res) => {
  try {
    const { vendorId, items, total, notes } = req.body;

    if (!vendorId || !total) {
      return res.status(400).json({ error: 'vendorId and total are required' });
    }

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    const order = new Order({
      vendorId,
      customerName: 'Walk-in Customer',
      items: items || [],
      total,
      paymentMethod: 'cash',
      orderSource: 'walkin',
      notes: notes || '',
      status: 'preparing'
    });

    await order.save();

    // Increment vendor walk-in count
    vendor.walkInCount = (vendor.walkInCount || 0) + 1;
    vendor.totalOrders += 1;
    await vendor.save();

    res.status(201).json({
      orderId: order._id,
      orderNumber: order.orderNumber,
      status: order.status,
      orderSource: 'walkin'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const submitRating = async (req, res) => {
  try {
    const { rating, ratingComment } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.status !== 'completed') {
      return res.status(400).json({ error: 'Can only rate completed orders' });
    }

    if (order.rating) {
      return res.status(400).json({ error: 'Order already rated' });
    }

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    order.rating = rating;
    order.ratingComment = ratingComment || '';

    await order.save();

    // Calculate and update vendor average rating
    const vendorOrders = await Order.find({ 
      vendorId: order.vendorId, 
      status: 'completed',
      rating: { $exists: true, $ne: null }
    });

    if (vendorOrders.length > 0) {
      const totalRating = vendorOrders.reduce((sum, o) => sum + (o.rating || 0), 0);
      const averageRating = totalRating / vendorOrders.length;
      
      await Vendor.findByIdAndUpdate(order.vendorId, { 
        rating: Math.round(averageRating * 10) / 10 
      });
    }

    res.json({ message: 'Rating submitted successfully', order });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

