import express from 'express';
import protect from '../middleware/auth.middleware.js';
import validate from '../middleware/validate.middleware.js';
import { 
  listBorrowItems, 
  getBorrowItemById, 
  createBorrowItem, 
  listMyBorrowItems,
  updateBorrowItem,
  deleteBorrowItem,
  markBorrowed,
  markReturned,
} from '../controllers/borrow.controller.js';
import { createBorrowingSchema, updateBorrowingSchema } from '../utils/validators.js';

const router = express.Router();

router.get('/mine', protect, listMyBorrowItems);
router.get('/', listBorrowItems);
router.get('/:id', getBorrowItemById);
router.post('/', protect, validate(createBorrowingSchema), createBorrowItem);
router.put('/:id', protect, validate(updateBorrowingSchema), updateBorrowItem);
router.patch('/:id/mark-borrowed', protect, markBorrowed);
router.patch('/:id/mark-returned', protect, markReturned);
router.delete('/:id', protect, deleteBorrowItem);

export default router;
