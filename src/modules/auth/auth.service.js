const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const authRepository = require('./auth.repository');
const { jwtSecret, jwtExpiresIn } = require('../../config/env');
const { AppError } = require('../../middleware/error.middleware');

const PIN_SALT_ROUNDS = 10;

// A real bcrypt hash of a value nobody can log in with. It is compared against
// when no user is found so a missing/ambiguous name costs the same wall-clock
// time as a wrong PIN, and the login endpoint cannot be used to enumerate
// valid employee names by timing.
const DUMMY_PIN_HASH = bcrypt.hashSync('0000', PIN_SALT_ROUNDS);

async function hashPin(pin) {
  return bcrypt.hash(pin, PIN_SALT_ROUNDS);
}

// Every failure returns the same status and message on purpose: an unknown
// name, a wrong PIN, an inactive employee and a disabled account must be
// indistinguishable, otherwise this endpoint enumerates valid employee names.
const invalidCredentials = () => new AppError(401, 'Invalid full name or PIN');

async function login({ fullName, pin }) {
  const candidates =
    await authRepository.findActiveEmployeesWithUserByName(fullName);

  // Exactly one active employee must match. Zero or multiple (ambiguous)
  // results are treated as not-found for security - both cost the same time.
  if (!candidates || candidates.length !== 1) {
    await bcrypt.compare(pin, DUMMY_PIN_HASH);
    throw invalidCredentials();
  }

  const employee = candidates[0];
  const user = employee.user;

  if (!user || user.status !== 'ACTIVE') {
    await bcrypt.compare(pin, DUMMY_PIN_HASH);
    throw invalidCredentials();
  }

  const pinMatches = await bcrypt.compare(pin, user.passwordHash);

  if (!pinMatches) {
    throw invalidCredentials();
  }

  const payload = {
    sub: user.id,
    role: user.role,
    employeeId: employee.id,
    employeeCode: employee.employeeCode,
  };

  const token = jwt.sign(payload, jwtSecret, {
    expiresIn: jwtExpiresIn,
  });

  return {
    token,
    user: {
      id: user.id,
      role: user.role,
      employee: {
        id: employee.id,
        employeeCode: employee.employeeCode,
        firstName: employee.firstName,
        lastName: employee.lastName,
      },
    },
  };
}

async function changePassword(userId, { currentPin, newPin }) {
  const user = await authRepository.findUserById(userId);

  if (!user || user.status !== 'ACTIVE') {
    throw new AppError(404, 'User not found or account is disabled');
  }

  const pinMatches = await bcrypt.compare(currentPin, user.passwordHash);
  if (!pinMatches) {
    throw new AppError(400, 'Current PIN is incorrect');
  }

  const newHash = await hashPin(newPin);
  await authRepository.updatePasswordHash(userId, newHash);

  return { message: 'Password changed successfully' };
}

module.exports = {
  login,
  hashPin,
  changePassword,
};

