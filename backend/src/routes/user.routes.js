import express from 'express';
import { getPublicProfile } from '../controllers/user.controller.js';
import protect from '../middleware/auth.middleware.js';
import validate from '../middleware/validate.middleware.js';

const router = express.Router();

router.get('/:id', getPublicProfile);


export default router;
