const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const repositoryPath = path.join(__dirname, '..', 'src', 'modules', 'reset', 'reset.repository.js');
const repository = require(repositoryPath);
const resetServicePath = path.join(__dirname, '..', 'src', 'modules', 'reset', 'reset.service.js');

function loadServiceWithStub(stub) {
  delete require.cache[resetServicePath];
  require.cache[repositoryPath] = {
    id: repositoryPath,
    filename: repositoryPath,
    loaded: true,
    exports: stub,
  };
  return require(resetServicePath);
}

test('previewReset returns counts and affected rows from the repository', async () => {
  const service = loadServiceWithStub({
    findResetPreviewData: async () => ({
      users: [
        {
          id: 'user-1',
          role: 'EMPLOYEE',
          status: 'ACTIVE',
          employeeId: 'emp-1',
          employee: {
            id: 'emp-1',
            employeeCode: 'EMP-1001',
            firstName: 'Jane',
            middleName: null,
            lastName: 'Doe',
            status: 'ACTIVE',
          },
        },
      ],
      attendanceRecords: [{ id: 'record-1' }],
      imports: [{ id: 'import-1' }],
      importIssues: [{ id: 'issue-1' }],
    }),
    clearNonAdminData: async () => {},
  });

  const result = await service.previewReset();

  assert.equal(result.summary.nonAdminUsersCount, 1);
  assert.equal(result.summary.nonAdminEmployeesCount, 1);
  assert.equal(result.summary.attendanceRecordsCount, 1);
  assert.equal(result.summary.importsCount, 1);
  assert.equal(result.summary.importIssuesCount, 1);
  assert.equal(result.users[0].employee.employeeCode, 'EMP-1001');
});

test('executeReset returns the preview snapshot before clearing data', async () => {
  let cleared = false;
  const service = loadServiceWithStub({
    findResetPreviewData: async () => ({
      users: [],
      attendanceRecords: [],
      imports: [],
      importIssues: [],
    }),
    clearNonAdminData: async () => {
      cleared = true;
    },
  });

  const result = await service.executeReset();

  assert.equal(cleared, true);
  assert.equal(result.summary.nonAdminUsersCount, 0);
});

delete require.cache[resetServicePath];
require.cache[repositoryPath] = {
  id: repositoryPath,
  filename: repositoryPath,
  loaded: true,
  exports: repository,
};