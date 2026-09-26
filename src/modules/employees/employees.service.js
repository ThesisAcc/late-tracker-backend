const employeesRepository = require('./employees.repository');
const { hashPin } = require('../auth/auth.service');

async function createEmployee(input) {
  const passwordHash = await hashPin(input.pin);
  const { employee, user } = await employeesRepository.createEmployeeWithUser({
    employeeCode: input.employeeCode,
    firstName: input.firstName,
    middleName: input.middleName ?? null,
    lastName: input.lastName,
    email: input.email,
    passwordHash,
  });

  return {
    id: employee.id,
    employeeCode: employee.employeeCode,
    firstName: employee.firstName,
    middleName: employee.middleName,
    lastName: employee.lastName,
    status: employee.status,
    user: { id: user.id, email: user.email, role: user.role, status: user.status },
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
