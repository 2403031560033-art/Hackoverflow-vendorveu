import express from 'express';
import {
  registerVendor,
  loginVendor,
  getAllVendors,
  getVendorById,
  getVendorMenu,
  toggleVendorStatus,
  updateVendorIsOpen,
  updateVendorLocation,
  updateVendorProfile,
  updateVendorWaitingTime,
  uploadVendorImage,
  uploadVendorQRCode
} from '../controllers/vendorController.js';
import { uploadVendor } from '../middleware/upload.js';

const router = express.Router();

router.post('/register', registerVendor);
router.post('/login', loginVendor);
router.get('/', getAllVendors);
router.get('/:id', getVendorById);
router.get('/:id/menu', getVendorMenu);
router.patch('/:id/toggle', toggleVendorStatus);
router.patch('/:id/is-open', updateVendorIsOpen);
router.patch('/:id/location', updateVendorLocation);
router.patch('/:id/profile', updateVendorProfile);
router.patch('/:id/waiting-time', updateVendorWaitingTime);
router.post('/:id/image', uploadVendor.single('image'), uploadVendorImage);
router.post('/:id/qrcode', uploadVendor.single('image'), uploadVendorQRCode);

export default router;

