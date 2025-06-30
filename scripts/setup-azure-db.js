const { execSync } = require('child_process');
require('dotenv').config();

// Skip when running in Codex or CI
if (process.env.CODEX_ENV_NODE_VERSION || process.env.CI) {
  console.log('Codex environment detected. Skipping Azure database setup.');
  process.exit(0);
}

async function setupAzureDatabase() {
  try {
    console.log('=== FuelSync Azure Database Setup ===\n');

    console.log('Step 1: Checking database connection...');
    execSync('node scripts/check-db-connection.js', { stdio: 'inherit' });
    console.log('✅ Database connection verified\n');

    console.log('Step 2: Fixing database constraints...');
    execSync('node scripts/fix-constraints.js', { stdio: 'inherit' });
    console.log('✅ Database constraints fixed\n');

    console.log('Step 3: Applying unified schema for Azure...');
    execSync('node scripts/setup-azure-schema.js', { stdio: 'inherit' });
    console.log('✅ Unified schema applied\n');

    console.log('Step 4: Running pending migrations...');
    execSync('node scripts/migrate.js up', { stdio: 'inherit' });
    console.log('✅ Pending migrations applied\n');

    console.log('Step 5: Applying cash_reports migration...');
    execSync('node scripts/apply-cash-reports-azure.js', { stdio: 'inherit' });
    console.log('✅ cash_reports table created\n');

    console.log('Step 6: Verifying schema structure...');
    execSync('node scripts/verify-schema.js', { stdio: 'inherit' });
    console.log('✅ Schema structure verified\n');

    console.log('Step 7: Generating Prisma client...');
    execSync('npx prisma generate', { stdio: 'inherit' });
    console.log('✅ Prisma client generated\n');

    console.log('Step 8: Seeding initial data...');
    execSync('node scripts/seed-data.js', { stdio: 'inherit' });
    console.log('✅ Initial data seeded\n');

    console.log('=== Azure Setup Complete ===');
  } catch (err) {
    console.error('Error during Azure setup:', err.message);
    process.exit(1);
  }
}

setupAzureDatabase();
