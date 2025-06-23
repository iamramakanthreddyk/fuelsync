const http = require('http');

// Test credentials
const testUsers = [
  { role: 'superadmin', email: 'admin@fuelsync.dev', password: 'password' },
  { role: 'owner', email: 'owner@demo.com', password: 'password' },
  { role: 'manager', email: 'manager@demo.com', password: 'password' },
  { role: 'attendant', email: 'attendant@demo.com', password: 'password' }
];

// API URL components
const API_HOST = 'localhost';
const API_PORT = 3000;
const API_PATH = '/v1/auth/login';

function makeLoginRequest(email, password) {
  return new Promise((resolve, reject) => {
    console.log(`\nTesting login for ${email}...`);
    
    // Prepare request data
    const postData = JSON.stringify({
      email,
      password
    });
    
    // Request options
    const options = {
      hostname: API_HOST,
      port: API_PORT,
      path: API_PATH,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 5000
    };
    
    console.log(`Making request to http://${API_HOST}:${API_PORT}${API_PATH}`);
    console.log('Request payload:', { email, password });
    
    // Make the request
    const req = http.request(options, (res) => {
      console.log(`Response status: ${res.statusCode}`);
      console.log('Response headers:', res.headers);
      
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(data);
          console.log('Response data:', parsedData);
          
          if (res.statusCode === 200 && parsedData.token) {
            console.log('Login successful!');
            console.log('Token:', parsedData.token ? '✓ Present' : '✗ Missing');
            console.log('User:', parsedData.user ? '✓ Present' : '✗ Missing');
            if (parsedData.user) {
              console.log('User ID:', parsedData.user.id);
              console.log('User Role:', parsedData.user.role);
              console.log('Tenant ID:', parsedData.user.tenantId || 'N/A');
            }
            resolve(true);
          } else {
            console.error('Login failed with status:', res.statusCode);
            console.error('Response data:', parsedData);
            resolve(false);
          }
        } catch (error) {
          console.error('Error parsing response:', error.message);
          console.error('Raw response:', data);
          resolve(false);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('Request error:', error.message);
      resolve(false);
    });
    
    req.on('timeout', () => {
      console.error('Request timed out');
      req.destroy();
      resolve(false);
    });
    
    // Write data to request body
    req.write(postData);
    req.end();
  });
}

async function runTests() {
  // Test logins
  let successCount = 0;
  for (const user of testUsers) {
    const success = await makeLoginRequest(user.email, user.password);
    if (success) successCount++;
  }
  
  // Summary
  console.log('\n--- Test Summary ---');
  console.log(`Successful logins: ${successCount}/${testUsers.length}`);
  console.log(`Failed logins: ${testUsers.length - successCount}`);
  
  if (successCount === testUsers.length) {
    console.log('\n✅ All login tests passed!');
  } else {
    console.log('\n❌ Some login tests failed.');
  }
}

// Run the tests
runTests();