const { AppError } = require('../../middleware/error.middleware');
const attendanceRepository = require('./attendance.repository');

/**
 * Create or update an attendance record.
 */
async function upsertAttendance({ employeeId, year, month, minutesLate }) {
  const exists = await attendanceRepository.employeeExists(employeeId);
  if (!exists) {
    throw new AppError(404, 'Employee not found');
  }

  return attendanceRepository.upsertAttendanceRecord({
    employeeId,
    year,
    month,
    minutesLate,
  });
}

/**
 * Update an existing attendance record's minutes.
 */
async function updateAttendance(id, minutesLate) {
  const record = await attendanceRepository.findById(id);
  if (!record) {
    throw new AppError(404, 'Attendance record not found');
  }

  return attendanceRepository.updateMinutesLate(id, minutesLate);
}

/**
 * Delete an attendance record.
 */
async function deleteAttendance(id) {
  const record = await attendanceRepository.findById(id);
  if (!record) {
    throw new AppError(404, 'Attendance record not found');
  }

  return attendanceRepository.deleteById(id);
}

/**
 * Get all attendance records for an employee in a given year.
 * Returns a 12-month structure, filling missing months with 0.
 */
async function getEmployeeAttendanceForYear(employeeId, year) {
  const exists = await attendanceRepository.employeeExists(employeeId);
  if (!exists) {
    throw new AppError(404, 'Employee not found');
  }

  const records = await attendanceRepository.findByEmployeeAndYear(employeeId, year);

  // Build 12-month map
  const monthMap = new Map();
  for (const record of records) {
    monthMap.set(record.month, record);
  }

  // Fill all 12 months
  const months = [];
  for (let month = 1; month <= 12; month++) {
    const record = monthMap.get(month);
    months.push({
      month,
      minutesLate: record?.minutesLate ?? 0,
      id: record?.id ?? null,
      importId: record?.importId ?? null,
      createdAt: record?.createdAt ?? null,
    });
  }

  return {
    employeeId,
    year,
    months,
  };
}

module.exports = {
  upsertAttendance,
  updateAttendance,
  deleteAttendance,
  getEmployeeAttendanceForYear,
};
