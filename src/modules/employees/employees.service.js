const employeesRepository = require('./employees.repository');
const { hashPin } = require('../auth/auth.service');
const PINGenerator = require('../../utils/PINGenerator');

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

module.exports = { createEmployee, listEmployees, getEmployee, updateEmployee };
