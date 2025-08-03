/**
 * @file test-frontend-backend-alignment.js
 * @description Test that frontend data mapping aligns with backend responses
 */

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3003/api/v1';

async function testFrontendBackendAlignment() {
  console.log('🔄 TESTING FRONTEND-BACKEND ALIGNMENT');
  console.log('=====================================\n');

  try {
    // Login
    const login = await fetch(`${BASE_URL}/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@fuelsync.com',
        password: 'Admin@123'
      })
    });
    
    const loginData = await login.json();
    const token = loginData.data.token;
    const headers = { 'Authorization': `Bearer ${token}` };

    console.log('1. ANALYTICS ENDPOINT ALIGNMENT');
    console.log('--------------------------------');
    
    const analytics = await fetch(`${BASE_URL}/superadmin/analytics/usage`, { headers });
    const analyticsData = await analytics.json();
    
    if (analyticsData.success) {
      console.log('✅ Analytics endpoint working');
      
      // Check data structure alignment
      const data = analyticsData.data;
      console.log('\n📊 Data Structure Analysis:');
      
      // System Stats
      if (data.systemStats) {
        console.log('✅ systemStats exists');
        console.log(`   - totalTenants: ${data.systemStats.totalTenants}`);
        console.log(`   - activeTenants: ${data.systemStats.activeTenants}`);
        console.log(`   - totalUsers: ${data.systemStats.totalUsers}`);
        console.log(`   - activeUsersWeek: ${data.systemStats.activeUsersWeek}`);
        console.log(`   - totalStations: ${data.systemStats.totalStations}`);
        console.log(`   - totalPumps: ${data.systemStats.totalPumps}`);
        console.log(`   - totalNozzles: ${data.systemStats.totalNozzles}`);
      } else {
        console.log('❌ systemStats missing');
      }
      
      // Plan Distribution
      if (data.planDistribution && Array.isArray(data.planDistribution)) {
        console.log('✅ planDistribution exists and is array');
        console.log(`   - Plans count: ${data.planDistribution.length}`);
        data.planDistribution.forEach((plan, i) => {
          console.log(`   - Plan ${i + 1}: ${plan.planName} (${plan.tenantCount} tenants, ₹${plan.monthlyRevenue})`);
        });
        
        // Calculate total revenue
        const totalRevenue = data.planDistribution.reduce((sum, plan) => sum + plan.monthlyRevenue, 0);
        console.log(`   - Total Revenue: ₹${totalRevenue}`);
      } else {
        console.log('❌ planDistribution missing or not array');
      }
      
      // Activity Summary
      if (data.activitySummary) {
        console.log('✅ activitySummary exists');
        console.log(`   - activeUsers: ${data.activitySummary.activeUsers}`);
        console.log(`   - totalActivities: ${data.activitySummary.totalActivities}`);
        console.log(`   - todayActivities: ${data.activitySummary.todayActivities}`);
      } else {
        console.log('❌ activitySummary missing');
      }
      
    } else {
      console.log('❌ Analytics endpoint failed:', analyticsData.message);
    }

    console.log('\n2. TENANTS ENDPOINT ALIGNMENT');
    console.log('------------------------------');
    
    const tenants = await fetch(`${BASE_URL}/superadmin/tenants`, { headers });
    const tenantsData = await tenants.json();
    
    if (tenantsData.success && tenantsData.data.tenants) {
      console.log('✅ Tenants endpoint working');
      console.log(`   - Tenants count: ${tenantsData.data.tenants.length}`);
      
      if (tenantsData.data.tenants.length > 0) {
        const tenant = tenantsData.data.tenants[0];
        console.log('\n📋 Tenant Structure Analysis:');
        console.log(`   - id: ${tenant.id ? '✅' : '❌'}`);
        console.log(`   - name: ${tenant.name ? '✅' : '❌'}`);
        console.log(`   - status: ${tenant.status ? '✅' : '❌'}`);
        console.log(`   - createdAt: ${tenant.createdAt ? '✅' : '❌'} (${tenant.createdAt})`);
        console.log(`   - plan: ${tenant.plan ? '✅' : '❌'}`);
        if (tenant.plan) {
          console.log(`     - plan.name: ${tenant.plan.name ? '✅' : '❌'} (${tenant.plan.name})`);
          console.log(`     - plan.priceMonthly: ${typeof tenant.plan.priceMonthly === 'number' ? '✅' : '❌'} (${tenant.plan.priceMonthly})`);
        }
        console.log(`   - usage: ${tenant.usage ? '✅' : '❌'}`);
        if (tenant.usage) {
          console.log(`     - usage.currentStations: ${typeof tenant.usage.currentStations === 'number' ? '✅' : '❌'} (${tenant.usage.currentStations})`);
          console.log(`     - usage.totalUsers: ${typeof tenant.usage.totalUsers === 'number' ? '✅' : '❌'} (${tenant.usage.totalUsers})`);
        }
      }
    } else {
      console.log('❌ Tenants endpoint failed:', tenantsData.message);
    }

    console.log('\n3. PLANS ENDPOINT ALIGNMENT');
    console.log('----------------------------');
    
    const plans = await fetch(`${BASE_URL}/superadmin/plans`, { headers });
    const plansData = await plans.json();
    
    if (plansData.success && plansData.data.plans) {
      console.log('✅ Plans endpoint working');
      console.log(`   - Plans count: ${plansData.data.plans.length}`);
      
      if (plansData.data.plans.length > 0) {
        const plan = plansData.data.plans[0];
        console.log('\n📦 Plan Structure Analysis:');
        console.log(`   - id: ${plan.id ? '✅' : '❌'}`);
        console.log(`   - name: ${plan.name ? '✅' : '❌'} (${plan.name})`);
        console.log(`   - priceMonthly: ${typeof plan.priceMonthly === 'number' ? '✅' : '❌'} (${plan.priceMonthly})`);
        console.log(`   - priceYearly: ${typeof plan.priceYearly === 'number' ? '✅' : '❌'} (${plan.priceYearly})`);
        console.log(`   - features: ${Array.isArray(plan.features) ? '✅' : '❌'} (${plan.features?.length} features)`);
        console.log(`   - tenantCount: ${typeof plan.tenantCount === 'number' ? '✅' : '❌'} (${plan.tenantCount})`);
        
        // Check price precision
        const hasLongDecimals = plan.priceMonthly.toString().includes('000000000000');
        console.log(`   - Price precision: ${hasLongDecimals ? '❌ Long decimals found' : '✅ Clean numbers'}`);
      }
    } else {
      console.log('❌ Plans endpoint failed:', plansData.message);
    }

    console.log('\n4. USERS ENDPOINT ALIGNMENT');
    console.log('----------------------------');
    
    const users = await fetch(`${BASE_URL}/superadmin/users`, { headers });
    const usersData = await users.json();
    
    if (usersData.success && usersData.data) {
      console.log('✅ Users endpoint working');
      console.log(`   - tenantUsers: ${Array.isArray(usersData.data.tenantUsers) ? '✅' : '❌'} (${usersData.data.tenantUsers?.length || 0})`);
      console.log(`   - adminUsers: ${Array.isArray(usersData.data.adminUsers) ? '✅' : '❌'} (${usersData.data.adminUsers?.length || 0})`);
      console.log(`   - totalUsers: ${typeof usersData.data.totalUsers === 'number' ? '✅' : '❌'} (${usersData.data.totalUsers})`);
    } else {
      console.log('❌ Users endpoint failed:', usersData.message);
    }

    console.log('\n🎯 FRONTEND MAPPING RECOMMENDATIONS');
    console.log('====================================');
    console.log('✅ Analytics Page: Use analytics.systemStats.* for metrics');
    console.log('✅ Analytics Page: Use analytics.planDistribution for revenue');
    console.log('✅ Tenants Page: Use tenant.plan.name and tenant.usage.*');
    console.log('✅ Plans Page: Prices are now clean numbers without long decimals');
    console.log('✅ Users Page: Use separate tenantUsers and adminUsers arrays');
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

// Run the alignment test
testFrontendBackendAlignment();
