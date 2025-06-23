import axios from 'axios';
import { writeFileSync } from 'fs';
import { join } from 'path';

// Test credentials
const testUsers = [
  { role: 'superadmin', email: 'admin@fuelsync.dev', password: 'password' },
  { role: 'owner', email: 'owner@demo.com', password: 'password' },
  { role: 'manager', email: 'manager@demo.com', password: 'password' },
  { role: 'attendant', email: 'attendant@demo.com', password: 'password' }
];

// API URL
const API_URL = process.env.API_URL || 'http://localhost:3000/v1';

async function testLogin(email: string, password: string) {
  console.log(`\nTesting login for ${email}...`);
  try {
    const response = await axios.post(`${API_URL}/auth/login`, {
      email,
      password
    });
    
    console.log('Login successful!');
    console.log('Token:', response.data.token ? '✓ Present' : '✗ Missing');
    console.log('User:', response.data.user ? '✓ Present' : '✗ Missing');
    if (response.data.user) {
      console.log('User ID:', response.data.user.id);
      console.log('User Role:', response.data.user.role);
      console.log('Tenant ID:', response.data.user.tenantId || 'N/A');
    }
    
    // Save token and user to file for frontend testing
    const authData = {
      token: response.data.token,
      user: response.data.user
    };
    
    const filename = `auth_${email.split('@')[0]}.json`;
    writeFileSync(join(process.cwd(), filename), JSON.stringify(authData, null, 2));
    console.log(`Saved auth data to ${filename}`);
    
    return true;
  } catch (error: any) {
    console.error('Login failed:', error.response?.data || error.message || 'Unknown error');
    return false;
  }
}

async function runTests() {
  try {
    // Test logins
    let successCount = 0;
    for (const user of testUsers) {
      const success = await testLogin(user.email, user.password);
      if (success) successCount++;
    }
    
    // Summary
    console.log('\n--- Test Summary ---');
    console.log(`Successful logins: ${successCount}/${testUsers.length}`);
    console.log(`Failed logins: ${testUsers.length - successCount}`);
    
    if (successCount === testUsers.length) {
      console.log('\n✅ All login tests passed!');
      console.log('\nTo test in frontend:');
      console.log('1. Copy the generated auth_*.json files to your frontend project');
      console.log('2. Use localStorage.setItem("fuelsync_token", token) and localStorage.setItem("fuelsync_user", JSON.stringify(user))');
    } else {
      console.log('\n❌ Some login tests failed.');
    }
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the tests
runTests();