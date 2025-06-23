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
  
  // Seed public schema
  console.log('\n--- Seeding public schema ---');
  try {
    execSync('npm run db:seed', { stdio: 'inherit' });
  } catch (error) {
    console.warn('Public schema seeding may have failed, but continuing');
  }
  
  // Seed test users
  console.log('\n--- Creating test users ---');
  try {
    execSync('npm run seed:test-users', { stdio: 'inherit' });
  } catch (error) {
    console.warn('Test user creation may have failed, but continuing');
  }
  
  // Reset passwords
  console.log('\n--- Resetting passwords ---');
  try {
    execSync('npm run reset:passwords', { stdio: 'inherit' });
  } catch (error) {
    console.warn('Password reset may have failed, but continuing');
  }
  
  console.log('\n--- Database initialization complete ---');
  console.log('\nTest users available:');
  console.log('- SuperAdmin: admin@fuelsync.dev / password');
  console.log('- Owner: owner@demo.com / password');
  console.log('- Manager: manager@demo.com / password');
  console.log('- Attendant: attendant@demo.com / password');
  
} catch (error) {
  console.error('Database initialization failed');
  process.exit(1);
}