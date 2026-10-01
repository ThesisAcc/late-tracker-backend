const { ZodError } = require('zod');
const { Prisma } = require('@prisma/client');

class AppError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

// Prisma error codes that mean "the request was wrong" rather than "the server
// is broken". Messages are built from err.meta only - err.message embeds the
// failing query and must never reach a response. Codes absent from this map
// fall through to the generic 500 below.
const prismaErrorResponses = {
  P2002: {
    status: 409,
    error: 'ConflictError',
    message: (meta) => `A record with this ${meta?.target?.join(', ') || 'value'} already exists.`,
  },
  P2003: {
    status: 409,
    error: 'ConflictError',
    message: () => 'Referenced record does not exist, or is still referenced by another record.',
  },
  P2023: {
    status: 400,
    error: 'ValidationError',
    message: () => 'The request contains values the database cannot store.',
  },
  P2025: {
    status: 404,
    error: 'NotFoundError',
    message: (meta) => meta?.cause || 'The requested record does not exist.',
  },
};

function notFoundHandler(req, res, next) {
  next(new AppError(404, 'Route not found'));
}

function errorHandler(err, req, res, next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'ValidationError',
      message: 'Request validation failed',
      details: err.flatten(),
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const mapped = prismaErrorResponses[err.code];

    if (mapped) {
      return res
        .status(mapped.status)
        .json({ error: mapped.error, message: mapped.message(err.meta) });
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
