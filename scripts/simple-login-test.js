const axios = require('axios');
const http = require('http');

// Check if server is running
function checkServer(host, port) {
  return new Promise((resolve) => {
    console.log(`Checking if server is running at ${host}:${port}...`);
    
    const req = http.request({
      host,
      port,
      path: '/',
      method: 'GET',
      timeout: 2000
    }, (res) => {
      console.log(`Server responded with status: ${res.statusCode}`);
      resolve(true);
    });
    
    req.on('error', (err) => {
      console.error(`Server check failed: ${err.message}`);
      resolve(false);
    });
    
    req.on('timeout', () => {
      console.error('Server check timed out');
      req.destroy();
      resolve(false);
    });
    
    req.end();
  });
}

// Test credentials
const testUsers = [
  { role: 'superadmin', email: 'admin@fuelsync.com', password: 'Admin@123' },
  { role: 'owner', email: 'owner@demofuels.com', password: 'Owner@123' }
];

// API URL
const API_URL = process.env.API_URL || 'http://localhost:3000/v1';

async function testLogin(email, password) {
  console.log(`\nTesting login for ${email}...`);
  try {
    console.log(`Making request to ${API_URL}/auth/login`);
    console.log('Request payload:', { email, password });
    
    const response = await axios.post(`${API_URL}/auth/login`, {
      email,
      password
    }, {
      // Add timeout and detailed error handling
      timeout: 5000,
      validateStatus: status => true // Don't throw on any status code
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers);
    console.log('Response data:', response.data);
    
    if (response.status === 200 && response.data && response.data.data && response.data.data.token) {
      console.log('Login successful!');
      console.log('Token:', response.data.data.token ? '✓ Present' : '✗ Missing');
      console.log('User:', response.data.data.user ? '✓ Present' : '✗ Missing');
      if (response.data.data.user) {
        console.log('User ID:', response.data.data.user.id);
        console.log('User Role:', response.data.data.user.role);
        console.log('Tenant ID:', response.data.data.user.tenantId || 'N/A');
      }
      return true;
    } else {
      console.error('Login failed with status:', response.status);
      console.error('Response data:', response.data);
      return false;
    }
  } catch (error) {
    console.error('Login request failed:');
    if (error.code) console.error('Error code:', error.code);
    if (error.message) console.error('Error message:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return false;
  }
}

async function runTests() {
  try {
    // Check if server is running
    const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
    const serverRunning = await checkServer('localhost', port);
    if (!serverRunning) {
      console.error('\n⚠️ Server is not running! Please start the server with: npm start');
      return;
    }
    
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
    } else {
      console.log('\n❌ Some login tests failed.');
    }
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the tests
runTests();