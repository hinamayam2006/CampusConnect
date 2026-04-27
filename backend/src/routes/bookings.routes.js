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
  // H-4 FIX: These existed in the controller but were never registered as routes
  confirmAttendance,
  studentConfirmAttendance,
  startBookingChat,
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
// H-4 FIX: Attendance confirmation routes — tutor and student sides
router.post('/:id/confirm-attendance', confirmAttendance);
router.post('/:id/student-confirm', studentConfirmAttendance);
router.post('/:id/start-chat', startBookingChat);

export default router;
