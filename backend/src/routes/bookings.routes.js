import express from 'express';
import protect from '../middleware/auth.middleware.js';
import validate from '../middleware/validate.middleware.js';
import { createBookingSchema, submitReviewSchema } from '../utils/validators.js';
import { bookingCreateLimiter } from '../middleware/rateLimiter.js';
import {
  createBooking,
  acceptBooking,
  rejectBooking,
  cancelBooking,
  completeBooking,
  reviewBooking,
  listMyBookings,
  listTutorBookings,
  uploadPaymentProof,
  approvePayment,
  rejectPayment,
  deleteBooking,
} from '../controllers/bookings.controller.js';

const router = express.Router();

router.use(protect);

router.post('/', bookingCreateLimiter, validate(createBookingSchema), createBooking);
router.get('/mine', listMyBookings);
router.get('/tutor', listTutorBookings);
router.post('/:id/accept', acceptBooking);
router.post('/:id/reject', rejectBooking);
router.post('/:id/cancel', cancelBooking);
router.post('/:id/complete', completeBooking);
router.post('/:id/review', validate(submitReviewSchema), reviewBooking);
router.post('/:id/payment-proof', uploadPaymentProof);
router.post('/:id/approve-payment', approvePayment);
router.post('/:id/reject-payment', rejectPayment);
router.delete('/:id', deleteBooking);

export default router;
