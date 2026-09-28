
const { z } = require('zod');

const loginSchema = z.object({
  employeeCode: z
    .string()
    .trim()
    .regex(/^EMP-\d+$/, 'Employee ID must be in the format EMP-1000'),

  pin: z
    .string()
    .regex(/^\d{4}$/, 'PIN must be exactly 4 digits'),
});

module.exports = { loginSchema };
