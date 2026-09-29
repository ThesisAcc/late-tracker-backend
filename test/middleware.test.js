const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

const { jwtSecret } = require('../src/config/env');
const { requireAuth } = require('../src/middleware/auth.middleware');
const { requireRole } = require('../src/middleware/role.middleware');

function run(middleware, req) {
  let nextError;
  let passed = false;

  middleware(req, {}, (err) => {
    if (err) nextError = err;
    else passed = true;
  });

  return { passed, nextError };
}

const validToken = jwt.sign(
  {
    sub: 'user-1',
    role: 'ADMIN',
    employeeId: 'emp-1',
    employeeCode: 'EMP-1000',
  },
  jwtSecret,
  { expiresIn: '1h' }
);

test('a valid bearer token populates req.user from the token only', () => {
  const req = { headers: { authorization: `Bearer ${validToken}` } };
  const { passed, nextError } = run(requireAuth, req);

  assert.equal(passed, true);
  assert.equal(nextError, undefined);
  assert.deepEqual(req.user, {
    id: 'user-1',
    role: 'ADMIN',
    employeeId: 'emp-1',
    employeeCode: 'EMP-1000',
  });
});

test('a missing Authorization header is rejected as 401', () => {
  const { passed, nextError } = run(requireAuth, { headers: {} });

  assert.equal(passed, false);
  assert.equal(nextError.statusCode, 401);
});

test('a non-Bearer scheme is rejected as 401', () => {
  const req = { headers: { authorization: `Basic ${validToken}` } };
  const { nextError } = run(requireAuth, req);

  assert.equal(nextError.statusCode, 401);
});

test('a token signed with the wrong secret is rejected as 401', () => {
  const forged = jwt.sign({ sub: 'user-1', role: 'ADMIN' }, 'not-the-real-secret');
  const { nextError } = run(requireAuth, { headers: { authorization: `Bearer ${forged}` } });

  assert.equal(nextError.statusCode, 401);
});

test('an expired token is rejected as 401', () => {
  const expired = jwt.sign({ sub: 'user-1', role: 'ADMIN' }, jwtSecret, { expiresIn: '-1s' });
  const { nextError } = run(requireAuth, { headers: { authorization: `Bearer ${expired}` } });

  assert.equal(nextError.statusCode, 401);
});

test('requireRole passes through for an allowed role', () => {
  const req = { user: { role: 'ADMIN' } };
  const { passed, nextError } = run(requireRole('ADMIN'), req);

  assert.equal(passed, true);
  assert.equal(nextError, undefined);
});

test('requireRole rejects a non-admin with 403', () => {
  const { passed, nextError } = run(requireRole('ADMIN'), { user: { role: 'EMPLOYEE' } });

  assert.equal(passed, false);
  assert.equal(nextError.statusCode, 403);
});

test('requireRole rejects an unauthenticated request with 401, not 403', () => {
  const { nextError } = run(requireRole('ADMIN'), {});

  assert.equal(nextError.statusCode, 401);
});
