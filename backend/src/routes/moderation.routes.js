import express from 'express';
import protect from '../middleware/auth.middleware.js';
import isAdmin from '../middleware/admin.middleware.js';
import {
  submitReport,
  getModerationQueue,
  adminReviewReport,
  getReportReasons,
  getContentReports
} from '../controllers/moderation.controller.js';

const router = express.Router();

// Public/protected routes (all authenticated users)
router.post('/report', protect, submitReport);
router.get('/reasons', protect, getReportReasons);
router.get('/content/:targetModel/:targetId/reports', protect, isAdmin, getContentReports);

// Admin-only routes
router.get('/admin/queue', protect, isAdmin, getModerationQueue);
router.patch('/admin/reports/:reportId/review', protect, isAdmin, adminReviewReport);

export default router;
