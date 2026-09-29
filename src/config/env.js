require('dotenv').config();

const required = ['DATABASE_URL', 'JWT_SECRET'];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

const nodeEnv = process.env.NODE_ENV || 'development';
const rawCorsOrigin = process.env.CORS_ORIGIN;

// In production a missing CORS_ORIGIN would otherwise silently widen access to
// every origin, so fail fast like the other required variables.
if (nodeEnv === 'production' && !rawCorsOrigin) {
  throw new Error('Missing required environment variable: CORS_ORIGIN');
}

// The cors package treats an array as a literal allowlist, so the "allow any
// origin" default has to stay the string '*'. Turning it into ['*'] matches
// nothing and would block every browser request instead of allowing them.
const corsOrigin = rawCorsOrigin
  ? rawCorsOrigin.split(',').map((o) => o.trim()).filter(Boolean)
  : '*';

module.exports = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  corsOrigin,
};
