/**
 * Environment Variable Checker
 * Validates required environment variables before starting the application
 */

const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'PORT',
  'NODE_ENV'
];

const missingVars = [];
const emptyVars = [];

console.log('🔍 Checking environment variables...\n');

requiredEnvVars.forEach(varName => {
  const value = process.env[varName];
  
  if (value === undefined) {
    missingVars.push(varName);
    console.log(`❌ ${varName}: NOT SET`);
  } else if (value === '' || value.trim() === '') {
    emptyVars.push(varName);
    console.log(`⚠️  ${varName}: SET BUT EMPTY`);
  } else {
    // Mask sensitive values
    if (varName === 'DATABASE_URL') {
      const masked = value.replace(/:[^:@]+@/, ':****@');
      console.log(`✅ ${varName}: ${masked.substring(0, 50)}...`);
    } else if (varName === 'JWT_SECRET') {
      console.log(`✅ ${varName}: ${'*'.repeat(Math.min(value.length, 10))}...`);
    } else {
      console.log(`✅ ${varName}: ${value}`);
    }
  }
});

console.log('');

if (missingVars.length > 0 || emptyVars.length > 0) {
  console.error('❌ Environment variable validation failed!\n');
  
  if (missingVars.length > 0) {
    console.error('Missing variables:');
    missingVars.forEach(v => console.error(`  - ${v}`));
    console.error('');
  }
  
  if (emptyVars.length > 0) {
    console.error('Empty variables:');
    emptyVars.forEach(v => {
      console.error(`  - ${v}`);
      // Special handling for DATABASE_URL
      if (v === 'DATABASE_URL') {
        console.error('');
        console.error('🔧 DATABASE_URL Troubleshooting Steps:');
        console.error('');
        console.error('STEP 1: Check PostgreSQL Service Name');
        console.error('  1. Go to Railway project dashboard');
        console.error('  2. Find your PostgreSQL service');
        console.error('  3. Click on it → Settings tab');
        console.error('  4. Note the exact service name (e.g., "Postgres", "PostgreSQL", "postgres")');
        console.error('');
        console.error('STEP 2: Get DATABASE_URL from PostgreSQL Service');
        console.error('  1. Click on PostgreSQL service → Variables tab');
        console.error('  2. Find DATABASE_URL variable');
        console.error('  3. Click "Reveal" to see the full connection string');
        console.error('  4. Copy the entire connection string');
        console.error('');
        console.error('STEP 3: Set DATABASE_URL in Backend Service');
        console.error('  1. Go to your BACKEND service (not PostgreSQL)');
        console.error('  2. Click Variables tab');
        console.error('  3. Find or add DATABASE_URL variable');
        console.error('  4. Choose ONE of these methods:');
        console.error('');
        console.error('   METHOD A: Use Service Reference (Recommended)');
        console.error('     - Value: ${{Postgres.DATABASE_URL}}');
        console.error('     - Replace "Postgres" with your actual PostgreSQL service name');
        console.error('     - Example: ${{PostgreSQL.DATABASE_URL}} if service is named "PostgreSQL"');
        console.error('');
        console.error('   METHOD B: Use Direct Connection String (If reference fails)');
        console.error('     - Paste the full connection string you copied in STEP 2');
        console.error('     - Format: postgresql://user:password@host:port/database');
        console.error('     - This bypasses Railway\'s service reference');
        console.error('');
        console.error('STEP 4: Verify the Variable');
        console.error('  1. After setting DATABASE_URL, click on it');
        console.error('  2. It should show a resolved connection string (not empty, not ${{...}})');
        console.error('  3. If it still shows empty, the service reference syntax is wrong');
        console.error('');
        console.error('STEP 5: Redeploy');
        console.error('  1. After fixing DATABASE_URL, redeploy the backend service');
        console.error('  2. The check script will run again and validate');
        console.error('');
      }
    });
    console.error('');
  }
  
  console.error('💡 General Troubleshooting:');
  console.error('  1. Check Railway Variables tab');
  console.error('  2. For DATABASE_URL, ensure PostgreSQL service is connected');
  console.error('  3. Use ${{ServiceName.DATABASE_URL}} to reference PostgreSQL service');
  console.error('  4. Make sure all services are deployed and running');
  console.error('  5. Wait for PostgreSQL service to be "Active" before deploying backend\n');
  
  process.exit(1);
}

console.log('✅ All required environment variables are set!\n');
