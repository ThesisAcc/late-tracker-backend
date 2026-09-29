const test = require('node:test');
const assert = require('node:assert/strict');
const {
  MONTH_NAMES,
  buildMonthlyBreakdown,
  calculateEmployeeSummary,
} = require('../src/modules/dashboard/dashboard.service');

test('MONTH_NAMES contains 12 months in order', () => {
  assert.equal(MONTH_NAMES.length, 12);
  assert.equal(MONTH_NAMES[0], 'January');
  assert.equal(MONTH_NAMES[11], 'December');
});

test('buildMonthlyBreakdown creates 12 months with 0 minutes when records are empty', () => {
  const breakdown = buildMonthlyBreakdown([]);
  assert.equal(breakdown.length, 12);
  for (let i = 0; i < 12; i++) {
    assert.equal(breakdown[i].month, i + 1);
    assert.equal(breakdown[i].monthName, MONTH_NAMES[i]);
    assert.equal(breakdown[i].minutesLate, 0);
  }
});

test('buildMonthlyBreakdown maps records to their correct months', () => {
  const records = [
    { month: 1, minutesLate: 15 },
    { month: 3, minutesLate: 45 },
    { month: 12, minutesLate: 30 },
  ];
  const breakdown = buildMonthlyBreakdown(records);
  assert.equal(breakdown.length, 12);
  assert.equal(breakdown[0].minutesLate, 15);
  assert.equal(breakdown[1].minutesLate, 0); // Feb
  assert.equal(breakdown[2].minutesLate, 45); // Mar
  assert.equal(breakdown[11].minutesLate, 30); // Dec
});

test('calculateEmployeeSummary computes total, average, and highest month correctly', () => {
  const breakdown = [
    { month: 1, monthName: 'January', minutesLate: 15 },
    { month: 2, monthName: 'February', minutesLate: 0 },
    { month: 3, monthName: 'March', minutesLate: 45 },
    { month: 4, monthName: 'April', minutesLate: 0 },
    { month: 5, monthName: 'May', minutesLate: 0 },
    { month: 6, monthName: 'June', minutesLate: 0 },
    { month: 7, monthName: 'July', minutesLate: 0 },
    { month: 8, monthName: 'August', minutesLate: 0 },
    { month: 9, monthName: 'September', minutesLate: 0 },
    { month: 10, monthName: 'October', minutesLate: 0 },
    { month: 11, monthName: 'November', minutesLate: 0 },
    { month: 12, monthName: 'December', minutesLate: 0 },
  ];

  const summary = calculateEmployeeSummary(breakdown);
  assert.equal(summary.totalMinutesLate, 60);
  assert.equal(summary.averageMinutesLatePerMonth, 5); // 60 / 12
  assert.equal(summary.monthsWithLatenessCount, 2);
  assert.deepEqual(summary.highestLateMonth, {
    month: 3,
    monthName: 'March',
    minutesLate: 45,
  });
});

test('calculateEmployeeSummary returns null highestLateMonth when all months are 0', () => {
  const breakdown = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    monthName: MONTH_NAMES[i],
    minutesLate: 0,
  }));

  const summary = calculateEmployeeSummary(breakdown);
  assert.equal(summary.totalMinutesLate, 0);
  assert.equal(summary.averageMinutesLatePerMonth, 0);
  assert.equal(summary.monthsWithLatenessCount, 0);
  assert.equal(summary.highestLateMonth, null);
});
