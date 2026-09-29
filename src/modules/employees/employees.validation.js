const { z } = require('zod');

const createEmployeeSchema = z.object({
  employeeCode: z
    .string()
    .trim()
    .regex(/^EMP-\d+$/, 'Employee ID must be in the format EMP-1000'),
  firstName: z.string().trim().min(1).max(100),
  middleName: z.string().trim().max(100).optional().nullable(),
  lastName: z.string().trim().min(1).max(100),
  pin: z.string().regex(/^\d{4}$/, 'PIN must be exactly 4 digits').optional(),
});

const updateEmployeeSchema = z
  .object({
    firstName: z.string().trim().min(1).max(100).optional(),
    middleName: z.string().trim().max(100).optional().nullable(),
    lastName: z.string().trim().min(1).max(100).optional(),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  })
  // Counts defined values rather than keys: zod strips an explicit undefined
  // from the parsed output but leaves the key in place, so counting keys would
  // let { firstName: undefined } through as a no-op update. null is meaningful
  // here because it clears middleName.
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: 'At least one field is required',
  });

const employeeIdParamSchema = z.object({
  id: z.string().uuid('Invalid employee id'),
});

module.exports = { createEmployeeSchema, updateEmployeeSchema, employeeIdParamSchema };
