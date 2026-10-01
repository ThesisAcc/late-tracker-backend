const resetRepository = require('./reset.repository');

function normalizeEmployee(employee) {
  if (!employee) return null;
  return {
    id: employee.id,
    employeeCode: employee.employeeCode,
    firstName: employee.firstName,
    middleName: employee.middleName,
    lastName: employee.lastName,
    status: employee.status,
  };
}

function normalizeUser(user) {
  return {
    id: user.id,
    role: user.role,
    status: user.status,
    employeeId: user.employeeId,
    employee: normalizeEmployee(user.employee),
  };
}

async function previewReset() {
  const { users, attendanceRecords, imports, importIssues } = await resetRepository.findResetPreviewData();

  const nonAdminUsers = users.map(normalizeUser);
  const employeeMap = new Map();
  for (const user of nonAdminUsers) {
    if (user.employee) employeeMap.set(user.employee.id, user.employee);
  }

  return {
    summary: {
      nonAdminUsersCount: nonAdminUsers.length,
      nonAdminEmployeesCount: employeeMap.size,
      attendanceRecordsCount: attendanceRecords.length,
      importsCount: imports.length,
      importIssuesCount: importIssues.length,
    },
    users: nonAdminUsers,
    employees: Array.from(employeeMap.values()),
    attendanceRecords,
    imports,
    importIssues,
  };
}

async function executeReset() {
  const preview = await previewReset();
  await resetRepository.clearNonAdminData();
  return preview;
}

module.exports = { previewReset, executeReset };