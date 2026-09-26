const express = require('express');
const rateLimit = require('express-rate-limit');
const authController = require('./auth.controller');

const router = express.Router();

// A 4-digit PIN only has 10,000 combinations, so the login route gets a much
// tighter limit than the rest of the API to make brute-forcing impractical.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'TooManyRequests', message: 'Too many login attempts. Try again later.' },
});

router.post('/login', loginLimiter, authController.login);

module.exports = router;
