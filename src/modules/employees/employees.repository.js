const prisma = require('../../lib/prisma');

const publicEmployeeSelect = {
  id: true,
  employeeCode: true,
  firstName: true,
  middleName: true,
  lastName: true,
  status: true,
  createdAt: true,
  user: { select: { id: true, email: true, role: true, status: true } },
};

function createEmployeeWithUser({ employeeCode, firstName, middleName, lastName, email, passwordHash }) {
  // Employee + User are created together in one transaction: an employee
  // record without a login account (or vice versa) is not a valid state here.
  return prisma.$transaction(async (tx) => {
    const employee = await tx.employee.create({
      data: { employeeCode, firstName, middleName, lastName },
    });

    const user = await tx.user.create({
      data: {
        employeeId: employee.id,
        email,
        passwordHash,
        role: 'EMPLOYEE',
      },
    });

    return { employee, user };
  });
}

function findAll() {
  return prisma.employee.findMany({
    select: publicEmployeeSelect,
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
  });
}

function findById(id) {
  return prisma.employee.findUnique({ where: { id }, select: publicEmployeeSelect });
}

function updateById(id, data) {
  return prisma.employee.update({ where: { id }, data, select: publicEmployeeSelect });
}

module.exports = { createEmployeeWithUser, findAll, findById, updateById };
