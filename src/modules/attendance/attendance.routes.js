const express = require('express');
const { requireAuth } = require('../../middleware/auth.middleware');
const { requireRole } = require('../../middleware/role.middleware');
const attendanceController = require('./attendance.controller');

const router = express.Router();

// All routes require admin JWT
router.use(requireAuth, requireRole('ADMIN'));

// GET must come before POST to avoid route conflict
router.get('/:employeeId/:year', attendanceController.getByEmployeeYear);

router.post('/', attendanceController.upsert);
router.patch('/:id', attendanceController.update);
router.delete('/:id', attendanceController.deleteRecord);

module.exports = router;
