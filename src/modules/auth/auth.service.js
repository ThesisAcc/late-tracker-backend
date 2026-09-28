const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const authRepository = require('./auth.repository');
const { jwtSecret, jwtExpiresIn } = require('../../config/env');
const { AppError } = require('../../middleware/error.middleware');

const PIN_SALT_ROUNDS = 10;

async function hashPin(pin) {
  return bcrypt.hash(pin, PIN_SALT_ROUNDS);
}

async function login({ employeeCode, pin }) {
  const employee =
    await authRepository.findEmployeeWithUserByCode(employeeCode);

  const invalidCredentials = () =>
    new AppError(401, 'Invalid employee ID or PIN');

  if (!employee || !employee.user) {
    throw invalidCredentials();
  }

  const user = employee.user;

  if (employee.status !== 'ACTIVE') {
    throw new AppError(403, 'This employee is inactive');
  }

  if (user.status !== 'ACTIVE') {
    throw new AppError(403, 'This account is disabled');
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
