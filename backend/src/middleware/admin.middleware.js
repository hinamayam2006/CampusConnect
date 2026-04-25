/**
 * admin.middleware.js
 * 
 * Must be chained AFTER the `protect` middleware:
 *   router.get('/route', protect, isAdmin, handler)
 * 
 * protect  → verifies JWT + suspension check → attaches req.user
 * isAdmin  → verifies req.user.role === 'admin' → 403 otherwise
 * 
 * This double-layer approach means:
 *   1. Unauthenticated users get 401
 *   2. Suspended users get 403 (blocked at protect level)
 *   3. Authenticated non-admins get 403 here
 *   4. Only admins pass through
 */
const isAdmin = (req, res, next) => {
  // req.user is guaranteed by the protect middleware running first
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Not authenticated.' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.',
    });
  }

  next();
};

export default isAdmin;
