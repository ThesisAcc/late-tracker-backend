const { z } = require('zod');

const currentYear = () => new Date().getFullYear();

const employeeDashboardQuerySchema = z.object({
  year: z
    .preprocess((val) => (val === undefined || val === '' ? undefined : Number(val)), z.number().int().min(2000).max(2100).optional())
    .transform((val) => val ?? currentYear()),
});

const adminDashboardQuerySchema = z.object({
  year: z
    .preprocess((val) => (val === undefined || val === '' ? undefined : Number(val)), z.number().int().min(2000).max(2100).optional())
    .transform((val) => val ?? currentYear()),
  month: z
    .preprocess((val) => (val === undefined || val === '' ? undefined : Number(val)), z.number().int().min(1).max(12).optional()),
  sortBy: z
    .enum(['totalMinutesLate', 'lateRatePercentage', 'lastName', 'firstName', 'employeeCode'])
    .default('totalMinutesLate'),
  order: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().trim().max(100).optional(),
});

const employeeIdParamSchema = z.object({
  id: z.string().uuid('Invalid employee id'),
});

module.exports = {
  employeeDashboardQuerySchema,
  adminDashboardQuerySchema,
  employeeIdParamSchema,
};
