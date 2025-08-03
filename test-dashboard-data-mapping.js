/**
 * @file test-dashboard-data-mapping.js
 * @description Test to identify exact data structure mismatches between backend and frontend
 */

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3003/api/v1';

async function testDashboardDataMapping() {
  console.log('🔍 TESTING DASHBOARD DATA MAPPING ISSUES');
  console.log('=========================================\n');

  try {
    // Login as tenant user
    const loginResponse = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'owner@gupta.com',
        password: 'Owner@123'
      })
    });

    if (!loginResponse.ok) {
      console.log('❌ Login failed, trying alternative credentials...');
      
      // Try different credentials
      const altLogin = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'gupta@fuelsync.com',
          password: 'Gupta@123'
        })
      });
      
      if (!altLogin.ok) {
        console.log('❌ Alternative login also failed');
        return;
      }
      
      var loginData = await altLogin.json();
    } else {
      var loginData = await loginResponse.json();
    }

    if (!loginData.success) {
      console.log('❌ Login failed:', loginData.message);
      return;
    }

    const token = loginData.data.token;
    const headers = { 'Authorization': `Bearer ${token}` };
    
    console.log('✅ Login successful');
    console.log(`👤 User: ${loginData.data.user.name} (${loginData.data.user.role})`);
    console.log(`🏢 Tenant: ${loginData.data.user.tenantName || 'N/A'}\n`);

    // Test 1: Today's Sales Summary
    console.log('1. TESTING TODAY\'S SALES SUMMARY');
    console.log('=================================');
    
    const todaysSales = await fetch(`${BASE_URL}/todays-sales/summary`, { headers });
    
    if (todaysSales.ok) {
      const salesData = await todaysSales.json();
      console.log('✅ Today\'s sales endpoint accessible');
      console.log('📊 Response structure:');
      console.log(JSON.stringify(salesData, null, 2));
      
      if (salesData.success && salesData.data) {
        const data = salesData.data;
        console.log('\n🔍 Data Analysis:');
        console.log(`   - Date: ${data.date} (type: ${typeof data.date})`);
        console.log(`   - Total Entries: ${data.totalEntries} (type: ${typeof data.totalEntries})`);
        console.log(`   - Total Amount: ${data.totalAmount} (type: ${typeof data.totalAmount})`);
        console.log(`   - Total Volume: ${data.totalVolume} (type: ${typeof data.totalVolume})`);
        
        if (data.paymentBreakdown) {
          console.log('   - Payment Breakdown:');
          Object.entries(data.paymentBreakdown).forEach(([method, amount]) => {
            console.log(`     * ${method}: ${amount} (type: ${typeof amount})`);
          });
        }
        
        if (data.nozzleEntries && data.nozzleEntries.length > 0) {
          console.log(`   - Nozzle Entries: ${data.nozzleEntries.length} entries`);
          const firstEntry = data.nozzleEntries[0];
          console.log('     * First entry structure:');
          Object.entries(firstEntry).forEach(([key, value]) => {
            console.log(`       - ${key}: ${value} (type: ${typeof value})`);
          });
        } else {
          console.log('   - Nozzle Entries: No entries found');
        }
      }
    } else {
      console.log(`❌ Today's sales failed: ${todaysSales.status}`);
    }

    // Test 2: Nozzle Readings
    console.log('\n2. TESTING NOZZLE READINGS');
    console.log('===========================');
    
    const readings = await fetch(`${BASE_URL}/nozzle-readings`, { headers });
    
    if (readings.ok) {
      const readingsData = await readings.json();
      console.log('✅ Readings endpoint accessible');
      console.log('📊 Response structure:');
      console.log(JSON.stringify(readingsData, null, 2));
      
      if (readingsData.success && readingsData.data && readingsData.data.readings) {
        const readingsList = readingsData.data.readings;
        console.log(`\n🔍 Readings Analysis: ${readingsList.length} readings found`);
        
        if (readingsList.length > 0) {
          const firstReading = readingsList[0];
          console.log('   - First reading structure:');
          Object.entries(firstReading).forEach(([key, value]) => {
            console.log(`     * ${key}: ${value} (type: ${typeof value})`);
          });
          
          // Check date formatting
          if (firstReading.recordedAt || firstReading.recorded_at) {
            const dateField = firstReading.recordedAt || firstReading.recorded_at;
            console.log(`   - Date field analysis:`);
            console.log(`     * Raw value: ${dateField}`);
            console.log(`     * Type: ${typeof dateField}`);
            console.log(`     * Is valid date: ${!isNaN(new Date(dateField).getTime())}`);
            console.log(`     * Formatted: ${new Date(dateField).toLocaleString()}`);
          }
        }
      }
    } else {
      console.log(`❌ Readings failed: ${readings.status}`);
    }

    // Test 3: Payment Methods
    console.log('\n3. TESTING PAYMENT METHODS');
    console.log('===========================');
    
    const paymentMethods = await fetch(`${BASE_URL}/dashboard/payment-methods`, { headers });
    
    if (paymentMethods.ok) {
      const paymentData = await paymentMethods.json();
      console.log('✅ Payment methods endpoint accessible');
      console.log('📊 Response structure:');
      console.log(JSON.stringify(paymentData, null, 2));
      
      if (paymentData.success && paymentData.data) {
        console.log('\n🔍 Payment Methods Analysis:');
        if (Array.isArray(paymentData.data)) {
          console.log(`   - Array with ${paymentData.data.length} items`);
          if (paymentData.data.length > 0) {
            const firstItem = paymentData.data[0];
            console.log('   - First item structure:');
            Object.entries(firstItem).forEach(([key, value]) => {
              console.log(`     * ${key}: ${value} (type: ${typeof value})`);
            });
          }
        } else {
          console.log('   - Not an array, structure:');
          Object.entries(paymentData.data).forEach(([key, value]) => {
            console.log(`     * ${key}: ${value} (type: ${typeof value})`);
          });
        }
      }
    } else {
      console.log(`❌ Payment methods failed: ${paymentMethods.status}`);
    }

    // Test 4: Station Performance
    console.log('\n4. TESTING STATION PERFORMANCE');
    console.log('===============================');
    
    const stationMetrics = await fetch(`${BASE_URL}/dashboard/station-metrics`, { headers });
    
    if (stationMetrics.ok) {
      const stationData = await stationMetrics.json();
      console.log('✅ Station metrics endpoint accessible');
      console.log('📊 Response structure:');
      console.log(JSON.stringify(stationData, null, 2));
    } else {
      console.log(`❌ Station metrics failed: ${stationMetrics.status}`);
      
      // Try alternative endpoint
      const altStations = await fetch(`${BASE_URL}/stations`, { headers });
      if (altStations.ok) {
        const altStationData = await altStations.json();
        console.log('✅ Alternative stations endpoint accessible');
        console.log('📊 Response structure:');
        console.log(JSON.stringify(altStationData, null, 2));
      }
    }

    console.log('\n🎯 FRONTEND-BACKEND MISMATCH ANALYSIS');
    console.log('======================================');
    console.log('Based on the API responses above, here are the likely issues:');
    console.log('');
    console.log('1. 📅 DATE FORMATTING:');
    console.log('   - Backend likely returns ISO strings or Date objects');
    console.log('   - Frontend expects specific date format');
    console.log('   - Solution: Add date parsing/formatting in frontend');
    console.log('');
    console.log('2. 🔢 OBJECT DISPLAY:');
    console.log('   - "[object Object]" suggests frontend is trying to display object as string');
    console.log('   - Solution: Proper object property access in components');
    console.log('');
    console.log('3. 📊 DATA STRUCTURE:');
    console.log('   - Backend wraps data in success/data structure');
    console.log('   - Frontend might expect direct data access');
    console.log('   - Solution: Update data extraction in API hooks');
    console.log('');
    console.log('4. 🔄 WEEKLY READINGS:');
    console.log('   - "Readings this week: 0" suggests aggregation issue');
    console.log('   - Backend might not have weekly aggregation endpoint');
    console.log('   - Solution: Add date filtering or aggregation logic');

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

// Run the dashboard data mapping test
testDashboardDataMapping();
