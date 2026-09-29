const prisma = require('../../lib/prisma');

async function findEmployeeById(id) {
  return prisma.employee.findUnique({
    where: { id },
    select: {
      id: true,
      employeeCode: true,
      firstName: true,
      middleName: true,
      lastName: true,
      status: true,
    },
  });
}

async function findAttendanceRecordsByEmployeeAndYear(employeeId, year) {
  return prisma.attendanceRecord.findMany({
    where: {
      employeeId,
      year,
    },
    select: {
      id: true,
      year: true,
      month: true,
      minutesLate: true,
    },
    orderBy: {
      month: 'asc',
    },
  });
}

async function findAllEmployeesWithAttendance(year) {
  return prisma.employee.findMany({
    select: {
      id: true,
      employeeCode: true,
      firstName: true,
      middleName: true,
      lastName: true,
      status: true,
      attendanceRecords: {
        where: { year },
        select: {
          id: true,
          month: true,
          minutesLate: true,
        },
        orderBy: { month: 'asc' },
      },
    },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
  });
}

module.exports = {
  findEmployeeById,
  findAttendanceRecordsByEmployeeAndYear,
  findAllEmployeesWithAttendance,
};
