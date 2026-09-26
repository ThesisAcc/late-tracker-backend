const { z } = require('zod');

const loginSchema = z.object({
  email: z.string().email(),
  pin: z
    .string()
    .regex(/^\d{4}$/, 'PIN must be exactly 4 digits'),
});

module.exports = { loginSchema };
