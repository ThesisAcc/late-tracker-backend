const { AppError } = require('./error.middleware');

/**
 * Usage: router.post('/admin/x', requireAuth, requireRole('ADMIN'), handler)
 * Must run after requireAuth so req.user is populated.
 */
function requireRole(...allowedRoles) {
  return function (req, res, next) {
    if (!req.user) {
      return next(new AppError(401, 'Not authenticated'));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError(403, 'You do not have permission to perform this action'));
    }
    next();
  };
}

module.exports = { requireRole };
