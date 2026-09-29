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

module.exports = {
  findEmployeeWithUserByCode,
};
