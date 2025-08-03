const axios = require('axios');
require('dotenv').config();

const API_BASE_URL = process.env.API_BASE_URL || 'https://fuelsync-api-demo-bvadbhg8bdbmg0ff.germanywestcentral-01.azurewebsites.net';

async function testReadingCreation() {
  try {
    console.log('🔐 Testing reading creation with user: gupta@fuelsync.com');
    
    // Step 1: Login
    console.log('\n1. Logging in...');
    const loginResponse = await axios.post(`${API_BASE_URL}/api/v1/auth/login`, {
      email: 'gupta@fuelsync.com',
      password: 'gupta@123'
    });
    
    if (!loginResponse.data.token) {
      throw new Error('Login failed - no token received');
    }
    
    const token = loginResponse.data.token;
    const user = loginResponse.data.user;
    console.log(`✅ Login successful! User: ${user.name} (${user.role})`);
    console.log(`   Tenant: ${user.tenantName} (${user.tenantId})`);
    
    // Step 2: Get stations
    console.log('\n2. Getting stations...');
    const stationsResponse = await axios.get(`${API_BASE_URL}/api/v1/stations`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-tenant-id': user.tenantId
      }
    });
    
    const stations = stationsResponse.data.data || stationsResponse.data;
    console.log(`✅ Found ${stations.length} stations`);
    if (stations.length === 0) {
      throw new Error('No stations found');
    }
    
    const station = stations[0];
    console.log(`   Using station: ${station.name} (${station.id})`);
    
    // Step 3: Get pumps for the station
    console.log('\n3. Getting pumps...');
    const pumpsResponse = await axios.get(`${API_BASE_URL}/api/v1/pumps?stationId=${station.id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-tenant-id': user.tenantId
      }
    });
    
    const pumps = pumpsResponse.data.data || pumpsResponse.data;
    console.log(`✅ Found ${pumps.length} pumps`);
    if (pumps.length === 0) {
      throw new Error('No pumps found');
    }
    
    const pump = pumps[0];
    console.log(`   Using pump: ${pump.name} (${pump.id})`);
    
    // Step 4: Get nozzles for the pump
    console.log('\n4. Getting nozzles...');
    const nozzlesResponse = await axios.get(`${API_BASE_URL}/api/v1/nozzles?pumpId=${pump.id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-tenant-id': user.tenantId
      }
    });
    
    const nozzles = nozzlesResponse.data.data || nozzlesResponse.data;
    console.log(`✅ Found ${nozzles.length} nozzles`);
    if (nozzles.length === 0) {
      throw new Error('No nozzles found');
    }
    
    const nozzle = nozzles[0];
    console.log(`   Using nozzle: ${nozzle.nozzleNumber} - ${nozzle.fuelType} (${nozzle.id})`);
    
    // Step 5: Create a reading
    console.log('\n5. Creating reading...');
    const readingData = {
      nozzleId: nozzle.id,
      reading: 1000.50,
      recordedAt: new Date().toISOString(),
      paymentMethod: 'cash'
    };
    
    console.log('   Reading data:', readingData);
    
    const readingResponse = await axios.post(`${API_BASE_URL}/api/v1/nozzle-readings`, readingData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-tenant-id': user.tenantId,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Reading created successfully!');
    console.log('   Response:', readingResponse.data);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Response:', error.response.data);
    }
    if (error.stack) {
      console.error('   Stack:', error.stack);
    }
  }
}

testReadingCreation();
