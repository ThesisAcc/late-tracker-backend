const path = require('path');
const xlsx = require('xlsx');
const bcrypt = require('bcrypt');
const prisma = require('../lib/prisma');

const MONTH_KEYS = [
  { name: 'January', month: 1 },
  { name: 'February', month: 2 },
  { name: 'March', month: 3 },
  { name: 'April', month: 4 },
  { name: 'May', month: 5 },
  { name: 'June', month: 6 },
  { name: 'July', month: 7 },
  { name: 'August', month: 8 },
  { name: 'September', month: 9 },
  { name: 'October', month: 10 },
  { name: 'November', month: 11 },
  { name: 'December', month: 12 },
];

async function seed() {
  const filePath = path.join(__dirname, '../storage/late-tracker-with-mockup-data.xlsx');
  console.log(`Reading mockup spreadsheet: ${filePath}`);

  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0]; // 'Workers'
  const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
  console.log(`Found ${rows.length} employee rows in sheet "${sheetName}".`);

  // Find an admin user to associate with the import record
  let adminUser = await prisma.user.findFirst({
    where: { role: 'ADMIN' },
  });

  if (!adminUser) {
    console.log('No admin found, creating default admin account...');
    const pinHash = await bcrypt.hash('1234', 10);
    const adminEmp = await prisma.employee.create({
      data: {
        employeeCode: 'EMP-1000',
        firstName: 'System',
        lastName: 'Admin',
        user: {
          create: {
            passwordHash: pinHash,
            role: 'ADMIN',
          },
        },
      },
      include: { user: true },
    });
    adminUser = adminEmp.user;
  }

  // Create an AttendanceImport record
  const year = 2026;
  const importRecord = await prisma.attendanceImport.create({
    data: {
      year,
      filename: 'late-tracker-with-mockup-data.xlsx',
      uploadedByUserId: adminUser.id,
      status: 'SUCCESS',
      completedAt: new Date(),
    },
  });
  console.log(`Created attendance import record ID: ${importRecord.id} for year ${year}`);

  const defaultPinHash = await bcrypt.hash('1234', 10);
  let createdCount = 0;
  let recordsCount = 0;

  for (const row of rows) {
    const employeeCode = String(row['Employee ID'] || row['employeeCode'] || '').trim();
    const lastName = String(row['Last Name'] || row['lastName'] || '').trim();
    const firstName = String(row['First Name'] || row['firstName'] || '').trim();
    const middleName = row['Middle Name'] || row['middleName'] ? String(row['Middle Name'] || row['middleName']).trim() : null;

    if (!employeeCode || !firstName || !lastName) {
      continue;
    }

    let employee = await prisma.employee.findUnique({
      where: { employeeCode },
    });

    if (!employee) {
      employee = await prisma.employee.create({
        data: {
          employeeCode,
          firstName,
          middleName,
          lastName,
          user: {
            create: {
              passwordHash: defaultPinHash,
              role: 'EMPLOYEE',
            },
          },
        },
      });
      createdCount++;
    }

    // Insert attendance records for each month
    for (const m of MONTH_KEYS) {
      const minutesLate = Number(row[m.name] ?? row[m.name.toLowerCase()] ?? 0);
      const safeMinutes = isNaN(minutesLate) || minutesLate < 0 ? 0 : Math.round(minutesLate);

      await prisma.attendanceRecord.upsert({
        where: {
          employeeId_year_month: {
            employeeId: employee.id,
            year,
            month: m.month,
          },
        },
        create: {
          employeeId: employee.id,
          year,
          month: m.month,
          minutesLate: safeMinutes,
          importId: importRecord.id,
        },
        update: {
          minutesLate: safeMinutes,
          importId: importRecord.id,
        },
      });
      recordsCount++;
    }
  }

  console.log(`Seeding complete: ${createdCount} employees created, ${recordsCount} attendance records upserted for year ${year}.`);
}

seed()
  .catch((err) => {
    console.error('Seeding error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
