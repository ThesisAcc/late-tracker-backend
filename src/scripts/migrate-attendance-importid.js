/**
 * Manual migration script
 * Run this once to make importId optional in attendance_records table
 * 
 * Usage: node src/scripts/migrate-attendance-importid.js
 */

const prisma = require('../lib/prisma');

async function migrate() {
  console.log('Starting migration: make attendance importId optional...');
  
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "attendance_records" ALTER COLUMN "import_id" DROP NOT NULL;
    `);
    
    console.log('✓ Migration successful: import_id is now nullable');
    
    // Verify the change
    const result = await prisma.$queryRawUnsafe(`
      SELECT column_name, is_nullable, data_type
      FROM information_schema.columns
      WHERE table_name = 'attendance_records' AND column_name = 'import_id';
    `);
    
    console.log('Verification:', result);
    
  } catch (error) {
    console.error('✗ Migration failed:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

migrate()
  .then(() => {
    console.log('\nMigration complete. You can now create manual attendance records.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nMigration failed:', error);
    process.exit(1);
  });
