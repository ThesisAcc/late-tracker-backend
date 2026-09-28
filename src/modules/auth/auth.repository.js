const prisma = require('../../lib/prisma');

async function findEmployeeWithUserByCode(employeeCode) {
  return prisma.employee.findUnique({
    where: {
      employeeCode,
    },
    include: {
      user: true,
    },
  });
}

async function findUserById(userId) {
  return prisma.user.findUnique({
    where: {
      id: userId,
    },
    include: {
      employee: true,
    },
  });
}

async function createUser(data) {
  return prisma.user.create({
    data,
    include: {
      employee: true,
    },
  });
}

module.exports = {
  findEmployeeWithUserByCode,
  findUserById,
  createUser,
};
