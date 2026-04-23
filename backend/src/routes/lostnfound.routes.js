import express from 'express';
import protect from '../middleware/auth.middleware.js';
import validate from '../middleware/validate.middleware.js';
import { listLostnFoundItems, createLostnFoundItem, getLostnFoundItemById } from '../controllers/lostnfound.controller.js';
import { createLostnFoundSchema } from '../utils/validators.js';

const router = express.Router();

router.get('/', listLostnFoundItems);
router.get('/:id', getLostnFoundItemById);
router.post('/', protect, validate(createLostnFoundSchema), createLostnFoundItem);

export default router;
