import express from 'express';
import {
  sendMessage,
  getMyMessages
} from '../controllers/supportController.js';

const router = express.Router();

// Customer/Vendor routes
router.post('/message', sendMessage);
router.get('/messages/:senderType/:senderId', getMyMessages);

export default router;
