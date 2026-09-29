const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const authRepository = require('./auth.repository');
const { jwtSecret, jwtExpiresIn } = require('../../config/env');
const { AppError } = require('../../middleware/error.middleware');

const PIN_SALT_ROUNDS = 10;

// A real bcrypt hash of a value nobody can log in with. It is compared against
// when no user is found so a missing employee code costs the same wall-clock
// time as a wrong PIN, and the login endpoint cannot be used to enumerate
// valid employee codes by timing.
const DUMMY_PIN_HASH = bcrypt.hashSync('0000', PIN_SALT_ROUNDS);

async function hashPin(pin) {
  return bcrypt.hash(pin, PIN_SALT_ROUNDS);
}

// Every failure returns the same status and message on purpose: an unknown
// employee code, a wrong PIN, an inactive employee and a disabled account must
// be indistinguishable, otherwise this endpoint enumerates valid EMP-#### codes.
const invalidCredentials = () => new AppError(401, 'Invalid employee ID or PIN');

async function login({ employeeCode, pin }) {
  const employee =
    await authRepository.findEmployeeWithUserByCode(employeeCode);

  if (!employee || !employee.user) {
    await bcrypt.compare(pin, DUMMY_PIN_HASH);
    throw invalidCredentials();
  }

  const user = employee.user;

  if (employee.status !== 'ACTIVE' || user.status !== 'ACTIVE') {
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

module.exports = {
  login,
  hashPin,
};
