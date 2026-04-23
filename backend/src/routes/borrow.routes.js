import express from 'express';
import protect from '../middleware/auth.middleware.js';
import validate from '../middleware/validate.middleware.js';
import { listBorrowItems, createBorrowItem } from '../controllers/borrow.controller.js';
import { createBorrowingSchema } from '../utils/validators.js';

const router = express.Router();

router.get('/', listBorrowItems);
router.post('/', protect, validate(createBorrowingSchema), createBorrowItem);

export default router;
