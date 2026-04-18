import express from 'express';
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  hideNotification,
  resolveNotificationLink,
} from '../controllers/notifications.controller.js';
import protect from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/', protect, listNotifications);
router.get('/:id/target', protect, resolveNotificationLink);
router.patch('/read-all', protect, markAllNotificationsRead);
router.patch('/:id/read', protect, markNotificationRead);
router.patch('/:id/hide', protect, hideNotification);

export default router;
