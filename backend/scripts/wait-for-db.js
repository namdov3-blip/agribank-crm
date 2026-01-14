/**
 * Wait for Database Connection
 * Retries database connection with exponential backoff
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['error'],
});

const MAX_RETRIES = 10;
const INITIAL_DELAY = 2000; // 2 seconds
const MAX_DELAY = 30000; // 30 seconds

async function waitForDatabase() {
  console.log('🔌 Waiting for database connection...\n');
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`Attempt ${attempt}/${MAX_RETRIES}: Connecting to database...`);
      
      // Try to connect
      await prisma.$connect();
      
      // Test with a simple query
      await prisma.$queryRaw`SELECT 1`;
      
      console.log('✅ Database connection successful!\n');
      await prisma.$disconnect();
      return true;
    } catch (error) {
      const isLastAttempt = attempt === MAX_RETRIES;
      
      if (isLastAttempt) {
        console.error('❌ Failed to connect to database after all retries\n');
        console.error('Error details:');
        console.error(`  Code: ${error.code || 'UNKNOWN'}`);
        console.error(`  Message: ${error.message}`);
        console.error('');
        console.error('💡 Troubleshooting:');
        console.error('  1. Check if PostgreSQL service is running and status is "Active"');
        console.error('  2. Verify DATABASE_URL is correct');
        console.error('  3. Check Railway logs for PostgreSQL service');
        console.error('  4. Try redeploying PostgreSQL service');
        console.error('  5. Ensure services are in the same Railway project\n');
        await prisma.$disconnect();
        process.exit(1);
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(INITIAL_DELAY * Math.pow(2, attempt - 1), MAX_DELAY);
      
      console.log(`⚠️  Connection failed: ${error.message}`);
      console.log(`   Retrying in ${delay / 1000} seconds...\n`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// Run the check
waitForDatabase()
  .then(() => {
    console.log('✅ Database is ready!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
