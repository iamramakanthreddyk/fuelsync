/**
 * @file test-new-superadmin-endpoints.js
 * @description Test the newly added SuperAdmin endpoints
 */

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3003/api/v1';

async function testNewSuperAdminEndpoints() {
  console.log('🚀 TESTING NEW SUPERADMIN ENDPOINTS');
  console.log('====================================\n');

  try {
    // 1. Login as SuperAdmin
    console.log('🔐 Logging in as SuperAdmin...');
    const loginResponse = await fetch(`${BASE_URL}/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@fuelsync.com',
        password: 'Admin@123'
      })
    });

    const loginData = await loginResponse.json();
    if (!loginData.success) {
      throw new Error('Login failed: ' + loginData.message);
    }

    const token = loginData.data.token;
    console.log('✅ Login successful\n');

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // 2. Test GET /superadmin/users
    console.log('1. Testing GET /superadmin/users');
    const usersResponse = await fetch(`${BASE_URL}/superadmin/users`, { headers });
    const usersData = await usersResponse.json();
    
    if (usersData.success) {
      console.log('✅ Users endpoint working');
      console.log(`   Tenant Users: ${usersData.data.tenantUsers.length}`);
      console.log(`   Admin Users: ${usersData.data.adminUsers.length}`);
      console.log(`   Total Users: ${usersData.data.totalUsers}`);
      
      // Show sample data
      if (usersData.data.tenantUsers.length > 0) {
        const sampleUser = usersData.data.tenantUsers[0];
        console.log(`   Sample Tenant User: ${sampleUser.email} (${sampleUser.role})`);
      }
      if (usersData.data.adminUsers.length > 0) {
        const sampleAdmin = usersData.data.adminUsers[0];
        console.log(`   Sample Admin User: ${sampleAdmin.email} (${sampleAdmin.role})`);
      }
    } else {
      console.log('❌ Users endpoint failed:', usersData.message);
    }

    // 3. Test POST /superadmin/plans (Create Plan)
    console.log('\n2. Testing POST /superadmin/plans (Create Plan)');
    const newPlan = {
      name: 'Test Plan',
      maxStations: 2,
      maxPumpsPerStation: 6,
      maxNozzlesPerPump: 3,
      priceMonthly: 799,
      priceYearly: 7990,
      features: [
        'Basic Dashboard',
        'Multi-Station Support',
        'User Management (up to 10 users)',
        'Basic Reports',
        'Email Support'
      ]
    };

    const createPlanResponse = await fetch(`${BASE_URL}/superadmin/plans`, {
      method: 'POST',
      headers,
      body: JSON.stringify(newPlan)
    });

    const createPlanData = await createPlanResponse.json();
    if (createPlanData.success) {
      console.log('✅ Plan creation working');
      console.log(`   Created plan: ${createPlanData.data.plan.name}`);
      console.log(`   Plan ID: ${createPlanData.data.plan.id}`);
      
      // 4. Test PUT /superadmin/plans/:id (Update Plan)
      console.log('\n3. Testing PUT /superadmin/plans/:id (Update Plan)');
      const planId = createPlanData.data.plan.id;
      const updatedPlan = {
        ...newPlan,
        name: 'Updated Test Plan',
        priceMonthly: 899,
        features: [
          ...newPlan.features,
          'Advanced Analytics'
        ]
      };

      const updatePlanResponse = await fetch(`${BASE_URL}/superadmin/plans/${planId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(updatedPlan)
      });

      const updatePlanData = await updatePlanResponse.json();
      if (updatePlanData.success) {
        console.log('✅ Plan update working');
        console.log(`   Updated plan: ${updatePlanData.data.plan.name}`);
        console.log(`   New price: ₹${updatePlanData.data.plan.price_monthly}/month`);
      } else {
        console.log('❌ Plan update failed:', updatePlanData.message);
      }
    } else {
      console.log('❌ Plan creation failed:', createPlanData.message);
    }

    // 5. Test GET /superadmin/analytics/tenant/:id
    console.log('\n4. Testing GET /superadmin/analytics/tenant/:id');
    const tenantId = 'cb5c9efd-fe29-44b3-8d75-e3fa70e0dd9b'; // Test Tenant ID
    const tenantAnalyticsResponse = await fetch(`${BASE_URL}/superadmin/analytics/tenant/${tenantId}`, { headers });
    const tenantAnalyticsData = await tenantAnalyticsResponse.json();
    
    if (tenantAnalyticsData.success) {
      console.log('✅ Tenant analytics working');
      console.log(`   Tenant: ${tenantAnalyticsData.data.tenant.name}`);
      console.log(`   Users: ${tenantAnalyticsData.data.usage.totalUsers}`);
      console.log(`   Stations: ${tenantAnalyticsData.data.usage.currentStations}`);
    } else {
      console.log('❌ Tenant analytics failed:', tenantAnalyticsData.message);
    }

    console.log('\n✅ All new SuperAdmin endpoints tested!');

  } catch (error) {
    console.error('❌ Error testing endpoints:', error.message);
  }
}

// Run the tests
testNewSuperAdminEndpoints();
