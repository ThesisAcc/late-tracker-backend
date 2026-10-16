const { AppError } = require('../../middleware/error.middleware');
const {
  createEmployeeSchema,
  updateEmployeeSchema,
  employeeIdParamSchema,
} = require('./employees.validation');
const employeesService = require('./employees.service');

async function create(req, res, next) {
  try {
    const data = createEmployeeSchema.parse(req.body);
    const employee = await employeesService.createEmployee(data);
    res.status(201).json(employee);
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const employees = await employeesService.listEmployees();
    res.json(employees);
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const { id } = employeeIdParamSchema.parse(req.params);
    const employee = await employeesService.getEmployee(id);
    if (!employee) throw new AppError(404, 'Employee not found');
    res.json(employee);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const { id } = employeeIdParamSchema.parse(req.params);
    const data = updateEmployeeSchema.parse(req.body);
    const updatedEmployee = await employeesService.updateEmployee(id, data, req.user.id, req.user.employeeId);
    res.json(updatedEmployee);
  } catch (err) {
    next(err);
  }
}
async function deleteEmployee(req, res, next) {
  try {
    const { id } = employeeIdParamSchema.parse(req.params);
    const deleted = await employeesService.deleteEmployee(id, req.user.id, req.user.employeeId);
    res.json(deleted);
  } catch (err) {
    next(err);
  }
}

async function resetPassword(req, res, next) {
  try {
    const { id } = employeeIdParamSchema.parse(req.params);
    const result = await employeesService.resetEmployeePassword(id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { create, list, getById, update, deleteEmployee, resetPassword };
