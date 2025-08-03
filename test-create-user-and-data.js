/**
 * @file test-create-user-and-data.js
 * @description Create test user and sample data to test dashboard mapping
 */

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3003/api/v1';

async function createTestUserAndData() {
  console.log('🔧 CREATING TEST USER AND SAMPLE DATA');
  console.log('======================================\n');

  try {
    // First, login as SuperAdmin to create tenant and user
    const adminLogin = await fetch(`${BASE_URL}/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@fuelsync.com',
        password: 'Admin@123'
      })
    });

    if (!adminLogin.ok) {
      console.log('❌ SuperAdmin login failed');
      return;
    }

    const adminData = await adminLogin.json();
    const adminToken = adminData.data.token;
    const adminHeaders = { 'Authorization': `Bearer ${adminToken}` };

    console.log('✅ SuperAdmin login successful');

    // Check existing tenants
    const tenants = await fetch(`${BASE_URL}/superadmin/tenants`, { headers: adminHeaders });
    const tenantsData = await tenants.json();
    
    console.log(`📊 Found ${tenantsData.data.tenants.length} existing tenants`);
    
    let testTenant = null;
    if (tenantsData.data.tenants.length > 0) {
      testTenant = tenantsData.data.tenants[0];
      console.log(`✅ Using existing tenant: ${testTenant.name} (ID: ${testTenant.id})`);
    } else {
      console.log('⚠️  No tenants found, would need to create one');
      return;
    }

    // Now try to login with different user credentials to test the dashboard
    const testCredentials = [
      { email: 'owner@gupta.com', password: 'Owner@123' },
      { email: 'gupta@fuelsync.com', password: 'Gupta@123' },
      { email: 'owner@teststation.com', password: 'Owner@123' },
      { email: 'test@fuelsync.com', password: 'Test@123' }
    ];

    let workingCredentials = null;
    
    for (const creds of testCredentials) {
      console.log(`🔑 Trying login: ${creds.email}`);
      
      const userLogin = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(creds)
      });

      if (userLogin.ok) {
        const userData = await userLogin.json();
        if (userData.success) {
          workingCredentials = { ...creds, token: userData.data.token, user: userData.data.user };
          console.log(`✅ Login successful: ${userData.data.user.name} (${userData.data.user.role})`);
          break;
        }
      }
      
      console.log(`❌ Login failed for ${creds.email}`);
    }

    if (!workingCredentials) {
      console.log('❌ No working credentials found');
      console.log('💡 You may need to create a test user manually or check existing user passwords');
      return;
    }

    const userHeaders = { 'Authorization': `Bearer ${workingCredentials.token}` };

    // Now test the dashboard endpoints with working credentials
    console.log('\n📊 TESTING DASHBOARD ENDPOINTS');
    console.log('===============================');

    // Test Today's Sales
    console.log('\n1. Today\'s Sales Summary:');
    const todaysSales = await fetch(`${BASE_URL}/todays-sales/summary`, { headers: userHeaders });
    
    if (todaysSales.ok) {
      const salesData = await todaysSales.json();
      console.log('✅ Today\'s sales accessible');
      console.log(`   - Success: ${salesData.success}`);
      console.log(`   - Data keys: ${Object.keys(salesData.data || {}).join(', ')}`);
      
      if (salesData.data) {
        console.log(`   - Total Entries: ${salesData.data.totalEntries}`);
        console.log(`   - Total Amount: ${salesData.data.totalAmount}`);
        console.log(`   - Date: ${salesData.data.date}`);
      }
    } else {
      console.log(`❌ Today's sales failed: ${todaysSales.status}`);
    }

    // Test Readings
    console.log('\n2. Nozzle Readings:');
    const readings = await fetch(`${BASE_URL}/nozzle-readings`, { headers: userHeaders });
    
    if (readings.ok) {
      const readingsData = await readings.json();
      console.log('✅ Readings accessible');
      console.log(`   - Success: ${readingsData.success}`);
      
      if (readingsData.data && readingsData.data.readings) {
        console.log(`   - Readings count: ${readingsData.data.readings.length}`);
        if (readingsData.data.readings.length > 0) {
          const firstReading = readingsData.data.readings[0];
          console.log(`   - First reading date: ${firstReading.recordedAt || firstReading.recorded_at}`);
          console.log(`   - First reading value: ${firstReading.reading}`);
        }
      }
    } else {
      console.log(`❌ Readings failed: ${readings.status}`);
    }

    // Test Payment Methods
    console.log('\n3. Payment Methods:');
    const paymentMethods = await fetch(`${BASE_URL}/dashboard/payment-methods`, { headers: userHeaders });
    
    if (paymentMethods.ok) {
      const paymentData = await paymentMethods.json();
      console.log('✅ Payment methods accessible');
      console.log(`   - Success: ${paymentData.success}`);
      console.log(`   - Data type: ${Array.isArray(paymentData.data) ? 'Array' : typeof paymentData.data}`);
      
      if (Array.isArray(paymentData.data)) {
        console.log(`   - Items count: ${paymentData.data.length}`);
      }
    } else {
      console.log(`❌ Payment methods failed: ${paymentMethods.status}`);
    }

    // Test Stations
    console.log('\n4. Stations:');
    const stations = await fetch(`${BASE_URL}/stations`, { headers: userHeaders });
    
    if (stations.ok) {
      const stationsData = await stations.json();
      console.log('✅ Stations accessible');
      console.log(`   - Success: ${stationsData.success}`);
      
      if (stationsData.data) {
        const stationsList = Array.isArray(stationsData.data) ? stationsData.data : stationsData.data.stations || [];
        console.log(`   - Stations count: ${stationsList.length}`);
      }
    } else {
      console.log(`❌ Stations failed: ${stations.status}`);
    }

    console.log('\n🎯 WORKING CREDENTIALS FOR TESTING:');
    console.log('====================================');
    console.log(`Email: ${workingCredentials.email}`);
    console.log(`Password: ${workingCredentials.password}`);
    console.log(`User: ${workingCredentials.user.name} (${workingCredentials.user.role})`);
    console.log(`Tenant: ${workingCredentials.user.tenantName || 'N/A'}`);
    
    console.log('\n📝 NEXT STEPS:');
    console.log('==============');
    console.log('1. Use the working credentials above to test frontend');
    console.log('2. Check dashboard components for data mapping issues');
    console.log('3. Fix date formatting and object display problems');
    console.log('4. Ensure proper data extraction from API responses');

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

// Run the test
createTestUserAndData();
