import express from 'express';
import { getPublicProfile } from '../controllers/user.controller.js';
import { optionalAuth } from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/:id', optionalAuth, getPublicProfile);


export default router;
