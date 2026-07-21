import crypto from 'crypto';
import Vendor from '../models/Vendor.js';
import Order from '../models/Order.js';

// Generate a blockchain identity hash for a vendor
export const generateVendorBlockchainId = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    if (vendor.blockchainId) {
      return res.status(400).json({
        error: 'Vendor already has a blockchain ID',
        blockchainId: vendor.blockchainId,
        verificationStatus: vendor.verificationStatus
      });
    }

    // Generate SHA-256 hash of vendor identity
    const identityString = `${vendor._id}:${vendor.phone}:${vendor.name}:${Date.now()}`;
    const blockchainId = crypto
      .createHash('sha256')
      .update(identityString)
      .digest('hex');

    vendor.blockchainId = blockchainId;
    vendor.verificationStatus = 'pending';
    await vendor.save();

    const vendorResponse = vendor.toObject();
    delete vendorResponse.password;

    res.json({
      message: 'Blockchain identity registered successfully',
      blockchainId,
      verificationStatus: 'pending',
      vendor: vendorResponse
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Verify vendor on-chain (admin action)
export const verifyVendorOnChain = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    if (!vendor.blockchainId) {
      return res.status(400).json({ error: 'Vendor has not registered a blockchain identity yet' });
    }

    if (vendor.verificationStatus === 'verified') {
      return res.status(400).json({ error: 'Vendor is already verified' });
    }

    vendor.verificationStatus = 'verified';
    vendor.verifiedAt = new Date();
    await vendor.save();

    const vendorResponse = vendor.toObject();
    delete vendorResponse.password;

    res.json({
      message: 'Vendor verified on blockchain successfully',
      blockchainId: vendor.blockchainId,
      verificationStatus: 'verified',
      verifiedAt: vendor.verifiedAt,
      vendor: vendorResponse
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Generate tamper-evident receipt hash for a completed order
export const generateReceiptHash = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.status !== 'completed') {
      return res.status(400).json({ error: 'Receipt hash can only be generated for completed orders' });
    }

    if (order.receiptHash) {
      return res.json({
        message: 'Receipt hash already exists',
        receiptHash: order.receiptHash,
        orderId: order._id
      });
    }

    // Create receipt content string
    const receiptContent = JSON.stringify({
      orderId: order._id,
      orderNumber: order.orderNumber,
      vendorId: order.vendorId,
      items: order.items.map(i => ({ name: i.name, qty: i.quantity, price: i.price })),
      total: order.total,
      completedAt: order.updatedAt
    });

    const receiptHash = crypto
      .createHash('sha256')
      .update(receiptContent)
      .digest('hex');

    order.receiptHash = receiptHash;
    await order.save();

    res.json({
      message: 'Receipt hash generated successfully',
      receiptHash,
      orderId: order._id,
      orderNumber: order.orderNumber
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Verify receipt integrity
export const verifyReceiptHash = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (!order.receiptHash) {
      return res.status(400).json({ error: 'No receipt hash found for this order' });
    }

    // Recompute hash
    const receiptContent = JSON.stringify({
      orderId: order._id,
      orderNumber: order.orderNumber,
      vendorId: order.vendorId,
      items: order.items.map(i => ({ name: i.name, qty: i.quantity, price: i.price })),
      total: order.total,
      completedAt: order.updatedAt
    });

    const computedHash = crypto
      .createHash('sha256')
      .update(receiptContent)
      .digest('hex');

    const isValid = computedHash === order.receiptHash;

    res.json({
      orderId: order._id,
      orderNumber: order.orderNumber,
      receiptHash: order.receiptHash,
      computedHash,
      isValid,
      message: isValid ? 'Receipt integrity verified — no tampering detected' : 'WARNING: Receipt integrity check failed — data may have been modified'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
