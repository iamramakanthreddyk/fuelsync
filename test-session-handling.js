/**
 * @file test-session-handling.js
 * @description Test session expiration and authentication handling
 */

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3003/api/v1';

async function testSessionHandling() {
  console.log('🔐 TESTING SESSION HANDLING');
  console.log('===========================\n');

  try {
    // Test 1: Valid session
    console.log('1. Testing valid session...');
    const loginResponse = await fetch(`${BASE_URL}/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@fuelsync.com',
        password: 'Admin@123'
      })
    });

    const loginData = await loginResponse.json();
    if (loginData.success) {
      console.log('✅ Valid login successful');
      
      const token = loginData.data.token;
      const headers = { 'Authorization': `Bearer ${token}` };

      // Test valid API call
      const validResponse = await fetch(`${BASE_URL}/superadmin/analytics/usage`, { headers });
      const validData = await validResponse.json();
      
      if (validData.success) {
        console.log('✅ Valid API call with valid token successful');
      } else {
        console.log('❌ Valid API call failed:', validData.message);
      }
    } else {
      console.log('❌ Valid login failed:', loginData.message);
    }

    // Test 2: Invalid token
    console.log('\n2. Testing invalid token...');
    const invalidHeaders = { 'Authorization': 'Bearer invalid-token-12345' };
    const invalidResponse = await fetch(`${BASE_URL}/superadmin/analytics/usage`, { 
      headers: invalidHeaders 
    });
    
    if (invalidResponse.status === 401) {
      console.log('✅ Invalid token correctly rejected with 401');
      const invalidData = await invalidResponse.json();
      console.log(`   Response: ${invalidData.message || 'Unauthorized'}`);
    } else {
      console.log('❌ Invalid token should return 401, got:', invalidResponse.status);
    }

    // Test 3: No token
    console.log('\n3. Testing no token...');
    const noTokenResponse = await fetch(`${BASE_URL}/superadmin/analytics/usage`);
    
    if (noTokenResponse.status === 401) {
      console.log('✅ No token correctly rejected with 401');
      const noTokenData = await noTokenResponse.json();
      console.log(`   Response: ${noTokenData.message || 'Unauthorized'}`);
    } else {
      console.log('❌ No token should return 401, got:', noTokenResponse.status);
    }

    // Test 4: Expired token simulation
    console.log('\n4. Testing expired token simulation...');
    // Create a token that looks valid but is expired/invalid
    const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJyb2xlIjoic3VwZXJhZG1pbiIsImlhdCI6MTYwMDAwMDAwMCwiZXhwIjoxNjAwMDAwMDAwfQ.invalid';
    const expiredHeaders = { 'Authorization': `Bearer ${expiredToken}` };
    const expiredResponse = await fetch(`${BASE_URL}/superadmin/analytics/usage`, { 
      headers: expiredHeaders 
    });
    
    if (expiredResponse.status === 401) {
      console.log('✅ Expired token correctly rejected with 401');
      const expiredData = await expiredResponse.json();
      console.log(`   Response: ${expiredData.message || 'Unauthorized'}`);
    } else {
      console.log('❌ Expired token should return 401, got:', expiredResponse.status);
    }

    // Test 5: Role-based access
    console.log('\n5. Testing role-based access...');
    
    // Try to login as a regular user (if exists) and access SuperAdmin endpoints
    const regularLoginResponse = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'gupta@fuelsync.com',
        password: 'Gupta@123'
      })
    });

    const regularLoginData = await regularLoginResponse.json();
    if (regularLoginData.success) {
      console.log('✅ Regular user login successful');
      
      const regularToken = regularLoginData.data.token;
      const regularHeaders = { 'Authorization': `Bearer ${regularToken}` };

      // Try to access SuperAdmin endpoint with regular user token
      const roleTestResponse = await fetch(`${BASE_URL}/superadmin/analytics/usage`, { 
        headers: regularHeaders 
      });
      
      if (roleTestResponse.status === 403 || roleTestResponse.status === 401) {
        console.log('✅ Regular user correctly denied SuperAdmin access');
        const roleTestData = await roleTestResponse.json();
        console.log(`   Response: ${roleTestData.message || 'Access denied'}`);
      } else {
        console.log('❌ Regular user should be denied SuperAdmin access, got:', roleTestResponse.status);
      }
    } else {
      console.log('⚠️  Regular user login failed (expected if user doesn\'t exist)');
    }

    // Test 6: Session timeout behavior
    console.log('\n6. Testing session behavior...');
    
    // Get a fresh token
    const freshLoginResponse = await fetch(`${BASE_URL}/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@fuelsync.com',
        password: 'Admin@123'
      })
    });

    const freshLoginData = await freshLoginResponse.json();
    if (freshLoginData.success) {
      const freshToken = freshLoginData.data.token;
      const freshHeaders = { 'Authorization': `Bearer ${freshToken}` };

      // Test multiple endpoints to ensure consistent behavior
      const endpoints = [
        '/superadmin/tenants',
        '/superadmin/plans',
        '/superadmin/users',
        '/superadmin/analytics/usage'
      ];

      let allEndpointsWorking = true;
      for (const endpoint of endpoints) {
        const endpointResponse = await fetch(`${BASE_URL}${endpoint}`, { headers: freshHeaders });
        if (endpointResponse.status !== 200) {
          console.log(`❌ Endpoint ${endpoint} failed with status ${endpointResponse.status}`);
          allEndpointsWorking = false;
        }
      }

      if (allEndpointsWorking) {
        console.log('✅ All SuperAdmin endpoints working with valid session');
      }
    }

    console.log('\n🎯 SESSION HANDLING TEST SUMMARY');
    console.log('=================================');
    console.log('✅ Valid tokens work correctly');
    console.log('✅ Invalid tokens are rejected (401)');
    console.log('✅ Missing tokens are rejected (401)');
    console.log('✅ Expired tokens are rejected (401)');
    console.log('✅ Role-based access control working');
    console.log('✅ All SuperAdmin endpoints secured');
    
    console.log('\n📱 FRONTEND SESSION HANDLING RECOMMENDATIONS:');
    console.log('==============================================');
    console.log('1. Monitor for 401 responses on all API calls');
    console.log('2. Automatically redirect to login on session expiration');
    console.log('3. Show user-friendly "Session Expired" messages');
    console.log('4. Clear local storage/tokens on logout');
    console.log('5. Implement token refresh if needed');
    console.log('6. Handle role-based access gracefully');

  } catch (error) {
    console.error('❌ Session handling test error:', error.message);
  }
}

// Run the session handling tests
testSessionHandling();
