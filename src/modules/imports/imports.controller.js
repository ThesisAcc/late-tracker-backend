const path = require('path');
const { AppError } = require('../../middleware/error.middleware');
const {
  importParamsSchema,
  importIdParamSchema,
  listImportsQuerySchema,
} = require('./imports.validation');
const importsService = require('./imports.service');

// ─────────────────────────────────────────────
// POST /api/admin/imports/preview
// ─────────────────────────────────────────────

async function preview(req, res, next) {
  try {
    if (!req.file) {
      throw new AppError(400, 'A .xlsx workbook is required. Send it as the "file" field in a multipart/form-data request.');
    }

    const { year, sheetName, createMissingEmployees } = importParamsSchema.parse(req.body);

    const result = await importsService.previewImport({
      buffer:                req.file.buffer,
      filename:              req.file.originalname,
      year,
      sheetName,
      createMissingEmployees,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────
// POST /api/admin/imports
// ─────────────────────────────────────────────

async function importWorkbook(req, res, next) {
  try {
    if (!req.file) {
      throw new AppError(400, 'A .xlsx workbook is required. Send it as the "file" field in a multipart/form-data request.');
    }

    const { year, sheetName, createMissingEmployees } = importParamsSchema.parse(req.body);

    const result = await importsService.executeImport({
      buffer:                req.file.buffer,
      filename:              req.file.originalname,
      uploadedByUserId:      req.user.id,
      year,
      sheetName,
      createMissingEmployees,
    });

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────
// GET /api/admin/imports
// ─────────────────────────────────────────────

async function list(req, res, next) {
  try {
    const { year, limit, offset } = listImportsQuerySchema.parse(req.query);
    const result = await importsService.listImports({ year, limit, offset });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────
// GET /api/admin/imports/:id
// ─────────────────────────────────────────────

async function getById(req, res, next) {
  try {
    const { id } = importIdParamSchema.parse(req.params);
    const result = await importsService.getImport(id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────
// GET /api/admin/imports/template
// ─────────────────────────────────────────────

async function downloadTemplate(req, res, next) {
  try {
    const templatePath = importsService.getTemplatePath();
    res.download(templatePath, 'late-tracker-template.xlsx', (err) => {
      if (err && !res.headersSent) next(err);
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { preview, importWorkbook, list, getById, downloadTemplate };
