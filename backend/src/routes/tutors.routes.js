import express from 'express';
import protect from '../middleware/auth.middleware.js';
import validate from '../middleware/validate.middleware.js';
import { createTutorProfileSchema, updateTutorProfileSchema } from '../utils/validators.js';
import {
  createTutorProfile,
  getTutorById,
  listTutors,
  getMyTutorProfile,
  getTutorEarnings,
  updateTutorProfile,
  listTutorReviews,
} from '../controllers/tutors.controller.js';

const router = express.Router();

router.get('/', protect, listTutors);
router.get('/mine', protect, getMyTutorProfile);
router.get('/:id/earnings', protect, getTutorEarnings);
router.get('/:id/reviews', protect, listTutorReviews);
router.get('/:id', protect, getTutorById);
router.post('/', protect, validate(createTutorProfileSchema), createTutorProfile);
router.patch('/:id', protect, validate(updateTutorProfileSchema), updateTutorProfile);

export default router;
