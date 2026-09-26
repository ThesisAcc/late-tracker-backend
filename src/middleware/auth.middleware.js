const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/env');
const { AppError } = require('./error.middleware');

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(new AppError(401, 'Missing or malformed Authorization header'));
  }

  try {
    const payload = jwt.verify(token, jwtSecret);
    // req.user is derived only from the verified token - never from the request body.
    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      employeeId: payload.employeeId ?? null,
    };
    next();
  } catch (err) {
    return next(new AppError(401, 'Invalid or expired token'));
  }
}

module.exports = { requireAuth };
