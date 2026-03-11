import express from 'express';
import {
  addMenuItem,
  getVendorMenu,
  updateMenuItem,
  toggleStock,
  deleteMenuItem,
  uploadMenuItemImage
} from '../controllers/menuController.js';
import { uploadMenu } from '../middleware/upload.js';

const router = express.Router();

router.post('/', addMenuItem);
router.get('/vendor/:vendorId', getVendorMenu);
router.patch('/:id', updateMenuItem);
router.patch('/:id/toggle-stock', toggleStock);
router.delete('/:id', deleteMenuItem);
router.post('/:id/image', uploadMenu.single('image'), uploadMenuItemImage);

export default router;

