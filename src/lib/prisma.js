const { PrismaClient } = require('@prisma/client');

// A single shared instance. Recreating PrismaClient on every module reload
// during dev would leak connections against Neon's connection limits.
const globalForPrisma = globalThis;

const prisma =
  globalForPrisma.__prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__prisma = prisma;
}

module.exports = prisma;
