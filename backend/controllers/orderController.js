import Order from '../models/Order.js';
import Vendor from '../models/Vendor.js';
import Customer from '../models/Customer.js';

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

    // Generate 4-digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    // Calculate estimated time from items
    const estimatedTime = items.reduce((max, item) => {
      return Math.max(max, item.preparationTime || 10);
    }, 10);

    const order = new Order({
      vendorId,
      customerName,
      customerPhone,
      items,
      total,
      paymentMethod,
      walletAmount: walletAmount || 0,
      cashAmount: cashAmount || 0,
      otp,
      estimatedTime,
      notes: notes || '',
      status: 'pending'
    });

    await order.save();

    // Update vendor total orders
    await Vendor.findByIdAndUpdate(vendorId, { $inc: { totalOrders: 1 } });

    // Handle wallet payment deduction
    if (paymentMethod === 'wallet' || paymentMethod === 'wallet-cash') {
      const customer = await Customer.findOne({ phone: customerPhone });
      if (customer) {
        customer.walletBalance -= walletAmount;
        customer.transactions.push({
          type: 'debit',
          amount: walletAmount,
          orderId: order._id,
          description: `Payment for Order #${order.orderNumber}`
        });
        await customer.save();
      }
    }

    // Create or update customer record
    let customer = await Customer.findOne({ phone: customerPhone });
    if (!customer) {
      customer = new Customer({
        phone: customerPhone,
        name: customerName
      });
    }
    customer.totalOrders += 1;
    await customer.save();

    res.status(201).json({
      orderId: order._id,
      orderNumber: order.orderNumber,
      otp: order.otp,
      estimatedTime: order.estimatedTime,
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
    const query = { vendorId: req.params.vendorId, status: { $ne: 'completed' } };
    
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

