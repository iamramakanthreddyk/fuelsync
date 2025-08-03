/**
 * @file debug-readings-empty.js
 * @description Debug why readings are returning empty
 */

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3003/api/v1';

async function debugReadingsEmpty() {
  console.log('🔍 DEBUGGING EMPTY READINGS ISSUE');
  console.log('==================================\n');

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
    const headers = { 'Authorization': `Bearer ${token}` };
    
    console.log('✅ Login successful');
    console.log(`👤 User: ${loginData.data.user.name} (${loginData.data.user.role})`);
    console.log(`🏢 Tenant: ${loginData.data.user.tenantName}\n`);

    // Test 1: Check readings endpoint directly
    console.log('1. TESTING READINGS ENDPOINT DIRECTLY');
    console.log('======================================');
    
    const readingsResponse = await fetch(`${BASE_URL}/nozzle-readings`, { headers });
    
    if (readingsResponse.ok) {
      const readingsData = await readingsResponse.json();
      console.log('📊 Raw Readings Response:');
      console.log(JSON.stringify(readingsData, null, 2));
      
      if (readingsData.success) {
        if (readingsData.data && readingsData.data.readings) {
          console.log(`\n✅ Found ${readingsData.data.readings.length} readings in response`);
          
          if (readingsData.data.readings.length > 0) {
            const firstReading = readingsData.data.readings[0];
            console.log('\n🔍 First Reading Structure:');
            Object.entries(firstReading).forEach(([key, value]) => {
              console.log(`   ${key}: ${JSON.stringify(value)} (${typeof value})`);
            });
          } else {
            console.log('❌ Readings array is empty');
          }
        } else {
          console.log('❌ No readings data in response');
        }
      } else {
        console.log('❌ Response not successful');
      }
    } else {
      console.log(`❌ Readings request failed: ${readingsResponse.status}`);
      const errorText = await readingsResponse.text();
      console.log(`   Error: ${errorText}`);
    }

    // Test 2: Check with different parameters
    console.log('\n2. TESTING WITH DIFFERENT PARAMETERS');
    console.log('====================================');
    
    const readingsWithLimit = await fetch(`${BASE_URL}/nozzle-readings?limit=10`, { headers });
    
    if (readingsWithLimit.ok) {
      const limitData = await readingsWithLimit.json();
      console.log(`📊 With limit=10: ${limitData.data?.readings?.length || 0} readings`);
    }

    // Test 3: Check database directly via a test endpoint or query
    console.log('\n3. CHECKING IF DATA EXISTS IN DATABASE');
    console.log('======================================');
    
    // Try to get stations to see if basic data exists
    const stationsResponse = await fetch(`${BASE_URL}/stations`, { headers });
    
    if (stationsResponse.ok) {
      const stationsData = await stationsResponse.json();
      console.log(`📊 Stations found: ${stationsData.data?.length || 0}`);
      
      if (stationsData.data && stationsData.data.length > 0) {
        console.log('✅ Basic data exists in database');
        
        // Try to get nozzles
        const nozzlesResponse = await fetch(`${BASE_URL}/nozzles`, { headers });
        
        if (nozzlesResponse.ok) {
          const nozzlesData = await nozzlesResponse.json();
          console.log(`📊 Nozzles found: ${nozzlesData.data?.nozzles?.length || 0}`);
          
          if (nozzlesData.data && nozzlesData.data.nozzles && nozzlesData.data.nozzles.length > 0) {
            console.log('✅ Nozzles exist in database');
            
            // The issue might be:
            console.log('\n🔍 POSSIBLE ISSUES:');
            console.log('===================');
            console.log('1. ❓ No readings have been created yet');
            console.log('2. ❓ UUID casting issues preventing readings from being retrieved');
            console.log('3. ❓ Data parser is interfering with the API response');
            console.log('4. ❓ Database query is failing silently');
            console.log('5. ❓ Tenant isolation is filtering out all readings');
            
            // Test 4: Try to create a reading to see if that works
            console.log('\n4. TESTING READING CREATION');
            console.log('============================');
            
            const firstNozzle = nozzlesData.data.nozzles[0];
            console.log(`🔧 Using nozzle: ${firstNozzle.nozzleNumber} (ID: ${firstNozzle.id})`);
            
            const testReading = {
              nozzleId: firstNozzle.id,
              reading: 5000.0,
              recordedAt: new Date().toISOString(),
              paymentMethod: 'cash'
            };
            
            console.log('🧪 Attempting to create test reading...');
            
            const createResponse = await fetch(`${BASE_URL}/nozzle-readings`, {
              method: 'POST',
              headers: {
                ...headers,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(testReading)
            });
            
            if (createResponse.ok) {
              const createResult = await createResponse.json();
              console.log('✅ Test reading created successfully!');
              console.log(`   Reading ID: ${createResult.data?.id}`);
              
              // Now try to fetch readings again
              console.log('\n5. RETESTING READINGS AFTER CREATION');
              console.log('=====================================');
              
              const retestResponse = await fetch(`${BASE_URL}/nozzle-readings`, { headers });
              
              if (retestResponse.ok) {
                const retestData = await retestResponse.json();
                console.log(`📊 Readings after creation: ${retestData.data?.readings?.length || 0}`);
                
                if (retestData.data?.readings?.length > 0) {
                  console.log('✅ Readings are now showing up!');
                  console.log('🎯 Issue was: No readings existed in database');
                } else {
                  console.log('❌ Still no readings - deeper issue exists');
                }
              }
              
            } else {
              const errorText = await createResponse.text();
              console.log(`❌ Reading creation failed: ${createResponse.status}`);
              console.log(`   Error: ${errorText}`);
              
              if (errorText.includes('operator does not exist: text = uuid')) {
                console.log('🎯 Issue is: UUID casting problems preventing creation');
              }
            }
          }
        }
      } else {
        console.log('❌ No basic data in database - setup issue');
      }
    }

    console.log('\n🎯 DIAGNOSIS SUMMARY');
    console.log('====================');
    console.log('The empty readings issue could be caused by:');
    console.log('1. 📊 No readings exist in the database yet');
    console.log('2. 🔧 UUID casting issues preventing database queries');
    console.log('3. 🔍 Data parser interfering with API responses');
    console.log('4. 🏢 Tenant isolation filtering out data');
    console.log('5. 💾 Database connection or query issues');

  } catch (error) {
    console.error('❌ Debug error:', error.message);
  }
}

// Run the debug
debugReadingsEmpty();
