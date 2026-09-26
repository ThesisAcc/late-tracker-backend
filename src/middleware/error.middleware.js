const { ZodError } = require('zod');
const { Prisma } = require('@prisma/client');

class AppError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

function notFoundHandler(req, res, next) {
  next(new AppError(404, 'Route not found'));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'ValidationError',
      message: 'Request validation failed',
      details: err.flatten(),
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // P2002 = unique constraint violation, the common one clients trigger.
    if (err.code === 'P2002') {
      return res.status(409).json({
        error: 'ConflictError',
        message: `A record with this ${err.meta?.target?.join(', ') || 'value'} already exists.`,
      });
    }
    // Never leak raw Prisma/DB error internals to the client.
    console.error('Prisma error:', err.code, err.message);
    return res.status(500).json({ error: 'InternalError', message: 'A database error occurred.' });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.name || 'AppError',
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
  }

  console.error('Unhandled error:', err);
  return res.status(500).json({ error: 'InternalError', message: 'Something went wrong.' });
}

module.exports = { AppError, notFoundHandler, errorHandler };
