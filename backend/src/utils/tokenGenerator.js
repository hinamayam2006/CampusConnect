/**
 * Token Generator Utility
 *
 * Implements industry-standard JWT token generation:
 * - Access tokens: short-lived (15 minutes), used for API requests
 * - Refresh tokens: long-lived (7 days), used to issue new access tokens
 *
 * Industry Standard (JWT Best Practices):
 * - Google/GitHub: access token ~1 hour, refresh token ~6 months
 * - AWS Cognito: access token 1 hour, ID token 1 hour, refresh token configurable
 * - OAuth 2.0 spec: recommends access token expiry of minutes to hours
 *
 * Our implementation (for educational MVP):
 * - Access token: 15 minutes - if stolen, limited access window
 * - Refresh token: 7 days - user doesn't need to log in daily
 * - Both stored in different JWT_SECRET for additional security
 *
 * Token Payload:
 * - Access token: { userId, type: 'access' } - used for route protection
 * - Refresh token: { userId, type: 'refresh' } - only used at /refresh endpoint
 */

import jwt from 'jsonwebtoken';

// Constants for token expiry
const ACCESS_TOKEN_EXPIRY = '15m'; // Short-lived, minimizes breach window
const REFRESH_TOKEN_EXPIRY = '7d'; // Long-lived, prevents forcing re-login

/**
 * Generate access token (short-lived)
 * Used in Authorization header for API requests
 *
 * @param {string} userId - MongoDB user ID
 * @returns {string} JWT access token
 */
export const generateAccessToken = (userId) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is not set');
  }

  return jwt.sign(
    {
      userId,
      type: 'access', // Allow tokens to carry their own type info
    },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
};

/**
 * Generate refresh token (long-lived)
 * Stored in database, used only at /refresh endpoint
 *
 * @param {string} userId - MongoDB user ID
 * @returns {string} JWT refresh token
 */
export const generateRefreshToken = (userId) => {
  if (!process.env.REFRESH_TOKEN_SECRET) {
    throw new Error('REFRESH_TOKEN_SECRET environment variable is not set');
  }

  return jwt.sign(
    {
      userId,
      type: 'refresh', // Identify as refresh token
    },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
};

/**
 * Verify access token
 * Called by auth middleware on protected routes
 *
 * @param {string} token - JWT token to verify
 * @returns {object} Decoded token payload { userId, type, iat, exp }
 * @throws {Error} If token invalid or expired
 */
export const verifyAccessToken = (token) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is not set');
  }

  return jwt.verify(token, process.env.JWT_SECRET);
};

/**
 * Verify refresh token
 * Called at /refresh endpoint to validate token before issuing new access token
 *
 * @param {string} token - JWT refresh token to verify
 * @returns {object} Decoded token payload { userId, type, iat, exp }
 * @throws {Error} If token invalid or expired
 */
export const verifyRefreshToken = (token) => {
  if (!process.env.REFRESH_TOKEN_SECRET) {
    throw new Error('REFRESH_TOKEN_SECRET environment variable is not set');
  }

  return jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
};

/**
 * Get token expiry times
 * Used by frontend to know when to auto-refresh
 *
 * @returns {object} { accessTokenExpiry: seconds, refreshTokenExpiry: seconds }
 */
export const getTokenExpiries = () => {
  // Parse time strings to seconds
  // '15m' → 900, '7d' → 604800
  const accessSeconds = timeToSeconds(ACCESS_TOKEN_EXPIRY);
  const refreshSeconds = timeToSeconds(REFRESH_TOKEN_EXPIRY);

  return {
    accessTokenExpiry: accessSeconds,
    refreshTokenExpiry: refreshSeconds,
  };
};

/**
 * Helper: convert time string to seconds
 * '15m' → 900, '7d' → 604800, '1h' → 3600
 */
function timeToSeconds(timeStr) {
  const match = timeStr.match(/^(\d+)([smhd])$/);
  if (!match) return 0;

  const [, num, unit] = match;
  const multipliers = {
    s: 1,
    m: 60,
    h: 60 * 60,
    d: 24 * 60 * 60,
  };

  return parseInt(num) * (multipliers[unit] || 1);
}

export default {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  getTokenExpiries,
};
