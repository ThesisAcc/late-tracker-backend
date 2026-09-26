const app = require('./app');
const prisma = require('./lib/prisma');
const { port } = require('./config/env');

const server = app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

async function shutdown(signal) {
  console.log(`${signal} received, shutting down gracefully...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
