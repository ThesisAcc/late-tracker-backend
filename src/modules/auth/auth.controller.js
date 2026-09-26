const { loginSchema } = require('./auth.validation');
const authService = require('./auth.service');

async function login(req, res, next) {
  try {
    const data = loginSchema.parse(req.body);
    const result = await authService.login(data);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { login };
