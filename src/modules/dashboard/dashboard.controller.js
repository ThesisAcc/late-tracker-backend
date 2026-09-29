const {
  employeeDashboardQuerySchema,
  adminDashboardQuerySchema,
  employeeIdParamSchema,
} = require('./dashboard.validation');
const dashboardService = require('./dashboard.service');

async function getMyStats(req, res, next) {
  try {
    const { year } = employeeDashboardQuerySchema.parse(req.query);
    const result = await dashboardService.getMyDashboard(req.user.employeeId, year);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function getAdminSummary(req, res, next) {
  try {
    const query = adminDashboardQuerySchema.parse(req.query);
    const result = await dashboardService.getAdminDashboard(query);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function getAdminEmployeeStats(req, res, next) {
  try {
    const { id } = employeeIdParamSchema.parse(req.params);
    const { year } = employeeDashboardQuerySchema.parse(req.query);
    const result = await dashboardService.getAdminEmployeeDashboard(id, year);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getMyStats,
  getAdminSummary,
  getAdminEmployeeStats,
};
