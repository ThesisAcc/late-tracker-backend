const express = require('express');
const { requireAuth } = require('../../middleware/auth.middleware');
const { requireRole } = require('../../middleware/role.middleware');
const resetController = require('./reset.controller');

const router = express.Router();

router.use(requireAuth, requireRole('ADMIN'));

router.get('/preview', resetController.preview);
router.delete('/', resetController.execute);

module.exports = router;