import { execSync } from 'child_process';

console.log('Initializing database...');

try {
  // Run migrations
  console.log('\n--- Running migrations ---');
  try {
    execSync('npm run db:migrate:all', { stdio: 'inherit' });
  } catch (error) {
    console.warn('Some migrations may have failed, but continuing with initialization');
  }
  
  // Seed production data
  console.log('\n--- Seeding data ---');
  try {
    execSync('npm run seed:production', { stdio: 'inherit' });
  } catch (error) {
    console.warn('Seeding may have failed, but continuing');
  }
  
  console.log('\n--- Database initialization complete ---');
  
} catch (error) {
  console.error('Database initialization failed');
  process.exit(1);
}