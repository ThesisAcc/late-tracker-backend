const express = require('express');
const { requireAuth } = require('../../middleware/auth.middleware');
const { requireRole } = require('../../middleware/role.middleware');
const employeesController = require('./employees.controller');

const router = express.Router();

router.use(requireAuth, requireRole('ADMIN'));

router.post('/', employeesController.create);
router.get('/', employeesController.list);
router.get('/:id', employeesController.getById);
router.patch('/:id', employeesController.update);
router.delete('/:id', employeesController.deleteEmployee);
router.post('/:id/reset-password', employeesController.resetPassword);

module.exports = router;
