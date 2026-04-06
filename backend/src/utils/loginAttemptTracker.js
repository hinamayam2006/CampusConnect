/**
 * Login Attempt Tracker
 *
 * Tracks failed login attempts per email address.
 * Implements NIST-style account lockout: 5 failed attempts → 15 minute lockout
 *
 * In production, this would use Redis. For now, uses in-memory storage.
 *
 * Industry Standard:
 * - AWS Cognito: 5 failures → 15 min lockout
 * - NIST guidelines: <5 attempts per 15 minutes
 * - Google/Microsoft: Similar approach
 */

const attempts = {}; // { 'email@domain': { count: 3, lockedUntil: 1680000000 } }

const MAX_ATTEMPTS = 5; // Failed login attempts before lockout
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds
const CLEANUP_INTERVAL = 60 * 60 * 1000; // Clean up old entries every hour

// Auto-cleanup old entries to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  Object.keys(attempts).forEach((email) => {
    if (attempts[email].lockedUntil && attempts[email].lockedUntil < now) {
      delete attempts[email];
    }
  });
}, CLEANUP_INTERVAL);

/**
 * Check if account is currently locked
 * Returns: { isLocked: boolean, remainingTime: milliseconds }
 */
export const checkLockout = (email) => {
  const now = Date.now();
  const emailAttempts = attempts[email];

  if (!emailAttempts || !emailAttempts.lockedUntil) {
    return { isLocked: false, remainingTime: 0 };
  }

  if (emailAttempts.lockedUntil > now) {
    const remainingTime = emailAttempts.lockedUntil - now;
    return { isLocked: true, remainingTime };
  }

  // Lockout expired, clean up
  delete attempts[email];
  return { isLocked: false, remainingTime: 0 };
};

/**
 * Record a failed login attempt
 * Returns: { isLocked: boolean, remainingAttempts: number, remainingTime: milliseconds }
 */
export const recordFailedAttempt = (email) => {
  const now = Date.now();

  if (!attempts[email]) {
    attempts[email] = { count: 1, lockedUntil: null };
  } else {
    attempts[email].count += 1;
  }

  // Lock account after MAX_ATTEMPTS
  if (attempts[email].count >= MAX_ATTEMPTS) {
    attempts[email].lockedUntil = now + LOCKOUT_DURATION;
    return {
      isLocked: true,
      remainingAttempts: 0,
      remainingTime: LOCKOUT_DURATION,
      lockedUntil: new Date(attempts[email].lockedUntil).toISOString(),
    };
  }

  return {
    isLocked: false,
    remainingAttempts: MAX_ATTEMPTS - attempts[email].count,
    remainingTime: 0,
  };
};

/**
 * Clear attempts on successful login
 */
export const clearAttempts = (email) => {
  delete attempts[email];
};

export default {
  checkLockout,
  recordFailedAttempt,
  clearAttempts,
};
