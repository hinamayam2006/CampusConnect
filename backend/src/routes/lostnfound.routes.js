import express from 'express';
import protect from '../middleware/auth.middleware.js';
import validate from '../middleware/validate.middleware.js';
import { listLostnFoundItems, createLostnFoundItem } from '../controllers/lostnfound.controller.js';
import { createLostnFoundSchema } from '../utils/validators.js';

const router = express.Router();

router.get('/', listLostnFoundItems);
router.post('/', protect, validate(createLostnFoundSchema), createLostnFoundItem);

export default router;
