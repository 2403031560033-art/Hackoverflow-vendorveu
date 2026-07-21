import express from 'express';
import {
  getVendorAnalytics,
  getAIRecommendations
} from '../controllers/aiController.js';

const router = express.Router();

router.get('/vendor/:vendorId/analytics', getVendorAnalytics);
router.get('/vendor/:vendorId/recommendations', getAIRecommendations);

export default router;
