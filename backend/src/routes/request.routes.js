import express from 'express';
import * as requestController from '../controllers/request.controller.js';
import protect from '../middleware/auth.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Create a new request (marketplace or ride)
router.post('/', requestController.createRequest);

// Get all requests for current user (as requester and/or owner)
router.get('/', requestController.getMyRequests);

// H-1 FIX: Static sub-path MUST come before /:id — otherwise Express captures it as id='resource'
// Get all requests for a specific resource (listing or ride) — owner only
router.get('/resource/:refModel/:refId', requestController.getRequestsForResource);

// Get a specific request by ID
router.get('/:id', requestController.getRequestById);

// Approve a request (owner only)
router.post('/:id/approve', requestController.approveRequest);

// Decline a request (owner only)
router.post('/:id/decline', requestController.declineRequest);

// Withdraw a request (requester only)
router.post('/:id/withdraw', requestController.withdrawRequest);

// Close a declined or withdrawn request
router.post('/:id/close', requestController.closeRequest);

// Close a live chat permanently
router.post('/:id/close-chat', requestController.closeChat);

// Accept chat request
router.post('/:id/accept-chat', requestController.acceptChatRequest);


export default router;
