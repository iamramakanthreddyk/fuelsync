const axios = require('axios');

const API_BASE = 'http://localhost:3003/api/v1';

async function testCashReportAPI() {
  try {
    console.log('🧪 Testing Cash Report API...\n');

    // Test data
    const loginData = {
      username: 'admin@example.com', // Replace with actual credentials
      password: 'password123'
    };

    const cashReportData = {
      stationId: 'your-station-id', // Replace with actual station ID
      cashAmount: 1500.50,
      cardAmount: 800.25,
      upiAmount: 650.75,
      creditAmount: 200.00,
      shift: 'morning',
      notes: 'Test cash report submission',
      date: new Date().toISOString().split('T')[0]
    };

    // Step 1: Login to get token
    console.log('1️⃣ Logging in...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, loginData);
    const token = loginResponse.data.data.token;
    console.log('✅ Login successful');

    // Step 2: Submit cash report
    console.log('\n2️⃣ Submitting cash report...');
    const headers = { Authorization: `Bearer ${token}` };
    
    const cashReportResponse = await axios.post(
      `${API_BASE}/attendant/cash-report`,
      cashReportData,
      { headers }
    );

    console.log('✅ Cash report submitted successfully!');
    console.log('📊 Response:', JSON.stringify(cashReportResponse.data, null, 2));

    // Step 3: Fetch cash reports
    console.log('\n3️⃣ Fetching cash reports...');
    const reportsResponse = await axios.get(
      `${API_BASE}/attendant/cash-reports`,
      { headers }
    );

    console.log('✅ Cash reports fetched successfully!');
    console.log('📋 Reports count:', reportsResponse.data.data.reports.length);

    console.log('\n🎉 All tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    if (error.response?.status === 400) {
      console.log('\n💡 Tip: Make sure to update the stationId in the test data');
    }
    
    if (error.response?.status === 401) {
      console.log('\n💡 Tip: Update the login credentials in the test data');
    }
  }
}

// Instructions
console.log(`
📋 Cash Report API Test Instructions:

1. Make sure the backend server is running on port 3003
2. Update the login credentials in this script
3. Update the stationId with a valid station ID from your database
4. Run: node scripts/test-cash-report-api.js

Expected API Flow:
- POST /api/v1/auth/login (get token)
- POST /api/v1/attendant/cash-report (submit report)
- GET /api/v1/attendant/cash-reports (fetch reports)

Cash Report Data Structure:
{
  stationId: string,
  cashAmount: number,
  cardAmount: number, 
  upiAmount: number,
  creditAmount: number,
  shift: 'morning' | 'afternoon' | 'night',
  notes?: string,
  date?: string
}
`);

testCashReportAPI();