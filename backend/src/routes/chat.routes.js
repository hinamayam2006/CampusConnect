import express from 'express';
import * as chatController from '../controllers/chat.controller.js';
import protect from '../middleware/auth.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Send a message (Socket.io will handle real-time, but this persists to DB)
router.post('/messages', chatController.sendMessage);

// Get all messages for a request
router.get('/messages/:requestId', chatController.getMessages);

// Mark a message as read
router.post('/messages/:messageId/read', chatController.markMessageAsRead);

// Get unread message count for current user
router.get('/unread/count', chatController.getUnreadCount);

// Get all active chats (approved requests with latest messages)
router.get('/active/chats', chatController.getActiveChats);

export default router;
