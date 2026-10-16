const prisma = require('../../lib/prisma');

/**
 * Upsert attendance record (create or update based on employee/year/month).
 * importId is set to null for manual entries.
 */
async function upsertAttendanceRecord({ employeeId, year, month, minutesLate }) {
  return prisma.attendanceRecord.upsert({
    where: {
      employeeId_year_month: { employeeId, year, month },
    },
    create: {
      employeeId,
      year,
      month,
      minutesLate,
      importId: null,
    },
    update: {
      minutesLate,
      importId: null,
    },
    select: {
      id: true,
      employeeId: true,
      year: true,
      month: true,
      minutesLate: true,
      importId: true,
      createdAt: true,
    },
  });
}

/**
 * Update only the minutesLate field for an existing record.
 */
async function updateMinutesLate(id, minutesLate) {
  return prisma.attendanceRecord.update({
    where: { id },
    data: { minutesLate },
    select: {
      id: true,
      employeeId: true,
      year: true,
      month: true,
      minutesLate: true,
      importId: true,
      createdAt: true,
    },
  });
}

/**
 * Delete an attendance record by ID.
 */
async function deleteById(id) {
  return prisma.attendanceRecord.delete({
    where: { id },
    select: {
      id: true,
      employeeId: true,
      year: true,
      month: true,
      minutesLate: true,
    },
  });
}

/**
 * Find an attendance record by ID.
 */
async function findById(id) {
  return prisma.attendanceRecord.findUnique({
    where: { id },
    select: {
      id: true,
      employeeId: true,
      year: true,
      month: true,
      minutesLate: true,
      importId: true,
      createdAt: true,
    },
  });
}

/**
 * Find all attendance records for a given employee and year.
 */
async function findByEmployeeAndYear(employeeId, year) {
  return prisma.attendanceRecord.findMany({
    where: { employeeId, year },
    select: {
      id: true,
      month: true,
      minutesLate: true,
      importId: true,
      createdAt: true,
    },
    orderBy: { month: 'asc' },
  });
}

/**
 * Check if employee exists.
 */
async function employeeExists(employeeId) {
  const count = await prisma.employee.count({ where: { id: employeeId } });
  return count > 0;
}

module.exports = {
  upsertAttendanceRecord,
  updateMinutesLate,
  deleteById,
  findById,
  findByEmployeeAndYear,
  employeeExists,
};
