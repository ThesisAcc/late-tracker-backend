const test = require('node:test');
const assert = require('node:assert/strict');
const {
  employeeDashboardQuerySchema,
  adminDashboardQuerySchema,
  employeeIdParamSchema,
} = require('../src/modules/dashboard/dashboard.validation');

test('employeeDashboardQuerySchema defaults year to current year if undefined', () => {
  const result = employeeDashboardQuerySchema.parse({});
  assert.equal(result.year, new Date().getFullYear());
});

test('employeeDashboardQuerySchema accepts valid year string', () => {
  const result = employeeDashboardQuerySchema.parse({ year: '2025' });
  assert.equal(result.year, 2025);
});

test('employeeDashboardQuerySchema rejects year below 2000', () => {
  assert.throws(() => {
    employeeDashboardQuerySchema.parse({ year: '1999' });
  });
});

test('employeeDashboardQuerySchema rejects year above 2100', () => {
  assert.throws(() => {
    employeeDashboardQuerySchema.parse({ year: '2101' });
  });
});

test('employeeDashboardQuerySchema rejects non-numeric year', () => {
  assert.throws(() => {
    employeeDashboardQuerySchema.parse({ year: 'abc' });
  });
});

test('adminDashboardQuerySchema provides expected defaults', () => {
  const result = adminDashboardQuerySchema.parse({});
  assert.equal(result.year, new Date().getFullYear());
  assert.equal(result.month, undefined);
  assert.equal(result.sortBy, 'totalMinutesLate');
  assert.equal(result.order, 'desc');
  assert.equal(result.search, undefined);
});

test('adminDashboardQuerySchema accepts valid month', () => {
  const result = adminDashboardQuerySchema.parse({ month: '5' });
  assert.equal(result.month, 5);
});

test('adminDashboardQuerySchema rejects month < 1 or > 12', () => {
  assert.throws(() => {
    adminDashboardQuerySchema.parse({ month: '0' });
  });
  assert.throws(() => {
    adminDashboardQuerySchema.parse({ month: '13' });
  });
});

test('adminDashboardQuerySchema accepts valid sortBy and order', () => {
  const result = adminDashboardQuerySchema.parse({
    sortBy: 'lateRatePercentage',
    order: 'asc',
    search: 'Santos',
  });
  assert.equal(result.sortBy, 'lateRatePercentage');
  assert.equal(result.order, 'asc');
  assert.equal(result.search, 'Santos');
});

test('adminDashboardQuerySchema rejects invalid sortBy', () => {
  assert.throws(() => {
    adminDashboardQuerySchema.parse({ sortBy: 'invalidColumn' });
  });
});

test('employeeIdParamSchema accepts a valid UUID', () => {
  const validUuid = '123e4567-e89b-12d3-a456-426614174000';
  const result = employeeIdParamSchema.parse({ id: validUuid });
  assert.equal(result.id, validUuid);
});

test('employeeIdParamSchema rejects an invalid UUID', () => {
  assert.throws(() => {
    employeeIdParamSchema.parse({ id: 'not-a-uuid' });
  });
});
