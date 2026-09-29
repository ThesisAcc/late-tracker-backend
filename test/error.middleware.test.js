const test = require('node:test');
const assert = require('node:assert/strict');
const { z } = require('zod');

const { createRes, prismaError } = require('./helpers');
const { AppError, errorHandler, notFoundHandler } = require('../src/middleware/error.middleware');

function handle(err) {
  const res = createRes();
  errorHandler(err, {}, res, () => {});
  return res;
}

test('P2002 unique violation maps to 409 and names the column', () => {
  const res = handle(prismaError('P2002', { target: ['employee_code'] }));

  assert.equal(res.statusCode, 409);
  assert.equal(res.body.error, 'ConflictError');
  assert.match(res.body.message, /employee_code/);
});

test('P2002 still returns 409 when Prisma supplies no target metadata', () => {
  const res = handle(prismaError('P2002', undefined));

  assert.equal(res.statusCode, 409);
  assert.equal(res.body.error, 'ConflictError');
});

test('P2023 inconsistent column data (e.g. malformed uuid) maps to 400', () => {
  const res = handle(prismaError('P2023', { modelName: 'Employee' }));

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error, 'ValidationError');
});

test('P2025 required record not found maps to 404', () => {
  const res = handle(
    prismaError('P2025', { modelName: 'Employee', cause: 'Record to update not found.' })
  );

  assert.equal(res.statusCode, 404);
  assert.equal(res.body.error, 'NotFoundError');
  assert.equal(res.body.message, 'Record to update not found.');
});

test('P2025 falls back to a generic message when cause is absent', () => {
  const res = handle(prismaError('P2025', undefined));

  assert.equal(res.statusCode, 404);
  assert.equal(res.body.message, 'The requested record does not exist.');
});

test('P2003 foreign key violation maps to 409', () => {
  const res = handle(prismaError('P2003', { field_name: 'users_employee_id_fkey' }));

  assert.equal(res.statusCode, 409);
  assert.equal(res.body.error, 'ConflictError');
});

test('an unmapped Prisma code becomes a 500 that leaks no internals', () => {
  const res = handle(prismaError('P9999', { connectionString: 'postgres://user:hunter2@host' }));

  assert.equal(res.statusCode, 500);
  assert.equal(res.body.error, 'InternalError');
  assert.equal(res.body.message, 'A database error occurred.');
  assert.doesNotMatch(JSON.stringify(res.body), /hunter2/);
  assert.doesNotMatch(JSON.stringify(res.body), /raw database internals/);
});

test('ZodError maps to 400 with flattened field details', () => {
  const schema = z.object({ pin: z.string().regex(/^\d{4}$/) });
  const result = schema.safeParse({ pin: 'abc' });

  const res = handle(result.error);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error, 'ValidationError');
  assert.ok(res.body.details.fieldErrors.pin);
});

test('AppError honours its own status and passes details through', () => {
  const res = handle(new AppError(403, 'Nope', { field: 'status' }));

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.message, 'Nope');
  assert.deepEqual(res.body.details, { field: 'status' });
});

test('an unknown error becomes a 500 that leaks no internals', () => {
  const res = handle(new Error('connection string postgres://u:p@h failed'));

  assert.equal(res.statusCode, 500);
  assert.equal(res.body.error, 'InternalError');
  assert.doesNotMatch(JSON.stringify(res.body), /postgres:\/\/u:p@h/);
});

test('notFoundHandler forwards a 404 AppError', () => {
  let captured;
  notFoundHandler({}, {}, (err) => {
    captured = err;
  });

  assert.ok(captured instanceof AppError);
  assert.equal(captured.statusCode, 404);
});
