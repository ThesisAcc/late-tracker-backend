const { z } = require('zod');

const createEmployeeSchema = z.object({
  employeeCode: z.string().trim().min(1).max(50),
  firstName: z.string().trim().min(1).max(100),
  middleName: z.string().trim().max(100).optional().nullable(),
  lastName: z.string().trim().min(1).max(100),
  email: z.string().email(),
  pin: z.string().regex(/^\d{4}$/, 'PIN must be exactly 4 digits'),
});

const updateEmployeeSchema = z.object({
  firstName: z.string().trim().min(1).max(100).optional(),
  middleName: z.string().trim().max(100).optional().nullable(),
  lastName: z.string().trim().min(1).max(100).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

module.exports = { createEmployeeSchema, updateEmployeeSchema };
