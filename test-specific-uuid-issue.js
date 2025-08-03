/**
 * @file test-specific-uuid-issue.js
 * @description Test specific parts of reading creation to isolate UUID issue
 */

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3003/api/v1';

async function testSpecificUUIDIssue() {
  console.log('🔍 TESTING SPECIFIC UUID ISSUE');
  console.log('===============================\n');

  try {
    // Login
    const loginResponse = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'gupta@fuelsync.com',
        password: 'gupta@123'
      })
    });

    const loginData = await loginResponse.json();
    const token = loginData.data.token;
    const headers = { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    console.log('✅ Login successful\n');

    // Test 1: Try creating a very simple reading with minimal data
    console.log('1. TESTING MINIMAL READING CREATION');
    console.log('====================================');
    
    const minimalReading = {
      nozzleId: '1e87d184-c4c2-43fc-88f8-a24f515d9f94',
      reading: 1000,
      recordedAt: new Date().toISOString(),
      paymentMethod: 'cash'
    };
    
    console.log('🧪 Creating minimal reading...');
    console.log(`   Nozzle ID: ${minimalReading.nozzleId}`);
    console.log(`   Reading: ${minimalReading.reading}`);
    console.log(`   Payment: ${minimalReading.paymentMethod}`);
    
    const minimalResponse = await fetch(`${BASE_URL}/nozzle-readings`, {
      method: 'POST',
      headers,
      body: JSON.stringify(minimalReading)
    });
    
    if (minimalResponse.ok) {
      const result = await minimalResponse.json();
      console.log('✅ Minimal reading created successfully!');
      console.log(`   Reading ID: ${result.data?.id}`);
      
      // Now test if we can retrieve readings
      console.log('\n2. TESTING READINGS RETRIEVAL AFTER CREATION');
      console.log('=============================================');
      
      const retrieveResponse = await fetch(`${BASE_URL}/nozzle-readings`, { headers });
      
      if (retrieveResponse.ok) {
        const retrieveData = await retrieveResponse.json();
        console.log(`📊 Retrieved ${retrieveData.data?.readings?.length || 0} readings`);
        
        if (retrieveData.data?.readings?.length > 0) {
          console.log('✅ Readings are now showing up!');
          console.log('🎯 Issue was: No readings existed in database');
          
          const firstReading = retrieveData.data.readings[0];
          console.log('\n📊 First Reading Data:');
          Object.entries(firstReading).forEach(([key, value]) => {
            console.log(`   ${key}: ${JSON.stringify(value)} (${typeof value})`);
          });
          
        } else {
          console.log('❌ Still no readings retrieved - retrieval issue exists');
        }
      } else {
        console.log(`❌ Failed to retrieve readings: ${retrieveResponse.status}`);
      }
      
    } else {
      const errorText = await minimalResponse.text();
      console.log(`❌ Minimal reading creation failed: ${minimalResponse.status}`);
      console.log(`   Error: ${errorText}`);
      
      // Try to identify which specific query is failing
      if (errorText.includes('operator does not exist: text = uuid')) {
        console.log('\n🔍 ANALYZING UUID ERROR');
        console.log('========================');
        console.log('The UUID error is still occurring. Possible causes:');
        console.log('1. 🔧 Nozzle validation query (checking if nozzle exists)');
        console.log('2. 🔧 Previous reading query (getting last reading)');
        console.log('3. 🔧 Reconciliation check (isFinalized function)');
        console.log('4. 🔧 Price lookup query (fuel price validation)');
        console.log('5. 🔧 User role validation query');
        console.log('6. 🔧 Sales record insertion');
        console.log('7. 🔧 Reading record insertion');
        
        // Test individual components
        console.log('\n3. TESTING INDIVIDUAL COMPONENTS');
        console.log('=================================');
        
        // Test nozzle endpoint
        const nozzleTest = await fetch(`${BASE_URL}/nozzles/${minimalReading.nozzleId}`, { headers });
        if (nozzleTest.ok) {
          console.log('✅ Nozzle endpoint works');
        } else {
          console.log(`❌ Nozzle endpoint fails: ${nozzleTest.status}`);
        }
        
        // Test stations endpoint
        const stationTest = await fetch(`${BASE_URL}/stations`, { headers });
        if (stationTest.ok) {
          console.log('✅ Stations endpoint works');
        } else {
          console.log(`❌ Stations endpoint fails: ${stationTest.status}`);
        }
        
        // Test fuel prices endpoint
        const pricesTest = await fetch(`${BASE_URL}/fuel-prices`, { headers });
        if (pricesTest.ok) {
          console.log('✅ Fuel prices endpoint works');
        } else {
          console.log(`❌ Fuel prices endpoint fails: ${pricesTest.status}`);
        }
      }
    }

    console.log('\n🎯 NEXT STEPS');
    console.log('==============');
    console.log('If reading creation is still failing:');
    console.log('1. 🔍 Check backend logs for specific failing query');
    console.log('2. 🔧 Add more UUID casting to remaining queries');
    console.log('3. 🧪 Test each database query individually');
    console.log('4. 📊 Verify database schema and constraints');
    
    console.log('\nIf reading creation works but retrieval fails:');
    console.log('1. 🔍 Check data parser integration');
    console.log('2. 🔧 Verify API service is using updated methods');
    console.log('3. 🧪 Test direct database queries');

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

// Run the test
testSpecificUUIDIssue();
