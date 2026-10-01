const prisma = require('../../lib/prisma');

function findResetPreviewData() {
  return prisma.$transaction(async (tx) => {
    const users = await tx.user.findMany({
      where: { role: { not: 'ADMIN' } },
      select: {
        id: true,
        role: true,
        status: true,
        employeeId: true,
        employee: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            middleName: true,
            lastName: true,
            status: true,
          },
        },
      },
      orderBy: [{ employee: { lastName: 'asc' } }, { employee: { firstName: 'asc' } }],
    });

    const attendanceRecords = await tx.attendanceRecord.findMany({
      select: {
        id: true,
        employeeId: true,
        year: true,
        month: true,
        minutesLate: true,
      },
      orderBy: [{ year: 'asc' }, { month: 'asc' }],
    });

    const imports = await tx.attendanceImport.findMany({
      select: {
        id: true,
        year: true,
        filename: true,
        status: true,
        createdAt: true,
        uploadedByUserId: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const importIssues = await tx.attendanceImportIssue.findMany({
      select: {
        id: true,
        importId: true,
        employeeId: true,
        issueType: true,
        message: true,
      },
    });

    return {
      users,
      attendanceRecords,
      imports,
      importIssues,
    };
  });
}

function clearNonAdminData() {
  return prisma.$transaction(async (tx) => {
    await tx.attendanceImportIssue.deleteMany();
    await tx.attendanceRecord.deleteMany();
    await tx.attendanceImport.deleteMany();
    await tx.user.deleteMany({ where: { role: { not: 'ADMIN' } } });
    await tx.employee.deleteMany({ where: { user: null } });
  }, {
    maxWait: 10000,
    timeout: 120000,
  });
}

module.exports = { findResetPreviewData, clearNonAdminData };