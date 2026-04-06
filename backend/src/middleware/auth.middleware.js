import jwt from 'jsonwebtoken';
import User from '../models/User.model.js';

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