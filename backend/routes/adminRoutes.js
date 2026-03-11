import express from 'express';
import {
  adminLogin,
  adminListVendors,
  adminListCustomers,
  adminDeleteVendor,
  adminDeleteCustomerById,
  uploadAdminQRCode,
  getAdminQRCode,
  getPublicAdminQRCode,
  updateCustomerWallet,
  getCustomerWalletDetails
} from '../controllers/adminController.js';
import {
  adminGetConversations,
  adminGetThreadMessages,
  adminReply
} from '../controllers/supportController.js';
import { adminAuth } from '../middleware/adminAuth.js';
import { uploadAdmin } from '../middleware/upload.js';

const router = express.Router();

router.post('/login', adminLogin);

// Public route for customers to get admin QR code
router.get('/qrcode/public', getPublicAdminQRCode);

router.get('/vendors', adminAuth, adminListVendors);
router.get('/customers', adminAuth, adminListCustomers);
router.delete('/vendors/:id', adminAuth, adminDeleteVendor);
router.delete('/customers/:id', adminAuth, adminDeleteCustomerById);

// Admin Support routes
router.get('/support/conversations', adminAuth, adminGetConversations);
router.get('/support/messages/:threadId', adminAuth, adminGetThreadMessages);
router.post('/support/reply', adminAuth, adminReply);

// Admin QR Code routes
router.post('/qrcode', adminAuth, uploadAdmin.single('image'), uploadAdminQRCode);
router.get('/qrcode', adminAuth, getAdminQRCode);

// Admin Wallet Management routes
router.get('/customers/:phone/wallet', adminAuth, getCustomerWalletDetails);
router.patch('/customers/:phone/wallet', adminAuth, updateCustomerWallet);

export default router;

