import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import User from '../models/User.model.js';
import { checkLockout, recordFailedAttempt, clearAttempts } from '../utils/loginAttemptTracker.js';
import { generateAccessToken, generateRefreshToken } from '../utils/tokenGenerator.js';
import { sendPasswordResetEmail, sendVerificationEmail } from '../utils/email.js';

// Helper — generate tokens (access + refresh)
const generateTokens = async (userId) => {
  const accessToken = generateAccessToken(userId);
  const refreshToken = generateRefreshToken(userId);

  // Hash refresh token before storing in DB (never store plain tokens)
  const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);

  // Calculate expiry time: 7 days from now
  const refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  return {
    accessToken,
    refreshToken, // Send to client (unhashed)
    hashedRefreshToken, // Store in DB (hashed)
    refreshTokenExpiry,
  };
};


// ─── REGISTER ────────────────────────────────────────────
export const register = async (req, res, next) => {
  try {
    const { name, email, password, department, year, location } = req.body;

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.',
      });
    }

    // Hash password — never store plain text
    // 12 rounds = secure but not too slow
    const hashedPassword = await bcrypt.hash(password, 12);

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const hashedVerificationToken = crypto.createHash('sha256').update(verificationToken).digest('hex');
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Create user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      department,
      year,
      location: location || '',
      isVerified: false,
      verificationToken: hashedVerificationToken,
      verificationTokenExpiry,
    });

    try {
      await sendVerificationEmail({
        to: user.email,
        name: user.name,
        token: verificationToken,
      });
    } catch (emailErr) {
      console.warn('Verification email failed:', emailErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Account created successfully. Please verify your email before logging in.',
      data: {
        user,
      },
    });

  } catch (err) {
    next(err); // passes to global error handler
  }
};

// ─── LOGIN ───────────────────────────────────────────────
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // 1. Check if account is locked due to too many failed attempts
    const { isLocked, remainingTime } = checkLockout(email);
    if (isLocked) {
      return res.status(429).json({
        success: false,
        message: 'Account temporarily locked due to too many failed login attempts. Please try again later.',
        retryAfter: Math.ceil(remainingTime / 1000), // seconds
      });
    }

    // 2. Find user — include password for comparison
    const user = await User.findOne({ email }).select('+password');

    // 3. Check if email/password are valid (generic message to prevent email enumeration)
    if (!user) {
      recordFailedAttempt(email); // Track attempt even if email doesn't exist
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // 4. Compare password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      recordFailedAttempt(email); // Track failed attempt
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    if (user.isVerified === false) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email before logging in.',
      });
    }

    // 5. Successful login — clear any previous failed attempts
    clearAttempts(email);

    // 6. Generate tokens (access + refresh)
    const { accessToken, refreshToken, hashedRefreshToken, refreshTokenExpiry } = await generateTokens(user._id);

    // 7. Store hashed refresh token in DB for later validation
    await User.findByIdAndUpdate(user._id, {
      refreshToken: hashedRefreshToken,
      refreshTokenExpiry,
    });

    // Remove password before sending back to client
    user.password = undefined;

    res.status(200).json({
      success: true,
      message: 'Logged in successfully',
      data: {
        user,
        accessToken,
        refreshToken,
      },
    });

  } catch (err) {
    next(err);
  }
};

export const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.params;

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      verificationToken: hashedToken,
      verificationTokenExpiry: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Verification token is invalid or expired.',
      });
    }

    user.isVerified = true;
    user.verificationToken = null;
    user.verificationTokenExpiry = null;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Email verified successfully. You can now log in.',
    });
  } catch (err) {
    next(err);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If the email exists, a password reset link has been sent.',
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);

    user.passwordResetToken = hashedResetToken;
    user.passwordResetTokenExpiry = resetTokenExpiry;
    await user.save();

    try {
      await sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        token: resetToken,
      });
    } catch (emailErr) {
      console.warn('Password reset email failed:', emailErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'If the email exists, a password reset link has been sent.',
    });
  } catch (err) {
    next(err);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetTokenExpiry: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Reset token is invalid or expired.',
      });
    }

    user.password = await bcrypt.hash(password, 12);
    user.passwordResetToken = null;
    user.passwordResetTokenExpiry = null;
    user.refreshToken = null;
    user.refreshTokenExpiry = null;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successfully. You can now log in.',
    });
  } catch (err) {
    next(err);
  }
};

// ─── GET CURRENT USER ────────────────────────────────────
export const getMe = async (req, res, next) => {
  try {
    // req.user is already attached by protect middleware
    res.status(200).json({
      success: true,
      data: {
        user: req.user,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── UPDATE PROFILE ──────────────────────────────────────
export const updateProfile = async (req, res, next) => {
  try {
    const { name, location, department, year, canTeach, needsTutoring, avatar } = req.body;

    const updates = {
      ...(typeof name === 'string' ? { name } : {}),
      ...(typeof location === 'string' ? { location } : {}),
      ...(typeof department === 'string' ? { department } : {}),
      ...(typeof year !== 'undefined' ? { year } : {}),
      ...(typeof avatar === 'string' ? { avatar } : {}),
      ...(Array.isArray(canTeach) ? { canTeach } : {}),
      ...(Array.isArray(needsTutoring) ? { needsTutoring } : {}),
    };

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true } // return updated doc, run schema validators
    ).select('-password -notifications');

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: updatedUser },
    });

  } catch (err) {
    next(err);
  }
};

// ─── REFRESH TOKEN ───────────────────────────────────────
/**
 * Exchange refresh token for new access token
 *
 * Flow:
 * 1. Client sends refresh token from localStorage
 * 2. Server verifies token signature and expiry
 * 3. Compares client token with hashed token in DB
 * 4. If match, issues new access token
 * 5. Optionally rotates refresh token (best practice)
 *
 * This allows users to maintain sessions without re-entering password
 */
export const refresh = async (req, res, next) => {
  try {
    const { refreshToken: clientRefreshToken } = req.body;

    if (!clientRefreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required',
      });
    }

    // 1. Verify refresh token signature (throws if expired/invalid)
    let decoded;
    try {
      const { verifyRefreshToken } = await import('../utils/tokenGenerator.js');
      decoded = verifyRefreshToken(clientRefreshToken);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token invalid or expired. Please log in again.',
      });
    }

    // 2. Fetch user with their stored refresh token
    const user = await User.findById(decoded.userId).select('+refreshToken +refreshTokenExpiry');

    if (!user || !user.refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'User not found or refresh token revoked.',
      });
    }

    // 3. Check if refresh token is expired
    if (user.refreshTokenExpiry < new Date()) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token expired. Please log in again.',
      });
    }

    // 4. Verify that the client's token matches the hashed token in DB
    const isTokenValid = await bcrypt.compare(clientRefreshToken, user.refreshToken);

    if (!isTokenValid) {
      // Token mismatch could indicate token compromise
      // Invalidate all sessions (optional: implement token rotation)
      return res.status(401).json({
        success: false,
        message: 'Refresh token invalid. Please log in again.',
      });
    }

    // 5. Issue new access token
    const accessToken = generateAccessToken(user._id);

    // Optional: rotate refresh token (issue new one)
    // This is a best practice but adds complexity
    // For now, we'll keep the same refresh token
    // const { refreshToken: newRefreshToken, hashedRefreshToken: newHashedRefreshToken } = await generateTokens(user._id);

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken,
      },
    });

  } catch (err) {
    next(err);
  }
};