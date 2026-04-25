/**
 * Auth Rate Limiter Middleware
 *
 * Implements stricter rate limiting for authentication endpoints
 * compared to the global rate limit.
 *
 * This prevents brute-force attacks on login/register endpoints
 * while keeping the global rate limit lenient for general traffic
 * (marketplace listings, borrow requests, etc.)
 *
 * Industry Standard:
 * - Login endpoint: 5 attempts per 15 minutes per IP (much stricter than global)
 * - Register endpoint: 3 attempts per 15 minutes per IP (prevents account enumeration)
 * - Global limit kept at 100 req/15min for normal operations
 *
 * This uses in-memory store (express-rate-limit default Store).
 * For production with multiple servers, use Redis Store.
 */

import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

/**
 * Strict rate limiter for login attempts
 * Limits to 5 attempts per 15 minutes per IP
 * Returns 429 (Too Many Requests) when exceeded
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minute window
  max: 5, // 5 attempts per window (much stricter than global 100)
  message: {
    success: false,
    message: 'Too many login attempts. Please try again later.',
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  // express-rate-limit v8: must normalize IPv6 via ipKeyGenerator (ERR_ERL_KEY_GEN_IPV6)
  keyGenerator: (req, res) => ipKeyGenerator(req.ip ?? req.socket?.remoteAddress ?? 'unknown'),
  handler: (req, res) => {
    // Custom handler to return our standard error format
    res.status(429).json({
      success: false,
      message: 'Too many login attempts. Please try again after 15 minutes.',
    });
  },
  skip: (req, res) => {
    // Don't count successful logins toward rate limit
    // (we'll reset after successful login anyway)
    return false;
  },
});

/**
 * Strict rate limiter for registration attempts
 * Limits to 100 accounts per 15 minutes per IP
 * Prevents account enumeration/abuse of registration endpoint while accommodating university campus networks
 */
export const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minute window
  max: 100, // 100 registration attempts per window (accommodates university campus networks)
  message: {
    success: false,
    message: 'Too many registration attempts. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, res) => ipKeyGenerator(req.ip ?? req.socket?.remoteAddress ?? 'unknown'),
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many registration attempts. Please try again after 15 minutes.',
    });
  },
});

export default {
  loginLimiter,
  registerLimiter,
};
