const employeesRepository = require('./employees.repository');
const { hashPin } = require('../auth/auth.service');
const PINGenerator = require('../../utils/pin-generator');
const { AppError } = require('../../middleware/error.middleware');

async function createEmployee(input) {
  const pinWasGenerated = !input.pin;
  const pin = input.pin || PINGenerator();

  const passwordHash = await hashPin(pin);
  const { employee, user } = await employeesRepository.createEmployeeWithUser({
    employeeCode: input.employeeCode,
    firstName: input.firstName,
    middleName: input.middleName ?? null,
    lastName: input.lastName,
    passwordHash,
  });

  return {
    id: employee.id,
    employeeCode: employee.employeeCode,
    firstName: employee.firstName,
    middleName: employee.middleName,
    lastName: employee.lastName,
    status: employee.status,
    updatedAt: employee.updatedAt,
    user: { id: user.id, role: user.role, status: user.status },
    ...(pinWasGenerated ? { generatedPin: pin } : {}),
  };
}

function listEmployees() {
  return employeesRepository.findAll();
}

function getEmployee(id) {
  return employeesRepository.findById(id);
}

function updateEmployee(id, data) {
  return employeesRepository.updateById(id, data);
}

async function deleteEmployee(id, currentUserId, currentEmployeeId) {
  const employee = await employeesRepository.findById(id);
  if (!employee) throw new AppError(404, 'Employee not found');

  if (employee.id === currentEmployeeId || employee.user?.id === currentUserId) {
    throw new AppError(400, 'Cannot delete your own account');
  }

  return employeesRepository.deleteById(id);
}

async function resetEmployeePassword(id) {
  const employee = await employeesRepository.findById(id);
  if (!employee) throw new AppError(404, 'Employee not found');
  if (!employee.user) throw new AppError(404, 'User account not found for this employee');

  const defaultPin = '1234';
  const passwordHash = await hashPin(defaultPin);
  await employeesRepository.resetPassword(id, passwordHash);

  return { message: 'Password reset to default 1234 successfully' };
}

module.exports = {
  createEmployee,
  listEmployees,
  getEmployee,
  updateEmployee,
  deleteEmployee,
  resetEmployeePassword,
};
