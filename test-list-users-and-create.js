/**
 * @file test-list-users-and-create.js
 * @description List existing users and create a test user for dashboard testing
 */

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3003/api/v1';

async function listUsersAndCreate() {
  console.log('👥 LISTING EXISTING USERS AND CREATING TEST USER');
  console.log('=================================================\n');

  try {
    // Login as SuperAdmin
    const adminLogin = await fetch(`${BASE_URL}/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@fuelsync.com',
        password: 'Admin@123'
      })
    });

    if (!adminLogin.ok) {
      console.log('❌ SuperAdmin login failed');
      return;
    }

    const adminData = await adminLogin.json();
    const adminToken = adminData.data.token;
    const adminHeaders = { 'Authorization': `Bearer ${adminToken}` };

    console.log('✅ SuperAdmin login successful');

    // List existing users
    console.log('\n1. LISTING EXISTING USERS');
    console.log('==========================');
    
    const users = await fetch(`${BASE_URL}/superadmin/users`, { headers: adminHeaders });
    
    if (users.ok) {
      const usersData = await users.json();
      console.log('✅ Users endpoint accessible');
      
      if (usersData.success && usersData.data) {
        const tenantUsers = usersData.data.tenantUsers || [];
        const adminUsers = usersData.data.adminUsers || [];
        
        console.log(`\n📊 Found ${tenantUsers.length} tenant users and ${adminUsers.length} admin users`);
        
        console.log('\n🏢 TENANT USERS:');
        tenantUsers.forEach((user, index) => {
          console.log(`   ${index + 1}. ${user.name} (${user.email}) - ${user.role}`);
          console.log(`      Tenant: ${user.tenantName || 'N/A'}`);
          console.log(`      Status: ${user.status || 'N/A'}`);
        });
        
        console.log('\n👨‍💼 ADMIN USERS:');
        adminUsers.forEach((user, index) => {
          console.log(`   ${index + 1}. ${user.name} (${user.email}) - ${user.role}`);
        });
        
        // Try to login with existing tenant users
        console.log('\n2. TESTING EXISTING USER LOGINS');
        console.log('================================');
        
        const commonPasswords = ['Owner@123', 'Manager@123', 'Attendant@123', 'Test@123', 'Password@123'];
        
        for (const user of tenantUsers.slice(0, 3)) { // Test first 3 users
          console.log(`\n🔑 Testing user: ${user.email}`);
          
          for (const password of commonPasswords) {
            try {
              const loginTest = await fetch(`${BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  email: user.email,
                  password: password
                })
              });
              
              if (loginTest.ok) {
                const loginData = await loginTest.json();
                if (loginData.success) {
                  console.log(`   ✅ SUCCESS with password: ${password}`);
                  console.log(`   👤 User: ${loginData.data.user.name} (${loginData.data.user.role})`);
                  console.log(`   🏢 Tenant: ${loginData.data.user.tenantName || 'N/A'}`);
                  
                  // Test a quick dashboard call
                  const testHeaders = { 'Authorization': `Bearer ${loginData.data.token}` };
                  const quickTest = await fetch(`${BASE_URL}/todays-sales/summary`, { headers: testHeaders });
                  
                  if (quickTest.ok) {
                    const testData = await quickTest.json();
                    console.log(`   📊 Dashboard test: ${testData.success ? 'SUCCESS' : 'FAILED'}`);
                    
                    if (testData.success && testData.data) {
                      console.log(`   📈 Today's sales: ${testData.data.totalEntries} entries, ₹${testData.data.totalAmount}`);
                    }
                  }
                  
                  console.log(`\n🎯 WORKING CREDENTIALS FOUND:`);
                  console.log(`   Email: ${user.email}`);
                  console.log(`   Password: ${password}`);
                  console.log(`   Use these credentials to test the frontend dashboard!`);
                  
                  return; // Exit once we find working credentials
                }
              }
            } catch (err) {
              // Continue trying
            }
          }
          
          console.log(`   ❌ No working password found for ${user.email}`);
        }
        
        console.log('\n❌ No working credentials found for existing users');
        
      } else {
        console.log('❌ Failed to get users data');
      }
    } else {
      console.log(`❌ Users endpoint failed: ${users.status}`);
    }

    // Get tenants to create a test user
    console.log('\n3. CREATING TEST USER');
    console.log('=====================');
    
    const tenants = await fetch(`${BASE_URL}/superadmin/tenants`, { headers: adminHeaders });
    const tenantsData = await tenants.json();
    
    if (tenantsData.success && tenantsData.data.tenants.length > 0) {
      const firstTenant = tenantsData.data.tenants[0];
      console.log(`📊 Using tenant: ${firstTenant.name} (ID: ${firstTenant.id})`);
      
      // Create a test user
      const testUserData = {
        name: 'Test Owner',
        email: 'testowner@fuelsync.com',
        password: 'TestOwner@123',
        role: 'owner',
        tenantId: firstTenant.id
      };
      
      console.log(`🔧 Creating test user: ${testUserData.email}`);
      
      // Note: We need to check if there's a user creation endpoint for SuperAdmin
      // For now, let's try to create via tenant creation or direct database
      
      console.log('⚠️  User creation via API not implemented in current SuperAdmin endpoints');
      console.log('💡 You may need to create a user directly in the database or add user creation endpoint');
      
      console.log('\n📝 MANUAL USER CREATION STEPS:');
      console.log('==============================');
      console.log('1. Connect to PostgreSQL database');
      console.log('2. Run this SQL to create a test user:');
      console.log(`
INSERT INTO public.users (id, name, email, password_hash, role, tenant_id, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Test Owner',
  'testowner@fuelsync.com',
  '$2b$10$example_hash_here', -- Use bcrypt to hash 'TestOwner@123'
  'owner',
  '${firstTenant.id}',
  NOW(),
  NOW()
);`);
      
      console.log('\n3. Or use the existing user credentials if you can find the correct password');
      console.log('4. Check the users table directly: SELECT name, email, role FROM public.users;');
    }

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

// Run the test
listUsersAndCreate();
