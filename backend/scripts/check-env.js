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
    emptyVars.forEach(v => console.error(`  - ${v}`));
    console.error('');
  }
  
  console.error('💡 Troubleshooting:');
  console.error('  1. Check Railway Variables tab');
  console.error('  2. For DATABASE_URL, ensure PostgreSQL service is connected');
  console.error('  3. Use ${{Postgres.DATABASE_URL}} to reference PostgreSQL service');
  console.error('  4. Make sure all services are deployed and running\n');
  
  process.exit(1);
}

console.log('✅ All required environment variables are set!\n');
