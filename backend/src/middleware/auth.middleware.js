import jwt from 'jsonwebtoken';
import User from '../models/User.model.js';

/** Sets req.user when a valid Bearer token is present; continues as guest otherwise. */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return next();
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password -notifications');
    if (user && user.isVerified && !user.isSuspended) req.user = user;
  } catch {
    // invalid token — treat as anonymous
  }
  next();
};

export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Not authenticated.' });
  }
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Insufficient permissions.' });
  }
  next();
};

const protect = async (req, res, next) => {
  try {
    // Check if Authorization header exists
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated. Please log in.',
      });
    }

    // Extract token
    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user — exclude password
    const user = await User.findById(decoded.userId).select('-password -notifications');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User no longer exists.',
      });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email before accessing this resource.',
        code: 'EMAIL_NOT_VERIFIED',
      });
    }

    // SUSPENSION KILL-SWITCH: even with a valid token, suspended accounts are blocked
    if (user.isSuspended) {
      return res.status(403).json({
        success: false,
        message: `Your account has been suspended. Reason: ${user.suspensionReason || 'Violation of community guidelines'}. Please contact support if you believe this is an error.`,
        suspended: true,
      });
    }

    // Attach user to request — available in all controllers
    req.user = user;
    next();

  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Token invalid or expired. Please log in again.',
    });
  }
};

export default protect;
export { protect };