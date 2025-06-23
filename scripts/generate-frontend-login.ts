import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Test credentials
const testUsers = [
  { role: 'superadmin', email: 'admin@fuelsync.dev', password: 'password' },
  { role: 'owner', email: 'owner@demo.com', password: 'password' },
  { role: 'manager', email: 'manager@demo.com', password: 'password' },
  { role: 'attendant', email: 'attendant@demo.com', password: 'password' }
];

// Generate localStorage code for each user
for (const user of testUsers) {
  const username = user.email.split('@')[0];
  const filename = `auth_${username}.json`;
  const filepath = join(process.cwd(), filename);
  
  if (existsSync(filepath)) {
    try {
      const authData = JSON.parse(readFileSync(filepath, 'utf8'));
      
      console.log(`\n// Code to login as ${user.role} (${user.email}):`);
      console.log(`localStorage.setItem('fuelsync_token', '${authData.token}');`);
      console.log(`localStorage.setItem('fuelsync_user', '${JSON.stringify(authData.user)}');`);
      console.log(`console.log('Logged in as ${user.role}');`);
      console.log(`// Then refresh the page`);
    } catch (error) {
      console.error(`Error reading ${filename}:`, error);
    }
  } else {
    console.log(`\n// Auth data for ${user.email} not found.`);
    console.log(`// Run 'npm run test:api-login' first to generate auth data.`);
  }
}

console.log('\n// To use this code:');
console.log('// 1. Open your browser console on the frontend app');
console.log('// 2. Copy and paste the code for the user you want to login as');
console.log('// 3. Refresh the page');