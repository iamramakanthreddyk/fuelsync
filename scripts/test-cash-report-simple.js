const axios = require('axios');

async function testCashReport() {
  try {
    const response = await axios.post('http://localhost:3003/api/v1/attendant/cash-report', {
      stationId: 'b4f2399d-8bdb-42d0-9c18-591351f2fc66',
      cashAmount: 1000,
      cardAmount: 500,
      upiAmount: 300,
      creditAmount: 200,
      shift: 'morning',
      notes: 'Test submission'
    }, {
      headers: {
        'Authorization': 'Bearer YOUR_TOKEN_HERE',
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Success:', response.data);
  } catch (error) {
    console.log('❌ Error:', error.response?.data || error.message);
  }
}

console.log('🧪 Testing cash report with correct column names...');
testCashReport();