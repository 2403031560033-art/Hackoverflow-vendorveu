import express from 'express';
import {
  registerCustomer,
  loginCustomer,
  getCustomerProfile,
  getWallet,
  addToWallet,
  getCustomerOrders,
  updateCustomerLocation
} from '../controllers/customerController.js';

const router = express.Router();

router.post('/register', registerCustomer);
router.post('/login', loginCustomer);
router.get('/:phone', getCustomerProfile);
router.get('/:phone/wallet', getWallet);
router.post('/:phone/wallet/add', addToWallet);
router.get('/:phone/orders', getCustomerOrders);
router.patch('/:phone/location', updateCustomerLocation);

export default router;

