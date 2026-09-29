const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const { corsOrigin } = require('./config/env');
const prisma = require('./lib/prisma');
const { notFoundHandler, errorHandler } = require('./middleware/error.middleware');
const swaggerSpec = require('./config/swagger');

const authRoutes = require('./modules/auth/auth.routes');
const employeesRoutes = require('./modules/employees/employees.routes');
const app = express();

// Render terminates TLS and forwards the real client IP in X-Forwarded-For.
// Trusting exactly one hop lets express-rate-limit bucket per client instead of
// per proxy. Only safe because the app is never exposed directly to the internet.
app.set('trust proxy', 1);

app.use(cors({ origin: corsOrigin }));
app.use(express.json({ limit: '1mb' }));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api-docs.json', (req, res) => res.json(swaggerSpec));

// Confirms the app can actually reach Neon - useful right after a Render
// deploy to check the DATABASE_URL/DIRECT_URL wiring before testing anything else.
app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', database: 'connected' });
  } catch (err) {
    res.status(503).json({ status: 'error', database: 'unreachable' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/admin/employees', employeesRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
