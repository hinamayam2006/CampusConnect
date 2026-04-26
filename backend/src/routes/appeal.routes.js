import express from 'express';
import protect from '../middleware/auth.middleware.js';
import { handleAppealEmail, submitAppeal } from '../controllers/appeal.controller.js';
import { verifyWebhookSignature } from '../middleware/webhook.middleware.js';

const router = express.Router();

// Webhook endpoint for email services (like SendGrid) — must have valid HMAC signature
router.post('/email-webhook', verifyWebhookSignature, handleAppealEmail);

// H-5 FIX: Intentionally unauthenticated — suspended users are blocked by `protect` (403),
// so they can never reach a protected endpoint. The controller validates email + suspension itself.
router.post('/submit', submitAppeal);

export default router;
