const { AppError } = require('../../middleware/error.middleware');
const { resetConfirmSchema } = require('./reset.validation');
const resetService = require('./reset.service');

async function preview(req, res, next) {
  try {
    const result = await resetService.previewReset();
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function execute(req, res, next) {
  try {
    const data = resetConfirmSchema.parse(req.body);
    if (data.confirm !== 'RESET_NON_ADMIN_DATA') {
      throw new AppError(400, 'Invalid reset confirmation token.');
    }

    const result = await resetService.executeReset();
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { preview, execute };