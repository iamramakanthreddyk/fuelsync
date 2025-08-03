const fetch = require('node-fetch');

async function testAnalyticsResponse() {
  try {
    // Login
    const login = await fetch('http://localhost:3003/api/v1/admin/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@fuelsync.com',
        password: 'Admin@123'
      })
    });
    
    const loginData = await login.json();
    const token = loginData.data.token;
    
    // Get analytics
    const analytics = await fetch('http://localhost:3003/api/v1/superadmin/analytics/usage', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const data = await analytics.json();
    console.log('Analytics Response Structure:');
    console.log(JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testAnalyticsResponse();
