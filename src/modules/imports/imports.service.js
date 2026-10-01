const path = require('path');
const xlsx = require('xlsx');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { AppError } = require('../../middleware/error.middleware');
const importsRepository = require('./imports.repository');

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_ROWS = 5000;
const DEFAULT_SHEET = 'Workers';
const PIN_SALT_ROUNDS = 10;

const MONTH_KEYS = [
  { name: 'January',   shortName: 'Jan', month: 1  },
  { name: 'February',  shortName: 'Feb', month: 2  },
  { name: 'March',     shortName: 'Mar', month: 3  },
  { name: 'April',     shortName: 'Apr', month: 4  },
  { name: 'May',       shortName: 'May', month: 5  },
  { name: 'June',      shortName: 'Jun', month: 6  },
  { name: 'July',      shortName: 'Jul', month: 7  },
  { name: 'August',    shortName: 'Aug', month: 8  },
  { name: 'September', shortName: 'Sep', month: 9  },
  { name: 'October',   shortName: 'Oct', month: 10 },
  { name: 'November',  shortName: 'Nov', month: 11 },
  { name: 'December',  shortName: 'Dec', month: 12 },
];

// Column header aliases (case-insensitive, whitespace-collapsed).
const HEADER_ALIASES = {
  employeeCode: ['employee id', 'employeeid', 'id', '#', 'no.', 'no'],
  lastName:     ['last name', 'lastname', 'name 1'],
  firstName:    ['first name', 'firstname', 'name 2'],
  middleName:   ['middle name', 'middlename', 'name 3'],
};

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function normalizeHeader(value) {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function findColumnIndex(headerRow, aliases) {
  const accepted = new Set(aliases.map(normalizeHeader));
  return headerRow.findIndex((cell) => accepted.has(normalizeHeader(cell)));
}

function parseMinutes(value) {
  if (value === null || value === undefined || value === '') return 0;
  const n = typeof value === 'number' ? value : Number(String(value).trim());
  if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) return null;
  return n;
}

function isBlankRow(row) {
  return row.every((c) => c === null || c === undefined || String(c).trim() === '');
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

// ─────────────────────────────────────────────
// EXCEL PARSING
// ─────────────────────────────────────────────

/**
 * Parse a multer buffer into workbook rows.
 * Returns { sheetNames, rows } where rows is the raw array of arrays from the
 * first matching sheet.
 */
function parseWorkbook(buffer, preferredSheet) {
  let workbook;
  try {
    workbook = xlsx.read(buffer, { type: 'buffer' });
  } catch {
    throw new AppError(400, 'Invalid file format. Upload a valid .xlsx workbook.');
  }

  if (!workbook.SheetNames.length) {
    throw new AppError(400, 'Workbook has no sheets.');
  }

  // Prefer the requested sheet name; fall back to DEFAULT_SHEET; then first sheet.
  const sheetName =
    (preferredSheet && workbook.SheetNames.find((s) => s === preferredSheet)) ||
    workbook.SheetNames.find((s) => s === DEFAULT_SHEET) ||
    workbook.SheetNames[0];

  const ws = workbook.Sheets[sheetName];
  // header:1 → array-of-arrays, preserving blanks
  const rawRows = xlsx.utils.sheet_to_json(ws, { header: 1, defval: null });

  return {
    sheetNames: workbook.SheetNames,
    sheetName,
    rawRows,
  };
}

/**
 * Parse raw array-of-arrays into validated worker objects.
 *
 * Returns:
 *   { workers, issues, missingMonthNumbers }
 *
 * issues is an array of { rowNumber, column, issueType, severity, message }.
 * workers is an array of validated worker data (even rows with only warnings).
 */
function parseRows(rawRows) {
  const issues = [];

  if (rawRows.length > MAX_ROWS) {
    throw new AppError(400, `Sheet exceeds the maximum of ${MAX_ROWS} rows.`);
  }

  // Find the first non-blank row with at least 2 non-null cells as the header.
  const headerIndex = rawRows.findIndex(
    (row) => !isBlankRow(row) && row.filter((c) => c !== null).length >= 2,
  );

  if (headerIndex < 0) {
    throw new AppError(400, 'Sheet has no recognisable header row.');
  }

  const headers = rawRows[headerIndex];

  // Locate required columns.
  const col = {
    employeeCode: findColumnIndex(headers, HEADER_ALIASES.employeeCode),
    lastName:     findColumnIndex(headers, HEADER_ALIASES.lastName),
    firstName:    findColumnIndex(headers, HEADER_ALIASES.firstName),
    middleName:   findColumnIndex(headers, HEADER_ALIASES.middleName),
  };

  const missingRequired = [];
  if (col.employeeCode < 0) missingRequired.push('Employee ID');
  if (col.lastName < 0)     missingRequired.push('Last Name');
  if (col.firstName < 0)    missingRequired.push('First Name');

  if (missingRequired.length) {
    throw new AppError(400, `Missing required header column(s): ${missingRequired.join(', ')}.`);
  }

  // Find month columns.
  const monthColumns = new Map(); // month number → column index
  for (const mk of MONTH_KEYS) {
    const idx = findColumnIndex(headers, [mk.name, mk.shortName, mk.name.toLowerCase()]);
    if (idx >= 0) monthColumns.set(mk.month, idx);
  }

  if (monthColumns.size === 0) {
    throw new AppError(400, 'Sheet must contain at least one month column (January – December).');
  }

  // Track missing months as warnings (not errors) — treated as zero.
  const missingMonthNumbers = MONTH_KEYS
    .filter((mk) => !monthColumns.has(mk.month))
    .map((mk) => mk.month);

  if (missingMonthNumbers.length > 0) {
    const names = missingMonthNumbers
      .map((m) => MONTH_KEYS.find((mk) => mk.month === m).shortName)
      .join(', ');
    issues.push({
      rowNumber: headerIndex + 1,
      column: 'Months',
      issueType: 'INVALID_MONTH',
      severity: 'WARNING',
      message: `Missing month columns treated as zero: ${names}.`,
    });
  }

  // Parse data rows.
  const workers = [];
  const seenCodes = new Set();

  const dataRows = rawRows.slice(headerIndex + 1);
  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const rowNumber = headerIndex + i + 2; // 1-based, accounting for header row

    if (isBlankRow(row)) continue;

    const employeeCode = String(row[col.employeeCode] ?? '').trim();
    const lastName     = String(row[col.lastName]     ?? '').trim();
    const firstName    = String(row[col.firstName]    ?? '').trim();
    const middleName   = col.middleName >= 0 ? String(row[col.middleName] ?? '').trim() : '';

    const rowIssues = [];

    // Identity validation.
    if (!employeeCode) {
      rowIssues.push({ rowNumber, column: 'Employee ID', issueType: 'INVALID_FILE_FORMAT', severity: 'ERROR', message: 'Employee ID is required.' });
    } else if (seenCodes.has(employeeCode.toLowerCase())) {
      rowIssues.push({ rowNumber, column: 'Employee ID', issueType: 'DUPLICATE_RECORD', severity: 'ERROR', message: `Employee ID "${employeeCode}" is duplicated.` });
    }
    if (!lastName)    rowIssues.push({ rowNumber, column: 'Last Name',  issueType: 'INVALID_FILE_FORMAT', severity: 'ERROR', message: 'Last name is required.' });
    if (!firstName)   rowIssues.push({ rowNumber, column: 'First Name', issueType: 'INVALID_FILE_FORMAT', severity: 'ERROR', message: 'First name is required.' });

    // Month minutes validation.
    const monthlyMinutes = {};
    for (const [month, colIdx] of monthColumns) {
      const parsed = parseMinutes(row[colIdx]);
      if (parsed === null) {
        rowIssues.push({
          rowNumber,
          column: MONTH_KEYS.find((mk) => mk.month === month).name,
          issueType: 'INVALID_MINUTES',
          severity: 'ERROR',
          message: `Late minutes must be a whole number ≥ 0. Received: "${row[colIdx]}".`,
        });
      } else {
        monthlyMinutes[month] = parsed;
      }
    }

    // Fill missing months with 0.
    for (const mk of MONTH_KEYS) {
      if (!(mk.month in monthlyMinutes)) monthlyMinutes[mk.month] = 0;
    }

    issues.push(...rowIssues);

    if (rowIssues.some((iss) => iss.severity === 'ERROR')) {
      // Still collect the row for the preview response but mark it invalid.
      workers.push({ employeeCode, firstName, middleName, lastName, monthlyMinutes, valid: false });
    } else {
      if (employeeCode) seenCodes.add(employeeCode.toLowerCase());
      workers.push({ employeeCode, firstName, middleName, lastName, monthlyMinutes, valid: true });
    }
  }

  return { workers, issues, missingMonthNumbers };
}

// ─────────────────────────────────────────────
// CROSS-REFERENCE WITH DATABASE
// ─────────────────────────────────────────────

/**
 * Given parsed workers + options, cross-references the DB:
 *  - Marks each worker as new/existing.
 *  - Flags UNKNOWN_EMPLOYEE if createMissingEmployees is false.
 *  - Flags HISTORICAL_MISMATCH for existing records that would be overwritten.
 *
 * Returns { workers (enriched), dbIssues, employeesToCreate }.
 */
async function crossReference(validWorkers, year, createMissingEmployees) {
  const employeeMap = await importsRepository.findAllActiveEmployeesByCode();
  const existingAttendance = await importsRepository.findExistingAttendanceForYear(year);

  const dbIssues = [];
  const employeesToCreate = [];
  const enriched = [];

  for (const worker of validWorkers) {
    const codeKey = worker.employeeCode.toLowerCase();
    const existing = employeeMap.get(codeKey);
    const isNew = !existing;

    if (isNew) {
      if (!createMissingEmployees) {
        dbIssues.push({
          column: 'Employee ID',
          issueType: 'UNKNOWN_EMPLOYEE',
          severity: 'ERROR',
          message: `Employee "${worker.employeeCode}" is not registered. Set createMissingEmployees=true to auto-register.`,
        });
        enriched.push({ ...worker, isNewEmployee: true, employeeId: null, employeeCodeKey: codeKey });
        continue;
      }
      // Will be created during commit.
      employeesToCreate.push({ ...worker, employeeCodeKey: codeKey });
      enriched.push({ ...worker, isNewEmployee: true, employeeId: null, employeeCodeKey: codeKey });
    } else {
      // Existing employee — check for attendance overwrite conflicts.
      const prevRecords = existingAttendance.get(existing.id);
      if (prevRecords) {
        for (const mk of MONTH_KEYS) {
          const existingMinutes = prevRecords.get(mk.month);
          const newMinutes = worker.monthlyMinutes[mk.month];
          if (existingMinutes !== undefined && existingMinutes !== newMinutes) {
            dbIssues.push({
              employeeId: existing.id,
              column: mk.name,
              issueType: 'HISTORICAL_MISMATCH',
              severity: 'WARNING',
              message: `${mk.name} for "${worker.employeeCode}" will change from ${existingMinutes} to ${newMinutes} minutes.`,
              existingValue: existingMinutes,
              uploadedValue: newMinutes,
              year,
              month: mk.month,
            });
          }
        }
      }
      enriched.push({ ...worker, isNewEmployee: false, employeeId: existing.id, employeeCodeKey: codeKey });
    }
  }

  return { workers: enriched, dbIssues, employeesToCreate };
}

// ─────────────────────────────────────────────
// PUBLIC SERVICE FUNCTIONS
// ─────────────────────────────────────────────

/**
 * Dry-run: parse + validate + cross-reference without writing to the DB.
 * Returns the full preview payload.
 */
async function previewImport({ buffer, filename, year, sheetName: preferredSheet, createMissingEmployees }) {
  const { sheetNames, sheetName, rawRows } = parseWorkbook(buffer, preferredSheet);
  const { workers: parsedWorkers, issues: parseIssues, missingMonthNumbers } = parseRows(rawRows);

  const validWorkers = parsedWorkers.filter((w) => w.valid);
  const { workers: enriched, dbIssues } = await crossReference(validWorkers, year, createMissingEmployees);

  const allIssues = [...parseIssues, ...dbIssues];
  const errorCount   = allIssues.filter((i) => i.severity === 'ERROR').length;
  const warningCount = allIssues.filter((i) => i.severity === 'WARNING').length;

  // Build monthlyMinutes keyed by lowercase month name for frontend compatibility.
  const workersOut = enriched.map((w) => ({
    employeeCode:  w.employeeCode,
    firstName:     w.firstName,
    middleName:    w.middleName || null,
    lastName:      w.lastName,
    isNewEmployee: w.isNewEmployee,
    monthlyMinutes: buildMonthlyMinutesObj(w.monthlyMinutes),
    totalMinutes:   Object.values(w.monthlyMinutes).reduce((s, v) => s + v, 0),
  }));

  const existingCount = enriched.filter((w) => !w.isNewEmployee).length;
  const newCount      = enriched.filter((w) => w.isNewEmployee).length;

  return {
    isValid: errorCount === 0,
    fileName: filename,
    sheetName,
    year,
    availableSheets: sheetNames,
    summary: {
      totalRows:              parsedWorkers.length,
      validWorkers:           validWorkers.length,
      totalMinutesLate:       workersOut.reduce((s, w) => s + w.totalMinutes, 0),
      newEmployeesCount:      newCount,
      existingEmployeesCount: existingCount,
      conflictsCount:         dbIssues.filter((i) => i.issueType === 'HISTORICAL_MISMATCH').length,
      errorsCount:            errorCount,
      warningsCount:          warningCount,
    },
    issues: allIssues,
    workers: workersOut,
  };
}

/**
 * Execute the import: parse → validate → commit inside a DB transaction.
 * Fails fast if there are parsing errors.
 */
async function executeImport({
  buffer,
  filename,
  uploadedByUserId,
  year,
  sheetName: preferredSheet,
  createMissingEmployees,
}) {
  const fileHash = sha256(buffer);

  // 1. Parse the workbook.
  const { sheetNames, sheetName, rawRows } = parseWorkbook(buffer, preferredSheet);
  const { workers: parsedWorkers, issues: parseIssues } = parseRows(rawRows);

  const hardErrors = parseIssues.filter((i) => i.severity === 'ERROR');

  // 2. Create the import record (PENDING) so we can attach issues even on failure.
  const importRecord = await importsRepository.createImportRecord({
    year,
    filename,
    fileHash,
    uploadedByUserId,
  });

  // If there are hard parse errors, log them and mark FAILED immediately.
  if (hardErrors.length > 0) {
    await importsRepository.commitImport({
      importId: importRecord.id,
      year,
      employeesToCreate: [],
      recordsToUpsert:   [],
      issuesToLog:       parseIssues.map((iss) => sanitiseIssueForDb(iss)),
      status:            'FAILED',
    });
    throw new AppError(422, 'Workbook contains validation errors. Import aborted.', {
      totalErrors: hardErrors.length,
      errors:      hardErrors,
    });
  }

  const validWorkers = parsedWorkers.filter((w) => w.valid);

  // 3. Cross-reference with database.
  const { workers: enriched, dbIssues, employeesToCreate } = await crossReference(
    validWorkers, year, createMissingEmployees,
  );

  const dbErrors = dbIssues.filter((i) => i.severity === 'ERROR');

  if (dbErrors.length > 0) {
    const allIssues = [...parseIssues, ...dbIssues];
    await importsRepository.commitImport({
      importId: importRecord.id,
      year,
      employeesToCreate: [],
      recordsToUpsert:   [],
      issuesToLog:       allIssues.map((iss) => sanitiseIssueForDb(iss)),
      status:            'FAILED',
    });
    throw new AppError(422, 'Workbook contains validation errors. Import aborted.', {
      totalErrors: dbErrors.length,
      errors:      dbErrors,
    });
  }

  // 4. Hash a default PIN for new employees.
  let defaultPasswordHash = null;
  if (employeesToCreate.length > 0) {
    // single hash shared by all auto-created employees; they should reset at first login
    defaultPasswordHash = await bcrypt.hash('1234', PIN_SALT_ROUNDS);
  }

  const employeesToCreateFull = employeesToCreate.map((e) => ({
    ...e,
    passwordHash: defaultPasswordHash,
  }));

  // Build upsert records.
  const recordsToUpsert = enriched.flatMap((w) =>
    MONTH_KEYS.map((mk) => ({
      // If new employee, employeeId is null – resolved inside commitImport by employeeCodeKey.
      employeeId:      w.employeeId,
      employeeCodeKey: w.employeeCodeKey,
      month:           mk.month,
      minutesLate:     w.monthlyMinutes[mk.month] ?? 0,
    })),
  );

  const allIssues = [...parseIssues, ...dbIssues];

  // 5. Commit.
  const { employeesCreated, recordsUpserted } = await importsRepository.commitImport({
    importId: importRecord.id,
    year,
    employeesToCreate: employeesToCreateFull,
    recordsToUpsert,
    issuesToLog: allIssues.map((iss) => sanitiseIssueForDb(iss)),
    status: 'SUCCESS',
  });

  // Build response workers list.
  const workersOut = enriched.map((w) => ({
    employeeCode:  w.employeeCode,
    firstName:     w.firstName,
    middleName:    w.middleName || null,
    lastName:      w.lastName,
    isNewEmployee: w.isNewEmployee,
    monthlyMinutes: buildMonthlyMinutesObj(w.monthlyMinutes),
    totalMinutes:   Object.values(w.monthlyMinutes).reduce((s, v) => s + v, 0),
  }));

  return {
    importId:  importRecord.id,
    status:    'SUCCESS',
    fileName:  filename,
    sheetName,
    year,
    availableSheets: sheetNames,
    importedAt: new Date().toISOString(),
    summary: {
      employeesCreated,
      employeesExisting: enriched.filter((w) => !w.isNewEmployee).length,
      recordsUpserted,
      totalMinutesLate:  workersOut.reduce((s, w) => s + w.totalMinutes, 0),
      issuesLogged:      allIssues.length,
      warningsCount:     allIssues.filter((i) => i.severity === 'WARNING').length,
    },
    issues:  allIssues.filter((i) => i.severity === 'WARNING'),
    workers: workersOut,
  };
}

/**
 * List import history.
 */
async function listImports({ year, limit, offset }) {
  const [rows, total] = await Promise.all([
    importsRepository.findImports({ year, limit, offset }),
    importsRepository.countImports({ year }),
  ]);

  return {
    total,
    limit,
    offset,
    imports: rows.map(formatImportRow),
  };
}

/**
 * Get a single import with its issues.
 */
async function getImport(id) {
  const row = await importsRepository.findImportById(id);
  if (!row) throw new AppError(404, 'Import not found');
  return formatImportDetail(row);
}

/**
 * Serve the blank template from disk.
 */
function getTemplatePath() {
  return path.join(__dirname, '../../storage/late-tracker-template.xlsx');
}

// ─────────────────────────────────────────────
// INTERNAL FORMATTERS
// ─────────────────────────────────────────────

function buildMonthlyMinutesObj(monthlyMinutes) {
  const out = {};
  for (const mk of MONTH_KEYS) {
    out[mk.name.toLowerCase()] = monthlyMinutes[mk.month] ?? 0;
  }
  return out;
}

function sanitiseIssueForDb(iss) {
  return {
    employeeId:    iss.employeeId ?? null,
    rowNumber:     iss.rowNumber ?? null,
    issueType:     iss.issueType,
    message:       iss.message,
    existingValue: iss.existingValue ?? null,
    uploadedValue: iss.uploadedValue ?? null,
    year:          iss.year ?? null,
    month:         iss.month ?? null,
  };
}

function formatImportRow(row) {
  return {
    id:         row.id,
    year:       row.year,
    filename:   row.filename,
    status:     row.status,
    createdAt:  row.createdAt,
    completedAt: row.completedAt,
    uploadedBy: {
      id: row.uploadedBy.id,
      employee: row.uploadedBy.employee,
    },
    _count: row._count,
  };
}

function formatImportDetail(row) {
  return {
    id:         row.id,
    year:       row.year,
    filename:   row.filename,
    status:     row.status,
    createdAt:  row.createdAt,
    completedAt: row.completedAt,
    uploadedBy: {
      id: row.uploadedBy.id,
      employee: row.uploadedBy.employee,
    },
    recordsCount: row._count.attendanceRecords,
    issues:       row.issues,
  };
}

module.exports = {
  previewImport,
  executeImport,
  listImports,
  getImport,
  getTemplatePath,
};
