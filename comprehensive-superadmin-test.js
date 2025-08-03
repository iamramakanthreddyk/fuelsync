/**
 * @file comprehensive-superadmin-test.js
 * @description Comprehensive test suite for SuperAdmin functionality
 */

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3003/api/v1';
let testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  details: []
};

function logTest(name, passed, message = '') {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    console.log(`✅ ${name}`);
  } else {
    testResults.failed++;
    console.log(`❌ ${name}: ${message}`);
  }
  testResults.details.push({ name, passed, message });
}

async function runComprehensiveTests() {
  console.log('🧪 COMPREHENSIVE SUPERADMIN TEST SUITE');
  console.log('======================================\n');

  let authToken;
  let testPlanId;

  try {
    // Test 1: SuperAdmin Authentication
    console.log('📋 Authentication Tests');
    console.log('------------------------');
    
    const loginResponse = await fetch(`${BASE_URL}/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@fuelsync.com',
        password: 'Admin@123'
      })
    });

    const loginData = await loginResponse.json();
    logTest('SuperAdmin Login', loginData.success && loginData.data.token, loginData.message);
    
    if (!loginData.success) {
      console.log('❌ Cannot proceed without authentication');
      return;
    }
    
    authToken = loginData.data.token;
    const headers = {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    };

    // Test invalid credentials
    const invalidLoginResponse = await fetch(`${BASE_URL}/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@fuelsync.com',
        password: 'wrongpassword'
      })
    });
    const invalidLoginData = await invalidLoginResponse.json();
    logTest('Invalid Credentials Rejected', !invalidLoginData.success);

    // Test 2: Tenant Management
    console.log('\n📋 Tenant Management Tests');
    console.log('---------------------------');
    
    const tenantsResponse = await fetch(`${BASE_URL}/superadmin/tenants`, { headers });
    const tenantsData = await tenantsResponse.json();
    logTest('Get All Tenants', tenantsData.success && Array.isArray(tenantsData.data.tenants));
    
    if (tenantsData.success && tenantsData.data.tenants.length > 0) {
      const tenant = tenantsData.data.tenants[0];
      logTest('Tenant Structure Valid', 
        tenant.id && tenant.name && tenant.plan && tenant.usage,
        'Missing required tenant properties'
      );
      logTest('Tenant Plan Structure Valid',
        tenant.plan.name && typeof tenant.plan.priceMonthly === 'number',
        'Invalid plan structure'
      );
      logTest('Tenant Usage Structure Valid',
        typeof tenant.usage.currentStations === 'number' && typeof tenant.usage.totalUsers === 'number',
        'Invalid usage structure'
      );
      logTest('Date Fields Valid',
        tenant.createdAt && !tenant.createdAt.includes('{}'),
        'Invalid date format'
      );
    }

    // Test 3: Plan Management
    console.log('\n📋 Plan Management Tests');
    console.log('-------------------------');
    
    const plansResponse = await fetch(`${BASE_URL}/superadmin/plans`, { headers });
    const plansData = await plansResponse.json();
    logTest('Get All Plans', plansData.success && Array.isArray(plansData.data.plans));
    
    if (plansData.success && plansData.data.plans.length > 0) {
      const plan = plansData.data.plans[0];
      logTest('Plan Structure Valid',
        plan.id && plan.name && typeof plan.priceMonthly === 'number',
        'Missing required plan properties'
      );
      logTest('Plan Features Valid',
        Array.isArray(plan.features) && plan.features.length > 0,
        'Invalid features structure'
      );
      logTest('Price Precision Fixed',
        !plan.priceMonthly.toString().includes('000000000000'),
        'Price precision issue not fixed'
      );
    }

    // Test plan creation
    const newPlan = {
      name: 'Comprehensive Test Plan',
      maxStations: 4,
      maxPumpsPerStation: 8,
      maxNozzlesPerPump: 4,
      priceMonthly: 1599,
      priceYearly: 15990,
      features: [
        'Advanced Dashboard',
        'Multi-Station Support',
        'Advanced Analytics',
        'Priority Support',
        'Custom Branding'
      ]
    };

    const createPlanResponse = await fetch(`${BASE_URL}/superadmin/plans`, {
      method: 'POST',
      headers,
      body: JSON.stringify(newPlan)
    });
    const createPlanData = await createPlanResponse.json();
    logTest('Create Plan', createPlanData.success, createPlanData.message);
    
    if (createPlanData.success) {
      testPlanId = createPlanData.data.plan.id;
      logTest('Plan Creation Returns ID', !!testPlanId);
      
      // Test plan update
      const updatedPlan = {
        ...newPlan,
        name: 'Updated Comprehensive Test Plan',
        priceMonthly: 1799
      };

      const updatePlanResponse = await fetch(`${BASE_URL}/superadmin/plans/${testPlanId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(updatedPlan)
      });
      const updatePlanData = await updatePlanResponse.json();
      logTest('Update Plan', updatePlanData.success, updatePlanData.message);
    }

    // Test 4: User Management
    console.log('\n📋 User Management Tests');
    console.log('-------------------------');
    
    const usersResponse = await fetch(`${BASE_URL}/superadmin/users`, { headers });
    const usersData = await usersResponse.json();
    logTest('Get All Users', usersData.success);
    
    if (usersData.success) {
      logTest('Users Response Structure Valid',
        usersData.data.tenantUsers && usersData.data.adminUsers && typeof usersData.data.totalUsers === 'number',
        'Invalid users response structure'
      );
      logTest('Tenant Users Array Valid',
        Array.isArray(usersData.data.tenantUsers),
        'tenantUsers is not an array'
      );
      logTest('Admin Users Array Valid',
        Array.isArray(usersData.data.adminUsers),
        'adminUsers is not an array'
      );
      
      if (usersData.data.tenantUsers.length > 0) {
        const tenantUser = usersData.data.tenantUsers[0];
        logTest('Tenant User Structure Valid',
          tenantUser.id && tenantUser.email && tenantUser.role,
          'Missing required tenant user properties'
        );
      }
      
      if (usersData.data.adminUsers.length > 0) {
        const adminUser = usersData.data.adminUsers[0];
        logTest('Admin User Structure Valid',
          adminUser.id && adminUser.email && adminUser.role,
          'Missing required admin user properties'
        );
      }
    }

    // Test 5: Analytics
    console.log('\n📋 Analytics Tests');
    console.log('-------------------');
    
    const analyticsResponse = await fetch(`${BASE_URL}/superadmin/analytics/usage`, { headers });
    const analyticsData = await analyticsResponse.json();
    logTest('Get Usage Analytics', analyticsData.success);
    
    if (analyticsData.success) {
      const stats = analyticsData.data.systemStats;
      logTest('System Stats Valid',
        typeof stats.totalTenants === 'number' && typeof stats.totalUsers === 'number',
        'Invalid system stats structure'
      );
      logTest('Plan Distribution Valid',
        Array.isArray(analyticsData.data.planDistribution),
        'Invalid plan distribution structure'
      );
    }

    // Test 6: Authorization
    console.log('\n📋 Authorization Tests');
    console.log('-----------------------');
    
    const noAuthResponse = await fetch(`${BASE_URL}/superadmin/tenants`);
    const noAuthData = await noAuthResponse.json();
    logTest('No Auth Token Rejected', !noAuthData.success && noAuthResponse.status === 401);
    
    const invalidAuthResponse = await fetch(`${BASE_URL}/superadmin/tenants`, {
      headers: { 'Authorization': 'Bearer invalid-token' }
    });
    const invalidAuthData = await invalidAuthResponse.json();
    logTest('Invalid Auth Token Rejected', !invalidAuthData.success && invalidAuthResponse.status === 401);

    // Test 7: Error Handling
    console.log('\n📋 Error Handling Tests');
    console.log('------------------------');
    
    const invalidPlanResponse = await fetch(`${BASE_URL}/superadmin/plans`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: 'Invalid Plan' }) // Missing required fields
    });
    const invalidPlanData = await invalidPlanResponse.json();
    logTest('Invalid Plan Creation Rejected', !invalidPlanData.success && invalidPlanResponse.status === 400);

  } catch (error) {
    console.error('❌ Test suite error:', error.message);
    logTest('Test Suite Execution', false, error.message);
  }

  // Cleanup
  if (testPlanId) {
    try {
      const { Pool } = require('pg');
      require('dotenv').config();
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      });
      await pool.query('DELETE FROM public.plans WHERE id = $1', [testPlanId]);
      await pool.end();
      console.log('\n🧹 Test plan cleaned up');
    } catch (error) {
      console.warn('⚠️  Could not clean up test plan:', error.message);
    }
  }

  // Results Summary
  console.log('\n📊 TEST RESULTS SUMMARY');
  console.log('========================');
  console.log(`Total Tests: ${testResults.total}`);
  console.log(`Passed: ${testResults.passed} ✅`);
  console.log(`Failed: ${testResults.failed} ❌`);
  console.log(`Success Rate: ${Math.round((testResults.passed / testResults.total) * 100)}%`);
  
  if (testResults.failed > 0) {
    console.log('\n❌ Failed Tests:');
    testResults.details.filter(t => !t.passed).forEach(test => {
      console.log(`   - ${test.name}: ${test.message}`);
    });
  }

  console.log(`\n${testResults.failed === 0 ? '🎉 ALL TESTS PASSED!' : '⚠️  Some tests failed - check details above'}`);
}

// Run the comprehensive tests
runComprehensiveTests();
