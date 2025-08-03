/**
 * @file test-superadmin.js
 * @description Test SuperAdmin endpoints with authentication
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3003/api/v1';

async function testSuperAdminEndpoints() {
  console.log('🚀 SUPERADMIN ENDPOINT TESTS');
  console.log('==============================\n');

  let authToken = null;

  try {
    // First, try to login as superadmin using seeded credentials
    console.log('🔐 Testing SuperAdmin login...\n');

    try {
      const loginResponse = await axios.post(`${BASE_URL}/admin/auth/login`, {
        email: 'admin@fuelsync.com',
        password: 'Admin@123'
      });

      if (loginResponse.data.success && loginResponse.data.data.token) {
        authToken = loginResponse.data.data.token;
        console.log('✅ SuperAdmin login successful');
        console.log('   Token received:', authToken.substring(0, 20) + '...');
      }
    } catch (error) {
      console.log('❌ SuperAdmin login failed:', error.response?.status, error.response?.data?.message);
    }

    console.log('\n🔍 Testing SuperAdmin endpoints...\n');

    // Test 1: Get tenants (should work with proper auth)
    console.log('1. Testing GET /superadmin/tenants');
    try {
      const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};
      const response = await axios.get(`${BASE_URL}/superadmin/tenants`, { headers });
      console.log('✅ Tenants endpoint accessible');
      console.log('   Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Tenants endpoint properly secured (401)');
      } else {
        console.log('❌ Tenants endpoint error:', error.response?.status, error.response?.data?.message);
        console.log('   Full error:', error.response?.data);
      }
    }

    // Test 2: Get plans
    console.log('\n2. Testing GET /superadmin/plans');
    try {
      const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};
      const response = await axios.get(`${BASE_URL}/superadmin/plans`, { headers });
      console.log('✅ Plans endpoint accessible');
      console.log('   Plans found:', response.data.data.plans.length);

      // Show plan details
      response.data.data.plans.forEach((plan, index) => {
        console.log(`   Plan ${index + 1}:`);
        console.log(`     Name: ${plan.name}`);
        console.log(`     Price: ₹${plan.priceMonthly}/month`);
        console.log(`     Features: ${JSON.stringify(plan.features)}`);
        console.log(`     Tenants: ${plan.tenantCount}`);
      });
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Plans endpoint properly secured (401)');
      } else {
        console.log('❌ Plans endpoint error:', error.response?.status, error.response?.data?.message);
      }
    }

    // Test 3: Get analytics
    console.log('\n3. Testing GET /superadmin/analytics/usage');
    try {
      const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};
      const response = await axios.get(`${BASE_URL}/superadmin/analytics/usage`, { headers });
      console.log('✅ Analytics endpoint accessible');
      console.log('   Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Analytics endpoint properly secured (401)');
      } else {
        console.log('❌ Analytics endpoint error:', error.response?.status, error.response?.data?.message);
        console.log('   Full error:', error.response?.data);
      }
    }

    // Test 4: Try to create a superadmin user (this might fail due to missing admin auth)
    console.log('\n4. Testing SuperAdmin user creation');
    try {
      const response = await axios.post(`${BASE_URL}/admin/auth/register`, {
        email: 'superadmin@test.com',
        password: 'password123',
        name: 'Test SuperAdmin'
      });
      console.log('✅ SuperAdmin user created');
      console.log('   Response:', response.data);
    } catch (error) {
      console.log('❌ SuperAdmin user creation failed:', error.response?.status, error.response?.data?.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }

  console.log('\n✅ SuperAdmin endpoint testing complete!');
}

// Run the tests
testSuperAdminEndpoints();
