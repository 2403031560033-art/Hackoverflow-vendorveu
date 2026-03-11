import Customer from '../models/Customer.js';
import Order from '../models/Order.js';
import bcrypt from 'bcryptjs';

export const registerCustomer = async (req, res) => {
  try {
    const { name, phone, password, location } = req.body;

    // Validate password
    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    // Check if customer already exists
    const existingCustomer = await Customer.findOne({ phone });
    if (existingCustomer) {
      return res.status(400).json({ error: 'Customer with this phone number already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const customer = new Customer({
      name: name || '',
      phone,
      password: hashedPassword,
      location: location ? {
        lat: location.lat || null,
        lng: location.lng || null,
        address: location.address || ''
      } : {}
    });

    await customer.save();
    
    // Remove password from response
    const customerResponse = customer.toObject();
    delete customerResponse.password;
    
    res.status(201).json({ customer: customerResponse });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const loginCustomer = async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    let customer = await Customer.findOne({ phone });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found. Please register first.' });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, customer.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Remove password from response
    const customerResponse = customer.toObject();
    delete customerResponse.password;

    res.json({ customer: customerResponse });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getCustomerProfile = async (req, res) => {
  try {
    const customer = await Customer.findOne({ phone: req.params.phone });
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    // Remove password from response
    const customerResponse = customer.toObject();
    delete customerResponse.password;
    
    res.json(customerResponse);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getWallet = async (req, res) => {
  try {
    let customer = await Customer.findOne({ phone: req.params.phone });
    
    if (!customer) {
      customer = new Customer({ phone: req.params.phone, walletBalance: 0 });
      await customer.save();
    }

    res.json({
      balance: customer.walletBalance,
      transactions: customer.transactions.sort((a, b) => b.createdAt - a.createdAt)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const addToWallet = async (req, res) => {
  try {
    const { amount, transactionId } = req.body;
    const phone = req.params.phone;

    let customer = await Customer.findOne({ phone });
    
    if (!customer) {
      customer = new Customer({ phone, walletBalance: 0 });
    }

    // Add bonus for top-ups >= ₹100
    let bonus = 0;
    if (amount >= 100) {
      bonus = 10;
    }

    const totalCredit = amount + bonus;
    customer.walletBalance += totalCredit;
    
    // Build description with transaction ID if provided
    let description = `Wallet top-up of ₹${amount}${bonus > 0 ? ` + ₹${bonus} bonus` : ''}`;
    if (transactionId) {
      description += ` (Transaction ID: ${transactionId})`;
    }
    
    customer.transactions.push({
      type: 'credit',
      amount: amount,
      description: description
    });

    await customer.save();

    res.json({
      balance: customer.walletBalance,
      credit: amount,
      bonus: bonus,
      message: `₹${amount} added to wallet${bonus > 0 ? ` (₹${bonus} bonus)` : ''}`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getCustomerOrders = async (req, res) => {
  try {
    const orders = await Order.find({ customerPhone: req.params.phone })
      .populate('vendorId', 'name phone location image')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateCustomerLocation = async (req, res) => {
  try {
    const { location } = req.body;
    const phone = req.params.phone;

    let customer = await Customer.findOne({ phone });
    
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    customer.location = {
      lat: location.lat || customer.location?.lat || null,
      lng: location.lng || customer.location?.lng || null,
      address: location.address || customer.location?.address || ''
    };

    await customer.save();
    res.json(customer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

