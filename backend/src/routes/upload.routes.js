import express from 'express';
import multer from 'multer';
import { uploadImage, uploadNotesFile } from '../controllers/upload.controller.js';
import protect from '../middleware/auth.middleware.js';
import { uploadsLimiter } from '../middleware/rateLimiter.js';

const uploadImageMulter = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const uploadNotesMulter = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

const router = express.Router();

router.post('/image', protect, uploadImageMulter.single('image'), uploadImage);
router.post('/notes', protect, uploadsLimiter, uploadNotesMulter.single('file'), uploadNotesFile);

export default router;
