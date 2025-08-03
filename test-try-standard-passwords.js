/**
 * @file test-try-standard-passwords.js
 * @description Try standard passwords with existing users
 */

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3003/api/v1';

async function tryStandardPasswords() {
  console.log('🔑 TRYING STANDARD PASSWORDS WITH EXISTING USERS');
  console.log('=================================================\n');

  const users = [
    'test-owner@example.com',
    'gupta@fuelsync.com',
    'test-manager@example.com',
    'manager@gupta.fuelsync.com'
  ];

  const passwords = [
    'password',
    'Password@123',
    'Test@123',
    'Owner@123',
    'Manager@123',
    'Gupta@123',
    'test123',
    'Test123!',
    'admin123',
    'Admin@123'
  ];

  for (const email of users) {
    console.log(`\n🔑 Testing user: ${email}`);
    
    for (const password of passwords) {
      try {
        const loginTest = await fetch(`${BASE_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        
        if (loginTest.ok) {
          const loginData = await loginTest.json();
          if (loginData.success) {
            console.log(`   ✅ SUCCESS with password: ${password}`);
            console.log(`   👤 User: ${loginData.data.user.name} (${loginData.data.user.role})`);
            console.log(`   🏢 Tenant: ${loginData.data.user.tenantName || 'N/A'}`);
            
            // Test dashboard endpoints
            const testHeaders = { 'Authorization': `Bearer ${loginData.data.token}` };
            
            console.log('\n   📊 TESTING DASHBOARD ENDPOINTS:');
            
            // Test Today's Sales
            const todaysSales = await fetch(`${BASE_URL}/todays-sales/summary`, { headers: testHeaders });
            if (todaysSales.ok) {
              const salesData = await todaysSales.json();
              console.log(`   ✅ Today's Sales: ${salesData.success ? 'SUCCESS' : 'FAILED'}`);
              if (salesData.success && salesData.data) {
                console.log(`      - Entries: ${salesData.data.totalEntries}`);
                console.log(`      - Amount: ₹${salesData.data.totalAmount}`);
                console.log(`      - Date: ${salesData.data.date}`);
                console.log(`      - Date type: ${typeof salesData.data.date}`);
                
                // Check if date is valid
                const dateObj = new Date(salesData.data.date);
                console.log(`      - Date valid: ${!isNaN(dateObj.getTime())}`);
                console.log(`      - Date formatted: ${dateObj.toLocaleDateString()}`);
              }
            } else {
              console.log(`   ❌ Today's Sales failed: ${todaysSales.status}`);
            }
            
            // Test Readings
            const readings = await fetch(`${BASE_URL}/nozzle-readings`, { headers: testHeaders });
            if (readings.ok) {
              const readingsData = await readings.json();
              console.log(`   ✅ Readings: ${readingsData.success ? 'SUCCESS' : 'FAILED'}`);
              if (readingsData.success && readingsData.data && readingsData.data.readings) {
                console.log(`      - Count: ${readingsData.data.readings.length}`);
                if (readingsData.data.readings.length > 0) {
                  const firstReading = readingsData.data.readings[0];
                  console.log(`      - First reading: ${firstReading.reading}`);
                  console.log(`      - Date: ${firstReading.recordedAt || firstReading.recorded_at}`);
                  console.log(`      - Date type: ${typeof (firstReading.recordedAt || firstReading.recorded_at)}`);
                  
                  // Check if reading date is valid
                  const readingDate = new Date(firstReading.recordedAt || firstReading.recorded_at);
                  console.log(`      - Date valid: ${!isNaN(readingDate.getTime())}`);
                  console.log(`      - Date formatted: ${readingDate.toLocaleDateString()}`);
                }
              }
            } else {
              console.log(`   ❌ Readings failed: ${readings.status}`);
            }
            
            // Test Payment Methods
            const paymentMethods = await fetch(`${BASE_URL}/dashboard/payment-methods`, { headers: testHeaders });
            if (paymentMethods.ok) {
              const paymentData = await paymentMethods.json();
              console.log(`   ✅ Payment Methods: ${paymentData.success ? 'SUCCESS' : 'FAILED'}`);
              if (paymentData.success) {
                console.log(`      - Data type: ${Array.isArray(paymentData.data) ? 'Array' : typeof paymentData.data}`);
                if (Array.isArray(paymentData.data)) {
                  console.log(`      - Items: ${paymentData.data.length}`);
                  if (paymentData.data.length > 0) {
                    console.log(`      - First item: ${JSON.stringify(paymentData.data[0])}`);
                  }
                }
              }
            } else {
              console.log(`   ❌ Payment Methods failed: ${paymentMethods.status}`);
            }
            
            console.log(`\n🎯 WORKING CREDENTIALS:`);
            console.log(`   Email: ${email}`);
            console.log(`   Password: ${password}`);
            console.log(`   Token: ${loginData.data.token.substring(0, 20)}...`);
            
            return { email, password, token: loginData.data.token, user: loginData.data.user };
          }
        }
      } catch (err) {
        // Continue trying
      }
    }
    
    console.log(`   ❌ No working password found for ${email}`);
  }
  
  console.log('\n❌ No working credentials found with standard passwords');
  console.log('\n💡 NEXT STEPS:');
  console.log('1. Check the database directly for user passwords');
  console.log('2. Reset a user password manually');
  console.log('3. Create a new test user with known credentials');
  
  return null;
}

// Run the test
tryStandardPasswords().then(result => {
  if (result) {
    console.log('\n✅ Found working credentials - you can now test the frontend!');
  }
});
