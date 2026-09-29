const { z } = require('zod');

const loginSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, 'Full name is required')
    .max(200, 'Full name must not exceed 200 characters'),

  pin: z
    .string()
    .regex(/^\d{4}$/, 'PIN must be exactly 4 digits'),
});

module.exports = { loginSchema };
