// Ensure the modules under test have the config they require before they are
// loaded. dotenv does not overwrite variables that are already set, so these
// values win over anything in a local .env.
process.env.DATABASE_URL ||= 'postgresql://user:pass@localhost:5432/late_tracker_test';
process.env.JWT_SECRET ||= 'test-secret-not-used-anywhere-real';

const { Prisma } = require('@prisma/client');

/** Minimal response double for invoking error middleware directly. */
function createRes() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

/** Builds a real Prisma error so instanceof checks behave as they do in prod. */
function prismaError(code, meta) {
  return new Prisma.PrismaClientKnownRequestError('raw database internals', {
    code,
    meta,
    clientVersion: '5.20.0',
  });
}

module.exports = { createRes, prismaError };
