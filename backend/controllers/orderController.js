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

// Verify Virtual E-Token (HMAC-signed secure token)
export const verifyPickupToken = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Virtual E-Token is required' });
    }

    // Parse the signed token: orderId.timestamp.signature
    const parts = token.split('.');
    if (parts.length !== 3) {
      return res.status(400).json({ error: 'Invalid E-Token format' });
    }

    const [orderId, timestamp, signature] = parts;

    // Fetch the order with vendor details
    const order = await Order.findById(orderId)
      .populate('vendorId', 'name phone location image verificationStatus blockchainId');

    if (!order) {
      return res.status(404).json({ error: 'Invalid E-Token. Order not found.' });
    }

    // Verify HMAC signature
    const secret = process.env.ETOKEN_SECRET || process.env.JWT_SECRET || 'vendorvue-etoken-secret-key';
    const payload = `${orderId}:${order.orderNumber}:${timestamp}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    if (expectedSignature !== signature) {
      return res.status(400).json({ error: 'E-Token signature verification failed. This token may be tampered.' });
    }

    // Check if token has already been used
    if (order.pickupTokenUsed) {
      return res.status(400).json({ error: 'This E-Token has already been used. Order was already collected.' });
    }

    // Check order status
    if (order.status === 'cancelled') {
      return res.status(400).json({ error: 'This order has been cancelled.' });
    }

    if (order.paymentStatus === 'refunded') {
      return res.status(400).json({ error: 'This order has been refunded.' });
    }

    if (order.paymentStatus === 'failed') {
      return res.status(400).json({ error: 'Payment for this order failed.' });
    }

    if (order.status !== 'ready') {
      return res.status(400).json({
        error: `Order is not ready for pickup. Current status: ${order.status}`,
        currentStatus: order.status
      });
    }

    // Check expiry
    if (order.pickupTokenExpiresAt && new Date() > order.pickupTokenExpiresAt) {
      return res.status(400).json({ error: 'E-Token has expired. Please contact the vendor.' });
    }

    // Token is valid — return full order details for vendor display
    // Do NOT mark as completed yet. That happens on completePickup.
    res.json({
      success: true,
      message: 'E-Token verified successfully',
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        items: order.items,
        total: order.total,
        notes: order.notes,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        status: order.status,
        estimatedTime: order.estimatedTime,
        estimatedPickupTime: order.estimatedPickupTime,
        createdAt: order.createdAt,
        orderSource: order.orderSource,
        vendorVerified: order.vendorId?.verificationStatus === 'verified'
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Complete pickup — called when vendor clicks "Deliver Food"
export const completePickup = async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ error: 'Order ID is required' });
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.status === 'completed') {
      return res.status(400).json({ error: 'Order is already completed' });
    }

    if (order.pickupTokenUsed) {
      return res.status(400).json({ error: 'Pickup already completed for this order' });
    }

    // Mark order as completed and invalidate token permanently
    order.status = 'completed';
    order.pickupTokenUsed = true;
    await order.save();

    // Auto-generate receipt hash (Web3 integrity)
    if (!order.receiptHash) {
      const receiptContent = JSON.stringify({
        orderId: order._id,
        orderNumber: order.orderNumber,
        vendorId: order.vendorId,
        items: order.items.map(i => ({ name: i.name, qty: i.quantity, price: i.price })),
        total: order.total,
        completedAt: new Date()
      });
      order.receiptHash = crypto
        .createHash('sha256')
        .update(receiptContent)
        .digest('hex');
      await order.save();
    }

    res.json({
      success: true,
      message: 'Pickup completed! Order delivered successfully.',
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        receiptHash: order.receiptHash
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

