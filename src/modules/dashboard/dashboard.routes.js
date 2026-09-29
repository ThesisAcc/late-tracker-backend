const express = require('express');
const { requireAuth } = require('../../middleware/auth.middleware');
const { requireRole } = require('../../middleware/role.middleware');
const dashboardController = require('./dashboard.controller');

// Employee-facing personal dashboard
const dashboardRoutes = express.Router();
dashboardRoutes.use(requireAuth);
dashboardRoutes.get('/my-stats', dashboardController.getMyStats);

// Admin-facing company-wide dashboard
const adminDashboardRoutes = express.Router();
adminDashboardRoutes.use(requireAuth, requireRole('ADMIN'));
adminDashboardRoutes.get('/', dashboardController.getAdminSummary);
adminDashboardRoutes.get('/employees/:id', dashboardController.getAdminEmployeeStats);

module.exports = {
  dashboardRoutes,
  adminDashboardRoutes,
};
