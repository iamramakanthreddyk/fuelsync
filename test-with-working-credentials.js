/**
 * @file test-with-working-credentials.js
 * @description Test dashboard with working credentials and identify data structure issues
 */

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3003/api/v1';

async function testWithWorkingCredentials() {
  console.log('🔑 TESTING WITH WORKING CREDENTIALS');
  console.log('===================================\n');

  try {
    // Login with provided credentials
    const loginResponse = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'gupta@fuelsync.com',
        password: 'gupta@123'
      })
    });

    if (!loginResponse.ok) {
      console.log('❌ Login failed with provided credentials');
      return;
    }

    const loginData = await loginResponse.json();
    
    if (!loginData.success) {
      console.log('❌ Login unsuccessful:', loginData.message);
      return;
    }

    const token = loginData.data.token;
    const headers = { 'Authorization': `Bearer ${token}` };
    
    console.log('✅ Login successful');
    console.log(`👤 User: ${loginData.data.user.name} (${loginData.data.user.role})`);
    console.log(`🏢 Tenant: ${loginData.data.user.tenantName || 'N/A'}\n`);

    // Test 1: Nozzle Readings - The problematic endpoint
    console.log('1. TESTING NOZZLE READINGS (PROBLEMATIC DATA)');
    console.log('==============================================');
    
    const readings = await fetch(`${BASE_URL}/nozzle-readings`, { headers });
    
    if (readings.ok) {
      const readingsData = await readings.json();
      console.log('✅ Readings endpoint accessible');
      console.log('📊 Full Response Structure:');
      console.log(JSON.stringify(readingsData, null, 2));
      
      if (readingsData.success && readingsData.data && readingsData.data.readings) {
        const readingsList = readingsData.data.readings;
        console.log(`\n🔍 Found ${readingsList.length} readings`);
        
        if (readingsList.length > 0) {
          const firstReading = readingsList[0];
          console.log('\n🚨 PROBLEMATIC DATA STRUCTURE IDENTIFIED:');
          console.log('==========================================');
          
          // Analyze the reading field
          console.log(`📊 Reading field:`, firstReading.reading);
          console.log(`   - Type: ${typeof firstReading.reading}`);
          console.log(`   - Is Object: ${typeof firstReading.reading === 'object'}`);
          console.log(`   - Structure: ${JSON.stringify(firstReading.reading)}`);
          
          // Analyze the recordedAt field
          console.log(`📅 RecordedAt field:`, firstReading.recordedAt);
          console.log(`   - Type: ${typeof firstReading.recordedAt}`);
          console.log(`   - Is Object: ${typeof firstReading.recordedAt === 'object'}`);
          console.log(`   - Structure: ${JSON.stringify(firstReading.recordedAt)}`);
          
          // Analyze other numeric fields
          console.log(`💰 Amount field:`, firstReading.amount);
          console.log(`   - Type: ${typeof firstReading.amount}`);
          
          console.log(`⛽ Volume field:`, firstReading.volume);
          console.log(`   - Type: ${typeof firstReading.volume}`);
          
          console.log(`💵 PricePerLitre field:`, firstReading.pricePerLitre);
          console.log(`   - Type: ${typeof firstReading.pricePerLitre}`);
          console.log(`   - Structure: ${JSON.stringify(firstReading.pricePerLitre)}`);
          
          console.log(`🔢 PreviousReading field:`, firstReading.previousReading);
          console.log(`   - Type: ${typeof firstReading.previousReading}`);
          console.log(`   - Structure: ${JSON.stringify(firstReading.previousReading)}`);
          
          console.log('\n🔧 DATA PARSING NEEDED:');
          console.log('========================');
          
          // Try to parse the complex number format
          if (firstReading.reading && typeof firstReading.reading === 'object' && firstReading.reading.d) {
            const parsedReading = firstReading.reading.d[0];
            console.log(`✅ Parsed reading: ${parsedReading} (from ${JSON.stringify(firstReading.reading)})`);
          }
          
          if (firstReading.pricePerLitre && typeof firstReading.pricePerLitre === 'object' && firstReading.pricePerLitre.d) {
            const parsedPrice = firstReading.pricePerLitre.d[0];
            console.log(`✅ Parsed price: ${parsedPrice} (from ${JSON.stringify(firstReading.pricePerLitre)})`);
          }
          
          if (firstReading.previousReading && typeof firstReading.previousReading === 'object' && firstReading.previousReading.d) {
            const parsedPrevious = firstReading.previousReading.d[0];
            console.log(`✅ Parsed previous: ${parsedPrevious} (from ${JSON.stringify(firstReading.previousReading)})`);
          }
        }
      }
    } else {
      console.log(`❌ Readings failed: ${readings.status}`);
    }

    // Test 2: Today's Sales Summary
    console.log('\n2. TESTING TODAY\'S SALES SUMMARY');
    console.log('=================================');
    
    const todaysSales = await fetch(`${BASE_URL}/todays-sales/summary`, { headers });
    
    if (todaysSales.ok) {
      const salesData = await todaysSales.json();
      console.log('✅ Today\'s sales accessible');
      console.log('📊 Response structure:');
      console.log(JSON.stringify(salesData, null, 2));
    } else {
      console.log(`❌ Today's sales failed: ${todaysSales.status}`);
    }

    // Test 3: Payment Methods
    console.log('\n3. TESTING PAYMENT METHODS');
    console.log('===========================');
    
    const paymentMethods = await fetch(`${BASE_URL}/dashboard/payment-methods`, { headers });
    
    if (paymentMethods.ok) {
      const paymentData = await paymentMethods.json();
      console.log('✅ Payment methods accessible');
      console.log('📊 Response structure:');
      console.log(JSON.stringify(paymentData, null, 2));
    } else {
      console.log(`❌ Payment methods failed: ${paymentMethods.status}`);
    }

    console.log('\n🎯 ROOT CAUSE IDENTIFIED');
    console.log('=========================');
    console.log('❌ Backend returns complex object format for numbers:');
    console.log('   - reading: {s: 1, e: 2, d: [600]} instead of 600');
    console.log('   - pricePerLitre: {s: 1, e: 1, d: [96]} instead of 96');
    console.log('   - recordedAt: {} instead of date string');
    console.log('');
    console.log('✅ SOLUTION NEEDED:');
    console.log('   1. Create data parser for complex number format');
    console.log('   2. Fix date handling for empty recordedAt objects');
    console.log('   3. Update frontend to parse backend response correctly');

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

// Run the test
testWithWorkingCredentials();
