const express = require('express');
const multer = require('multer');
const { requireAuth } = require('../../middleware/auth.middleware');
const { requireRole } = require('../../middleware/role.middleware');
const importsController = require('./imports.controller');
const { AppError } = require('../../middleware/error.middleware');

const router = express.Router();

// Accept only .xlsx files up to 5 MB. multer stores the file in memory so the
// service can hash the buffer and read it without touching the filesystem.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    const ok =
      file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.originalname.toLowerCase().endsWith('.xlsx');
    if (ok) return cb(null, true);
    cb(new AppError(400, 'Only .xlsx workbooks are accepted.'));
  },
}).single('file');

// Wrap multer so its errors flow through the standard error middleware.
function uploadMiddleware(req, res, next) {
  upload(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new AppError(400, 'Workbook must be 5 MB or smaller.'));
      }
      return next(new AppError(400, err.message));
    }
    next(err);
  });
}

// All routes require a valid admin JWT.
router.use(requireAuth, requireRole('ADMIN'));

// Template must be declared before /:id so it is not swallowed by the UUID param.
router.get('/template', importsController.downloadTemplate);

router.get('/', importsController.list);
router.post('/preview', uploadMiddleware, importsController.preview);
router.post('/', uploadMiddleware, importsController.importWorkbook);
router.get('/:id', importsController.getById);

module.exports = router;
