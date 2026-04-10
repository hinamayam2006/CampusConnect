import express from 'express';
import { getDashboardSummary, getDashboardActivity } from '../controllers/dashboard.controller.js';
import protect from '../middleware/auth.middleware.js';

const router = express.Router();
// Apply the protect middleware to ensure req.user._id is available
router.get('/summary', protect, getDashboardSummary);
router.get('/activity', protect, getDashboardActivity);
export default router;