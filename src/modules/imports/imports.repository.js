const prisma = require('../../lib/prisma');

// ─────────────────────────────────────────────
// IMPORT HISTORY
// ─────────────────────────────────────────────

function createImportRecord({ year, filename, fileHash, uploadedByUserId }) {
  return prisma.attendanceImport.create({
    data: { year, filename, fileHash, uploadedByUserId, status: 'PENDING' },
  });
}

function updateImportStatus(id, { status, completedAt }) {
  return prisma.attendanceImport.update({
    where: { id },
    data: { status, completedAt },
  });
}

function findImports({ year, limit, offset } = {}) {
  return prisma.attendanceImport.findMany({
    where: year ? { year } : undefined,
    include: {
      uploadedBy: {
        include: { employee: { select: { id: true, employeeCode: true, firstName: true, lastName: true } } },
      },
      _count: { select: { attendanceRecords: true, issues: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit ?? 20,
    skip: offset ?? 0,
  });
}

function countImports({ year } = {}) {
  return prisma.attendanceImport.count({ where: year ? { year } : undefined });
}

function findImportById(id) {
  return prisma.attendanceImport.findUnique({
    where: { id },
    include: {
      uploadedBy: {
        include: { employee: { select: { id: true, employeeCode: true, firstName: true, lastName: true } } },
      },
      issues: {
        orderBy: [{ rowNumber: 'asc' }],
      },
      _count: { select: { attendanceRecords: true } },
    },
  });
}

// ─────────────────────────────────────────────
// EMPLOYEE LOOKUPS
// ─────────────────────────────────────────────

/**
 * Returns a Map<employeeCode (lowercase) → employee> for all active employees.
 */
async function findAllActiveEmployeesByCode() {
  const rows = await prisma.employee.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, employeeCode: true, firstName: true, middleName: true, lastName: true },
  });

  const map = new Map();
  for (const emp of rows) {
    map.set(emp.employeeCode.toLowerCase(), emp);
  }
  return map;
}

/**
 * Returns a Map<employeeId → Map<month → minutesLate>> for a given year.
 * Useful to detect HISTORICAL_MISMATCH.
 */
async function findExistingAttendanceForYear(year) {
  const records = await prisma.attendanceRecord.findMany({
    where: { year },
    select: { employeeId: true, month: true, minutesLate: true },
  });

  const map = new Map();
  for (const r of records) {
    if (!map.has(r.employeeId)) map.set(r.employeeId, new Map());
    map.get(r.employeeId).set(r.month, r.minutesLate);
  }
  return map;
}

// ─────────────────────────────────────────────
// TRANSACTIONAL COMMIT
// ─────────────────────────────────────────────

/**
 * Commits a fully-validated import in one transaction:
 *   1. Creates any missing employees + users.
 *   2. Upserts attendance records.
 *   3. Logs AttendanceImportIssue rows.
 *   4. Marks the AttendanceImport as SUCCESS or FAILED.
 *
 * @param {object} opts
 * @param {string}  opts.importId
 * @param {number}  opts.year
 * @param {Array}   opts.employeesToCreate  – validated new-employee objects
 * @param {Array}   opts.recordsToUpsert    – { employeeId, year, month, minutesLate }
 * @param {Array}   opts.issuesToLog        – AttendanceImportIssue data objects
 * @param {'SUCCESS'|'FAILED'} opts.status
 * @returns {Promise<{ employeesCreated: number, recordsUpserted: number }>}
 */
async function commitImport({ importId, year, employeesToCreate, recordsToUpsert, issuesToLog, status }) {
  return prisma.$transaction(async (tx) => {
    // 1. Create missing employees + user accounts.
    const createdEmployeeIds = new Map(); // employeeCode → id
    for (const emp of employeesToCreate) {
      const created = await tx.employee.create({
        data: {
          employeeCode: emp.employeeCode,
          firstName: emp.firstName,
          middleName: emp.middleName ?? null,
          lastName: emp.lastName,
          user: {
            create: {
              passwordHash: emp.passwordHash,
              role: 'EMPLOYEE',
            },
          },
        },
        select: { id: true, employeeCode: true },
      });
      createdEmployeeIds.set(emp.employeeCode.toLowerCase(), created.id);
    }

    // Resolve employeeId for upsert rows that were created above (their id was
    // not known until the transaction ran).
    const resolvedRecords = recordsToUpsert.map((r) => {
      const eid = r.employeeId ?? createdEmployeeIds.get(r.employeeCodeKey);
      return { ...r, employeeId: eid };
    });

    // 2. Upsert attendance records.
    let recordsUpserted = 0;
    for (const r of resolvedRecords) {
      if (!r.employeeId) continue; // safety guard
      await tx.attendanceRecord.upsert({
        where: { employeeId_year_month: { employeeId: r.employeeId, year, month: r.month } },
        create: { employeeId: r.employeeId, year, month: r.month, minutesLate: r.minutesLate, importId },
        update: { minutesLate: r.minutesLate, importId },
      });
      recordsUpserted++;
    }

    // 3. Log import issues.
    if (issuesToLog.length > 0) {
      await tx.attendanceImportIssue.createMany({
        data: issuesToLog.map((issue) => ({ ...issue, importId })),
      });
    }

    // 4. Mark the import as complete.
    await tx.attendanceImport.update({
      where: { id: importId },
      data: { status, completedAt: new Date() },
    });

    return {
      employeesCreated: employeesToCreate.length,
      recordsUpserted,
    };
  }, {
    // Bulk imports can involve hundreds of writes, so the default interactive
    // transaction timeout is too short for this path.
    maxWait: 10000,
    timeout: 120000,
  });
}

module.exports = {
  createImportRecord,
  updateImportStatus,
  findImports,
  countImports,
  findImportById,
  findAllActiveEmployeesByCode,
  findExistingAttendanceForYear,
  commitImport,
};
