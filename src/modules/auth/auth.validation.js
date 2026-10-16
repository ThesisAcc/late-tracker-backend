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

const changePasswordSchema = z
  .object({
    currentPin: z
      .string()
      .regex(/^\d{4}$/, 'Current PIN must be exactly 4 digits'),
    newPin: z
      .string()
      .regex(/^\d{4}$/, 'New PIN must be exactly 4 digits'),
  })
  .refine((data) => data.currentPin !== data.newPin, {
    message: 'New PIN must be different from current PIN',
    path: ['newPin'],
  });

module.exports = { loginSchema, changePasswordSchema };
