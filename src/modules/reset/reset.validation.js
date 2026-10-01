const { z } = require('zod');

const resetConfirmSchema = z.object({
  confirm: z.literal('RESET_NON_ADMIN_DATA'),
});

module.exports = { resetConfirmSchema };