const attendanceService = require('./attendance.service');
const {
  createAttendanceSchema,
  updateAttendanceSchema,
  attendanceIdParamSchema,
  employeeYearParamSchema,
} = require('./attendance.validation');

/**
 * POST /api/admin/attendance
 * Create or update attendance record.
 */
async function upsert(req, res, next) {
  try {
    const data = createAttendanceSchema.parse(req.body);
    const record = await attendanceService.upsertAttendance(data);
    res.status(201).json(record);
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/admin/attendance/:id
 * Update attendance record minutes.
 */
async function update(req, res, next) {
  try {
    const { id } = attendanceIdParamSchema.parse(req.params);
    const { minutesLate } = updateAttendanceSchema.parse(req.body);
    const record = await attendanceService.updateAttendance(id, minutesLate);
    res.json(record);
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/admin/attendance/:id
 * Delete attendance record.
 */
async function deleteRecord(req, res, next) {
  try {
    const { id } = attendanceIdParamSchema.parse(req.params);
    const deleted = await attendanceService.deleteAttendance(id);
    res.json(deleted);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/attendance/:employeeId/:year
 * Get all attendance for employee in given year (12 months).
 */
async function getByEmployeeYear(req, res, next) {
  try {
    const { employeeId, year } = employeeYearParamSchema.parse(req.params);
    const result = await attendanceService.getEmployeeAttendanceForYear(employeeId, year);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  upsert,
  update,
  deleteRecord,
  getByEmployeeYear,
};
