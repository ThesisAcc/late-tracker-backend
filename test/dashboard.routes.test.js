const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

const { jwtSecret } = require('../src/config/env');
const { requireAuth } = require('../src/middleware/auth.middleware');
const { requireRole } = require('../src/middleware/role.middleware');

function createToken(role = 'EMPLOYEE', employeeId = 'emp-101') {
  return jwt.sign(
    {
      sub: 'user-101',
      role,
      employeeId,
      employeeCode: 'EMP-1001',
    },
    jwtSecret,
    { expiresIn: '1h' }
  );
}

test('dashboard route requires authentication', () => {
  let passed = false;
  let nextErr;
  requireAuth({ headers: {} }, {}, (err) => {
    if (err) nextErr = err;
    else passed = true;
  });
  assert.equal(passed, false);
  assert.equal(nextErr.statusCode, 401);
});

test('regular employee can pass authentication for personal dashboard', () => {
  const token = createToken('EMPLOYEE', 'emp-101');
  const req = { headers: { authorization: `Bearer ${token}` } };
  let passed = false;
  let nextErr;
  requireAuth(req, {}, (err) => {
    if (err) nextErr = err;
    else passed = true;
  });
  assert.equal(passed, true);
  assert.equal(nextErr, undefined);
  assert.equal(req.user.employeeId, 'emp-101');
  assert.equal(req.user.role, 'EMPLOYEE');
});

test('admin dashboard denies access to regular employee', () => {
  const req = { user: { role: 'EMPLOYEE' } };
  let passed = false;
  let nextErr;
  const adminGuard = requireRole('ADMIN');
  adminGuard(req, {}, (err) => {
    if (err) nextErr = err;
    else passed = true;
  });
  assert.equal(passed, false);
  assert.equal(nextErr.statusCode, 403);
});

test('admin dashboard allows access to admin role', () => {
  const req = { user: { role: 'ADMIN' } };
  let passed = false;
  let nextErr;
  const adminGuard = requireRole('ADMIN');
  adminGuard(req, {}, (err) => {
    if (err) nextErr = err;
    else passed = true;
  });
  assert.equal(passed, true);
  assert.equal(nextErr, undefined);
});
