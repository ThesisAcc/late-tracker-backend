const { AppError } = require('../../middleware/error.middleware');
const dashboardRepository = require('./dashboard.repository');

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function buildMonthlyBreakdown(records) {
  const recordMap = new Map();
  for (const r of records) {
    recordMap.set(r.month, r.minutesLate);
  }

  const breakdown = [];
  for (let m = 1; m <= 12; m++) {
    breakdown.push({
      month: m,
      monthName: MONTH_NAMES[m - 1],
      minutesLate: recordMap.get(m) ?? 0,
    });
  }
  return breakdown;
}

function calculateEmployeeSummary(monthlyBreakdown) {
  let totalMinutesLate = 0;
  let monthsWithLatenessCount = 0;
  let highestLateMonth = null;
  let maxMinutes = -1;

  for (const item of monthlyBreakdown) {
    totalMinutesLate += item.minutesLate;
    if (item.minutesLate > 0) {
      monthsWithLatenessCount++;
    }
    if (item.minutesLate > maxMinutes) {
      maxMinutes = item.minutesLate;
      highestLateMonth = {
        month: item.month,
        monthName: item.monthName,
        minutesLate: item.minutesLate,
      };
    }
  }

  const highest = maxMinutes > 0 ? highestLateMonth : null;
  const averageMinutesLatePerMonth = Number((totalMinutesLate / 12).toFixed(2));

  return {
    totalMinutesLate,
    averageMinutesLatePerMonth,
    monthsWithLatenessCount,
    highestLateMonth: highest,
  };
}

async function getMyDashboard(employeeId, year) {
  if (!employeeId) {
    throw new AppError(404, 'Employee record not found for this user');
  }

  const employee = await dashboardRepository.findEmployeeById(employeeId);
  if (!employee) {
    throw new AppError(404, 'Employee not found');
  }

  const records = await dashboardRepository.findAttendanceRecordsByEmployeeAndYear(employeeId, year);
  const monthlyBreakdown = buildMonthlyBreakdown(records);
  const summary = calculateEmployeeSummary(monthlyBreakdown);

  return {
    employee: {
      id: employee.id,
      employeeCode: employee.employeeCode,
      firstName: employee.firstName,
      middleName: employee.middleName,
      lastName: employee.lastName,
    },
    year,
    summary,
    monthlyBreakdown,
  };
}

async function getAdminDashboard({ year, month, sortBy = 'totalMinutesLate', order = 'desc', search }) {
  const employees = await dashboardRepository.findAllEmployeesWithAttendance(year);

  // Calculate stats for all employees
  let totalCompanyLateMinutes = 0;
  let employeesWithLateness = 0;

  const employeeSummaries = employees.map((emp) => {
    const monthlyBreakdown = buildMonthlyBreakdown(emp.attendanceRecords);
    const summary = calculateEmployeeSummary(monthlyBreakdown);

    // If a specific month is requested, target that month's minutes
    const targetMinutesLate = month
      ? (monthlyBreakdown.find((m) => m.month === month)?.minutesLate ?? 0)
      : summary.totalMinutesLate;

    totalCompanyLateMinutes += targetMinutesLate;
    if (targetMinutesLate > 0) {
      employeesWithLateness++;
    }

    const fullName = [emp.firstName, emp.middleName, emp.lastName].filter(Boolean).join(' ');

    return {
      employeeId: emp.id,
      employeeCode: emp.employeeCode,
      firstName: emp.firstName,
      middleName: emp.middleName,
      lastName: emp.lastName,
      fullName,
      status: emp.status,
      targetMinutesLate,
      totalMinutesLate: summary.totalMinutesLate,
      monthsLateCount: summary.monthsWithLatenessCount,
      monthlyBreakdown,
      highestLateMonth: summary.highestLateMonth,
    };
  });

  const totalEmployees = employeeSummaries.length;
  const activeEmployees = employeeSummaries.filter((e) => e.status === 'ACTIVE').length;
  const averageLateMinutesPerEmployee =
    totalEmployees > 0 ? Number((totalCompanyLateMinutes / totalEmployees).toFixed(2)) : 0;

  // Compute lateRatePercentage & natural rank by targetMinutesLate descending
  employeeSummaries.forEach((emp) => {
    emp.lateRatePercentage =
      totalCompanyLateMinutes > 0
        ? Number(((emp.targetMinutesLate / totalCompanyLateMinutes) * 100).toFixed(2))
        : 0;
  });

  // Sort by targetMinutesLate desc to assign overall company rank
  const ranked = [...employeeSummaries].sort((a, b) => b.targetMinutesLate - a.targetMinutesLate);
  ranked.forEach((emp, index) => {
    emp.rank = index + 1;
  });

  // Top tardy employee highlight
  let highestLateEmployee = null;
  if (ranked.length > 0 && ranked[0].targetMinutesLate > 0) {
    const top = ranked[0];
    highestLateEmployee = {
      employeeId: top.employeeId,
      employeeCode: top.employeeCode,
      fullName: top.fullName,
      minutesLate: top.targetMinutesLate,
      lateRatePercentage: top.lateRatePercentage,
      rank: 1,
    };
  }

  // Filter if search query exists
  let resultList = employeeSummaries;
  if (search) {
    const searchLower = search.toLowerCase();
    resultList = resultList.filter(
      (e) =>
        e.employeeCode.toLowerCase().includes(searchLower) ||
        e.fullName.toLowerCase().includes(searchLower)
    );
  }

  // Apply requested sorting
  resultList.sort((a, b) => {
    let comparison = 0;
    if (sortBy === 'totalMinutesLate') {
      comparison = a.targetMinutesLate - b.targetMinutesLate;
    } else if (sortBy === 'lateRatePercentage') {
      comparison = a.lateRatePercentage - b.lateRatePercentage;
    } else if (sortBy === 'lastName') {
      comparison = a.lastName.localeCompare(b.lastName);
    } else if (sortBy === 'firstName') {
      comparison = a.firstName.localeCompare(b.firstName);
    } else if (sortBy === 'employeeCode') {
      comparison = a.employeeCode.localeCompare(b.employeeCode);
    }
    return order === 'desc' ? -comparison : comparison;
  });

  return {
    period: {
      year,
      month: month ?? null,
      monthName: month ? MONTH_NAMES[month - 1] : null,
    },
    companySummary: {
      totalEmployees,
      activeEmployees,
      totalCompanyLateMinutes,
      averageLateMinutesPerEmployee,
      employeesWithLateness,
      highestLateEmployee,
    },
    employees: resultList.map((e) => ({
      rank: e.rank,
      employeeId: e.employeeId,
      employeeCode: e.employeeCode,
      firstName: e.firstName,
      middleName: e.middleName,
      lastName: e.lastName,
      fullName: e.fullName,
      status: e.status,
      minutesLate: e.targetMinutesLate,
      totalMinutesLate: e.totalMinutesLate,
      lateRatePercentage: e.lateRatePercentage,
      monthsLateCount: e.monthsLateCount,
      monthlyBreakdown: e.monthlyBreakdown,
      highestLateMonth: e.highestLateMonth,
    })),
  };
}

async function getAdminEmployeeDashboard(employeeId, year) {
  const employee = await dashboardRepository.findEmployeeById(employeeId);
  if (!employee) {
    throw new AppError(404, 'Employee not found');
  }

  const [records, allEmployees] = await Promise.all([
    dashboardRepository.findAttendanceRecordsByEmployeeAndYear(employeeId, year),
    dashboardRepository.findAllEmployeesWithAttendance(year),
  ]);

  const monthlyBreakdown = buildMonthlyBreakdown(records);
  const summary = calculateEmployeeSummary(monthlyBreakdown);

  // Calculate company stats to determine rank and rate
  let totalCompanyMinutes = 0;
  const totals = allEmployees.map((e) => {
    const sum = e.attendanceRecords.reduce((acc, r) => acc + r.minutesLate, 0);
    totalCompanyMinutes += sum;
    return { employeeId: e.id, sum };
  });

  totals.sort((a, b) => b.sum - a.sum);
  const rankIndex = totals.findIndex((t) => t.employeeId === employeeId);
  const rank = rankIndex !== -1 ? rankIndex + 1 : null;

  const lateRatePercentage =
    totalCompanyMinutes > 0
      ? Number(((summary.totalMinutesLate / totalCompanyMinutes) * 100).toFixed(2))
      : 0;

  return {
    employee: {
      id: employee.id,
      employeeCode: employee.employeeCode,
      firstName: employee.firstName,
      middleName: employee.middleName,
      lastName: employee.lastName,
      status: employee.status,
    },
    year,
    summary,
    monthlyBreakdown,
    companyComparison: {
      rank,
      totalEmployees: allEmployees.length,
      lateRatePercentage,
      companyTotalLateMinutes: totalCompanyMinutes,
    },
  };
}

module.exports = {
  MONTH_NAMES,
  buildMonthlyBreakdown,
  calculateEmployeeSummary,
  getMyDashboard,
  getAdminDashboard,
  getAdminEmployeeDashboard,
};
