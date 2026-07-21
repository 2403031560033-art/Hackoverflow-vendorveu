import express from 'express';
import {
  generateVendorBlockchainId,
  verifyVendorOnChain,
  generateReceiptHash,
  verifyReceiptHash
} from '../controllers/web3Controller.js';

const router = express.Router();

router.post('/vendor/:id/register', generateVendorBlockchainId);
router.post('/vendor/:id/verify', verifyVendorOnChain);
router.post('/order/:id/receipt-hash', generateReceiptHash);
router.get('/order/:id/verify-receipt', verifyReceiptHash);

export default router;
