import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

const DAY_MS = 24 * 60 * 60 * 1000;

function userKey(req) {
  const userId = req.user?._id;
  if (userId) return `user:${userId}`;
  return ipKeyGenerator(req.ip ?? req.socket?.remoteAddress ?? 'unknown');
}

export const uploadsLimiter = rateLimit({
  windowMs: DAY_MS,
  max: 10,
  message: { success: false, message: 'Upload limit reached for today. Try again tomorrow.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => userKey(req),
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Upload limit reached for today. Try again tomorrow.',
    });
  },
});

export const bookingCreateLimiter = rateLimit({
  windowMs: DAY_MS,
  max: 10,
  message: { success: false, message: 'Booking request limit reached for today. Try again tomorrow.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => userKey(req),
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Booking request limit reached for today. Try again tomorrow.',
    });
  },
});
