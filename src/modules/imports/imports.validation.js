const { z } = require('zod');

const currentYear = new Date().getFullYear();

// Query/body params for the preview and execute import endpoints.
const importParamsSchema = z.object({
  year: z
    .string()
    .trim()
    .regex(/^\d{4}$/, 'year must be a 4-digit number')
    .transform(Number)
    .refine((y) => y >= 2000 && y <= 2100, 'year must be between 2000 and 2100')
    .default(String(currentYear)),

  sheetName: z.string().trim().optional(),

  // Accept string 'true'/'false' from multipart fields or plain booleans from JSON.
  createMissingEmployees: z
    .union([z.boolean(), z.string()])
    .transform((v) => {
      if (typeof v === 'boolean') return v;
      return v.toLowerCase() !== 'false';
    })
    .default(true),
});

const importIdParamSchema = z.object({
  id: z.string().uuid('Invalid import id'),
});

const listImportsQuerySchema = z.object({
  year: z
    .string()
    .trim()
    .regex(/^\d{4}$/, 'year must be a 4-digit number')
    .transform(Number)
    .optional(),
  limit: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .refine((n) => n >= 1 && n <= 100, 'limit must be 1 to 100')
    .default('20'),
  offset: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .default('0'),
});

module.exports = { importParamsSchema, importIdParamSchema, listImportsQuerySchema };
