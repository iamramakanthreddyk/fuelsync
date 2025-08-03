/**
 * @file test-nozzles-structure.js
 * @description Check nozzles data structure
 */

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3003/api/v1';

async function testNozzlesStructure() {
  console.log('🔍 CHECKING NOZZLES DATA STRUCTURE');
  console.log('===================================\n');

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
    
    console.log('✅ Login successful\n');

    // Check nozzles endpoint
    const nozzlesResponse = await fetch(`${BASE_URL}/nozzles`, { headers });
    
    if (nozzlesResponse.ok) {
      const nozzlesData = await nozzlesResponse.json();
      console.log('📊 Nozzles Response:');
      console.log(JSON.stringify(nozzlesData, null, 2));
      
      if (nozzlesData.success && nozzlesData.data) {
        console.log(`\n✅ Found ${nozzlesData.data.length} nozzles`);
        
        if (nozzlesData.data.length > 0) {
          const firstNozzle = nozzlesData.data[0];
          console.log('\n🔍 First Nozzle Structure:');
          Object.entries(firstNozzle).forEach(([key, value]) => {
            console.log(`   ${key}: ${value} (${typeof value})`);
          });
        }
      }
    } else {
      console.log(`❌ Nozzles failed: ${nozzlesResponse.status}`);
    }

    // Also check a simple reading creation to test UUID fixes
    console.log('\n🧪 TESTING SIMPLE READING CREATION');
    console.log('===================================');
    
    // Try with a hardcoded nozzle ID from the database
    const testReadingData = {
      nozzleId: '26959c13-0822-40da-bde1-399f241dd1ee', // From previous test data
      reading: 3000.5,
      recordedAt: new Date().toISOString(),
      paymentMethod: 'cash'
    };
    
    console.log('🔧 Testing reading creation...');
    console.log(`   Nozzle ID: ${testReadingData.nozzleId}`);
    console.log(`   Reading: ${testReadingData.reading}L`);
    
    const createReadingResponse = await fetch(`${BASE_URL}/nozzle-readings`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testReadingData)
    });
    
    if (createReadingResponse.ok) {
      const result = await createReadingResponse.json();
      console.log('✅ Reading created successfully!');
      console.log(`   Reading ID: ${result.data?.id || 'N/A'}`);
      console.log('🎉 UUID fixes are working!');
    } else {
      const errorText = await createReadingResponse.text();
      console.log(`❌ Reading creation failed: ${createReadingResponse.status}`);
      console.log(`   Error: ${errorText}`);
      
      if (errorText.includes('operator does not exist: text = uuid')) {
        console.log('⚠️  UUID issues still exist');
      } else {
        console.log('✅ UUID issues fixed, other validation error');
      }
    }

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

// Run the test
testNozzlesStructure();
