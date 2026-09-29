const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createEmployeeSchema,
  updateEmployeeSchema,
  employeeIdParamSchema,
} = require('../src/modules/employees/employees.validation');
const { loginSchema } = require('../src/modules/auth/auth.validation');

test('createEmployeeSchema accepts a well formed employee', () => {
  const result = createEmployeeSchema.safeParse({
    employeeCode: 'EMP-1000',
    firstName: 'Jane',
    lastName: 'Doe',
  });

  assert.equal(result.success, true);
});

test('createEmployeeSchema rejects a malformed employee code', () => {
  const result = createEmployeeSchema.safeParse({
    employeeCode: 'emp-1000',
    firstName: 'Jane',
    lastName: 'Doe',
  });

  assert.equal(result.success, false);
});

test('createEmployeeSchema rejects a PIN that is not exactly 4 digits', () => {
  const base = { employeeCode: 'EMP-1000', firstName: 'Jane', lastName: 'Doe' };

  assert.equal(createEmployeeSchema.safeParse({ ...base, pin: '12345' }).success, false);
  assert.equal(createEmployeeSchema.safeParse({ ...base, pin: 'abcd' }).success, false);
  assert.equal(createEmployeeSchema.safeParse({ ...base, pin: '1234' }).success, true);
});

test('updateEmployeeSchema rejects an empty body', () => {
  const result = updateEmployeeSchema.safeParse({});

  assert.equal(result.success, false);
  assert.equal(result.error.flatten().formErrors[0], 'At least one field is required');
});

test('updateEmployeeSchema rejects a body whose only key is explicitly undefined', () => {
  // Without the refine this would count as one key and be accepted as a no-op.
  const result = updateEmployeeSchema.safeParse({ firstName: undefined });

  assert.equal(result.success, false);
});

test('updateEmployeeSchema accepts a single field update', () => {
  const result = updateEmployeeSchema.safeParse({ status: 'INACTIVE' });

  assert.equal(result.success, true);
  assert.deepEqual(result.data, { status: 'INACTIVE' });
});

test('updateEmployeeSchema rejects a status outside the enum', () => {
  const result = updateEmployeeSchema.safeParse({ status: 'DELETED' });

  assert.equal(result.success, false);
});

test('employeeIdParamSchema accepts a uuid', () => {
  const result = employeeIdParamSchema.safeParse({ id: '11111111-1111-1111-1111-111111111111' });

  assert.equal(result.success, true);
});

test('employeeIdParamSchema rejects a non-uuid id', () => {
  const result = employeeIdParamSchema.safeParse({ id: 'not-a-uuid' });

  assert.equal(result.success, false);
  assert.equal(result.error.issues[0].message, 'Invalid employee id');
});

test('loginSchema trims the full name before validation', () => {
  assert.equal(loginSchema.safeParse({ fullName: '  Maria Santos ', pin: '1234' }).success, true);
});

test('loginSchema rejects a missing or empty full name', () => {
  assert.equal(loginSchema.safeParse({ pin: '1234' }).success, false);
  assert.equal(loginSchema.safeParse({ fullName: '', pin: '1234' }).success, false);
  assert.equal(loginSchema.safeParse({ fullName: '   ', pin: '1234' }).success, false);
});

test('loginSchema rejects a non 4-digit PIN', () => {
  assert.equal(loginSchema.safeParse({ fullName: 'Maria Santos', pin: '12345' }).success, false);
  assert.equal(loginSchema.safeParse({ fullName: 'Maria Santos', pin: '12a4' }).success, false);
});

test('loginSchema rejects a numeric PIN, since it must be a string', () => {
  const result = loginSchema.safeParse({ fullName: 'Maria Santos', pin: 1234 });

  assert.equal(result.success, false);
});
