import express from 'express';
import {
  createOrder,
  getOrderById,
  getOrderByNumber,
  getVendorOrders,
  getVendorStats,
  updateOrderStatus,
  verifyOTP,
  verifyPickupToken,
  completePickup,
  createWalkInOrder,
  submitRating
} from '../controllers/orderController.js';

const router = express.Router();

router.post('/', createOrder);
router.get('/:id', getOrderById);
router.get('/number/:orderNumber', getOrderByNumber);
router.get('/vendor/:vendorId', getVendorOrders);
router.get('/vendor/:vendorId/stats', getVendorStats);
router.patch('/:id/status', updateOrderStatus);
router.post('/:id/verify', verifyOTP);
router.post('/verify-token', verifyPickupToken);
router.post('/complete-pickup', completePickup);
router.post('/walkin', createWalkInOrder);
router.post('/:id/rating', submitRating);

export default router;

