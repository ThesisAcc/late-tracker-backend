const { z } = require('zod');

const createAttendanceSchema = z.object({
  employeeId: z.string().uuid('Invalid employee ID format'),
  year: z.number().int().min(2020).max(2100),
  month: z.number().int().min(1).max(12),
  minutesLate: z.number().int().min(0, 'Minutes late must be 0 or greater'),
});

const updateAttendanceSchema = z.object({
  minutesLate: z.number().int().min(0, 'Minutes late must be 0 or greater'),
});

const attendanceIdParamSchema = z.object({
  id: z.string().uuid('Invalid attendance record ID'),
});

const employeeYearParamSchema = z.object({
  employeeId: z.string().uuid('Invalid employee ID'),
  year: z.coerce.number().int().min(2020).max(2100),
});

module.exports = {
  createAttendanceSchema,
  updateAttendanceSchema,
  attendanceIdParamSchema,
  employeeYearParamSchema,
};
