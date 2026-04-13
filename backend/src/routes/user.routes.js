import express from 'express';
import { getPublicProfile, rateUser } from '../controllers/user.controller.js';
import protect from '../middleware/auth.middleware.js';
import validate from '../middleware/validate.middleware.js';
import { rateUserSchema } from '../utils/validators.js';

const router = express.Router();

router.get('/:id', getPublicProfile);
router.post('/:id/rate', protect, validate(rateUserSchema), rateUser);

export default router;
