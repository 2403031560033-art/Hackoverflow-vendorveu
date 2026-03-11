import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';
import Vendor from '../models/Vendor.js';
import Customer from '../models/Customer.js';
import MenuItem from '../models/MenuItem.js';

function requireAdminSecret() {
  const secret = process.env.ADMIN_JWT_SECRET;
  if (!secret) {
    throw new Error('ADMIN_JWT_SECRET is not configured');
  }
  return secret;
}

export const adminLogin = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'username and password are required' });
    }

    const admin = await Admin.findOne({ username: username.trim() });
    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const ok = await bcrypt.compare(password, admin.password);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { adminId: admin._id.toString(), username: admin.username },
      requireAdminSecret(),
      { expiresIn: '7d' }
    );

    res.json({
      token,
      admin: { id: admin._id, username: admin.username }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const adminListVendors = async (req, res) => {
  try {
    const vendors = await Vendor.find({}).sort({ createdAt: -1 });
    const vendorsResponse = vendors.map(v => {
      const obj = v.toObject();
      delete obj.password;
      return obj;
    });
    res.json(vendorsResponse);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const adminListCustomers = async (req, res) => {
  try {
    const customers = await Customer.find({}).sort({ createdAt: -1 });
    const customersResponse = customers.map(c => {
      const obj = c.toObject();
      delete obj.password;
      return obj;
    });
    res.json(customersResponse);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// keepOrders behavior: we do NOT delete orders; we DO delete vendor menu items to avoid orphaned catalog
export const adminDeleteVendor = async (req, res) => {
  try {
    const { id } = req.params;
    const vendor = await Vendor.findById(id);
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    await MenuItem.deleteMany({ vendorId: vendor._id });
    await Vendor.findByIdAndDelete(vendor._id);

    res.json({ message: 'Vendor deleted', vendorId: id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// keepOrders behavior: orders are keyed by customerPhone, so deleting customer is safe
export const adminDeleteCustomerById = async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await Customer.findById(id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    await Customer.findByIdAndDelete(customer._id);
    res.json({ message: 'Customer deleted', customerId: id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const uploadAdminQRCode = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    // Get the first admin (assuming single admin system, or use req.admin.adminId)
    const admin = await Admin.findOne();
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    const uploadPath = `/uploads/admin/${req.file.filename}`;
    admin.qrCode = uploadPath;
    await admin.save();

    res.json({
      message: 'QR Code uploaded successfully',
      qrCode: admin.qrCode
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getAdminQRCode = async (req, res) => {
  try {
    const admin = await Admin.findOne();
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    res.json({ qrCode: admin.qrCode || null });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Public endpoint for customers to get admin QR code
export const getPublicAdminQRCode = async (req, res) => {
  try {
    const admin = await Admin.findOne();
    if (!admin) {
      return res.status(404).json({ error: 'Admin QR code not found' });
    }

    res.json({ qrCode: admin.qrCode || null });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateCustomerWallet = async (req, res) => {
  try {
    const { phone } = req.params;
    const { amount, description } = req.body;

    if (typeof amount !== 'number') {
      return res.status(400).json({ error: 'Amount must be a number' });
    }

    let customer = await Customer.findOne({ phone });
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const oldBalance = customer.walletBalance;
    customer.walletBalance += amount;

    if (customer.walletBalance < 0) {
      return res.status(400).json({ error: 'Insufficient wallet balance' });
    }

    customer.transactions.push({
      type: amount > 0 ? 'credit' : 'debit',
      amount: Math.abs(amount),
      description: description || `Admin ${amount > 0 ? 'added' : 'deducted'} ₹${Math.abs(amount)}${description ? `: ${description}` : ''}`
    });

    await customer.save();

    res.json({
      message: `Wallet ${amount > 0 ? 'credited' : 'debited'} successfully`,
      balance: customer.walletBalance,
      previousBalance: oldBalance,
      change: amount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getCustomerWalletDetails = async (req, res) => {
  try {
    const { phone } = req.params;
    const customer = await Customer.findOne({ phone });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const customerResponse = customer.toObject();
    delete customerResponse.password;

    res.json({
      phone: customer.phone,
      name: customer.name,
      balance: customer.walletBalance,
      transactions: customer.transactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

