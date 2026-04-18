import express from 'express';
import { register, login, getMe, updateProfile, refresh, verifyEmail, forgotPassword, resetPassword } from '../controllers/auth.controller.js';
import protect from '../middleware/auth.middleware.js';
import validate from '../middleware/validate.middleware.js';
import { loginLimiter, registerLimiter } from '../middleware/authRateLimiter.js';
import { registerSchema, loginSchema, updateProfileSchema, forgotPasswordSchema, resetPasswordSchema } from '../utils/validators.js';

const router = express.Router();

// Public routes with strict rate limiting
// Login: 5 attempts per 15 minutes per IP (prevents brute-force)
// Register: 3 attempts per 15 minutes per IP (prevents account enumeration)
router.post('/register', registerLimiter, validate(registerSchema), register);
router.post('/login', loginLimiter, validate(loginSchema), login);
router.get('/verify-email/:token', verifyEmail);
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password/:token', validate(resetPasswordSchema), resetPassword);

// Refresh token endpoint — exchange refresh token for new access token
// Not rate-limited here (rate limiter already blocks bad attempts at login)
// Frontend should only call this when access token expires
router.post('/refresh', refresh);

// Protected routes — must be logged in
router.get('/me', protect, getMe);
router.put('/profile', protect, validate(updateProfileSchema), updateProfile);

export default router;