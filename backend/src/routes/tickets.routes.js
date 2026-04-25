import express from 'express';
import rateLimit from 'express-rate-limit';
import protect from '../middleware/auth.middleware.js';
import validate from '../middleware/validate.middleware.js';
import { submitFeedbackSchema, submitIssueReportSchema } from '../utils/validators.js';
import { submitFeedback, submitIssueReport, listMyTickets } from '../controllers/tickets.controller.js';

const router = express.Router();

// Rate limiter specifically for submitting tickets (spam prevention)
// Limits users to 5 tickets every 15 minutes
const ticketLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many tickets submitted. Please try again later.' },
});

router.get('/mine', protect, listMyTickets);
router.post('/feedback', protect, ticketLimiter, validate(submitFeedbackSchema), submitFeedback);
router.post('/report', protect, ticketLimiter, validate(submitIssueReportSchema), submitIssueReport);

export default router;
