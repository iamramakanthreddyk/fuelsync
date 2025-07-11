const axios = require('axios');

const BASE_URL = 'http://localhost:3003';

async function testEndpoints() {
  console.log('Testing FuelSync API Endpoints...\n');

  try {
    // Test health endpoint
    console.log('1. Testing health endpoint...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health check:', healthResponse.data.status);
    
    // Test SuperAdmin login (you'll need to replace with actual credentials)
    console.log('\n2. Testing SuperAdmin login...');
    try {
      const loginResponse = await axios.post(`${BASE_URL}/api/v1/admin/auth/login`, {
        email: 'admin@fuelsync.com',
        password: 'admin123'
      });
      
      const token = loginResponse.data.data.token;
      console.log('✅ SuperAdmin login successful');
      
      // Test SuperAdmin dashboard
      console.log('\n3. Testing SuperAdmin dashboard...');
      const dashboardResponse = await axios.get(`${BASE_URL}/api/v1/admin/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ SuperAdmin dashboard:', dashboardResponse.data.data);
      
      // Test SuperAdmin user list
      console.log('\n4. Testing SuperAdmin user list...');
      const adminUsersResponse = await axios.get(`${BASE_URL}/api/v1/admin/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ SuperAdmin users:', adminUsersResponse.data.data.length, 'users found');
      
      // Test tenant list
      console.log('\n5. Testing tenant list...');
      const tenantsResponse = await axios.get(`${BASE_URL}/api/v1/admin/tenants`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ Tenants:', tenantsResponse.data.data.length, 'tenants found');
      
    } catch (loginError) {
      console.log('❌ SuperAdmin login failed:', loginError.response?.data?.message || loginError.message);
      console.log('   This is expected if no admin user exists yet.');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testEndpoints().catch(console.error);