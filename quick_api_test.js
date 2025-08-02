/**
 * @file quick_api_test.js
 * @description Quick API security test for FuelSync
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3004/api/v1';

async function testServerHealth() {
  console.log('🔍 Testing server health...');
  
  try {
    // Test a simple endpoint
    const response = await axios.get(`${BASE_URL}/auth/login`, {
      timeout: 5000,
      validateStatus: () => true // Accept any status code
    });
    
    console.log(`✅ Server is responding on port 3004 (Status: ${response.status})`);
    return true;
  } catch (error) {
    console.log(`❌ Server not responding: ${error.message}`);
    return false;
  }
}

async function testBasicEndpoints() {
  console.log('\n🧪 TESTING BASIC API ENDPOINTS');
  console.log('==============================');
  
  const tests = [
    {
      name: 'POST /auth/login (no credentials)',
      method: 'POST',
      url: `${BASE_URL}/auth/login`,
      data: {},
      expectedStatus: 400
    },
    {
      name: 'POST /auth/login (invalid credentials)',
      method: 'POST', 
      url: `${BASE_URL}/auth/login`,
      data: { email: 'invalid@test.com', password: 'wrong' },
      expectedStatus: 401
    },
    {
      name: 'GET /stations (no auth)',
      method: 'GET',
      url: `${BASE_URL}/stations`,
      expectedStatus: 401
    },
    {
      name: 'GET /users (no auth)',
      method: 'GET',
      url: `${BASE_URL}/users`,
      expectedStatus: 401
    },
    {
      name: 'GET /dashboard (no auth)',
      method: 'GET',
      url: `${BASE_URL}/dashboard`,
      expectedStatus: 401
    },
    {
      name: 'GET /nozzle-readings (no auth)',
      method: 'GET',
      url: `${BASE_URL}/nozzle-readings`,
      expectedStatus: 401
    },
    {
      name: 'GET /reports/sales (no auth)',
      method: 'GET',
      url: `${BASE_URL}/reports/sales`,
      expectedStatus: 401
    },
    {
      name: 'GET /analytics/station-comparison (no auth)',
      method: 'GET',
      url: `${BASE_URL}/analytics/station-comparison`,
      expectedStatus: 401
    },
    {
      name: 'GET /creditors (no auth)',
      method: 'GET',
      url: `${BASE_URL}/creditors`,
      expectedStatus: 401
    },
    {
      name: 'GET /reconciliation/summary (no auth)',
      method: 'GET',
      url: `${BASE_URL}/reconciliation/summary`,
      expectedStatus: 401
    }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      const config = {
        method: test.method,
        url: test.url,
        timeout: 5000,
        validateStatus: () => true // Accept any status code
      };
      
      if (test.data) {
        config.data = test.data;
      }
      
      const response = await axios(config);
      
      if (response.status === test.expectedStatus) {
        console.log(`✅ ${test.name}`);
        passed++;
      } else {
        console.log(`❌ ${test.name} (Expected ${test.expectedStatus}, got ${response.status})`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${test.name} (Error: ${error.message})`);
      failed++;
    }
  }
  
  console.log(`\n📊 RESULTS: ${passed} passed, ${failed} failed`);
  
  if (failed === 0) {
    console.log('🎉 All basic API security tests passed!');
  } else {
    console.log('⚠️  Some tests failed - check the results above.');
  }
}

async function runTests() {
  console.log('🚀 FUELSYNC API SECURITY TESTS');
  console.log('==============================\n');
  
  // Check if server is running
  const serverRunning = await testServerHealth();
  
  if (!serverRunning) {
    console.log('\n❌ Server is not running. Please start the server first with:');
    console.log('   npm run build && node dist/app.js');
    process.exit(1);
  }
  
  // Run basic endpoint tests
  await testBasicEndpoints();
  
  console.log('\n✅ API security testing complete!');
}

// Run tests
runTests().catch(error => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
});
