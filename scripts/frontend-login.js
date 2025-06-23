const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Test credentials
const testUsers = [
  { role: 'superadmin', email: 'admin@fuelsync.dev', password: 'password' },
  { role: 'owner', email: 'owner@demo.com', password: 'password' },
  { role: 'manager', email: 'manager@demo.com', password: 'password' },
  { role: 'attendant', email: 'attendant@demo.com', password: 'password' }
];

// API URL
const API_URL = process.env.API_URL || 'http://localhost:3000/v1';

async function testLogin(email, password) {
  console.log(`\nTesting login for ${email}...`);
  try {
    const response = await axios.post(`${API_URL}/auth/login`, {
      email,
      password
    });
    
    console.log('Login successful!');
    
    // Save token and user to file for frontend testing
    const authData = {
      token: response.data.token,
      user: response.data.user
    };
    
    const username = email.split('@')[0];
    const filename = `auth_${username}.json`;
    fs.writeFileSync(path.join(process.cwd(), filename), JSON.stringify(authData, null, 2));
    console.log(`Saved auth data to ${filename}`);
    
    // Generate localStorage code
    console.log('\nFrontend login code:');
    console.log(`localStorage.setItem('fuelsync_token', '${authData.token}');`);
    console.log(`localStorage.setItem('fuelsync_user', '${JSON.stringify(authData.user)}');`);
    console.log(`console.log('Logged in as ${authData.user.role}');`);
    
    return true;
  } catch (error) {
    console.error('Login failed:', error.response?.data || error.message || 'Unknown error');
    return false;
  }
}

// Get user from command line argument or use owner by default
const userArg = process.argv[2] || 'owner';
const user = testUsers.find(u => u.role.toLowerCase() === userArg.toLowerCase() || 
                               u.email.split('@')[0].toLowerCase() === userArg.toLowerCase());

if (!user) {
  console.error(`User "${userArg}" not found. Available users: ${testUsers.map(u => u.role).join(', ')}`);
  process.exit(1);
}

// Test login for the specified user
testLogin(user.email, user.password).then(success => {
  if (!success) {
    process.exit(1);
  }
});