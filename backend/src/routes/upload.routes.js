import express from 'express';
import multer from 'multer';
import { uploadImage } from '../controllers/upload.controller.js';
import protect from '../middleware/auth.middleware.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const router = express.Router();

router.post('/image', protect, upload.single('image'), uploadImage);

export default router;
