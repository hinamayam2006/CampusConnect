/**
 * Global error-handling middleware for Express.
 *
 * M-6 FIX: This file was 0 bytes (dead stub). Implemented as a proper
 * Express error handler and wired into app.js after all other middleware.
 *
 * Usage (in app.js, AFTER all routes):
 *   import errorHandler from './middleware/error.middleware.js';
 *   app.use(errorHandler);
 */

/**
 * Centralized Express error handler.
 * Must be registered LAST with four parameters so Express recognises it as an error handler.
 *
 * @param {Error} err
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const errorHandler = (err, req, res, next) => {
  // If headers already sent (e.g. streaming started), delegate to Express default handler
  if (res.headersSent) {
    return next(err);
  }

  // Mongoose CastError — invalid ObjectId etc.
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: `Invalid ${err.path}: ${err.value}`,
    });
  }

  // Mongoose ValidationError
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      success: false,
      message: messages.join('. '),
    });
  }

  // MongoDB duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(409).json({
      success: false,
      message: `Duplicate value for ${field}. Please use a different value.`,
    });
  }

  // JWT errors (in case they bubble up outside protect middleware)
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Token invalid. Please log in again.',
    });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired. Please log in again.',
    });
  }

  // Multer / file-size errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      message: 'File too large.',
    });
  }

  // Default — log internally, return safe message to client
  const statusCode = err.statusCode || err.status || 500;
  console.error(`[${new Date().toISOString()}] Unhandled error ${statusCode}:`, err);

  res.status(statusCode).json({
    success: false,
    message: statusCode < 500 ? err.message : 'An unexpected error occurred. Please try again.',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

export default errorHandler;
