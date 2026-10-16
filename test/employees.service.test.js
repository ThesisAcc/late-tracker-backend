const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const repositoryPath = path.join(__dirname, '..', 'src', 'modules', 'employees', 'employees.repository.js');
const employeesServicePath = path.join(__dirname, '..', 'src', 'modules', 'employees', 'employees.service.js');

function loadServiceWithStub(stub) {
  delete require.cache[employeesServicePath];
  require.cache[repositoryPath] = {
    id: repositoryPath,
    filename: repositoryPath,
    loaded: true,
    exports: stub,
  };
  return require(employeesServicePath);
}

test('deleteEmployee throws 404 when employee not found', async () => {
  const service = loadServiceWithStub({
    findById: async () => null,
  });

  await assert.rejects(
    () => service.deleteEmployee('emp-1', 'user-admin', 'emp-admin'),
    { statusCode: 404, message: 'Employee not found' }
  );
});

test('deleteEmployee throws 400 when admin attempts to delete own account', async () => {
  const service = loadServiceWithStub({
    findById: async () => ({ id: 'emp-admin', user: { id: 'user-admin' } }),
  });

  await assert.rejects(
    () => service.deleteEmployee('emp-admin', 'user-admin', 'emp-admin'),
    { statusCode: 400, message: 'Cannot delete your own account' }
  );
});

test('deleteEmployee deletes successfully when deleting another employee', async () => {
  let deletedId = null;
  const service = loadServiceWithStub({
    findById: async (id) => ({ id, user: { id: 'user-target' } }),
    deleteById: async (id) => {
      deletedId = id;
      return { id };
    },
  });

  const result = await service.deleteEmployee('emp-target', 'user-admin', 'emp-admin');
  assert.equal(deletedId, 'emp-target');
  assert.deepEqual(result, { id: 'emp-target' });
});

test('resetEmployeePassword throws 404 when employee not found', async () => {
  const service = loadServiceWithStub({
    findById: async () => null,
  });

  await assert.rejects(
    () => service.resetEmployeePassword('emp-missing'),
    { statusCode: 404, message: 'Employee not found' }
  );
});

test('resetEmployeePassword throws 404 when employee has no user', async () => {
  const service = loadServiceWithStub({
    findById: async () => ({ id: 'emp-1', user: null }),
  });

  await assert.rejects(
    () => service.resetEmployeePassword('emp-1'),
    { statusCode: 404, message: 'User account not found for this employee' }
  );
});

test('resetEmployeePassword updates user password hash to default 1234', async () => {
  let updatedEmployeeId = null;
  let updatedHash = null;

  const service = loadServiceWithStub({
    findById: async (id) => ({ id, user: { id: 'user-1' } }),
    resetPassword: async (empId, hash) => {
      updatedEmployeeId = empId;
      updatedHash = hash;
      return { id: 'user-1' };
    },
  });

  const result = await service.resetEmployeePassword('emp-1');
  assert.equal(updatedEmployeeId, 'emp-1');
  assert.ok(updatedHash);
  assert.equal(result.message, 'Password reset to default 1234 successfully');
});
