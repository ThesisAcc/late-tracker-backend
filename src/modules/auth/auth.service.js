const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../../lib/prisma');
const { jwtSecret, jwtExpiresIn } = require('../../config/env');
const { AppError } = require('../../middleware/error.middleware');

const PIN_SALT_ROUNDS = 10;

async function hashPin(pin) {
  return bcrypt.hash(pin, PIN_SALT_ROUNDS);
}

async function login({ email, pin }) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { employee: true },
  });

  // Same error whether the email doesn't exist or the PIN is wrong -
  // don't let a client enumerate valid emails.
  const invalidCredentials = () => new AppError(401, 'Invalid email or PIN');

  if (!user) throw invalidCredentials();
  if (user.status !== 'ACTIVE') throw new AppError(403, 'This account is disabled');

  const pinMatches = await bcrypt.compare(pin, user.passwordHash);
  if (!pinMatches) throw invalidCredentials();

  const payload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    employeeId: user.employeeId,
  };

  const token = jwt.sign(payload, jwtSecret, { expiresIn: jwtExpiresIn });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      employee: user.employee
        ? {
            id: user.employee.id,
            employeeCode: user.employee.employeeCode,
            firstName: user.employee.firstName,
            lastName: user.employee.lastName,
          }
        : null,
    },
  };
}

module.exports = { login, hashPin };
